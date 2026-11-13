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
import { OrganizationsService } from './organizations.service.ts';
import { CreateOrganizationDto } from './dto/create-organization.dto.ts';
import { UpdateOrganizationDto } from './dto/update-organization.dto.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { FilterDto } from '../common/dto/filter.dto.ts';
import { toOrganizationModel } from './organization.model.ts';

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
  async findOne(@Param('id') id: string) {
    return toOrganizationModel(await this.service.requireById(id));
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
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtGuard, PermissionGuard)
  @Permission('org:update')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
