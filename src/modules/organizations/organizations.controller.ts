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
import { OrganizationsService } from './organizations.service.ts';
import { CreateOrganizationDto } from './dto/create-organization.dto.ts';
import { UpdateOrganizationDto } from './dto/update-organization.dto.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { toOrganizationModel } from './mappers/organization.mapper.ts';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:read')
  findAll(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.service.findAllForActor(req.actor, filter);
  }

  @Get(':id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:read')
  async findOne(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
  ) {
    return toOrganizationModel(
      await this.service.requireByIdForActor(req.actor, id),
    );
  }

  @Post()
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('platform:orgs:read')
  create(@Body() dto: CreateOrganizationDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:update')
  update(
    @Req() req: { actor: ActorContext },
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.update(req.actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:update')
  remove(@Req() req: { actor: ActorContext }, @Param('id') id: string) {
    return this.service.remove(req.actor, id);
  }
}
