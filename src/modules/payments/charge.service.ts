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
import { PROVIDER_ACCOUNT_STATUS } from '../providers/accounts/entity/provider-account.entity.ts';
import {
  ATTEMPT_STATUS,
  attemptTransition,
  CHARGE_OUTCOME,
  ChargeOutcome,
  PAYMENT_ATTEMPT_OPERATION,
} from './attempt-states.ts';
import { PaymentAttempt } from './entities/payment-attempt.entity.ts';
import { Payment } from './entities/payment.entity.ts';
import { PAYMENT_STATUS, transition } from './states.ts';
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

    const payment = await this.payments.loadById(paymentId, auth);
    if (!payment) {
      throw new ApiError(
        'not_found',
        HttpStatus.NOT_FOUND,
        'payment not found',
      );
    }

    if (payment.status !== PAYMENT_STATUS.CREATED) {
      throw new ApiError(
        'payment_not_chargeable',
        HttpStatus.CONFLICT,
        `payment status is '${payment.status}'; only 'created' payments charge`,
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
    if (
      account.organization.id !== payment.organizationId ||
      account.application.id !== payment.applicationId
    ) {
      throw new ApiError(
        'provider_account_not_found',
        HttpStatus.NOT_FOUND,
        'unknown provider account for this organization',
      );
    }
    const ineligible: string[] = [];
    if (account.status !== PROVIDER_ACCOUNT_STATUS.ENABLED) {
      ineligible.push('account_disabled');
    }
    if (account.environment !== auth.environment) {
      ineligible.push('environment_mismatch');
    }
    if (!account.supportedCurrencies.includes(payment.currency.toUpperCase())) {
      ineligible.push('currency_unsupported');
    }
    if (!account.supportedMethods.includes(payment.method)) {
      ineligible.push('method_unsupported');
    }
    if (ineligible.length > 0) {
      throw new ApiError(
        'provider_account_not_eligible',
        HttpStatus.CONFLICT,
        'the selected provider account cannot process this payment',
        { reasons: ineligible },
      );
    }

    const adapter = await this.factory.forAccount(account);
    const customer = await this.customers.forPayment(payment.id);

    const attempt = await this.attempts.manager.transaction(async (tx) => {
      const currentPayment = await tx.findOne(Payment, {
        where: {
          id: payment.id,
          organizationId: auth.organizationId,
          applicationId: auth.applicationId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentPayment) {
        throw new ApiError(
          'not_found',
          HttpStatus.NOT_FOUND,
          'payment not found',
        );
      }
      if (currentPayment.status !== PAYMENT_STATUS.CREATED) {
        throw new ApiError(
          'payment_not_chargeable',
          HttpStatus.CONFLICT,
          `payment status is '${currentPayment.status}'; only 'created' payments charge`,
        );
      }

      const activeAttempt = await tx.findOne(PaymentAttempt, {
        where: {
          payment: { id: payment.id },
          status: ATTEMPT_STATUS.INITIATED,
        },
      });
      if (activeAttempt) {
        throw new ApiError(
          'payment_not_chargeable',
          HttpStatus.CONFLICT,
          'a charge attempt is already in progress',
        );
      }

      return tx.save(PaymentAttempt, {
        payment: { id: payment.id },
        organization: { id: payment.organizationId },
        providerAccount: { id: payment.providerAccountId! },
        operation: PAYMENT_ATTEMPT_OPERATION.CHARGE,
        status: ATTEMPT_STATUS.INITIATED,
        diagnostics: {},
      });
    });

    let providerReference: string | null = null;
    let redirectUrl: string | null = null;
    let outcome: ChargeOutcome = CHARGE_OUTCOME.NONE;
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
        outcome = CHARGE_OUTCOME.UNKNOWN;
        providerReference = e.providerRef ?? null;
        diagnostics = { phase: 'createCheckout', error: 'timeout' };
      } else if (e instanceof ProviderConfigError) {
        outcome = CHARGE_OUTCOME.FAILED;
        diagnostics = { phase: 'createCheckout', error: 'provider_config', message: e.message };
      } else {
        outcome = CHARGE_OUTCOME.FAILED;
        diagnostics = { phase: 'createCheckout', error: 'provider_error', message: e instanceof Error ? e.message : String(e) };
      }
    }

    await this.attempts.manager.transaction(async (tx) => {
      const row = await tx.findOneByOrFail(PaymentAttempt, { id: attempt.id });

      if (outcome === CHARGE_OUTCOME.FAILED) {
        attemptTransition(row.status, ATTEMPT_STATUS.FAILED);
      } else {
        if (outcome === CHARGE_OUTCOME.UNKNOWN) {
          attemptTransition(row.status, ATTEMPT_STATUS.UNKNOWN);
        }

        const currentPayment = await tx.findOneByOrFail(Payment, {
          id: payment.id,
        });
        if (currentPayment.status !== PAYMENT_STATUS.PROCESSING) {
          transition(currentPayment.status, PAYMENT_STATUS.PROCESSING);
          await tx.update(
            Payment,
            { id: payment.id },
            { status: PAYMENT_STATUS.PROCESSING },
          );
        }
      }

      await tx.update(
        PaymentAttempt,
        { id: attempt.id },
        {
          status: outcome === CHARGE_OUTCOME.NONE ? row.status : outcome,
          providerReference,
          diagnostics: diagnostics as object,
        },
      );
    });

    return { attempt_id: attempt.id, redirect_url: redirectUrl };
  }
}
