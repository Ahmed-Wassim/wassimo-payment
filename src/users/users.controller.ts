import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { JwtGuard, ActorContext } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { Permission } from '../auth/permission.decorator.ts';
import { UsersService } from './users.service.ts';
import { CreateRoleDto } from './dto/create-role.dto.ts';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.ts';
import { CreateMemberDto } from './dto/create-member.dto.ts';
import { FilterDto } from '../common/dto/filter.dto.ts';
import * as bcrypt from 'bcrypt';

@Controller()
@UseGuards(JwtGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('roles')
  @Permission('org:members:manage')
  listRoles(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.users.listRolesForActor(req.actor, filter);
  }

  @Post('roles')
  @Permission('org:members:manage')
  createRole(@Req() req: { actor: ActorContext }, @Body() dto: CreateRoleDto) {
    return this.users.createRole(req.actor.organizationId, dto.name, req.actor.userId);
  }

  @Get('roles/:id/permissions')
  @Permission('org:members:manage')
  listRolePermissions(
    @Req() req: { actor: ActorContext },
    @Param('id') roleId: string,
  ) {
    return this.users.getRolePermissionsForActor(req.actor, roleId);
  }

  @Post('roles/:id/permissions')
  @Permission('org:members:manage')
  async assignPermissions(
    @Req() req: { actor: ActorContext },
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    await this.users.setRolePermissions(req.actor, roleId, dto.permissionCodes);
    return { ok: true };
  }

  @Get('users')
  @Permission('org:members:read')
  listMembers(
    @Req() req: { actor: ActorContext },
    @Query() filter: FilterDto,
  ) {
    return this.users.listMembersForActor(req.actor, filter);
  }

  @Post('users')
  @Permission('org:members:manage')
  async createMember(@Req() req: { actor: ActorContext }, @Body() dto: CreateMemberDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const organizationId = req.actor.isSuperAdmin
      ? dto.organizationId ?? req.actor.organizationId ?? null
      : req.actor.organizationId ?? null;
    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required for platform actors creating members',
      );
    }
    const role = await this.users.findRoleById(dto.roleId);
    if (role.organizationId !== organizationId) {
      throw new BadRequestException('role does not belong to the selected organization');
    }
    const user = await this.users.create({ email: dto.email, passwordHash: hash });
    await this.users.createMembership(user.id, organizationId, dto.roleId);
    return { id: user.id, email: user.email, roleId: dto.roleId, organizationId };
  }

  @Get('permissions')
  @Permission('org:members:manage')
  listPermissions() {
    return this.users.listPermissions();
  }
}
