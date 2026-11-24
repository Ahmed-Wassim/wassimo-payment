import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { FilterDto } from '../../common/dto/filter.dto.ts';
import { CurrenciesService } from '../currencies/currencies.service.ts';
import { ProviderAccountsService } from '../providers/accounts/provider-accounts.service.ts';
import { CreatePaymentDto } from './dto/create-payment.dto.ts';
import { Payment } from './entities/payment.entity.ts';
import { CustomersService } from '../customers/customers.service.ts';
import { PAYMENT_STATUS } from './states.ts';
import { toPaymentModel, type PaymentModel } from './mappers/payment.mapper.ts';

type Actor = { organizationId: string | null; isSuperAdmin: boolean };

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
    private readonly currencies: CurrenciesService,
    private readonly providers: ProviderAccountsService,
    private readonly customers: CustomersService,
  ) {}

  async createInTx(
    em: EntityManager,
    auth: AuthContext,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    if (!Number.isSafeInteger(dto.amount_minor) || dto.amount_minor <= 0) {
      throw new ApiError('invalid_amount', HttpStatus.BAD_REQUEST, 'amount_minor must be a positive safe integer');
    }
    try {
      await this.currencies.requireEnabled(dto.currency);
    } catch {
      throw new ApiError('invalid_currency', HttpStatus.BAD_REQUEST, `unknown or disabled currency ${dto.currency}`);
    }

    const account = await this.providers.requireById(dto.provider_account_id);
    if (
      !account ||
      account.organization.id !== auth.organizationId ||
      account.application.id !== auth.applicationId
    ) {
      throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this application');
    }
    const ineligible: string[] = [];
    if (account.status !== 'enabled') ineligible.push('account_disabled');
    if (account.environment !== auth.environment) ineligible.push('environment_mismatch');
    if (!account.supportedCurrencies.includes(dto.currency.toUpperCase())) ineligible.push('currency_unsupported');
    if (!account.supportedMethods.includes(dto.method)) ineligible.push('method_unsupported');
    if (ineligible.length > 0) {
      throw new ApiError('provider_account_not_eligible', HttpStatus.CONFLICT, 'the selected provider account cannot process this payment', { reasons: ineligible });
    }

    try {
      const payment = await em.save(Payment, {
        organizationId: auth.organizationId,
        applicationId: auth.applicationId,
        reference: dto.reference,
        amountMinor: String(dto.amount_minor),
        currency: dto.currency.toUpperCase(),
        status: PAYMENT_STATUS.CREATED,
        providerAccountId: account.id,
        method: dto.method,
        capturedMinor: '0',
        refundedConfirmedMinor: '0',
      });
      if (dto.customer_details) {
        await this.customers.snapshotInTx(em, payment.id, dto.customer_details);
      }
      return payment;
    } catch (e) {
      if ((e as { code?: string })?.code === '23505') {
        throw new ApiError('payment_reference_conflict', HttpStatus.CONFLICT, 'a payment already exists for this reference');
      }
      throw e;
    }
  }

  async loadById(
    id: string,
    auth: { organizationId: string; applicationId?: string },
  ): Promise<Payment | null> {
    const where: { id: string; organizationId: string; applicationId?: string } = {
      id,
      organizationId: auth.organizationId,
    };
    if (auth.applicationId) where.applicationId = auth.applicationId;
    return this.repo.findOne({ where });
  }

  async loadByIdForActor(
    id: string,
    actor: Actor,
  ): Promise<Payment | null> {
    if (!isUuid(id)) {
      throw new BadRequestException('malformed payment id');
    }
    const where: { id: string; organizationId?: string } = { id };
    if (!actor.isSuperAdmin) {
      if (!actor.organizationId) return null;
      where.organizationId = actor.organizationId;
    }
    return this.repo.findOne({ where });
  }

  async listForActor(actor: Actor, filter: FilterDto): Promise<PaymentModel[]> {
    const organizationId = actor.isSuperAdmin
      ? filter.organizationId ?? null
      : actor.organizationId;
    if (!actor.isSuperAdmin && !organizationId) return [];

    const qb = this.repo
      .createQueryBuilder('p')
      .orderBy('p.created_at', 'DESC');

    if (organizationId) {
      qb.andWhere('p.organization_id = :organizationId', { organizationId });
    }
    if (filter.applicationId) {
      qb.andWhere('p.application_id = :applicationId', {
        applicationId: filter.applicationId,
      });
    }

    const rows = await qb.getMany();
    return Promise.all(
      rows.map(async (row) =>
        toPaymentModel(row, await this.customers.forPayment(row.id)),
      ),
    );
  }

  async requireByIdForActor(actor: Actor, id: string): Promise<PaymentModel> {
    const row = await this.loadByIdForActor(id, actor);
    if (!row) {
      throw new NotFoundException(`Payment not found ${id}`);
    }
    return toPaymentModel(row, await this.customers.forPayment(row.id));
  }

  async customerFor(paymentId: string) {
    return this.customers.forPayment(paymentId);
  }
}
