import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiError } from '../../common/errors/api-error.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { ProviderAccount } from './entities/provider-account.entity.ts';
import { toProviderModel } from './mappers/provider.mapper.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { Provider, ProviderMethod } from './entities/provider.entity.ts';
import { CreateProviderAccountDto } from './dto/create-provider-account.dto.ts';
import { UpdateProviderAccountDto } from './dto/update-provider-account.dto.ts';
import { Organization } from '../organizations/entities/organization.entity.ts';
import { Application } from '../applications/entities/application.entity.ts';
import {
  ProviderAccountModel,
  toProviderAccountModel,
} from './mappers/provider-account.mapper.ts';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderAccount)
    private readonly accounts: Repository<ProviderAccount>,
  ) {}

  async listAccounts(): Promise<ProviderAccountModel[]> {
    const rows = await this.accounts.find({ relations: { organization: true, application: true }, order: { createdAt: 'ASC' } });
    return rows.map((row) => toProviderAccountModel(row));
  }

  async listAccountsForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ): Promise<ProviderAccountModel[]> {
    const rows = await this.accounts.find({ relations: { organization: true, application: true }, order: { createdAt: 'ASC' } });

    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;

    const filtered = rows.filter((r) => {
      if (organizationId && r.organization.id !== organizationId) return false;
      if (filter.applicationId && r.application.id !== filter.applicationId) return false;
      return true;
    });

    return filtered.map((row) => toProviderAccountModel(row));
  }

  async findForContext(
    context: { organizationId: string; applicationId: string },
    filter?: { currency?: string; method?: string },
  ): Promise<ProviderAccount[]> {
    const qb = this.accounts
      .createQueryBuilder('a')
      .where('a.organization_id = :orgId', { orgId: context.organizationId })
      .andWhere('a.application_id = :appId', { appId: context.applicationId })
      .andWhere('a.status = :status', { status: 'enabled' });
    if (filter?.currency) {
      qb.andWhere('a.supported_currencies @> :currencies::jsonb', {
        currencies: JSON.stringify([filter.currency]),
      });
    }
    if (filter?.method) {
      qb.andWhere('a.supported_methods @> :methods::jsonb', {
        methods: JSON.stringify([filter.method]),
      });
    }
    return qb.getMany();
  }

  async requireById(id: string): Promise<ProviderAccount> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed provider account id');
    }
    const row = await this.accounts.findOne({ where: { id }, relations: { organization: true, application: true } });
    if (!row) throw new NotFoundException(`Provider account not found ${id}`);
    return row;
  }

  async requireByIdForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    id: string,
  ): Promise<ProviderAccount> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed provider account id');
    }
    const row = await this.accounts.findOne({ where: { id }, relations: { organization: true, application: true } });
    if (!row || (!actor.isSuperAdmin && row.organization.id !== actor.organizationId)) {
      throw new NotFoundException(`Provider account not found ${id}`);
    }
    return row;
  }

  listProviders() {
    return this.providers.find({ order: { code: 'ASC' } }).then((rows) =>
      rows.map((row) => toProviderModel(row)),
    );
  }

  async requireByCode(code: string): Promise<Provider> {
    const row = await this.providers.findOne({ where: { code } });
    if (!row) throw new NotFoundException(`Provider not found: ${code}`);
    return row;
  }

  async findOneAccount(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    id: string,
  ): Promise<ProviderAccountModel> {
    return toProviderAccountModel(await this.requireByIdForActor(actor, id));
  }

  async createAccount(dto: CreateProviderAccountDto) {
    const org = await this.accounts.manager.findOne(Organization, {
      where: { id: dto.organizationId },
    });
    if (!org) {
      throw new NotFoundException(`Organization not found ${dto.organizationId}`);
    }
    const application = await this.accounts.manager.findOne(Application, {
      where: {
        id: dto.applicationId,
        organization: { id: dto.organizationId },
      },
    });
    if (!application) {
      throw new NotFoundException(`Application not found ${dto.applicationId}`);
    }
    const provider = await this.providers.findOne({
      where: { code: dto.providerCode },
    });
    if (!provider) {
      throw new NotFoundException(`Provider not found: ${dto.providerCode}`);
    }
    this.assertMethodsSupported(provider, dto.supportedMethods);

    const row = this.accounts.create({
      organization: org as any,
      application: application as any,
      providerCode: dto.providerCode,
      environment: dto.environment,
      displayName: dto.displayName,
      supportedCurrencies: dto.supportedCurrencies,
      supportedMethods: dto.supportedMethods,
      config: dto.config ?? {},
      status: 'disabled',
    });
    const saved = await this.accounts.save(row);
    return toProviderAccountModel(saved);
  }

  async createAccountForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    dto: CreateProviderAccountDto,
  ) {
    const orgId = actor.isSuperAdmin ? dto.organizationId : actor.organizationId;
    if (!orgId) {
      throw new BadRequestException(
        'organizationId is required for platform actors creating accounts',
      );
    }
    return this.createAccount({ ...dto, organizationId: orgId });
  }

  async updateAccount(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    id: string,
    dto: UpdateProviderAccountDto,
  ) {
    const row = await this.requireByIdForActor(actor, id);

    if (dto.displayName !== undefined) row.displayName = dto.displayName;
    if (dto.supportedCurrencies !== undefined) {
      row.supportedCurrencies = dto.supportedCurrencies;
    }
    if (dto.supportedMethods !== undefined) {
      const provider = await this.requireByCode(row.providerCode);
      this.assertMethodsSupported(provider, dto.supportedMethods);
      row.supportedMethods = dto.supportedMethods;
    }
    if (dto.config !== undefined) row.config = dto.config;
    if (dto.status !== undefined) row.status = dto.status;

    const saved = await this.accounts.save(row);
    return toProviderAccountModel(saved);
  }

  async removeAccount(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    id: string,
  ): Promise<void> {
    const row = await this.requireByIdForActor(actor, id);
    await this.accounts.remove(row);
  }

  private assertMethodsSupported(provider: Provider, requested: string[]): void {
    const catalogue = new Map<string, ProviderMethod>(
      provider.methods.map((method) => [method.code, method]),
    );
    const rejected = requested.filter((code) => {
      const entry = catalogue.get(code);
      return !entry || entry.is_special === true;
    });
    if (rejected.length > 0) {
      throw new ApiError(
        'provider_method_unsupported',
        HttpStatus.BAD_REQUEST,
        'requested methods are not selectable for this provider account',
        { rejected },
      );
    }
  }
}
