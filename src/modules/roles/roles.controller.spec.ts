import { Test, TestingModule } from '@nestjs/testing';
import { RolNombre } from './entities/rol.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;

  const mockRolesService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: mockRolesService }],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('delega findAll a RolesService', async () => {
    const expected = [{ id: 1, nombre: RolNombre.ADMIN }];
    mockRolesService.findAll.mockResolvedValue(expected);

    await expect(controller.findAll()).resolves.toEqual(expected);
    expect(mockRolesService.findAll).toHaveBeenCalled();
  });
});
