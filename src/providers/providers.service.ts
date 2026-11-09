import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderAccount } from './entities/provider-account.entity.ts';
import { Provider } from './entities/provider.entity.ts';
import { CreateProviderAccountDto } from './dto/create-provider-account.dto.ts';
import { UpdateProviderAccountDto } from './dto/update-provider-account.dto.ts';
import { Organization } from '../organizations/entities/organization.entity.ts';
import {
  ProviderAccountModel,
  toProviderAccountModel,
} from './provider-account.model.ts';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderAccount)
    private readonly accounts: Repository<ProviderAccount>,
  ) {}

  async listAccounts(): Promise<ProviderAccountModel[]> {
    const rows = await this.accounts.find({ order: { createdAt: 'ASC' } });
    return rows.map((row) => toProviderAccountModel(row));
  }

  async findEnabledForOrg(
    organizationId: string,
    filter?: { currency?: string; method?: string },
  ): Promise<ProviderAccount[]> {
    const qb = this.accounts
      .createQueryBuilder('a')
      .where('a.organization_id = :orgId', { orgId: organizationId })
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
    const row = await this.accounts.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Provider account not found ${id}`);
    return row;
  }

  listProviders() {
    return this.providers.find({ order: { code: 'ASC' } });
  }

  async requireByCode(code: string): Promise<Provider> {
    const row = await this.providers.findOne({ where: { code } });
    if (!row) throw new NotFoundException(`Provider not found: ${code}`);
    return row;
  }

  async findOneAccount(id: string): Promise<ProviderAccountModel> {
    return toProviderAccountModel(await this.requireById(id));
  }

  async createAccount(dto: CreateProviderAccountDto) {
    const org = await this.accounts.manager.findOne(Organization, {
      where: { id: dto.organizationId },
    });
    if (!org) {
      throw new NotFoundException(`Organization not found ${dto.organizationId}`);
    }
    const provider = await this.providers.findOne({
      where: { code: dto.providerCode },
    });
    if (!provider) {
      throw new NotFoundException(`Provider not found: ${dto.providerCode}`);
    }

    const row = this.accounts.create({
      organizationId: dto.organizationId,
      providerCode: dto.providerCode,
      environment: dto.environment,
      displayName: dto.displayName,
      supportedCurrencies: dto.supportedCurrencies,
      supportedMethods: dto.supportedMethods,
      config: dto.config ?? {},
      credentialsRef: dto.credentialsRef ?? null,
      status: 'disabled',
    });
    const saved = await this.accounts.save(row);
    return toProviderAccountModel(saved);
  }

  async updateAccount(id: string, dto: UpdateProviderAccountDto) {
    const row = await this.requireById(id);

    if (dto.displayName !== undefined) row.displayName = dto.displayName;
    if (dto.supportedCurrencies !== undefined) {
      row.supportedCurrencies = dto.supportedCurrencies;
    }
    if (dto.supportedMethods !== undefined) {
      row.supportedMethods = dto.supportedMethods;
    }
    if (dto.config !== undefined) row.config = dto.config;
    if (dto.status !== undefined) row.status = dto.status;

    const saved = await this.accounts.save(row);
    return toProviderAccountModel(saved);
  }

  async removeAccount(id: string): Promise<void> {
    const row = await this.requireById(id);
    await this.accounts.remove(row);
  }
}
