import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service.ts';
import { RolesService } from '../users/roles.service.ts';
import { requirePermission } from './permissions.ts';
import { ActorContext } from './jwt.guard.ts';
import { PERMISSION_KEY } from './permission.decorator.ts';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
    private readonly roles: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) return true;
    const req = context.switchToHttp().getRequest();
    const actor = req.actor as ActorContext;
    if (actor.isSuperAdmin) return true;
    const membership = await this.users.requireMembership(actor.userId);
    if (membership.organizationId !== actor.organizationId) {
      return false;
    }
    const rolePerms = await this.roles.getRolePermissionsForActor(
      actor,
      membership.roleId,
    );
    requirePermission(required, rolePerms);
    return true;
  }
}
