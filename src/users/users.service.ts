import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.ts';
import { In, Repository } from 'typeorm';
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

  async findByEmail(email: string, selectPassword = false): Promise<User | null> {
    return this.users.findOne({
      where: { email },
      select: selectPassword
        ? { id: true, email: true, passwordHash: true, status: true, isSuperAdmin: true, createdAt: true, updatedAt: true }
        : undefined,
    });
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

  async create(data: { email: string; passwordHash: string }): Promise<User> {
    const user = this.users.create(data);
    return this.users.save(user);
  }

  async createRole(organizationId: string, name: string, createdBy: string): Promise<Role> {
    const role = this.roles.create({ organizationId, name, createdBy });
    return this.roles.save(role);
  }

  async createMembership(userId: string, organizationId: string, roleId: string): Promise<OrgMembership> {
    const membership = this.memberships.create({ userId, organizationId, roleId });
    return this.memberships.save(membership);
  }

  async listPermissionsByGroup(group: string): Promise<Permission[]> {
    return this.permissions.find({ where: { groupName: group } });
  }

  async assignPermissionToRole(roleId: string, permissionCode: string): Promise<void> {
    await this.rolePermissions.save(this.rolePermissions.create({ roleId, permissionCode }));
  }

  async setRolePermissions(roleId: string, permissionCodes: string[], organizationId: string): Promise<void> {
    const role = await this.findRoleById(roleId);
    if (role.organizationId !== organizationId) {
      throw new ForbiddenException('Cannot modify roles in another organization');
    }
    await this.rolePermissions.delete({ roleId });
    for (const code of permissionCodes) {
      await this.rolePermissions.save(this.rolePermissions.create({ roleId, permissionCode: code }));
    }
  }

  async listByOrg(organizationId: string): Promise<User[]> {
    const memberships = await this.memberships.find({ where: { organizationId } });
    const userIds = memberships.map((m) => m.userId);
    if (userIds.length === 0) return [];
    return this.users.findBy({ id: In(userIds) });
  }
}
