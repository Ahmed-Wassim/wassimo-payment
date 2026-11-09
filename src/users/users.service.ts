import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.ts';
import { Repository } from 'typeorm';
import { OrgMembership } from './entities/org-membership.entity.ts';
import { Role } from './entities/role.entity.ts';
import { Permission } from './entities/permission.entity.ts';
import { RolePermission } from './entities/role-permission.entity.ts';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(OrgMembership)
    private readonly memberships: Repository<OrgMembership>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissions: Repository<RolePermission>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const row = await this.users.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`User not found ${id}`);
    return row;
  }

  async findMembership(userId: string): Promise<OrgMembership | null> {
    return this.memberships.findOne({ where: { userId } });
  }

  async requireMembership(userId: string): Promise<OrgMembership> {
    const row = await this.findMembership(userId);
    if (!row)
      throw new NotFoundException(`Membership not found for user ${userId}`);
    return row;
  }

  async findRoleById(id: string): Promise<Role> {
    const row = await this.roles.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Role not found ${id}`);
    return row;
  }

  async listPermissions(): Promise<Permission[]> {
    return this.permissions.find({ order: { code: 'ASC' } });
  }

  async listRolesByOrg(organizationId: string): Promise<Role[]> {
    return this.roles.find({
      where: { organizationId },
      order: { name: 'ASC' },
    });
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const rows = await this.rolePermissions.find({ where: { roleId } });
    return rows.map((r) => r.permissionCode);
  }

  async hasPermission(roleId: string, permission: string): Promise<boolean> {
    const perms = await this.getRolePermissions(roleId);
    return perms.includes(permission);
  }
}
