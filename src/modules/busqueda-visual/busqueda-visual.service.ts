import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import {
  validatePhotos,
  type ImageUpload,
} from '../almacenamiento/image-upload';
import { Avistamiento } from '../avistamientos/entities/avistamiento.entity';
import { FotoAvistamiento } from '../avistamientos/entities/foto-avistamiento.entity';
import { Especie } from '../especies/entities/especie.entity';
import { BuscarAvistamientosDto } from './dto/buscar-avistamientos.dto';
import { AvistamientoEmbedding } from './entities/avistamiento-embedding.entity';
import { SightingPhotoClient } from './sighting-photo.client';
import {
  normalizeVector,
  VISUAL_MODEL,
  VisualModelClient,
} from './visual-model.client';
import { hasSufficientSimilarity, similarityScore } from './ranking';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { iaConfig } from '../../config';

const NOTICE =
  'Posibles coincidencias visuales, no identidad confirmada. Solo se muestran animales con parecido suficiente; revisa las fotos, la fecha y la ubicación.';

@Injectable()
export class BusquedaVisualService {
  private readonly activeUsers = new Set<string>();
  constructor(
    @InjectRepository(FotoAvistamiento)
    private readonly photos: Repository<FotoAvistamiento>,
    @InjectRepository(AvistamientoEmbedding)
    private readonly embeddings: Repository<AvistamientoEmbedding>,
    @InjectRepository(Especie) private readonly species: Repository<Especie>,
    @InjectRepository(Avistamiento)
    private readonly sightings: Repository<Avistamiento>,
    private readonly model: VisualModelClient,
    private readonly remote: SightingPhotoClient,
    private readonly suscripciones: SuscripcionesService,
    @Inject(iaConfig.KEY)
    private readonly ia: ConfigType<typeof iaConfig>,
  ) {}

  async buscar(
    user: string,
    dto: BuscarAvistamientosDto,
    files?: ImageUpload[],
  ) {
    validatePhotos(files);
    await this.suscripciones.verificar(user, 'busqueda');
    if (this.activeUsers.has(user) || this.activeUsers.size >= 2)
      throw new HttpException(
        'Hay una búsqueda en curso. Espera unos instantes y vuelve a intentar.',
        429,
      );
    this.activeUsers.add(user);
    const deadline = Date.now() + 150000;
    try {
      const species = await this.species.findOneBy({ id: dto.especieId });
      if (
        !species ||
        !['perro', 'gato'].includes(species.nombre.toLocaleLowerCase().trim())
      )
        throw new BadRequestException('Selecciona la especie Perro o Gato.');
      const candidates = await this.photos
        .createQueryBuilder('foto')
        .innerJoin('foto.avistamiento', 'avistamiento')
        .innerJoin('avistamiento.usuario', 'usuario')
        .where('avistamiento.estado = :estado', { estado: 'ACTIVO' })
        .andWhere('usuario.estado = true')
        .andWhere('avistamiento.especieId = :species', {
          species: dto.especieId,
        })
        .orderBy('foto.id', 'ASC')
        .take(201)
        .getMany();
      if (candidates.length > 200)
        throw new UnprocessableEntityException(
          'La búsqueda admite hasta 200 fotos de avistamientos por especie en esta versión.',
        );
      const queries = await this.model.embed(
        files.map((file) => file.buffer),
        this.remaining(deadline),
      );
      const vectors = new Map<string, number[]>();
      const cached = candidates.length
        ? await this.embeddings.findBy({
            fotoId: In(candidates.map((photo) => photo.id)),
            modelo: VISUAL_MODEL,
          })
        : [];
      for (const item of cached) {
        try {
          vectors.set(item.fotoId, normalizeVector(item.vector));
        } catch {
          /* Rebuild invalid cache rows. */
        }
      }
      let failed = 0;
      for (const photo of candidates) {
        if (vectors.has(photo.id)) continue;
        let bytes: Buffer;
        try {
          bytes = await this.remote.download(
            photo.url,
            Math.min(10000, this.remaining(deadline)),
          );
        } catch {
          failed++;
          continue;
        }
        let vector: number[];
        try {
          [vector] = await this.model.embed([bytes], this.remaining(deadline));
        } catch (error) {
          if (error instanceof BadRequestException) {
            failed++;
            continue;
          }
          throw error;
        }
        try {
          await this.embeddings.upsert(
            { fotoId: photo.id, modelo: VISUAL_MODEL, vector },
            ['fotoId', 'modelo'],
          );
          vectors.set(photo.id, vector);
        } catch (error) {
          // A photo can be deleted while a search is running; never recreate it.
          if (
            error instanceof QueryFailedError &&
            (error.driverError as { code?: string }).code === '23503'
          )
            continue;
          throw error;
        }
      }
      if (candidates.length && !vectors.size)
        throw new ServiceUnavailableException(
          'No se pudieron procesar las fotos de los avistamientos. Intenta nuevamente.',
        );
      const reportIds = [
        ...new Set(
          candidates
            .filter((photo) => vectors.has(photo.id))
            .map((photo) => photo.avistamientoId),
        ),
      ];
      // Recheck visibility and current photos after slow external inference.
      const current = reportIds.length
        ? await this.sightings
            .createQueryBuilder('avistamiento')
            .innerJoin('avistamiento.usuario', 'usuario')
            .leftJoinAndSelect('avistamiento.especie', 'especie')
            .leftJoinAndSelect('avistamiento.fotos', 'fotos')
            .where('avistamiento.id IN (:...ids)', { ids: reportIds })
            .andWhere('avistamiento.estado = :estado', { estado: 'ACTIVO' })
            .andWhere('avistamiento.especieId = :species', {
              species: dto.especieId,
            })
            .andWhere('usuario.estado = true')
            .getMany()
        : [];
      const resultados = current
        .flatMap((item) => {
          const processed = item.fotos
            .map((photo) => vectors.get(photo.id))
            .filter((value): value is number[] => !!value);
          if (!processed.length) return [];
          return [
            {
              similitud: similarityScore(queries, processed),
              avistamiento: this.publicSighting(item, user),
            },
          ];
        })
        .filter((item) =>
          hasSufficientSimilarity(item.similitud, this.ia.minSimilarity),
        )
        .sort(
          (a, b) =>
            b.similitud - a.similitud ||
            a.avistamiento.id.localeCompare(b.avistamiento.id),
        )
        .slice(0, 5);
      await this.suscripciones.consumir(user, 'busqueda');
      return {
        modelo: VISUAL_MODEL,
        aviso: NOTICE,
        fotosConsultadas: files.length,
        fotosNoProcesadas: failed,
        resultados,
      };
    } finally {
      this.activeUsers.delete(user);
    }
  }

  private remaining(deadline: number) {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      throw new ServiceUnavailableException(
        'La preparación de fotos tardó demasiado. Los avances se guardaron; vuelve a buscar.',
      );
    return Math.min(45000, remaining);
  }

  private publicSighting(item: Avistamiento, user: string) {
    return {
      id: item.id,
      especieId: item.especieId,
      especie: { id: item.especie.id, nombre: item.especie.nombre },
      descripcion: item.descripcion,
      direccion: item.direccion,
      fechaAvistamiento: item.fechaAvistamiento,
      latitud: Number(item.latitud),
      longitud: Number(item.longitud),
      estado: item.estado,
      esPropio: item.usuarioId === user,
      fotos: [...item.fotos]
        .sort(
          (a, b) =>
            Number(b.esPrincipal) - Number(a.esPrincipal) ||
            a.id.localeCompare(b.id),
        )
        .map((photo) => ({
          id: photo.id,
          url: photo.url,
          esPrincipal: photo.esPrincipal,
        })),
    };
  }
}
