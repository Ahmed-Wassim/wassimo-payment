import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { APP_CONFIG } from '../../config/config.module.ts';
import type { AppConfig } from '../../config/configuration.ts';
import { ApiError } from '../../common/api-error.ts';
import { ProviderAccount } from './entities/provider-account.entity.ts';
import { ProviderCredential } from './entities/provider-credential.entity.ts';
import { decryptPayload, encryptPayload } from './crypto.ts';

const UNIQUE_VIOLATION = '23505';

type CredentialActor = {
  organizationId: string | null;
  isSuperAdmin: boolean;
};

@Injectable()
export class ProviderCredentialService {
  constructor(
    @InjectRepository(ProviderCredential)
    private readonly credentials: Repository<ProviderCredential>,
    @InjectRepository(ProviderAccount)
    private readonly accounts: Repository<ProviderAccount>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async setForActor(
    actor: CredentialActor,
    accountId: string,
    payload: Record<string, string>,
  ): Promise<void> {
    const account = await this.accounts.findOne({ where: { id: accountId } });
    if (
      !account ||
      (!actor.isSuperAdmin && account.organizationId !== actor.organizationId)
    ) {
      throw new NotFoundException(`Provider account not found ${accountId}`);
    }
    await this.set(accountId, payload);
  }

  async set(accountId: string, payload: Record<string, string>): Promise<void> {
    const encrypted = encryptPayload(JSON.stringify(payload), this.requireKey());
    const existing = await this.credentials.findOneBy({
      providerAccountId: accountId,
    });
    if (existing) {
      existing.encryptedPayload = encrypted;
      await this.credentials.save(existing);
      return;
    }
    try {
      await this.credentials.insert({ providerAccountId: accountId, encryptedPayload: encrypted });
    } catch (error) {
      if (error instanceof QueryFailedError && error.driverError.code === UNIQUE_VIOLATION) {
        const row = await this.credentials.findOneByOrFail({ providerAccountId: accountId });
        row.encryptedPayload = encrypted;
        await this.credentials.save(row);
        return;
      }
      throw error;
    }
  }

  async load(accountId: string): Promise<Record<string, string>> {
    const row = await this.credentials.findOneBy({ providerAccountId: accountId });
    if (!row) {
      throw new ApiError(
        'provider_credentials_missing',
        HttpStatus.SERVICE_UNAVAILABLE,
        `Provider credentials not stored for account ${accountId}`,
      );
    }
    return JSON.parse(decryptPayload(row.encryptedPayload, this.requireKey())) as Record<string, string>;
  }

  async exists(accountId: string): Promise<boolean> {
    return this.credentials.existsBy({ providerAccountId: accountId });
  }

  private requireKey(): string {
    const key = this.config.encryption.key;
    if (!key) {
      throw new ApiError(
        'encryption_key_missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'ENCRYPTION_KEY is not configured; provider credentials cannot be encrypted or read',
      );
    }
    return key;
  }
}
