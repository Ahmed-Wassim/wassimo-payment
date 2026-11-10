import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Provider } from './entities/provider.entity.ts';
import { ProvidersService } from './providers.service.ts';
import { ProviderAccountModel } from './provider-account.model.ts';
import { CreateProviderAccountDto } from './dto/create-provider-account.dto.ts';
import { UpdateProviderAccountDto } from './dto/update-provider-account.dto.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';

@Controller()
export class ProvidersController {
  constructor(private readonly service: ProvidersService) {}

  @Get('providers')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  listProviders(): Promise<Provider[]> {
    return this.service.listProviders();
  }

  @Get('providers/:code')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  findProvider(@Param('code') code: string): Promise<Provider> {
    return this.service.requireByCode(code);
  }

  @Get('provider-accounts')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  listAccounts(
    @Req() req: { actor: ActorContext },
    @Query('organizationId') filter?: string,
  ): Promise<ProviderAccountModel[]> {
    const orgId = req.actor.isSuperAdmin && filter
      ? filter
      : req.actor.organizationId;
    return this.service.listAccountsForActor(req.actor, orgId);
  }

  @Get('provider-accounts/:id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  findAccount(@Param('id') id: string): Promise<ProviderAccountModel> {
    return this.service.findOneAccount(id);
  }

  @Post('provider-accounts')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:members:manage')
  createAccount(
    @Req() req: { actor: ActorContext },
    @Body() dto: CreateProviderAccountDto,
  ) {
    return this.service.createAccountForActor(req.actor, dto);
  }

  @Patch('provider-accounts/:id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:members:manage')
  updateAccount(@Param('id') id: string, @Body() dto: UpdateProviderAccountDto) {
    return this.service.updateAccount(id, dto);
  }

  @Delete('provider-accounts/:id')
  @HttpCode(204)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:members:manage')
  async removeAccount(@Param('id') id: string) {
    await this.service.removeAccount(id);
  }
}