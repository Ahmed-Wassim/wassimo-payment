import { ProviderAccount, ProviderAccountStatus, ProviderEnvironment } from '../entities/provider-account.entity.ts';
import { toOrganizationModel, OrganizationModel } from '../../organizations/mappers/organization.mapper.ts';
import { toApplicationModel, ApplicationModel } from '../../applications/mappers/application.mapper.ts';

export class ProviderAccountModel {
  id!: string;
  organization!: OrganizationModel;
  application!: ApplicationModel;
  providerCode!: string;
  environment!: ProviderEnvironment;
  displayName!: string;
  status!: ProviderAccountStatus;
  supportedCurrencies!: string[];
  supportedMethods!: string[];
  config!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toProviderAccountModel(row: ProviderAccount): ProviderAccountModel {
  return {
    id: row.id,
    organization: toOrganizationModel(row.organization),
    application: toApplicationModel(row.application),
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
