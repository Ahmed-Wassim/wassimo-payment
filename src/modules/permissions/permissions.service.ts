import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ORG_ADMIN_PERMISSION_GROUPS } from './constants/permissions.constant.ts';
import { Permission } from '../users/entities/permission.entity.ts';
import { toPermissionModel } from './mappers/permission.mapper.ts';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
  ) {}

  async listForActor(actor: { isSuperAdmin: boolean }) {
    const rows = await this.permissions.find({
      where: actor.isSuperAdmin
        ? {}
        : { groupName: In([...ORG_ADMIN_PERMISSION_GROUPS]) },
      order: { code: 'ASC' },
    });
    return rows.map((row) => toPermissionModel(row));
  }
}
