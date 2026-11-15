import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

describe('UsuariosController', () => {
  let controller: UsuariosController;

  const mockUsuariosService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockUsuariosService }],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('delega findAll a UsuariosService con PaginationDto', async () => {
    const pagination = { limit: 10, offset: 0 };
    const expected = [{ id: 'uuid' }];
    mockUsuariosService.findAll.mockResolvedValue(expected);

    await expect(controller.findAll(pagination)).resolves.toEqual(expected);
    expect(mockUsuariosService.findAll).toHaveBeenCalledWith(pagination);
  });

  it('delega findOne a UsuariosService con UUID string', async () => {
    const expected = { id: 'uuid' };
    mockUsuariosService.findOne.mockResolvedValue(expected);

    await expect(controller.findOne('uuid')).resolves.toEqual(expected);
    expect(mockUsuariosService.findOne).toHaveBeenCalledWith('uuid');
  });

  it('delega update a UsuariosService con UUID string y DTO', async () => {
    const dto = { nombre: 'Nuevo' };
    const expected = { id: 'uuid', nombre: 'Nuevo' };
    mockUsuariosService.update.mockResolvedValue(expected);

    await expect(controller.update('uuid', dto)).resolves.toEqual(expected);
    expect(mockUsuariosService.update).toHaveBeenCalledWith('uuid', dto);
  });

  it('delega remove (baja lógica) a UsuariosService con UUID string', async () => {
    const expected = { id: 'uuid', estado: false };
    mockUsuariosService.remove.mockResolvedValue(expected);

    await expect(controller.remove('uuid')).resolves.toEqual(expected);
    expect(mockUsuariosService.remove).toHaveBeenCalledWith('uuid');
  });
});
