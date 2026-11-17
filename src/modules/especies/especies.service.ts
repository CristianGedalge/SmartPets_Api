import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Especie } from './entities/especie.entity';

@Injectable()
export class EspeciesService {
  constructor(
    @InjectRepository(Especie) private readonly especies: Repository<Especie>,
  ) {}
  findAll() {
    return this.especies.find({ order: { nombre: 'ASC' } });
  }
}
