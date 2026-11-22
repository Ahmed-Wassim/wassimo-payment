import { ForbiddenException } from '@nestjs/common';

export function requirePermission(
  permission: string,
  rolePermissions: string[],
): void {
  if (!rolePermissions.includes(permission)) {
    throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}
