import { ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Consumo } from './entities/consumo.entity';
import { Plan } from './entities/plan.entity';
import { EstadoSuscripcion, Suscripcion } from './entities/suscripcion.entity';
import { SuscripcionesService } from './suscripciones.service';

describe('SuscripcionesService', () => {
  const plan: Plan = {
    id: 'plan-1',
    nombre: 'Gratis',
    descripcion: null,
    precioReferencial: '0.00',
    busquedasFotoMes: 1,
    mensajesAgenteMes: 2,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const suscripcion = {
    id: 'sub-1',
    usuarioId: 'citizen-1',
    planId: plan.id,
    estado: EstadoSuscripcion.ACTIVA,
    inicio: new Date('2026-11-01T00:00:00.000Z'),
    fin: null,
    asignadaPor: null,
    plan,
  } as Suscripcion;

  function serviceWith(manager: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  }) {
    const dataSource = {
      transaction: jest.fn((work: (current: typeof manager) => unknown) =>
        work(manager),
      ),
    } as unknown as DataSource;
    return new SuscripcionesService(
      {} as Repository<Plan>,
      {} as Repository<Suscripcion>,
      {} as Repository<Consumo>,
      {} as Repository<Usuario>,
      dataSource,
    );
  }

  it('suma una búsqueda cuando todavía hay cupo', async () => {
    const consumo = {
      usuarioId: 'citizen-1',
      periodo: '2026-11-01',
      busquedasFoto: 0,
      mensajesAgente: 0,
    };
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(suscripcion)
        .mockResolvedValueOnce(consumo),
      findOneBy: jest.fn().mockResolvedValue(plan),
      create: jest.fn(),
      save: jest.fn(async (value: unknown) => value),
    };
    await serviceWith(manager).consumir('citizen-1', 'busqueda');
    expect(consumo.busquedasFoto).toBe(1);
    expect(manager.save).toHaveBeenCalledWith(consumo);
  });

  it('rechaza la búsqueda cuando el cupo mensual se agotó', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(suscripcion)
        .mockResolvedValueOnce({ busquedasFoto: 1, mensajesAgente: 0 }),
      findOneBy: jest.fn().mockResolvedValue(plan),
      create: jest.fn(),
      save: jest.fn(),
    };
    await expect(
      serviceWith(manager).consumir('citizen-1', 'busqueda'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('marca vencida una suscripción cuya fecha ya pasó', async () => {
    const vencida = {
      ...suscripcion,
      fin: new Date('2020-01-01T00:00:00.000Z'),
    };
    const manager = {
      findOne: jest.fn().mockResolvedValue(vencida),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(async (value: Suscripcion) => value),
    };
    await expect(
      serviceWith(manager).verificar('citizen-1', 'agente'),
    ).rejects.toThrow('Tu suscripción venció');
    expect(vencida.estado).toBe(EstadoSuscripcion.VENCIDA);
  });
});
