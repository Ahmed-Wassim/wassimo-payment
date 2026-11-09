import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Application } from './entities/application.entity.ts';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity.ts';
import { UpdateApplicationDto } from './dto/update-application.dto.ts';
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
    return this.repo.find({
      relations: { organization: true },
      order: { createdAt: 'ASC' },
    });
  }

  async requireById(id: string): Promise<Application> {
    const app = await this.repo.findOne({
      where: { id },
      relations: { organization: true },
    });
    if (!app) throw new NotFoundException(`Application not found ${id}`);
    return app;
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

    return this.repo.save(app);
  }

  async update(id: string, dto: UpdateApplicationDto) {
    const app = await this.requireById(id);

    if (dto.name !== undefined) app.name = dto.name;
    if (dto.status !== undefined) app.status = dto.status;

    return this.repo.save(app);
  }

  async remove(id: string) {
    const app = await this.requireById(id);

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
