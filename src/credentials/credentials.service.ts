import { Injectable } from '@nestjs/common';
import { ApiCredential } from './api-credential.entity.ts';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

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

  async issue(applicationId: string, environment: string, scopes: string[]) {
    const keyId = randomBytes(4).toString('hex');
    const secret = randomBytes(32).toString('base64url');
    const token = `wpk_${keyId}_${secret}`;

    await this.repo.insert({
      application: { id: applicationId } as any,
      keyId,
      secretHash: createHash('sha256').update(secret).digest('hex'),
      prefix: token.slice(0, 12),
      environment,
      scopes,
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
}
