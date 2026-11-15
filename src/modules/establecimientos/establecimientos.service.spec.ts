import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolNombre } from '../roles/entities/rol.entity';
import {
  Establecimiento,
  TipoEstablecimiento,
} from './entities/establecimiento.entity';
import { EstablecimientosService } from './establecimientos.service';

describe('EstablecimientosService', () => {
  let service: EstablecimientosService;

  const mockEstablecimientoRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    preload: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablecimientosService,
        {
          provide: getRepositoryToken(Establecimiento),
          useValue: mockEstablecimientoRepo,
        },
      ],
    }).compile();

    service = module.get<EstablecimientosService>(EstablecimientosService);
  });

  describe('findAll & findOne', () => {
    it('CA-01: findAll retorna la lista de establecimientos con usuario público', async () => {
      const now = new Date();
      mockEstablecimientoRepo.find.mockResolvedValue([
        {
          id: 'est-1',
          usuarioId: 'enc-1',
          nombre: 'Refugio Esperanza',
          tipo: TipoEstablecimiento.REFUGIO,
          descripcion: null,
          direccion: 'Calle 1 #10',
          latitud: null,
          longitud: null,
          telefono: '70012345',
          horarioAtencion: null,
          estado: true,
          createdAt: now,
          updatedAt: now,
          usuario: {
            id: 'enc-1',
            nombre: 'Carlos',
            apellido: 'Gómez',
            telefono: '71122334',
            fotoUrl: null,
            email: 'carlos@refugio.com',
            passwordHash: 'secret',
            estado: true,
            rol: { id: 3, nombre: RolNombre.ENCARGADO },
          },
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Refugio Esperanza');
      expect(result[0].usuario).not.toHaveProperty('passwordHash');
    });

    it('CA-02: findOne lanza NotFoundException (404) si no existe', async () => {
      mockEstablecimientoRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('CA-03: actualiza campos del establecimiento con preload y retorna el objeto actualizado', async () => {
      const preloaded = {
        id: 'est-1',
        usuarioId: 'enc-1',
        nombre: 'Refugio Esperanza Norte',
        tipo: TipoEstablecimiento.REFUGIO,
        direccion: 'Calle 1 #10',
        telefono: '77788899',
        estado: true,
      };
      mockEstablecimientoRepo.preload.mockResolvedValue(preloaded);
      mockEstablecimientoRepo.save.mockResolvedValue(preloaded);

      const result = await service.update('est-1', {
        nombre: 'Refugio Esperanza Norte',
        telefono: '77788899',
      });

      expect(mockEstablecimientoRepo.preload).toHaveBeenCalledWith({
        id: 'est-1',
        nombre: 'Refugio Esperanza Norte',
        telefono: '77788899',
      });
      expect(result.nombre).toBe('Refugio Esperanza Norte');
      expect(result.telefono).toBe('77788899');
    });
  });

  describe('remove', () => {
    it('CA-04: realiza baja lógica con preload cambiando estado a false', async () => {
      const preloaded = {
        id: 'est-1',
        usuarioId: 'enc-1',
        nombre: 'Refugio Esperanza',
        estado: false,
      };
      mockEstablecimientoRepo.preload.mockResolvedValue(preloaded);
      mockEstablecimientoRepo.save.mockResolvedValue(preloaded);

      const result = await service.remove('est-1');

      expect(mockEstablecimientoRepo.preload).toHaveBeenCalledWith({
        id: 'est-1',
        estado: false,
      });
      expect(result.estado).toBe(false);
    });
  });
});
