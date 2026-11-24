import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import {
  ProviderConfigError,
  ProviderTimeoutError,
} from '../providers/integrations/adapter.ts';
import { PaymentProviderFactory } from '../providers/integrations/payment-provider.factory.ts';
import { ProviderAccountsService } from '../providers/accounts/provider-accounts.service.ts';
import { attemptTransition, ChargeOutcome } from './attempt-states.ts';
import { PaymentAttempt } from './entities/payment-attempt.entity.ts';
import { Payment } from './entities/payment.entity.ts';
import { transition } from './states.ts';
import { PaymentsService } from './payments.service.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { CustomersService } from '../customers/customers.service.ts';
import { toCustomerDetails } from '../customers/mappers/customer-details.mapper.ts';

@Injectable()
export class ChargeService {
  constructor(
    @InjectRepository(PaymentAttempt)
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly payments: PaymentsService,
    private readonly providers: ProviderAccountsService,
    private readonly factory: PaymentProviderFactory,
    private readonly customers: CustomersService,
  ) {}

  async charge(
    auth: AuthContext,
    paymentId: string,
  ): Promise<{ attempt_id: string; redirect_url: string | null }> {
    if (!isUuid(paymentId)) {
      throw new ApiError(
        'validation_error',
        HttpStatus.BAD_REQUEST,
        'malformed payment id',
      );
    }

    const payment = await this.payments.loadById(paymentId);
    if (!payment || payment.organizationId !== auth.organizationId) {
      throw new ApiError(
        'not_found',
        HttpStatus.NOT_FOUND,
        'payment not found',
      );
    }

    if (payment.status !== 'created') {
      throw new ApiError(
        'payment_not_chargeable',
        HttpStatus.CONFLICT,
        `payment status is '${payment.status}'; only 'created' payments charge`,
      );
    }

    const unresolved = await this.attempts.findOne({
      where: { payment: { id: payment.id }, status: 'unknown' },
    });
    if (unresolved) {
      throw new ApiError(
        'unresolved_attempt',
        HttpStatus.CONFLICT,
        'an earlier attempt has an unknown outcome — resolve it first',
      );
    }

    if (!payment.providerAccountId || !payment.method) {
      throw new ApiError(
        'payment_not_chargeable',
        HttpStatus.CONFLICT,
        'payment is missing a frozen provider selection',
      );
    }

    let account;
    try {
      account = await this.providers.requireById(payment.providerAccountId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new ApiError(
          'provider_account_not_found',
          HttpStatus.NOT_FOUND,
          'unknown provider account for this organization',
        );
      }
      throw e;
    }
    if (account.organization.id !== payment.organizationId) {
      throw new ApiError(
        'provider_account_not_found',
        HttpStatus.NOT_FOUND,
        'unknown provider account for this organization',
      );
    }

    const adapter = await this.factory.forAccount(account);
    const customer = await this.customers.forPayment(payment.id);

    const attempt = await this.attempts.manager.transaction(async (tx) =>
      tx.save(PaymentAttempt, {
        payment: { id: payment.id },
        organization: { id: payment.organizationId },
        providerAccount: { id: payment.providerAccountId! },
        operation: 'charge',
        status: 'initiated',
        diagnostics: {},
      }),
    );

    let providerReference: string | null = null;
    let redirectUrl: string | null = null;
    let outcome: ChargeOutcome = 'none';
    let diagnostics: Record<string, unknown> = {};

    try {
      const result = await adapter.createCheckout({
        paymentId: payment.id,
        amountMinor: BigInt(payment.amountMinor),
        currency: payment.currency,
        method: payment.method,
        customerDetails: customer ? toCustomerDetails(customer) : null,
      });
      providerReference = result.providerReference;
      redirectUrl = result.redirectUrl;
    } catch (e) {
      if (e instanceof ProviderTimeoutError) {
        outcome = 'unknown';
        diagnostics = { phase: 'createCheckout', error: 'timeout' };
      } else if (e instanceof ProviderConfigError) {
        outcome = 'failed';
        diagnostics = { phase: 'createCheckout', error: 'provider_config', message: e.message };
      } else {
        outcome = 'failed';
        diagnostics = { phase: 'createCheckout', error: 'provider_error', message: e instanceof Error ? e.message : String(e) };
      }
    }

    await this.attempts.manager.transaction(async (tx) => {
      const row = await tx.findOneByOrFail(PaymentAttempt, { id: attempt.id });

      if (outcome === 'failed') {
        attemptTransition(row.status, 'failed');
      } else {
        if (outcome === 'unknown') {
          attemptTransition(row.status, 'unknown');
        }

        const currentPayment = await tx.findOneByOrFail(Payment, {
          id: payment.id,
        });
        if (currentPayment.status !== 'processing') {
          transition(currentPayment.status, 'processing');
          await tx.update(
            Payment,
            { id: payment.id },
            { status: 'processing' },
          );
        }
      }

      await tx.update(
        PaymentAttempt,
        { id: attempt.id },
        {
          status: outcome === 'none' ? row.status : outcome,
          providerReference,
          diagnostics: diagnostics as object,
        },
      );
    });

    return { attempt_id: attempt.id, redirect_url: redirectUrl };
  }
}
