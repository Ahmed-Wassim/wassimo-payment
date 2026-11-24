import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ActorContext, JwtGuard } from '../../auth/jwt.guard.ts';
import { Permission } from '../../auth/permission.decorator.ts';
import { PermissionGuard } from '../../auth/permission.guard.ts';
import { FilterDto } from '../../../common/dto/filter.dto.ts';
import { SetProviderCredentialsDto } from '../credentials/dto/set-provider-credentials.dto.ts';
import { ProviderCredentialService } from '../credentials/provider-credential.service.ts';
import { CreateProviderAccountDto } from './dto/create-provider-account.dto.ts';
import { UpdateProviderAccountDto } from './dto/update-provider-account.dto.ts';
import { ProviderAccountModel } from './mapper/provider-account.mapper.ts';
import { ProviderAccountsService } from './provider-accounts.service.ts';

@Controller('provider-accounts')
export class ProviderAccountsController {
  constructor(
    private readonly service: ProviderAccountsService,
    private readonly credentials: ProviderCredentialService,
  ) {}

  @Get()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  listAccounts(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ): Promise<ProviderAccountModel[]> {
    return this.service.listAccountsForActor(req.actor, filter);
  }

  @Get(':id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:read')
  findAccount(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ): Promise<ProviderAccountModel> {
    return this.service.findOneAccount(req.actor, id);
  }

  @Post()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:create')
  createAccount(
    @Req() req: { actor: ActorContext },
    @Body() dto: CreateProviderAccountDto,
  ) {
    return this.service.createAccount(req.actor, dto);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:update')
  updateAccount(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: UpdateProviderAccountDto,
  ) {
    return this.service.updateAccount(req.actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:delete')
  async removeAccount(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ) {
    await this.service.removeAccount(req.actor, id);
  }

  @Post(':id/credentials')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('apps:update')
  async setCredentials(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: SetProviderCredentialsDto,
  ) {
    await this.credentials.setForActor(req.actor, id, dto.credentials);
  }
}
