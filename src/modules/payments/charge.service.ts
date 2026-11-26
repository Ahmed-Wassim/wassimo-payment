import { HttpStatus, Injectable } from '@nestjs/common';
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
import { ensureProviderAccountEligible } from '../providers/accounts/eligibility/provider-account-eligibility.ts';
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
    returnUrl?: string | null,
  ): Promise<{ attempt_id: string; redirect_url: string | null }> {
    const payment = await this.payments.requireById(paymentId, auth);
    if (payment.status !== PAYMENT_STATUS.CREATED) {
      throw this.notChargeable(
        `payment status is '${payment.status}'; only 'created' payments charge`,
      );
    }
    if (!payment.providerAccountId || !payment.method) {
      throw this.notChargeable(
        'payment is missing a frozen provider selection',
      );
    }

    const account = await this.providers.requireInScope(
      payment.providerAccountId,
      {
        organizationId: payment.organizationId,
        applicationId: payment.applicationId,
      },
    );

    ensureProviderAccountEligible(account, {
      environment: auth.environment,
      currency: payment.currency,
      method: payment.method,
    });

    const adapter = await this.factory.forAccount(account);
    const customer = await this.customers.forPayment(payment.id);

    const attempt = await this.attempts.manager.transaction(async (tx) => {
      const current = await tx.findOne(Payment, {
        where: {
          id: payment.id,
          organizationId: auth.organizationId,
          applicationId: auth.applicationId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) {
        throw new ApiError(
          'not_found',
          HttpStatus.NOT_FOUND,
          'payment not found',
        );
      }
      if (current.status !== PAYMENT_STATUS.CREATED) {
        throw this.notChargeable(
          `payment status is '${current.status}'; only 'created' payments charge`,
        );
      }

      const activeAttempt = await tx.findOne(PaymentAttempt, {
        where: {
          payment: { id: payment.id },
          status: ATTEMPT_STATUS.INITIATED,
        },
      });
      if (activeAttempt) {
        throw this.notChargeable('a charge attempt is already in progress');
      }

      return tx.save(PaymentAttempt, tx.create(PaymentAttempt, {
        payment: { id: payment.id },
        organization: { id: payment.organizationId },
        providerAccount: { id: payment.providerAccountId! },
        operation: PAYMENT_ATTEMPT_OPERATION.CHARGE,
        status: ATTEMPT_STATUS.INITIATED,
        diagnostics: {},
      }));
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
        method: payment.method!,
        customerDetails: customer ? toCustomerDetails(customer) : null,
        returnUrl: returnUrl ?? null,
      });
      providerReference = result.providerReference;
      redirectUrl = result.redirectUrl;
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        outcome = CHARGE_OUTCOME.UNKNOWN;
        providerReference = error.providerRef ?? null;
        diagnostics = { phase: 'createCheckout', error: 'timeout' };
      } else {
        outcome = CHARGE_OUTCOME.FAILED;
        diagnostics = {
          phase: 'createCheckout',
          error:
            error instanceof ProviderConfigError
              ? 'provider_config'
              : 'provider_error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    await this.attempts.manager.transaction(async (tx) => {
      const currentAttempt = await tx.findOneByOrFail(PaymentAttempt, {
        id: attempt.id,
      });

      if (outcome === CHARGE_OUTCOME.FAILED) {
        attemptTransition(currentAttempt.status, ATTEMPT_STATUS.FAILED);
      } else {
        if (outcome === CHARGE_OUTCOME.UNKNOWN) {
          attemptTransition(currentAttempt.status, ATTEMPT_STATUS.UNKNOWN);
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
          status:
            outcome === CHARGE_OUTCOME.NONE ? currentAttempt.status : outcome,
          providerReference,
          diagnostics: diagnostics as object,
        },
      );
    });

    return { attempt_id: attempt.id, redirect_url: redirectUrl };
  }

  private notChargeable(message: string) {
    return new ApiError('payment_not_chargeable', HttpStatus.CONFLICT, message);
  }
}
