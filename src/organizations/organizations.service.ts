import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity.ts';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  async resolvePlatformOrg(): Promise<Organization> {
    return this.repo.findOneOrFail({ where: { isPlatform: true } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async requireBySlug(slug: string): Promise<Organization> {
    const org = await this.findBySlug(slug);
    if (!org) {
      throw new NotFoundException(`Organization not found: ${slug}`);
    }
    return org;
  }
}
