import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Application } from './entities/application.entity.ts';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity.ts';
import { UpdateApplicationDto } from './dto/update-application.dto.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { toApplicationModel } from './application.model.ts';
import { isUuid } from '../../common/is-uuid.ts';
import { ApiCredential } from '../credentials/entities/api-credential.entity.ts';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly repo: Repository<Application>,
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
    @InjectRepository(ApiCredential)
    private readonly credentials: Repository<ApiCredential>,
  ) {}

  async findAll() {
    const rows = await this.repo.find({
      relations: { organization: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => toApplicationModel(row));
  }

  async listForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ) {
    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;
    const rows = await this.repo.find({
      where: organizationId ? { organization: { id: organizationId } } : {},
      relations: { organization: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => toApplicationModel(row));
  }

  async requireById(id: string): Promise<Application> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed application id');
    }
    const app = await this.repo.findOne({
      where: { id },
      relations: { organization: true },
    });
    if (!app) throw new NotFoundException(`Application not found ${id}`);
    return app;
  }

  async requireByIdForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    id: string,
  ): Promise<Application> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed application id');
    }
    const app = await this.repo.findOne({
      where: { id },
      relations: { organization: true },
    });
    if (!app || (!actor.isSuperAdmin && app.organization?.id !== actor.organizationId)) {
      throw new NotFoundException(`Application not found ${id}`);
    }
    return app;
  }

  async createForOrg(
    organizationId: string | null,
    dto: { slug: string; name: string },
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required for platform actors creating applications',
      );
    }
    return this.create({ slug: dto.slug, name: dto.name, organizationId });
  }

  async create(dto: { slug: string; name: string; organizationId: string }) {
    const slugTaken = await this.repo.findOne({ where: { slug: dto.slug } });
    if (slugTaken) {
      throw new ConflictException(
        `Application slug already taken: ${dto.slug}`,
      );
    }

    const org = await this.orgs.findOne({ where: { id: dto.organizationId } });
    if (!org) {
      throw new NotFoundException(
        `Organization not found for application: ${dto.organizationId}`,
      );
    }

    const app = this.repo.create({
      slug: dto.slug,
      name: dto.name,
      organization: org,
    });

    const saved = await this.repo.save(app);
    return toApplicationModel(saved);
  }

  async update(actor: { organizationId: string | null; isSuperAdmin: boolean }, id: string, dto: UpdateApplicationDto) {
    const app = await this.requireByIdForActor(actor, id);

    if (dto.name !== undefined) app.name = dto.name;
    if (dto.status !== undefined) app.status = dto.status;

    const saved = await this.repo.save(app);
    return toApplicationModel(saved);
  }

  async remove(actor: { organizationId: string | null; isSuperAdmin: boolean }, id: string) {
    const app = await this.requireByIdForActor(actor, id);

    const credentials = await this.credentials.count({
      where: { application: { id: app.id } },
    });
    if (credentials > 0) {
      throw new ConflictException(
        `application ${app.slug} has ${credentials} credential(s); revoke or delete them first`,
      );
    }

    return this.repo.remove(app);
  }
}
