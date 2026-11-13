import { Permission } from './entities/permission.entity.ts';

export class PermissionModel {
  code!: string;
  name!: string;
  groupName!: string;
}

export function toPermissionModel(row: Permission): PermissionModel {
  return {
    code: row.code,
    name: row.name,
    groupName: row.groupName,
  };
}
