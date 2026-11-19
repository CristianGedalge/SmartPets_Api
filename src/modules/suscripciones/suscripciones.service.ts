import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { RolNombre } from '../roles/entities/rol.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { Consumo } from './entities/consumo.entity';
import { EstadoPago, Pago } from './entities/pago.entity';
import { Plan } from './entities/plan.entity';
import { EstadoSuscripcion, Suscripcion } from './entities/suscripcion.entity';

export type RecursoSuscripcion = 'busqueda' | 'agente';

export interface SuscripcionResumen {
  plan: string;
  planId: string;
  estado: EstadoSuscripcion;
  inicio: string;
  fin: string | null;
  busquedasFotoMes: number | null;
  busquedasFotoUsadas: number;
  mensajesAgenteMes: number | null;
  mensajesAgenteUsados: number;
}

const DIAS_DE_PLAN = 30;

const MENSAJE_CUPO: Record<RecursoSuscripcion, string> = {
  busqueda: 'Alcanzaste el cupo mensual de búsquedas por foto de tu plan.',
  agente: 'Alcanzaste el cupo mensual del agente de tu plan.',
};

@Injectable()
export class SuscripcionesService {
  constructor(
    @InjectRepository(Plan) private readonly planes: Repository<Plan>,
    @InjectRepository(Suscripcion)
    private readonly suscripciones: Repository<Suscripcion>,
    @InjectRepository(Consumo) private readonly consumos: Repository<Consumo>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async asignarGratis(manager: EntityManager, usuarioId: string) {
    const plan = await manager.findOneBy(Plan, {
      nombre: 'Gratis',
      activo: true,
    });
    if (!plan) {
      throw new InternalServerErrorException(
        'El plan Gratis no está configurado.',
      );
    }
    await manager.save(
      manager.create(Suscripcion, {
        usuarioId,
        planId: plan.id,
        estado: EstadoSuscripcion.ACTIVA,
        inicio: new Date(),
        fin: null,
      }),
    );
  }

  async resumen(usuarioId: string): Promise<SuscripcionResumen | null> {
    const activa = await this.suscripciones.findOne({
      where: { usuarioId, estado: EstadoSuscripcion.ACTIVA },
      relations: { plan: true },
    });
    if (activa?.fin && new Date(activa.fin).getTime() <= Date.now()) {
      activa.estado = EstadoSuscripcion.VENCIDA;
      await this.suscripciones.save(activa);
    }
    const vigente =
      activa ??
      (await this.suscripciones.findOne({
        where: { usuarioId },
        relations: { plan: true },
        order: { createdAt: 'DESC' },
      }));
    if (!vigente?.plan) return null;
    const uso = await this.usoDelMes(usuarioId);
    return this.resumenDe(vigente, uso);
  }

  async verificar(usuarioId: string, recurso: RecursoSuscripcion) {
    await this.dataSource.transaction((manager) =>
      this.exigirCupo(manager, usuarioId, recurso, false),
    );
  }

  async consumir(usuarioId: string, recurso: RecursoSuscripcion) {
    await this.dataSource.transaction((manager) =>
      this.exigirCupo(manager, usuarioId, recurso, true),
    );
  }

  listarPlanes() {
    return this.planes
      .find({ order: { nombre: 'ASC' } })
      .then((planes) => planes.map((plan) => this.planPublico(plan)));
  }

  async crearPlan(dto: CreatePlanDto) {
    const plan = this.planes.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      precioReferencial: dto.precioReferencial.toFixed(2),
      busquedasFotoMes: dto.busquedasFotoMes ?? null,
      mensajesAgenteMes: dto.mensajesAgenteMes ?? null,
      activo: dto.activo ?? true,
    });
    return this.planPublico(await this.guardarPlan(plan));
  }

  async actualizarPlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.planes.findOneBy({ id });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (dto.nombre !== undefined) plan.nombre = dto.nombre;
    if (dto.descripcion !== undefined) plan.descripcion = dto.descripcion;
    if (dto.precioReferencial !== undefined) {
      plan.precioReferencial = dto.precioReferencial.toFixed(2);
    }
    if (dto.busquedasFotoMes !== undefined) {
      plan.busquedasFotoMes = dto.busquedasFotoMes;
    }
    if (dto.mensajesAgenteMes !== undefined) {
      plan.mensajesAgenteMes = dto.mensajesAgenteMes;
    }
    if (dto.activo !== undefined) plan.activo = dto.activo;
    return this.planPublico(await this.guardarPlan(plan));
  }

  listarDisponibles() {
    return this.planes
      .find({ where: { activo: true }, order: { precioReferencial: 'ASC' } })
      .then((planes) => planes.map((plan) => this.planPublico(plan)));
  }

  async pagar(usuarioId: string, planId: string) {
    await this.exigirCiudadano(usuarioId);
    const plan = await this.planes.findOneBy({ id: planId });
    if (!plan?.activo) {
      throw new BadRequestException('Selecciona un plan activo.');
    }
    const monto = Number(plan.precioReferencial);
    if (!(monto > 0)) {
      throw new BadRequestException('Este plan no tiene un precio de pago.');
    }
    const inicio = new Date();
    const fin = new Date(inicio.getTime() + DIAS_DE_PLAN * 24 * 60 * 60 * 1000);
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Suscripcion,
        { usuarioId, estado: EstadoSuscripcion.ACTIVA },
        { estado: EstadoSuscripcion.CANCELADA },
      );
      const suscripcion = await manager.save(
        manager.create(Suscripcion, {
          usuarioId,
          planId: plan.id,
          estado: EstadoSuscripcion.ACTIVA,
          inicio,
          fin,
        }),
      );
      await manager.save(
        manager.create(Pago, {
          usuarioId,
          planId: plan.id,
          suscripcionId: suscripcion.id,
          monto: monto.toFixed(2),
          moneda: 'BOB',
          estado: EstadoPago.PAGADO,
        }),
      );
    });
    return {
      monto,
      moneda: 'BOB',
      plan: plan.nombre,
      vence: fin.toISOString(),
      suscripcion: await this.resumen(usuarioId),
    };
  }

  async deCiudadano(usuarioId: string) {
    await this.exigirCiudadano(usuarioId);
    return this.resumen(usuarioId);
  }

  private async exigirCupo(
    manager: EntityManager,
    usuarioId: string,
    recurso: RecursoSuscripcion,
    registrar: boolean,
  ) {
    const suscripcion = await manager.findOne(Suscripcion, {
      where: { usuarioId, estado: EstadoSuscripcion.ACTIVA },
      ...(registrar ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!suscripcion) {
      throw new ForbiddenException(
        'Tu cuenta no tiene una suscripción activa.',
      );
    }
    if (suscripcion.fin && new Date(suscripcion.fin).getTime() <= Date.now()) {
      suscripcion.estado = EstadoSuscripcion.VENCIDA;
      await manager.save(suscripcion);
      throw new ForbiddenException(
        'Tu suscripción venció. Elige un plan para renovarla.',
      );
    }
    const plan = await manager.findOneBy(Plan, { id: suscripcion.planId });
    if (!plan) {
      throw new ForbiddenException(
        'Tu cuenta no tiene una suscripción activa.',
      );
    }
    const limite =
      recurso === 'busqueda' ? plan.busquedasFotoMes : plan.mensajesAgenteMes;
    const periodo = periodoActual();
    let consumo = await manager.findOne(Consumo, {
      where: { usuarioId, periodo },
      ...(registrar ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!consumo && registrar) {
      consumo = await this.crearConsumo(manager, usuarioId, periodo);
    }
    const usado = Number(
      recurso === 'busqueda'
        ? (consumo?.busquedasFoto ?? 0)
        : (consumo?.mensajesAgente ?? 0),
    );
    if (limite !== null && usado >= Number(limite)) {
      throw new ForbiddenException(MENSAJE_CUPO[recurso]);
    }
    if (!registrar || !consumo) return;
    if (recurso === 'busqueda') consumo.busquedasFoto = usado + 1;
    else consumo.mensajesAgente = usado + 1;
    await manager.save(consumo);
  }

  private async crearConsumo(
    manager: EntityManager,
    usuarioId: string,
    periodo: string,
  ) {
    try {
      return await manager.save(
        manager.create(Consumo, {
          usuarioId,
          periodo,
          busquedasFoto: 0,
          mensajesAgente: 0,
        }),
      );
    } catch (error) {
      if (!esUnico(error)) throw error;
      const existente = await manager.findOne(Consumo, {
        where: { usuarioId, periodo },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existente) throw error;
      return existente;
    }
  }

  private async usoDelMes(usuarioId: string) {
    const consumo = await this.consumos.findOneBy({
      usuarioId,
      periodo: periodoActual(),
    });
    return {
      busquedasFotoUsadas: Number(consumo?.busquedasFoto ?? 0),
      mensajesAgenteUsados: Number(consumo?.mensajesAgente ?? 0),
    };
  }

  private async exigirCiudadano(usuarioId: string) {
    const usuario = await this.usuarios.findOne({
      where: { id: usuarioId },
      relations: { rol: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.rol.nombre !== String(RolNombre.CIUDADANO)) {
      throw new BadRequestException('Solo los ciudadanos tienen suscripción.');
    }
    return usuario;
  }

  private async guardarPlan(plan: Plan) {
    try {
      return await this.planes.save(plan);
    } catch (error) {
      if (esUnico(error)) {
        throw new ConflictException('Ya existe un plan con ese nombre.');
      }
      throw error;
    }
  }

  private planPublico(plan: Plan) {
    return {
      id: plan.id,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      precioReferencial: Number(plan.precioReferencial),
      busquedasFotoMes: plan.busquedasFotoMes,
      mensajesAgenteMes: plan.mensajesAgenteMes,
      activo: plan.activo,
    };
  }

  private resumenDe(
    suscripcion: Suscripcion,
    uso: { busquedasFotoUsadas: number; mensajesAgenteUsados: number },
  ): SuscripcionResumen {
    return {
      plan: suscripcion.plan.nombre,
      planId: suscripcion.planId,
      estado: suscripcion.estado,
      inicio: new Date(suscripcion.inicio).toISOString(),
      fin: suscripcion.fin ? new Date(suscripcion.fin).toISOString() : null,
      busquedasFotoMes: conteo(suscripcion.plan.busquedasFotoMes),
      busquedasFotoUsadas: uso.busquedasFotoUsadas,
      mensajesAgenteMes: conteo(suscripcion.plan.mensajesAgenteMes),
      mensajesAgenteUsados: uso.mensajesAgenteUsados,
    };
  }
}

function conteo(value: number | string | null) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function periodoActual(now = new Date()) {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}-01`;
}

function esUnico(error: unknown) {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}
