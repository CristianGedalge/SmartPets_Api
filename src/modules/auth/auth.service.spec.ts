import { LEGAL_VERSION } from './legal/legal-version';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { scryptSync } from 'crypto';
import { DataSource } from 'typeorm';
import {
  Establecimiento,
  TipoEstablecimiento,
} from '../establecimientos/entities/establecimiento.entity';
import { Rol, RolNombre } from '../roles/entities/rol.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { AuthService } from './auth.service';
import { AuthEmailService } from './auth-email.service';
import { VerificacionEmail } from './entities/verificacion-email.entity';
import { AceptacionLegal } from './entities/aceptacion-legal.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsuarioRepo = {
    findOne: jest.fn(),
  };

  const mockRolRepo = {
    findOne: jest.fn(),
  };

  const mockVerificacionRepo = {
    findOne: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockAceptacionRepo = { findOne: jest.fn() };

  const mockManager = {
    create: jest.fn(),
    preload: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    insert: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (manager: typeof mockManager) => unknown) =>
      cb(mockManager),
    ),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockSuscripciones = {
    asignarGratis: jest.fn(),
    resumen: jest.fn().mockResolvedValue(null),
  };

  const mockAuthEmail = {
    sendVerification: jest.fn().mockResolvedValue(true),
    sendWelcome: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
        { provide: getRepositoryToken(Rol), useValue: mockRolRepo },
        {
          provide: getRepositoryToken(VerificacionEmail),
          useValue: mockVerificacionRepo,
        },
        {
          provide: getRepositoryToken(AceptacionLegal),
          useValue: mockAceptacionRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: JwtService, useValue: mockJwtService },
        { provide: SuscripcionesService, useValue: mockSuscripciones },
        { provide: AuthEmailService, useValue: mockAuthEmail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('CA-01a: registra usuario CIUDADANO cuando no se envía establecimiento y retorna JWT sin passwordHash', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      mockRolRepo.findOne.mockResolvedValue({
        id: 2,
        nombre: RolNombre.CIUDADANO,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');

      const savedUsuario = {
        id: 'user-uuid',
        rolId: 2,
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: '70012345',
        fotoUrl: null,
        email: 'ana@ejemplo.com',
        passwordHash: 'hashed_pw',
        estado: true,
      };

      mockManager.create.mockReturnValueOnce(savedUsuario);
      mockManager.save.mockResolvedValueOnce(savedUsuario);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');
      mockVerificacionRepo.findOne.mockResolvedValue(null);

      const result = await service.register({
        aceptaTerminos: true,
        aceptaPrivacidad: true,
        versionLegal: LEGAL_VERSION,
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@ejemplo.com',
        password: 'MiPassword123',
        telefono: '70012345',
      });

      expect(mockUsuarioRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'ana@ejemplo.com' },
      });
      expect(mockRolRepo.findOne).toHaveBeenCalledWith({
        where: { nombre: RolNombre.CIUDADANO },
      });
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        requiereVerificacion: true,
        email: 'ana@ejemplo.com',
        emailEnmascarado: 'an*@ejemplo.com',
        correoEnviado: true,
      });
      expect(result).not.toHaveProperty('access_token');
      expect(mockAuthEmail.sendVerification).toHaveBeenCalledTimes(1);
      expect(mockSuscripciones.asignarGratis).toHaveBeenCalledWith(
        mockManager,
        savedUsuario.id,
      );
    });

    it('CA-01b: registra usuario ENCARGADO + establecimiento en transacción cuando se envía establecimiento', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);
      mockRolRepo.findOne.mockResolvedValue({
        id: 3,
        nombre: RolNombre.ENCARGADO,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');

      const savedUsuario = {
        id: 'enc-uuid',
        rolId: 3,
        nombre: 'Carlos',
        apellido: 'Gómez',
        telefono: '71122334',
        fotoUrl: null,
        email: 'carlos@vet.com',
        passwordHash: 'hashed_pw',
        estado: true,
      };

      const savedEstablecimiento = {
        id: 'est-uuid',
        usuarioId: 'enc-uuid',
        nombre: 'Veterinaria San Roque',
        tipo: TipoEstablecimiento.VETERINARIA,
        descripcion: 'Atención integral',
        direccion: 'Av. Bush #450',
        latitud: -17.783327,
        longitud: -63.18214,
        telefono: '33445566',
        horarioAtencion: 'Lun-Sab 08:00-20:00',
        estado: true,
      };

      mockManager.create
        .mockReturnValueOnce(savedUsuario)
        .mockReturnValueOnce(savedEstablecimiento);
      mockManager.save
        .mockResolvedValueOnce(savedUsuario)
        .mockResolvedValueOnce(savedEstablecimiento);
      mockJwtService.signAsync.mockResolvedValue('jwt-token-enc');

      const result = await service.register({
        aceptaTerminos: true,
        aceptaPrivacidad: true,
        versionLegal: LEGAL_VERSION,
        nombre: 'Carlos',
        apellido: 'Gómez',
        email: 'carlos@vet.com',
        password: 'MiPassword123',
        telefono: '71122334',
        establecimiento: {
          nombre: 'Veterinaria San Roque',
          tipo: TipoEstablecimiento.VETERINARIA,
          descripcion: 'Atención integral',
          direccion: 'Av. Bush #450',
          latitud: -17.783327,
          longitud: -63.18214,
          telefono: '33445566',
          horarioAtencion: 'Lun-Sab 08:00-20:00',
        },
      });

      expect(mockRolRepo.findOne).toHaveBeenCalledWith({
        where: { nombre: RolNombre.ENCARGADO },
      });
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        access_token: 'jwt-token-enc',
        usuario: {
          id: 'enc-uuid',
          rolId: 3,
          nombre: 'Carlos',
          apellido: 'Gómez',
          telefono: '71122334',
          fotoUrl: null,
          email: 'carlos@vet.com',
          rol: RolNombre.ENCARGADO,
          estado: true,
          establecimiento: savedEstablecimiento,
          suscripcion: null,
        },
      });
      expect(mockSuscripciones.asignarGratis).not.toHaveBeenCalled();
    });

    it('CA-02: lanza ConflictException (409) si el email ya existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        id: 'existing-id',
        email: 'ana@ejemplo.com',
      });

      await expect(
        service.register({
          aceptaTerminos: true,
          aceptaPrivacidad: true,
          versionLegal: LEGAL_VERSION,
          nombre: 'Ana',
          apellido: 'Pérez',
          email: 'ana@ejemplo.com',
          password: 'MiPassword123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('CA-04: retorna access_token y usuario con credenciales válidas y cuenta activa', async () => {
      const usuario = {
        id: 'user-uuid',
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: null,
        fotoUrl: null,
        email: 'ana@ejemplo.com',
        passwordHash: 'hashed_pw',
        estado: true,
        rol: { id: 2, nombre: RolNombre.CIUDADANO },
        establecimiento: undefined as Establecimiento | undefined,
      };
      mockUsuarioRepo.findOne.mockResolvedValue(usuario);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login({
        email: 'ana@ejemplo.com',
        password: 'MiPassword123',
      });

      expect(result).toMatchObject({
        access_token: 'jwt-token',
        usuario: {
          email: 'ana@ejemplo.com',
          rol: RolNombre.CIUDADANO,
          establecimiento: null,
        },
      });
    });

    it('CA-05: lanza UnauthorizedException (401) si el usuario no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'no@existe.com', password: 'MiPassword123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('CA-05: lanza UnauthorizedException (401) si la cuenta está desactivada (estado = false)', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        id: 'user-uuid',
        email: 'ana@ejemplo.com',
        passwordHash: 'hashed_pw',
        estado: false,
        rol: { id: 2, nombre: RolNombre.CIUDADANO },
      });

      await expect(
        service.login({ email: 'ana@ejemplo.com', password: 'MiPassword123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('CA-05: lanza UnauthorizedException (401) si la contraseña no coincide', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        id: 'user-uuid',
        email: 'ana@ejemplo.com',
        passwordHash: 'hashed_pw',
        estado: true,
        rol: { id: 2, nombre: RolNombre.CIUDADANO },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'ana@ejemplo.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('verifica un código vigente, elimina el desafío y crea la sesión', async () => {
      const salt = '0123456789abcdef0123456789abcdef';
      const usuario = {
        id: 'user-uuid',
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@ejemplo.com',
        passwordHash: 'hashed_pw',
        estado: true,
        emailVerificado: false,
        rol: { id: 2, nombre: RolNombre.CIUDADANO },
        establecimiento: undefined,
      };
      mockUsuarioRepo.findOne.mockResolvedValue(usuario);
      mockVerificacionRepo.findOne.mockResolvedValue({
        usuarioId: usuario.id,
        salt,
        codigoHash: scryptSync('123456', salt, 64).toString('hex'),
        expiraEn: new Date(Date.now() + 60_000),
        enviadoEn: new Date(),
        intentos: 0,
      });
      mockAceptacionRepo.findOne.mockResolvedValue({
        versionTerminos: LEGAL_VERSION,
      });
      mockJwtService.signAsync.mockResolvedValue('jwt-verificado');

      const result = await service.verifyEmail({
        email: usuario.email,
        codigo: '123456',
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        Usuario,
        { id: usuario.id },
        { emailVerificado: true },
      );
      expect(mockManager.delete).toHaveBeenCalledWith(VerificacionEmail, {
        usuarioId: usuario.id,
      });
      expect(mockAuthEmail.sendWelcome).toHaveBeenCalledWith(
        usuario.email,
        usuario.nombre,
        LEGAL_VERSION,
      );
      expect(result.access_token).toBe('jwt-verificado');
    });
  });

  describe('getProfile & updateProfile', () => {
    it('CA-06: retorna perfil público si el usuario existe y está activo', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        id: 'user-uuid',
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: null,
        fotoUrl: null,
        email: 'ana@ejemplo.com',
        estado: true,
        rol: { id: 2, nombre: RolNombre.CIUDADANO },
        establecimiento: undefined,
      });

      const result = await service.getProfile('user-uuid');

      expect(result).toEqual({
        id: 'user-uuid',
        nombre: 'Ana',
        apellido: 'Pérez',
        telefono: null,
        fotoUrl: null,
        email: 'ana@ejemplo.com',
        rol: RolNombre.CIUDADANO,
        estado: true,
        establecimiento: null,
        suscripcion: null,
      });
    });

    it('CA-06: lanza UnauthorizedException (401) si el usuario está inactivo o no existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('missing-uuid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('CA-07: updateProfile actualiza el perfil propio y retorna los datos actualizados', async () => {
      mockManager.preload.mockResolvedValueOnce({
        id: 'user-uuid',
        nombre: 'Ana María',
        estado: true,
      });
      mockManager.save.mockResolvedValueOnce({});
      mockUsuarioRepo.findOne.mockResolvedValueOnce({
        id: 'user-uuid',
        nombre: 'Ana María',
        apellido: 'Pérez',
        telefono: '70099999',
        fotoUrl: null,
        email: 'ana@ejemplo.com',
        estado: true,
        rol: { id: 2, nombre: RolNombre.CIUDADANO },
        establecimiento: undefined,
      });

      const result = await service.updateProfile('user-uuid', {
        nombre: 'Ana María',
        telefono: '70099999',
      });

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result.nombre).toBe('Ana María');
      expect(result.telefono).toBe('70099999');
    });
  });
});
