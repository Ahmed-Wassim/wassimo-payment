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
import { ProviderCredentialService } from './provider-credential.service.ts';
import { ProviderAccountModel } from './provider-account.model.ts';
import { toProviderModel } from './provider.model.ts';
import { CreateProviderAccountDto } from './dto/create-provider-account.dto.ts';
import { UpdateProviderAccountDto } from './dto/update-provider-account.dto.ts';
import { SetProviderCredentialsDto } from './dto/set-provider-credentials.dto.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { FilterDto } from '../common/dto/filter.dto.ts';

@Controller()
export class ProvidersController {
  constructor(
    private readonly service: ProvidersService,
    private readonly credentials: ProviderCredentialService,
  ) {}

  @Get('providers')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  listProviders(): Promise<Provider[]> {
    return this.service.listProviders();
  }

  @Get('providers/:code')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  async findProvider(@Param('code') code: string) {
    return toProviderModel(await this.service.requireByCode(code));
  }

  @Get('provider-accounts')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  listAccounts(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ): Promise<ProviderAccountModel[]> {
    return this.service.listAccountsForActor(req.actor, filter);
  }

  @Get('provider-accounts/:id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  findAccount(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ): Promise<ProviderAccountModel> {
    return this.service.findOneAccount(req.actor, id);
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
  updateAccount(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: UpdateProviderAccountDto,
  ) {
    return this.service.updateAccount(req.actor, id, dto);
  }

  @Delete('provider-accounts/:id')
  @HttpCode(204)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:members:manage')
  async removeAccount(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ) {
    await this.service.removeAccount(req.actor, id);
  }

  @Post('provider-accounts/:id/credentials')
  @HttpCode(204)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:members:manage')
  async setCredentials(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: SetProviderCredentialsDto,
  ) {
    await this.credentials.setForActor(req.actor, id, dto.credentials);
  }
}