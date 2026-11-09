import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity.ts';
import { User } from './entities/user.entity.ts';
import { Permission } from './entities/permission.entity.ts';
import { RolePermission } from './entities/role-permission.entity.ts';
import { OrgMembership } from './entities/org-membership.entity.ts';
import { UsersService } from './users.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      RolePermission,
      OrgMembership,
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
