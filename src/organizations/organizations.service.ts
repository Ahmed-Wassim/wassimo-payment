import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity.ts';
import { Application } from '../applications/entities/application.entity.ts';
import { FilterDto } from '../common/dto/filter.dto.ts';
import { toOrganizationModel, OrganizationModel } from './organization.model.ts';
import { isUuid } from '../common/is-uuid.ts';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
  ) {}

  async findAll() {
    const rows = await this.repo.find({ order: { createdAt: 'ASC' } });
    return rows.map((row) => toOrganizationModel(row));
  }

  async create(dto: { slug: string; name: string; status?: string }) {
    const exists = await this.repo.findOne({ where: { slug: dto.slug } });
    if (exists) {
      throw new ConflictException(`Organization already exists: ${dto.slug}`);
    }

    const org = this.repo.create({
      slug: dto.slug,
      name: dto.name,
      status: dto.status ?? 'active',
      isPlatform: false,
    });

    const saved = await this.repo.save(org);
    return toOrganizationModel(saved);
  }

  async findById(id: string): Promise<Organization | null> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed organization id');
    }
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    const org = await this.requireById(id);
    if (org.isPlatform) {
      throw new ConflictException('platform organization cannot be deleted');
    }
    const applications = await this.applications.count({
      where: { organization: { id: org.id } },
    });
    if (applications > 0) {
      throw new ConflictException(
        `organization ${org.slug} has ${applications} application(s); delete them first`,
      );
    }
    return this.repo.remove(org);
  }

  async requireById(id: string): Promise<Organization> {
    const org = await this.findById(id);
    if (!org) throw new NotFoundException(`Organization not found ${id}`);

    return org;
  }

  async resolvePlatformOrg(): Promise<Organization> {
    return this.repo.findOneOrFail({ where: { isPlatform: true } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async update(id: string, dto: { name?: string; status?: string }) {
    const org = await this.requireById(id);

    if (dto.name !== undefined) org.name = dto.name;
    if (dto.status !== undefined) org.status = dto.status;

    const saved = await this.repo.save(org);
    return toOrganizationModel(saved);
  }

  async requireBySlug(slug: string): Promise<Organization> {
    const org = await this.findBySlug(slug);
    if (!org) {
      throw new NotFoundException(`Organization not found: ${slug}`);
    }
    return org;
  }

  async findAllForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ) {
    if (!actor.isSuperAdmin) {
      if (!actor.organizationId) return [];
      const rows = await this.repo.find({
        where: { id: actor.organizationId },
        order: { createdAt: 'ASC' },
      });
      return rows.map((row) => toOrganizationModel(row));
    }

    const rows = await this.repo.find({
      where: filter.organizationId ? { id: filter.organizationId } : {},
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => toOrganizationModel(row));
  }
}
