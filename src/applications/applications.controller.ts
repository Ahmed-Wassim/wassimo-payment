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
import { ApplicationsService } from './applications.service.ts';
import { CreateApplicationDto } from './dto/create-application.dto.ts';
import { UpdateApplicationDto } from './dto/update-application.dto.ts';
import { JwtGuard, ActorContext } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';

@Controller('applications')
@UseGuards(JwtGuard, PermissionGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Get()
  @Permission('apps:read')
  listApps(
    @Req() req: { actor: ActorContext },
    @Query('organizationId') orgFilter?: string,
  ) {
    const orgId = req.actor.isSuperAdmin && orgFilter
      ? orgFilter
      : req.actor.organizationId;
    return this.service.listByOrg(orgId);
  }

  @Get(':id')
  @Permission('apps:read')
  findOne(@Param('id') id: string) {
    return this.service.requireById(id);
  }

  @Post()
  @Permission('apps:create')
  create(@Req() req: { actor: ActorContext }, @Body() dto: CreateApplicationDto) {
    return this.service.createForOrg(req.actor.organizationId, dto);
  }

  @Patch(':id')
  @Permission('apps:update')
  update(@Param('id') id: string, @Body() dto: UpdateApplicationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Permission('apps:update')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
