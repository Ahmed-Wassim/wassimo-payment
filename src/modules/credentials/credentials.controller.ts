import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service.ts';
import { IssueCredentialDto } from './dto/issue-credential.dto.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { API_SCOPES } from '../auth/api-scopes.ts';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly service: CredentialsService) {}

  @Get()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('keys:read')
  findAll(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.service.findAllForActor(req.actor, filter);
  }

  @Get('scope-catalog')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('keys:issue')
  getScopeCatalog() {
    return API_SCOPES;
  }

  @Get(':id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('keys:read')
  findOne(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ) {
    return this.service.findOneForActor(req.actor, id);
  }

  @Post()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('keys:issue')
  issue(
    @Req() req: { actor: ActorContext },
    @Body() dto: IssueCredentialDto,
  ) {
    return this.service.issueForActor(req.actor, dto);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('keys:revoke')
  revoke(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ) {
    return this.service.revokeForActor(req.actor, id);
  }
}
