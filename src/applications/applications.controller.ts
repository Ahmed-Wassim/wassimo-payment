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
import { FilterDto } from '../common/dto/filter.dto.ts';
import { toApplicationModel } from './application.model.ts';
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
    @Query() filter: FilterDto,
  ) {
    return this.service.listForActor(req.actor, filter);
  }

  @Get(':id')
  @Permission('apps:read')
  async findOne(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ) {
    return toApplicationModel(await this.service.requireByIdForActor(req.actor, id));
  }

  @Post()
  @Permission('apps:create')
  create(@Req() req: { actor: ActorContext }, @Body() dto: CreateApplicationDto) {
    return this.service.createForOrg(req.actor.organizationId ?? dto.organizationId ?? null, dto);
  }

  @Patch(':id')
  @Permission('apps:update')
  update(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.service.update(req.actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Permission('apps:update')
  async remove(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ) {
    await this.service.remove(req.actor, id);
  }
}
