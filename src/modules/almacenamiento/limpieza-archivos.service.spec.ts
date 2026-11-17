import { DataSource, EntityManager } from 'typeorm';
import { CloudinaryService } from './cloudinary.service';
import { LimpiezaArchivosService } from './limpieza-archivos.service';
import { ArchivoPendiente } from './entities/archivo-pendiente.entity';

describe('LimpiezaArchivosService', () => {
  const task = {
    id: 'job',
    storageKey: 'pet/file',
    disponibleDesde: new Date(),
  };
  const manager = {
    findOne: jest.fn(),
    existsBy: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  };
  const cloud = { destroy: jest.fn() };
  const ds = {
    transaction: jest.fn((cb: (em: EntityManager) => unknown) =>
      cb(manager as unknown as EntityManager),
    ),
  };
  const service = new LimpiezaArchivosService(
    ds as unknown as DataSource,
    cloud as unknown as CloudinaryService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    ds.transaction.mockImplementation((cb) =>
      cb(manager as unknown as EntityManager),
    );
    manager.findOne.mockResolvedValue({ ...task });
    manager.existsBy.mockResolvedValue(false);
  });
  it('elimina la tarea solo después del borrado idempotente remoto', async () => {
    expect(await service.processOne('job')).toBe(true);
    expect(cloud.destroy).toHaveBeenCalledWith('pet/file');
    expect(manager.delete).toHaveBeenCalledWith(ArchivoPendiente, {
      id: 'job',
    });
  });
  it('conserva y pospone la tarea si Cloudinary falla', async () => {
    cloud.destroy.mockRejectedValue(new Error('offline'));
    expect(await service.processOne('job')).toBe(false);
    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledTimes(1);
    const calls = manager.save.mock.calls as unknown[][];
    const savedTask = calls[0][1] as ArchivoPendiente;
    expect(savedTask.id).toBe('job');
    expect(savedTask.disponibleDesde.getTime()).toBeGreaterThan(Date.now());
  });
  it('jamás destruye un archivo que aún tiene referencia', async () => {
    manager.existsBy.mockResolvedValue(true);
    expect(await service.processOne()).toBe(true);
    expect(cloud.destroy).not.toHaveBeenCalled();
  });
  it('protege archivos referenciados por avistamientos aunque no sean de mascotas', async () => {
    manager.existsBy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await service.processOne()).toBe(true);
    expect(cloud.destroy).not.toHaveBeenCalled();
    expect(manager.existsBy).toHaveBeenCalledTimes(2);
  });
  it('un fallo de commit conserva la posibilidad de reintentar destroy', async () => {
    manager.delete.mockRejectedValue(new Error('database offline'));
    expect(await service.processOne()).toBe(false);
    expect(cloud.destroy).toHaveBeenCalled();
  });
  it('libera el intervalo al cerrar el módulo', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(service, 'processPending').mockResolvedValue();
    service.onModuleInit();
    service.onModuleDestroy();
    jest.advanceTimersByTime(120000);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    jest.useRealTimers();
  });
});
