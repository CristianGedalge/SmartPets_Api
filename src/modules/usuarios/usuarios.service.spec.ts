import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolNombre } from '../roles/entities/rol.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;

  const mockUsuarioRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    preload: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  describe('findAll & findOne', () => {
    it('CA-01: findAll retorna la lista de usuarios sin passwordHash', async () => {
      const now = new Date();
      mockUsuarioRepo.find.mockResolvedValue([
        {
          id: 'u-1',
          rolId: 2,
          nombre: 'Ana',
          apellido: 'Pérez',
          telefono: null,
          fotoUrl: null,
          email: 'ana@ejemplo.com',
          passwordHash: 'secret',
          estado: true,
          createdAt: now,
          updatedAt: now,
          rol: { id: 2, nombre: RolNombre.CIUDADANO },
          establecimiento: undefined,
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[0].rol).toBe(RolNombre.CIUDADANO);
    });

    it('CA-02: findOne lanza NotFoundException (404) si no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('CA-03: actualiza datos del usuario con preload y retorna el objeto sin passwordHash', async () => {
      const now = new Date();
      const preloaded = {
        id: 'u-1',
        rolId: 2,
        nombre: 'Ana María',
        apellido: 'Pérez',
        telefono: '70011223',
        fotoUrl: null,
        email: 'ana@ejemplo.com',
        passwordHash: 'secret',
        estado: true,
        createdAt: now,
        updatedAt: now,
      };
      mockUsuarioRepo.preload.mockResolvedValue(preloaded);
      mockUsuarioRepo.save.mockResolvedValue(preloaded);

      const result = await service.update('u-1', {
        nombre: 'Ana María',
        telefono: '70011223',
      });

      expect(mockUsuarioRepo.preload).toHaveBeenCalledWith({
        id: 'u-1',
        nombre: 'Ana María',
        telefono: '70011223',
      });
      expect(result.nombre).toBe('Ana María');
      expect(result.telefono).toBe('70011223');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('remove', () => {
    it('CA-04: realiza baja lógica con preload cambiando estado a false', async () => {
      const preloaded = {
        id: 'u-1',
        rolId: 2,
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@ejemplo.com',
        passwordHash: 'secret',
        estado: false,
      };
      mockUsuarioRepo.preload.mockResolvedValue(preloaded);
      mockUsuarioRepo.save.mockResolvedValue(preloaded);

      const result = await service.remove('u-1');

      expect(mockUsuarioRepo.preload).toHaveBeenCalledWith({
        id: 'u-1',
        estado: false,
      });
      expect(result.estado).toBe(false);
    });
  });
});
