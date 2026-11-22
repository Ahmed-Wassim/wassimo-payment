import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserStatus } from './entities/user.entity.ts';
import { EntityManager, In, Repository } from 'typeorm';
import { OrgMembership } from './entities/org-membership.entity.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { RolesService } from './roles.service.ts';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(OrgMembership)
    private readonly memberships: Repository<OrgMembership>,
    private readonly roles: RolesService,
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
    if (!isUuid(id)) {
      throw new BadRequestException('malformed user id');
    }
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

  async create(
    data: { email: string; passwordHash: string },
    manager: EntityManager,
  ): Promise<User> {
    const repo = manager.getRepository(User);
    const user = repo.create(data);
    return repo.save(user);
  }

  async createMembership(
    userId: string,
    organizationId: string,
    roleId: string,
    manager: EntityManager,
  ): Promise<OrgMembership> {
    const repo = manager.getRepository(OrgMembership);
    const membership = repo.create({ userId, organizationId, roleId });
    return repo.save(membership);
  }

  async createMemberForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    data: {
      email: string;
      passwordHash: string;
      roleId: string;
      organizationId?: string;
    },
  ) {
    const organizationId = actor.isSuperAdmin
      ? data.organizationId ?? actor.organizationId
      : actor.organizationId;
    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required for platform actors creating members',
      );
    }

    const role = await this.roles.findRoleById(data.roleId);
    if (role.organizationId !== organizationId) {
      throw new BadRequestException(
        'role does not belong to the selected organization',
      );
    }

    return this.users.manager.transaction(async (manager) => {
      const user = manager.create(User, {
        email: data.email,
        passwordHash: data.passwordHash,
      });
      await manager.save(User, user);
      await manager.insert(OrgMembership, {
        userId: user.id,
        organizationId,
        roleId: data.roleId,
      });
      return {
        id: user.id,
        email: user.email,
        roleId: data.roleId,
        organizationId,
      };
    });
  }

  async listMembersForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ) {
    if (!actor.isSuperAdmin && !actor.organizationId) return [];

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
      this.roles.findManyByIds(roleIds),
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

  async updateMemberForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    userId: string,
    dto: { roleId?: string; status?: UserStatus },
  ): Promise<{ id: string; roleId: string; status: UserStatus }> {
    if (!isUuid(userId)) {
      throw new BadRequestException('malformed user id');
    }
    return this.users.manager.transaction(async (manager) => {
      const membership = await manager.findOne(OrgMembership, {
        where: { userId },
      });
      if (
        !membership ||
        (!actor.isSuperAdmin &&
          membership.organizationId !== actor.organizationId)
      ) {
        throw new NotFoundException(`Membership not found for user ${userId}`);
      }

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException(`User not found ${userId}`);

      if (dto.roleId !== undefined) {
        const role = await this.roles.findRoleById(dto.roleId);
        if (role.organizationId !== membership.organizationId) {
          throw new BadRequestException(
            'role does not belong to the member organization',
          );
        }
        membership.roleId = dto.roleId;
        await manager.save(OrgMembership, membership);
      }

      if (dto.status !== undefined) {
        user.status = dto.status;
        await manager.save(User, user);
      }

      return { id: userId, roleId: membership.roleId, status: user.status };
    });
  }
}
