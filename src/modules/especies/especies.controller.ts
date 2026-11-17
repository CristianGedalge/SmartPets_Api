import { Controller, Get } from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { EspeciesService } from './especies.service';

@Controller('especies')
@AuthRole()
export class EspeciesController {
  constructor(private readonly especies: EspeciesService) {}
  @Get()
  findAll() {
    return this.especies.findAll();
  }
}
