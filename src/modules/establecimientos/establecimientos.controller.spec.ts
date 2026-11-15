import { Test, TestingModule } from '@nestjs/testing';
import { EstablecimientosController } from './establecimientos.controller';
import { EstablecimientosService } from './establecimientos.service';

describe('EstablecimientosController', () => {
  let controller: EstablecimientosController;

  const mockEstablecimientosService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstablecimientosController],
      providers: [
        {
          provide: EstablecimientosService,
          useValue: mockEstablecimientosService,
        },
      ],
    }).compile();

    controller = module.get<EstablecimientosController>(
      EstablecimientosController,
    );
  });

  it('delega findAll a EstablecimientosService con PaginationDto', async () => {
    const pagination = { limit: 10, offset: 0 };
    const expected = [{ id: 'est-uuid' }];
    mockEstablecimientosService.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(pagination)).resolves.toEqual(expected);
    expect(mockEstablecimientosService.findAll).toHaveBeenCalledWith(
      pagination,
    );
  });

  it('delega findOne a EstablecimientosService con UUID string', async () => {
    const expected = { id: 'est-uuid' };
    mockEstablecimientosService.findOne.mockResolvedValue(expected);

    await expect(controller.findOne('est-uuid')).resolves.toEqual(expected);
    expect(mockEstablecimientosService.findOne).toHaveBeenCalledWith(
      'est-uuid',
    );
  });

  it('delega update a EstablecimientosService con UUID string y DTO', async () => {
    const dto = { nombre: 'Nuevo Nombre' };
    const expected = { id: 'est-uuid', nombre: 'Nuevo Nombre' };
    mockEstablecimientosService.update.mockResolvedValue(expected);

    await expect(controller.update('est-uuid', dto)).resolves.toEqual(expected);
    expect(mockEstablecimientosService.update).toHaveBeenCalledWith(
      'est-uuid',
      dto,
    );
  });

  it('delega remove (baja lógica) a EstablecimientosService con UUID string', async () => {
    const expected = { id: 'est-uuid', estado: false };
    mockEstablecimientosService.remove.mockResolvedValue(expected);

    await expect(controller.remove('est-uuid')).resolves.toEqual(expected);
    expect(mockEstablecimientosService.remove).toHaveBeenCalledWith('est-uuid');
  });
});
