import { Application, ApplicationStatus } from '../entities/application.entity.ts';
import { toOrganizationModel, OrganizationModel } from '../../organizations/mappers/organization.mapper.ts';

export class ApplicationModel {
  id!: string;
  slug!: string;
  name!: string;
  status!: ApplicationStatus;
  organization!: OrganizationModel | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toApplicationModel(row: Application): ApplicationModel {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    organization: row.organization ? toOrganizationModel(row.organization) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
