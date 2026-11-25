import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JsonContains, Repository } from 'typeorm';
import { ApiError } from '../../../common/errors/api-error.ts';
import { FilterDto } from '../../../common/dto/filter.dto.ts';
import { Application } from '../../applications/entities/application.entity.ts';
import { Organization } from '../../organizations/entities/organization.entity.ts';
import { isUuid } from '../../../common/utils/is-uuid.ts';
import { Provider, ProviderMethod } from '../provider.entity.ts';
import { ProvidersService } from '../providers.service.ts';
import {
  ProviderAccount,
  PROVIDER_ACCOUNT_STATUS,
} from './entity/provider-account.entity.ts';
import { CreateProviderAccountDto } from './dto/create-provider-account.dto.ts';
import { UpdateProviderAccountDto } from './dto/update-provider-account.dto.ts';
import {
  ProviderAccountModel,
  toProviderAccountModel,
} from './mapper/provider-account.mapper.ts';

@Injectable()
export class ProviderAccountsService {
  constructor(
    @InjectRepository(ProviderAccount)
    private readonly accounts: Repository<ProviderAccount>,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    private readonly providers: ProvidersService,
  ) {}

  async listAccounts(): Promise<ProviderAccountModel[]> {
    const rows = await this.accounts.find({
      relations: { organization: true, application: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => toProviderAccountModel(row));
  }

  async listAccountsForActor(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    filter: FilterDto,
  ): Promise<ProviderAccountModel[]> {
    const organizationId = actor.isSuperAdmin
      ? filter.organizationId
      : actor.organizationId;
    if (!actor.isSuperAdmin && !organizationId) return [];

    const rows = await this.accounts.find({
      where: {
        ...(organizationId && { organization: { id: organizationId } }),
        ...(filter.applicationId && {
          application: { id: filter.applicationId },
        }),
      },
      relations: { organization: true, application: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => toProviderAccountModel(row));
  }

  async findForContext(
    context: { organizationId: string; applicationId: string },
    filter?: { currency?: string; method?: string },
  ): Promise<ProviderAccount[]> {
    return this.accounts.find({
      where: {
        organization: { id: context.organizationId },
        application: { id: context.applicationId },
        status: PROVIDER_ACCOUNT_STATUS.ENABLED,
        ...(filter?.currency && {
          supportedCurrencies: JsonContains([filter.currency]),
        }),
        ...(filter?.method && {
          supportedMethods: JsonContains([filter.method]),
        }),
      },
    });
  }

  async requireById(id: string): Promise<ProviderAccount> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed provider account id');
    }
    const row = await this.accounts.findOne({
      where: { id },
      relations: { organization: true, application: true },
    });
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
    const row = await this.accounts.findOne({
      where: { id },
      relations: { organization: true, application: true },
    });
    if (!row || (!actor.isSuperAdmin && row.organization.id !== actor.organizationId)) {
      throw new NotFoundException(`Provider account not found ${id}`);
    }
    return row;
  }

  async findOneAccount(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    id: string,
  ): Promise<ProviderAccountModel> {
    return toProviderAccountModel(await this.requireByIdForActor(actor, id));
  }

  async createAccount(
    actor: { organizationId: string | null; isSuperAdmin: boolean },
    dto: CreateProviderAccountDto,
  ) {
    const organizationId = actor.isSuperAdmin
      ? dto.organizationId
      : actor.organizationId;
    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required for platform actors creating accounts',
      );
    }

    const org = await this.organizations.findOne({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException(`Organization not found ${organizationId}`);
    }
    const application = await this.applications.findOne({
      where: {
        id: dto.applicationId,
        organization: { id: organizationId },
      },
    });
    if (!application) {
      throw new NotFoundException(`Application not found ${dto.applicationId}`);
    }
    const provider = await this.providers.requireByCode(dto.providerCode);
    this.validateProviderAccountMethods(provider, dto.supportedMethods);

    const row = this.accounts.create({
      organization: org,
      application,
      providerCode: dto.providerCode,
      environment: dto.environment,
      displayName: dto.displayName,
      supportedCurrencies: dto.supportedCurrencies,
      supportedMethods: dto.supportedMethods,
      config: dto.config ?? {},
      status: PROVIDER_ACCOUNT_STATUS.ENABLED,
    });
    const saved = await this.accounts.save(row);
    return toProviderAccountModel(saved);
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
      const provider = await this.providers.requireByCode(row.providerCode);
      this.validateProviderAccountMethods(provider, dto.supportedMethods);
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

  private validateProviderAccountMethods(
    provider: Provider,
    requested: string[],
  ): void {
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
