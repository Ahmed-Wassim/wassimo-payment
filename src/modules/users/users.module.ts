import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity.ts';
import { User } from './entities/user.entity.ts';
import { Permission } from './entities/permission.entity.ts';
import { RolePermission } from './entities/role-permission.entity.ts';
import { OrgMembership } from './entities/org-membership.entity.ts';
import { UsersService } from './users.service.ts';
import { UsersController } from './users.controller.ts';
import { RolesController } from './roles.controller.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { RolesService } from './roles.service.ts';
import { SuperAdminUserSeeder } from './seeder/super-admin-user.seeder.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      RolePermission,
      OrgMembership,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, RolesController],
  providers: [UsersService, RolesService, SuperAdminUserSeeder],
  exports: [UsersService, RolesService, SuperAdminUserSeeder],
})
export class UsersModule {}
