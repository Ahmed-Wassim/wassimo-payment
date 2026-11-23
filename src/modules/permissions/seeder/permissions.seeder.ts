import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../users/entities/permission.entity.ts';
import { RolePermission } from '../../users/entities/role-permission.entity.ts';
import { SUPER_ADMIN_ROLE_ID } from '../../users/constants/system-roles.constant.ts';
import { PERMISSIONS } from '../constants/permissions.constant.ts';

@Injectable()
export class PermissionsSeeder {
  private readonly logger = new Logger(PermissionsSeeder.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  async seed() {
    this.logger.log('Seeding permissions...');

    for (const perm of PERMISSIONS) {
      const exists = await this.permissionRepo.findOne({
        where: { code: perm.code },
      });

      if (!exists) {
        await this.permissionRepo.save(
          this.permissionRepo.create({
            code: perm.code,
            name: perm.name,
            groupName: perm.groupName,
          }),
        );
        this.logger.log(`Created permission: ${perm.code}`);
      }

      const rolePermissionExists = await this.rolePermissionRepo.findOneBy({
        roleId: SUPER_ADMIN_ROLE_ID,
        permissionCode: perm.code,
      });
      if (!rolePermissionExists) {
        await this.rolePermissionRepo.save(
          this.rolePermissionRepo.create({
            roleId: SUPER_ADMIN_ROLE_ID,
            permissionCode: perm.code,
          }),
        );
      }
    }

    this.logger.log('Permissions seeding completed');
  }
}
