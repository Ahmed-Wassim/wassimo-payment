import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service.ts';
import { IssueCredentialDto } from './dto/issue-credential.dto.ts';
import { FilterDto } from '../common/dto/filter.dto.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';

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

  @Get(':id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('keys:read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
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
  revoke(@Param('id') id: string) {
    return this.service.revoke(id);
  }
}