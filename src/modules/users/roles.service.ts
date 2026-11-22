import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { ORG_ADMIN_PERMISSION_GROUPS } from '../permissions/constants/permissions.constant.ts';
import { OrgMembership } from './entities/org-membership.entity.ts';
import { Permission } from './entities/permission.entity.ts';
import { Role } from './entities/role.entity.ts';
import { RolePermission } from './entities/role-permission.entity.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { RoleModel, toRoleModel } from './mappers/role.mapper.ts';

type Actor = { organizationId: string | null; isSuperAdmin: boolean };

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissions: Repository<RolePermission>,
    @InjectRepository(OrgMembership)
    private readonly memberships: Repository<OrgMembership>,
  ) {}

  async findPlatformAdminRole(): Promise<Role | null> {
    return this.roles.findOne({
      where: { name: 'Super Admin', organizationId: IsNull() },
    });
  }

  async findRoleById(id: string): Promise<Role> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed role id');
    }
    const row = await this.roles.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Role not found ${id}`);
    return row;
  }

  async findManyByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) return [];
    return this.roles.findBy({ id: In(ids) });
  }

  async requireRoleForActor(actor: Actor, id: string): Promise<Role> {
    const row = await this.findRoleById(id);
    if (
      !actor.isSuperAdmin &&
      (!actor.organizationId || row.organizationId !== actor.organizationId)
    ) {
      throw new NotFoundException(`Role not found ${id}`);
    }
    return row;
  }

  async updateRole(actor: Actor, id: string, name?: string): Promise<RoleModel> {
    const row = await this.requireRoleForActor(actor, id);
    if (name !== undefined) row.name = name;
    const saved = await this.roles.save(row);
    return toRoleModel(saved, await this.getRolePermissions(saved.id));
  }

  async removeRole(actor: Actor, id: string): Promise<void> {
    const row = await this.requireRoleForActor(actor, id);
    const inUse = await this.memberships.count({ where: { roleId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Role is in use by ${inUse} member(s); reassign them first`,
      );
    }
    await this.roles.remove(row);
  }

  async listRolesForActor(actor: Actor, filter: FilterDto) {
    if (!actor.isSuperAdmin && !actor.organizationId) return [];

    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;
    const roles = await this.roles.find({
      where: organizationId ? { organizationId } : {},
      order: { name: 'ASC' },
    });
    const roleIds = roles.map((role) => role.id);
    const permissions = roleIds.length
      ? await this.rolePermissions.find({ where: { roleId: In(roleIds) } })
      : [];
    const permissionsByRole = new Map<string, string[]>();
    for (const permission of permissions) {
      const codes = permissionsByRole.get(permission.roleId) ?? [];
      codes.push(permission.permissionCode);
      permissionsByRole.set(permission.roleId, codes);
    }
    return roles.map((role) =>
      toRoleModel(role, permissionsByRole.get(role.id) ?? []),
    );
  }

  private async getRolePermissions(roleId: string): Promise<string[]> {
    const rows = await this.rolePermissions.find({ where: { roleId } });
    return rows.map((row) => row.permissionCode);
  }

  async getRolePermissionsForActor(actor: Actor, roleId: string): Promise<string[]> {
    await this.requireRoleForActor(actor, roleId);
    return this.getRolePermissions(roleId);
  }

  async createOrganizationAdminRole(
    organizationId: string,
    createdBy: string,
    manager: EntityManager,
  ): Promise<Role> {
    const permissions = await manager.getRepository(Permission).find({
      where: { groupName: In([...ORG_ADMIN_PERMISSION_GROUPS]) },
    });
    return this.createRoleWithPermissions(
      organizationId,
      'Admin',
      createdBy,
      permissions.map((permission) => permission.code),
      manager,
    );
  }

  async createRoleForActor(
    actor: { userId: string; organizationId: string | null; isSuperAdmin: boolean },
    name: string,
    organizationId?: string,
    permissionCodes: string[] = [],
  ): Promise<RoleModel> {
    const orgId = actor.isSuperAdmin
      ? organizationId ?? null
      : actor.organizationId ?? null;
    if (!orgId) {
      throw new BadRequestException(
        'organizationId is required for platform actors creating roles',
      );
    }

    const codes = await this.validatePermissionCodes(permissionCodes, true);
    const role = await this.createRoleWithPermissions(
      orgId,
      name,
      actor.userId,
      codes,
    );
    return toRoleModel(role, codes);
  }

  private async createRoleWithPermissions(
    organizationId: string,
    name: string,
    createdBy: string,
    permissionCodes: string[],
    manager?: EntityManager,
  ): Promise<Role> {
    const create = async (manager: EntityManager) => {
      const role = manager.create(Role, {
        organizationId,
        name,
        createdBy,
      });
      await manager.save(Role, role);
      if (permissionCodes.length > 0) {
        await manager.insert(
          RolePermission,
          permissionCodes.map((permissionCode) => ({
            roleId: role.id,
            permissionCode,
          })),
        );
      }
      return role;
    };
    return manager ? create(manager) : this.roles.manager.transaction(create);
  }

  async setRolePermissions(
    actor: Actor,
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    const role = await this.requireRoleForActor(actor, roleId);
    const codes = await this.validatePermissionCodes(
      permissionCodes,
      role.organizationId !== null,
    );

    await this.rolePermissions.manager.transaction(async (manager) => {
      await manager.delete(RolePermission, { roleId });
      if (codes.length > 0) {
        await manager.insert(
          RolePermission,
          codes.map((permissionCode) => ({
            roleId,
            permissionCode,
          })),
        );
      }
    });
  }

  private async validatePermissionCodes(
    permissionCodes: string[],
    organizationRole: boolean,
  ): Promise<string[]> {
    const uniqueCodes = [...new Set(permissionCodes)];
    const permissions = uniqueCodes.length
      ? await this.permissions.findBy({ code: In(uniqueCodes) })
      : [];
    if (permissions.length !== uniqueCodes.length) {
      throw new BadRequestException('One or more permission codes are unknown');
    }

    const allowedGroups = new Set<string>(ORG_ADMIN_PERMISSION_GROUPS);
    if (
      organizationRole &&
      permissions.some((permission) => !allowedGroups.has(permission.groupName))
    ) {
      throw new ForbiddenException(
        'Organization roles cannot receive platform permissions',
      );
    }
    return uniqueCodes;
  }
}
