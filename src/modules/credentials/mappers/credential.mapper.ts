import { ApiCredential } from '../entities/api-credential.entity.ts';
import { toApplicationModel, ApplicationModel } from '../../applications/mappers/application.mapper.ts';

export class CredentialModel {
  id!: string;
  application!: ApplicationModel;
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
    application: toApplicationModel(row.application),
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
