import { Organization } from './entities/organization.entity.ts';

export class OrganizationModel {
  id!: string;
  slug!: string;
  name!: string;
  isPlatform!: boolean;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export function toOrganizationModel(row: Organization): OrganizationModel {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isPlatform: row.isPlatform,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
