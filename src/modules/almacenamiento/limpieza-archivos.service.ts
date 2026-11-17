import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, LessThanOrEqual } from 'typeorm';
import { ArchivoPendiente } from './entities/archivo-pendiente.entity';
import { FotoAvistamiento } from '../avistamientos/entities/foto-avistamiento.entity';
import { FotoMascota } from '../mascotas/entities/foto-mascota.entity';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class LimpiezaArchivosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LimpiezaArchivosService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processPending();
    }, 60000);
    this.timer.unref();
    void this.processPending();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processOne(id?: string): Promise<boolean> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const task = await manager.findOne(ArchivoPendiente, {
          where: {
            ...(id ? { id } : {}),
            disponibleDesde: LessThanOrEqual(new Date()),
          },
          order: { disponibleDesde: 'ASC' },
          lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
        });
        if (!task) return false;
        // A reference always wins over an expired cleanup intent.
        const referenced =
          (await manager.existsBy(FotoMascota, {
            storageKey: task.storageKey,
          })) ||
          (await manager.existsBy(FotoAvistamiento, {
            storageKey: task.storageKey,
          }));
        if (!referenced) {
          try {
            await this.cloudinary.destroy(task.storageKey);
          } catch {
            task.disponibleDesde = new Date(Date.now() + 5 * 60000);
            await manager.save(ArchivoPendiente, task);
            this.logger.warn(
              'Eliminación de archivo pendiente; se reintentará en cinco minutos.',
            );
            return false;
          }
        }
        await manager.delete(ArchivoPendiente, { id: task.id });
        return true;
      });
    } catch {
      this.logger.warn(
        'No se pudo procesar la cola de archivos; se reintentará automáticamente.',
      );
      return false;
    }
  }

  async processPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (let i = 0; i < 10; i++) {
        if (!(await this.processOne())) break;
      }
    } finally {
      this.running = false;
    }
  }
}
