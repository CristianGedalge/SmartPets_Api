import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('delega register a AuthService', async () => {
    const dto = {
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@ejemplo.com',
      password: 'MiPassword123',
    };
    const expected = { access_token: 'jwt', usuario: { id: 'uuid' } };
    mockAuthService.register.mockResolvedValue(expected);

    await expect(controller.register(dto)).resolves.toEqual(expected);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('delega login a AuthService', async () => {
    const dto = { email: 'ana@ejemplo.com', password: 'MiPassword123' };
    const expected = { access_token: 'jwt', usuario: { id: 'uuid' } };
    mockAuthService.login.mockResolvedValue(expected);

    await expect(controller.login(dto)).resolves.toEqual(expected);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
  });

  it('delega getProfile usando userId extraído con @GetUser', async () => {
    const expected = { id: 'uuid', email: 'ana@ejemplo.com' };
    mockAuthService.getProfile.mockResolvedValue(expected);

    await expect(controller.getProfile('uuid')).resolves.toEqual(expected);
    expect(mockAuthService.getProfile).toHaveBeenCalledWith('uuid');
  });

  it('delega updateProfile usando userId y UpdateProfileDto', async () => {
    const dto = { nombre: 'Ana María' };
    const expected = { id: 'uuid', nombre: 'Ana María' };
    mockAuthService.updateProfile.mockResolvedValue(expected);

    await expect(controller.updateProfile('uuid', dto)).resolves.toEqual(
      expected,
    );
    expect(mockAuthService.updateProfile).toHaveBeenCalledWith('uuid', dto);
  });
});
