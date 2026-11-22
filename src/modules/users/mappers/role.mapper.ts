import { Role } from '../entities/role.entity.ts';

export interface RoleModel {
  id: string;
  organizationId: string | null;
  name: string;
  createdBy: string | null;
  createdAt: Date;
  permissionCodes: string[];
}

export function toRoleModel(
  role: Role,
  permissionCodes: string[] = [],
): RoleModel {
  return {
    id: role.id,
    organizationId: role.organizationId,
    name: role.name,
    createdBy: role.createdBy,
    createdAt: role.createdAt,
    permissionCodes,
  };
}
