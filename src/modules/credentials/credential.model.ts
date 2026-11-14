import { ApiCredential } from './entities/api-credential.entity.ts';

export class CredentialModel {
  id!: string;
  applicationId!: string;
  keyId!: string;
  prefix!: string;
  environment!: string;
  scopes!: string[];
  status!: string;
  lastUsedAt!: Date | null;
  revokedAt!: Date | null;
  createdAt!: Date;
}

export function toCredentialModel(row: ApiCredential): CredentialModel {
  return {
    id: row.id,
    applicationId: row.application.id,
    keyId: row.keyId,
    prefix: row.prefix,
    environment: row.environment,
    scopes: row.scopes,
    status: row.status,
    lastUsedAt: row.lastUsedAt ?? null,
    revokedAt: row.revokedAt ?? null,
    createdAt: row.createdAt,
  };
}
