import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Especie } from './entities/especie.entity';
import { EspeciesController } from './especies.controller';
import { EspeciesService } from './especies.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Especie])],
  controllers: [EspeciesController],
  providers: [EspeciesService],
})
export class EspeciesModule {}
