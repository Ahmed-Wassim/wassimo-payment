import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../common/api-error.ts';
import { CurrenciesService } from '../currencies/currencies.service.ts';
import { ProvidersService } from '../providers/providers.service.ts';
import { CreatePaymentDto } from './dto/create-payment.dto.ts';
import { Payment } from './entities/payment.entity.ts';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
    private readonly currencies: CurrenciesService,
    private readonly providers: ProvidersService,
  ) {}

  async createInTx(
    em: EntityManager,
    auth: AuthContext,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    if (!Number.isInteger(dto.amount_minor) || dto.amount_minor <= 0) {
      throw new ApiError('invalid_amount', HttpStatus.BAD_REQUEST, 'amount_minor must be a positive integer');
    }
    try {
      await this.currencies.requireEnabled(dto.currency);
    } catch {
      throw new ApiError('invalid_currency', HttpStatus.BAD_REQUEST, `unknown or disabled currency ${dto.currency}`);
    }

    const account = await this.providers.requireById(dto.provider_account_id);
    if (!account || account.organizationId !== auth.organizationId) {
      throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
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
        status: 'created',
        providerAccountId: account.id,
        method: dto.method,
        capturedMinor: '0',
        refundedConfirmedMinor: '0',
      });
      return payment;
    } catch (e) {
      if ((e as { code?: string })?.code === '23505') {
        throw new ApiError('payment_reference_conflict', HttpStatus.CONFLICT, 'a payment already exists for this reference');
      }
      throw e;
    }
  }

  async loadById(id: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { id } });
  }
}
