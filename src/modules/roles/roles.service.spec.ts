import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Rol, RolNombre } from './entities/rol.entity';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;

  const mockRolRepo = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Rol), useValue: mockRolRepo },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('CA-01: findAll retorna la lista de roles ordenada por id', async () => {
    const expected = [
      { id: 1, nombre: RolNombre.ADMIN },
      { id: 2, nombre: RolNombre.CIUDADANO },
      { id: 3, nombre: RolNombre.ENCARGADO },
    ];
    mockRolRepo.find.mockResolvedValue(expected);

    await expect(service.findAll()).resolves.toEqual(expected);
    expect(mockRolRepo.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
  });
});
