import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.ts';
import { In, IsNull, Repository } from 'typeorm';
import { OrgMembership } from './entities/org-membership.entity.ts';
import { Role } from './entities/role.entity.ts';
import { Permission } from './entities/permission.entity.ts';
import { RolePermission } from './entities/role-permission.entity.ts';
import { FilterDto } from '../common/dto/filter.dto.ts';

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

  async findPlatformAdminRole(): Promise<Role | null> {
    return this.roles.findOne({
      where: { name: 'Super Admin', organizationId: IsNull() },
    });
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

  async listRolesForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ): Promise<Role[]> {
    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;
    return this.roles.find({
      where: organizationId ? { organizationId } : {},
      order: { name: 'ASC' },
    });
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const rows = await this.rolePermissions.find({ where: { roleId } });
    return rows.map((r) => r.permissionCode);
  }

  async getRolePermissionsForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    roleId: string,
  ): Promise<string[]> {
    const role = await this.findRoleById(roleId);
    if (!actor.isSuperAdmin && role.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot view roles in another organization');
    }
    return this.getRolePermissions(roleId);
  }

  async hasPermission(roleId: string, permission: string): Promise<boolean> {
    const perms = await this.getRolePermissions(roleId);
    return perms.includes(permission);
  }

  async create(data: { email: string; passwordHash: string }): Promise<User> {
    const user = this.users.create(data);
    return this.users.save(user);
  }

  async createRole(
    organizationId: string | null,
    name: string,
    createdBy: string,
  ): Promise<Role> {
    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required for platform actors creating roles',
      );
    }
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

  async setRolePermissions(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    const role = await this.findRoleById(roleId);
    if (
      !actor.isSuperAdmin &&
      role.organizationId !== actor.organizationId
    ) {
      throw new ForbiddenException('Cannot modify roles in another organization');
    }
    await this.rolePermissions.delete({ roleId });
    for (const code of permissionCodes) {
      await this.rolePermissions.save(this.rolePermissions.create({ roleId, permissionCode: code }));
    }
  }

  async listMembersForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ) {
    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;
    const memberships = await this.memberships.find({
      where: organizationId ? { organizationId } : {},
    });
    if (memberships.length === 0) return [];

    const userIds = memberships.map((m) => m.userId);
    const roleIds = [...new Set(memberships.map((m) => m.roleId))];
    const [userRows, roleRows] = await Promise.all([
      this.users.findBy({ id: In(userIds) }),
      roleIds.length ? this.roles.findBy({ id: In(roleIds) }) : Promise.resolve([] as Role[]),
    ]);

    const userById = new Map(userRows.map((u) => [u.id, u]));
    const roleById = new Map(roleRows.map((r) => [r.id, r]));

    return memberships.map((membership) => {
      const user = userById.get(membership.userId);
      const role = roleById.get(membership.roleId);
      return {
        id: user?.id ?? membership.userId,
        email: user?.email ?? '',
        status: user?.status,
        isSuperAdmin: user?.isSuperAdmin ?? false,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt,
        organizationId: membership.organizationId,
        roleId: membership.roleId,
        roleName: role?.name ?? null,
      };
    });
  }
}
