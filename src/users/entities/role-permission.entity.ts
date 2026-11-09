import { Entity, PrimaryColumn } from 'typeorm';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @PrimaryColumn({ name: 'permission_code' })
  permissionCode!: string;
}
