import { Body, Controller, Get, Post, Req, UseGuards, Param } from '@nestjs/common';
import { JwtGuard, ActorContext } from '../auth/jwt.guard.ts';
import { PermissionGuard } from '../auth/permission.guard.ts';
import { SetMetadata } from '@nestjs/common';
import { UsersService } from './users.service.ts';
import { CreateRoleDto } from './dto/create-role.dto.ts';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.ts';
import { CreateMemberDto } from './dto/create-member.dto.ts';
import * as bcrypt from 'bcrypt';

const Permission = (action: string) => SetMetadata('permission', action);

@Controller()
@UseGuards(JwtGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('roles')
  @Permission('org:members:manage')
  listRoles(@Req() req: { actor: ActorContext }) {
    return this.users.listRolesByOrg(req.actor.organizationId);
  }

  @Post('roles')
  @Permission('org:members:manage')
  createRole(@Req() req: { actor: ActorContext }, @Body() dto: CreateRoleDto) {
    return this.users.createRole(req.actor.organizationId, dto.name, req.actor.userId);
  }

  @Post('roles/:id/permissions')
  @Permission('org:members:manage')
  async assignPermissions(
    @Req() req: { actor: ActorContext },
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    await this.users.setRolePermissions(roleId, dto.permissionCodes, req.actor.organizationId);
    return { ok: true };
  }

  @Get('users')
  @Permission('org:members:read')
  listMembers(@Req() req: { actor: ActorContext }) {
    return this.users.listByOrg(req.actor.organizationId);
  }

  @Post('users')
  @Permission('org:members:manage')
  async createMember(@Req() req: { actor: ActorContext }, @Body() dto: CreateMemberDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({ email: dto.email, passwordHash: hash });
    await this.users.createMembership(user.id, req.actor.organizationId, dto.roleId);
    return { id: user.id, email: user.email, roleId: dto.roleId };
  }

  @Get('permissions')
  @Permission('org:members:manage')
  listPermissions() {
    return this.users.listPermissions();
  }
}
