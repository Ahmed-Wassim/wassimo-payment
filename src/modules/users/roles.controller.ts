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
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { ActorContext, JwtGuard } from '../auth/jwt.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.ts';
import { CreateRoleDto } from './dto/create-role.dto.ts';
import { UpdateRoleDto } from './dto/update-role.dto.ts';
import { RolesService } from './roles.service.ts';

@Controller()
@UseGuards(JwtGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('roles')
  @Permission('org:members:manage')
  listRoles(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.roles.listRolesForActor(req.actor, filter);
  }

  @Post('roles')
  @Permission('org:members:manage')
  createRole(@Req() req: { actor: ActorContext }, @Body() dto: CreateRoleDto) {
    return this.roles.createRoleForActor(
      req.actor,
      dto.name,
      dto.organizationId,
      dto.permissionCodes,
    );
  }

  @Patch('roles/:id')
  @Permission('org:members:manage')
  updateRole(
    @Req() req: { actor: ActorContext },
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.updateRole(req.actor, roleId, dto.name);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permission('org:members:manage')
  async removeRole(
    @Req() req: { actor: ActorContext },
    @Param('id') roleId: string,
  ) {
    await this.roles.removeRole(req.actor, roleId);
  }

  @Get('roles/:id/permissions')
  @Permission('org:members:manage')
  listRolePermissions(
    @Req() req: { actor: ActorContext },
    @Param('id') roleId: string,
  ) {
    return this.roles.getRolePermissionsForActor(req.actor, roleId);
  }

  @Post('roles/:id/permissions')
  @Permission('org:members:manage')
  async assignPermissions(
    @Req() req: { actor: ActorContext },
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    await this.roles.setRolePermissions(req.actor, roleId, dto.permissionCodes);
    return { ok: true };
  }
}
