import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AlertasExtravioService } from './alertas-extravio.service';
import { AlertaExtravio } from './entities/alerta-extravio.entity';
import { EstadoAlerta } from './enums/estado-alerta.enum';
import { Mascota, SexoMascota } from '../mascotas/entities/mascota.entity';

describe('AlertasExtravioService', () => {
  const query = {
    innerJoinAndSelect: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    take: jest.fn(),
    skip: jest.fn(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };
  const repository = { createQueryBuilder: jest.fn() };
  const manager = {
    findOne: jest.fn(),
    existsBy: jest.fn(),
    create: jest.fn((_target: unknown, data: unknown) => data),
    save: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((cb: (em: EntityManager) => Promise<unknown>) =>
      cb(manager as unknown as EntityManager),
    ),
  };
  const service = new AlertasExtravioService(
    repository as unknown as Repository<AlertaExtravio>,
    dataSource as unknown as DataSource,
  );
  const dto = {
    mascotaId: 'pet',
    descripcion: 'Plaza',
    fechaExtravio: '2020-01-01T12:00:00Z',
    latitud: -17.78,
    longitud: -63.18,
  };
  let alerta: AlertaExtravio;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const name of [
      'innerJoinAndSelect',
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'take',
      'skip',
    ] as const)
      query[name].mockReturnValue(query);
    repository.createQueryBuilder.mockReturnValue(query);
    dataSource.transaction.mockImplementation((cb) =>
      cb(manager as unknown as EntityManager),
    );
    manager.findOne.mockReset();
    manager.existsBy.mockReset();
    manager.save.mockReset();
    alerta = {
      id: 'alert',
      mascotaId: 'pet',
      descripcion: null,
      fechaExtravio: new Date(dto.fechaExtravio),
      latitud: -17.78,
      longitud: -63.18,
      estado: EstadoAlerta.ACTIVA,
      fechaResolucion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      mascota: {
        id: 'pet',
        usuarioId: 'owner',
        nombre: 'Luna',
        especieId: 1,
        especie: { id: 1, nombre: 'Perro' },
        razaNombre: null,
        sexo: SexoMascota.HEMBRA,
        color: null,
        edadAproximadaMeses: 12,
        estado: true,
        fotos: [
          {
            id: 'photo',
            url: 'https://images.test/main.png',
            storageKey: 'private-key',
            proveedor: 'CLOUDINARY',
            esPrincipal: true,
          },
          {
            id: 'secondary',
            url: 'https://images.test/secondary.png',
            esPrincipal: false,
          },
        ],
      } as Mascota,
    };
    query.getOne.mockResolvedValue(alerta);
    query.getMany.mockResolvedValue([alerta]);
    manager.save.mockResolvedValue(alerta);
  });

  function ownedSequence() {
    manager.findOne
      .mockResolvedValueOnce({ id: 'alert', mascotaId: 'pet' })
      .mockResolvedValueOnce(alerta.mascota)
      .mockResolvedValueOnce(alerta);
  }

  it('crear comprueba mascota activa propia y asigna ACTIVA en una transacción', async () => {
    manager.findOne.mockResolvedValue(alerta.mascota);
    manager.existsBy.mockResolvedValue(false);
    await service.create('owner', dto);
    expect(manager.findOne).toHaveBeenCalledWith(Mascota, {
      where: { id: 'pet', usuarioId: 'owner', estado: true },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.create).toHaveBeenCalledWith(AlertaExtravio, {
      mascotaId: 'pet',
      descripcion: 'Plaza',
      fechaExtravio: new Date(dto.fechaExtravio),
      latitud: dto.latitud,
      longitud: dto.longitud,
      estado: EstadoAlerta.ACTIVA,
      fechaResolucion: null,
    });
  });

  it('rechaza mascota ajena/inactiva y duplicado antes de guardar', async () => {
    manager.findOne.mockResolvedValueOnce(null);
    await expect(service.create('stranger', dto)).rejects.toThrow(
      NotFoundException,
    );
    manager.findOne.mockResolvedValueOnce(alerta.mascota);
    manager.existsBy.mockResolvedValue(true);
    await expect(service.create('owner', dto)).rejects.toThrow(
      ConflictException,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('listado público filtra estado y mascota; mis alertas filtra propietario sin excluir historial', async () => {
    await service.findAll({ limit: 5, offset: 1 });
    expect(query.where).toHaveBeenCalledWith('alerta.estado = :estado', {
      estado: EstadoAlerta.ACTIVA,
    });
    expect(query.andWhere).toHaveBeenCalledWith('mascota.estado = true');
    expect(query.take).toHaveBeenCalledWith(5);
    expect(query.skip).toHaveBeenCalledWith(1);
    jest.clearAllMocks();
    await service.findMine('owner');
    expect(query.where).toHaveBeenCalledWith('mascota.usuarioId = :usuarioId', {
      usuarioId: 'owner',
    });
    expect(query.andWhere).not.toHaveBeenCalled();
  });

  it('selecciona campos explícitos y solo la foto principal, sin datos privados', async () => {
    const result = await service.findOne('alert');
    expect(result.mascota.fotoPrincipal).toEqual({
      id: 'photo',
      url: 'https://images.test/main.png',
    });
    expect(result.mascota).not.toHaveProperty('usuarioId');
    expect(JSON.stringify(result)).not.toContain('private-key');
    expect(JSON.stringify(result)).not.toContain('secondary.png');
    expect(result.latitud).toBe(-17.78);
    alerta.mascota.fotos = [];
    expect((await service.findOne('alert')).mascota.fotoPrincipal).toBeNull();
  });

  it.each([EstadoAlerta.RESUELTA, EstadoAlerta.CANCELADA, EstadoAlerta.OCULTA])(
    'detalle %s solo es visible al dueño',
    async (estado) => {
      alerta.estado = estado;
      await expect(service.findOne('alert')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('alert', 'stranger')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('alert', 'owner')).resolves.toMatchObject({
        estado,
      });
    },
  );

  it('alerta activa de mascota inactiva es privada', async () => {
    alerta.mascota.estado = false;
    await expect(service.findOne('alert')).rejects.toThrow(NotFoundException);
    await expect(service.findOne('alert', 'owner')).resolves.toMatchObject({
      estado: EstadoAlerta.ACTIVA,
    });
  });

  it('rechaza modificación ajena y no guarda datos', async () => {
    manager.findOne
      .mockResolvedValueOnce({ id: 'alert', mascotaId: 'pet' })
      .mockResolvedValueOnce(null);
    await expect(
      service.update('stranger', 'alert', { descripcion: 'Ajena' }),
    ).rejects.toThrow(NotFoundException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('actualiza campos permitidos y conserva valores cero', async () => {
    ownedSequence();
    await service.update('owner', 'alert', {
      descripcion: null,
      latitud: 0,
      longitud: 0,
    });
    expect(alerta).toMatchObject({
      mascotaId: 'pet',
      descripcion: null,
      latitud: 0,
      longitud: 0,
      estado: EstadoAlerta.ACTIVA,
    });
  });

  it('resolver registra fecha y cancelar conserva fechaResolucion nula', async () => {
    ownedSequence();
    await service.resolve('owner', 'alert');
    expect(alerta.estado).toBe(EstadoAlerta.RESUELTA);
    expect(alerta.fechaResolucion).toBeInstanceOf(Date);
    alerta.estado = EstadoAlerta.ACTIVA;
    alerta.fechaResolucion = null;
    ownedSequence();
    await service.cancel('owner', 'alert');
    expect(alerta.estado).toBe(EstadoAlerta.CANCELADA);
    expect(alerta.fechaResolucion).toBeNull();
  });

  it.each([EstadoAlerta.RESUELTA, EstadoAlerta.CANCELADA, EstadoAlerta.OCULTA])(
    'impide editar, resolver o cancelar una alerta %s',
    async (estado) => {
      alerta.estado = estado;
      ownedSequence();
      await expect(service.update('owner', 'alert', {})).rejects.toThrow(
        ConflictException,
      );
      ownedSequence();
      await expect(service.resolve('owner', 'alert')).rejects.toThrow(
        ConflictException,
      );
      ownedSequence();
      await expect(service.cancel('owner', 'alert')).rejects.toThrow(
        ConflictException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    },
  );

  it('valida fechas también dentro del servicio', async () => {
    await expect(
      service.create('owner', {
        ...dto,
        fechaExtravio: '2999-01-01T00:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update('owner', 'alert', { fechaExtravio: 'invalid' }),
    ).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
