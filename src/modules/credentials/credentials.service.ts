import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiCredential } from './entities/api-credential.entity.ts';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { CredentialModel, toCredentialModel } from './mappers/credential.mapper.ts';
import { Application } from '../applications/entities/application.entity.ts';
import { CredentialEnvironment } from './entities/api-credential.entity.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { IssueCredentialDto } from './dto/issue-credential.dto.ts';

export interface VerifiedCredential {
  credential: ApiCredential;
  applicationId: string;
  organizationId: string;
}

@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(ApiCredential)
    private readonly repo: Repository<ApiCredential>,
  ) {}

  async issue(
    applicationId: string,
    environment: CredentialEnvironment,
    scopes: string[],
  ) {
    const keyId = randomBytes(4).toString('hex');
    const secret = randomBytes(32).toString('base64url');
    const prefix = `wpk_${keyId}`;
    const token = `${prefix}_${secret}`;

    await this.repo.manager.transaction(async (manager) => {
      await manager.update(
        ApiCredential,
        {
          application: { id: applicationId },
          environment,
          status: 'active',
        },
        { status: 'revoked', revokedAt: new Date() },
      );

      await manager.insert(ApiCredential, {
        application: { id: applicationId } as any,
        keyId,
        secretHash: createHash('sha256').update(secret).digest('hex'),
        prefix,
        environment,
        scopes,
      });
    });

    return token;
  }

  async verify(token: string): Promise<VerifiedCredential | null> {
    if (!token.startsWith('wpk_')) return null;
    const rest = token.slice('wpk_'.length);
    const sep = rest.indexOf('_');
    if (sep <= 0) return null;
    const keyId = rest.slice(0, sep);
    const secret = rest.slice(sep + 1);

    const row = await this.repo.findOne({
      where: { keyId, status: 'active' },
      relations: { application: { organization: true } },
    });
    if (!row) return null;

    const candidate = createHash('sha256').update(secret).digest();
    const stored = Buffer.from(row.secretHash, 'hex');
    if (
      candidate.length !== stored.length ||
      !timingSafeEqual(candidate, stored)
    )
      return null;
    return {
      credential: row,
      applicationId: row.application.id,
      organizationId: row.application.organization.id,
    };
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.repo.update(id, { lastUsedAt: new Date() });
  }

  async issueForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    dto: IssueCredentialDto,
  ) {
    const app = await this.repo.manager.findOne(Application, {
      where: { id: dto.applicationId },
      relations: { organization: true },
    });
    if (!app) {
      throw new NotFoundException(`Application not found ${dto.applicationId}`);
    }
    if (!actor.isSuperAdmin && app.organization.id !== actor.organizationId) {
      throw new NotFoundException(`Application not found ${dto.applicationId}`);
    }

    const token = await this.issue(dto.applicationId, dto.environment, dto.scopes);
    return {
      applicationId: dto.applicationId,
      environment: dto.environment,
      scopes: dto.scopes,
      token,
    };
  }

  async findAllForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ): Promise<CredentialModel[]> {
    const rows = await this.repo.find({
      relations: { application: { organization: true } },
      order: { createdAt: 'ASC' },
    });

    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;

    const filtered = organizationId
      ? rows.filter((r) => r.application?.organization?.id === organizationId)
      : rows;

    return filtered.map((row) => toCredentialModel(row));
  }

  async revoke(id: string): Promise<CredentialModel> {
    const row = await this.repo.findOne({
      where: { id },
      relations: { application: true },
    });
    if (!row) throw new NotFoundException(`Credential not found ${id}`);

    if (row.status !== 'revoked') {
      row.status = 'revoked';
      row.revokedAt = new Date();
      await this.repo.update(id, {
        status: row.status,
        revokedAt: row.revokedAt,
      });
    }

    return toCredentialModel(row);
  }

  async findAll(): Promise<CredentialModel[]> {
    const rows = await this.repo.find({
      relations: { application: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => toCredentialModel(row));
  }

  async findOne(id: string): Promise<CredentialModel> {
    const row = await this.repo.findOne({
      where: { id },
      relations: { application: true },
    });
    if (!row) throw new NotFoundException(`Credential not found ${id}`);
    return toCredentialModel(row);
  }
}
