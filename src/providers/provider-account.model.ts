import { ProviderAccount } from "./provider-account.entity.ts";

export class ProviderAccountModel {
  id!: string;
  organizationId!: string;
  providerCode!: string;
  environment!: string;
  displayName!: string;
  status!: string;
  supportedCurrencies!: string[];
  supportedMethods!: string[];
  config!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toProviderAccountModel (
  row: ProviderAccount,
): ProviderAccountModel {
  return {
    id: row.id,
    organizationId: row.organizationId,
    providerCode: row.providerCode,
    environment: row.environment,
    displayName: row.displayName,
    status: row.status,
    supportedCurrencies: row.supportedCurrencies,
    supportedMethods: row.supportedMethods,
    config: row.config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}