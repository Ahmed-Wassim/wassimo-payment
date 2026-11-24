import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProviderModel, toProviderModel } from './provider.mapper.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { JwtGuard } from '../auth/jwt.guard.ts';
import { ProvidersService } from './providers.service.ts';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @Get()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  listProviders(): Promise<ProviderModel[]> {
    return this.service.listProviders();
  }

  @Get(':code')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  async findProvider(@Param('code') code: string) {
    return toProviderModel(await this.service.requireByCode(code));
  }
}
