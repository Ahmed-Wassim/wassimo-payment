import { ForbiddenException } from '@nestjs/common';
import { ActorContext } from './jwt.guard.ts';

export function can(
  actor: ActorContext,
  permission: string,
  rolePermissions: string[],
): boolean {
  if (actor.isSuperAdmin) return true;
  return rolePermissions.includes(permission);
}

export function requirePermission(
  actor: ActorContext,
  permission: string,
  rolePermissions: string[],
): void {
  if (!can(actor, permission, rolePermissions)) {
    throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}
