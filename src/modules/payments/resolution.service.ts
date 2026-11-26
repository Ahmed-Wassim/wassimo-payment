import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import { PROVIDER_RESULT } from '../providers/integrations/adapter.ts';
import type { Outcome } from '../providers/integrations/adapter.ts';
import { PaymentProviderFactory } from '../providers/integrations/payment-provider.factory.ts';
import { ProviderAccountsService } from '../providers/accounts/provider-accounts.service.ts';
import {
  ATTEMPT_STATUS,
  attemptRecoveryTransition,
  AttemptStatus,
} from './attempt-states.ts';
import { PaymentAttempt } from './entities/payment-attempt.entity.ts';
import { Payment } from './entities/payment.entity.ts';
import {
  PAYMENT_STATUS,
  PaymentStatus,
  recoveryTransition,
  transition,
} from './states.ts';
import { PaymentsService } from './payments.service.ts';
import { OutboxService } from '../../outbox/outbox.service.ts';

@Injectable()
export class ResolutionService {
  constructor(
    @InjectRepository(PaymentAttempt)
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly payments: PaymentsService,
    private readonly providers: ProviderAccountsService,
    private readonly factory: PaymentProviderFactory,
    private readonly outbox: OutboxService,
  ) {}

  async resolve(auth: AuthContext, paymentId: string): Promise<Payment> {
    const payment = await this.payments.requireById(paymentId, auth);

    if (
      payment.status === PAYMENT_STATUS.SUCCEEDED ||
      payment.status === PAYMENT_STATUS.EXPIRED
    ) {
      throw new ApiError(
        'nothing_to_resolve',
        HttpStatus.CONFLICT,
        'nothing unresolved on this payment',
      );
    }

    const recoverable = payment.status === PAYMENT_STATUS.FAILED;
    const selectableStatuses: AttemptStatus[] = recoverable
      ? [ATTEMPT_STATUS.FAILED]
      : [ATTEMPT_STATUS.UNKNOWN, ATTEMPT_STATUS.INITIATED];
    const attempt = await this.attempts
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.providerAccount', 'providerAccount')
      .where('a.payment_id = :pid', { pid: payment.id })
      .andWhere('a.status IN (:...statuses)', {
        statuses: selectableStatuses,
      })
      .orderBy('CASE WHEN a.status = :unknown THEN 0 ELSE 1 END')
      .setParameter('unknown', ATTEMPT_STATUS.UNKNOWN)
      .addOrderBy('a.createdAt', 'ASC')
      .getOne();

    if (!attempt) {
      throw new ApiError(
        'nothing_to_resolve',
        HttpStatus.CONFLICT,
        'nothing unresolved on this payment',
      );
    }

    const account = await this.providers.requireInScope(
      attempt.providerAccount.id,
      { organizationId: payment.organizationId },
    );

    const adapter = await this.factory.forAccount(account);

    let providerOutcome: Outcome = { result: PROVIDER_RESULT.UNKNOWN };
    try {
      if (attempt.providerReference) {
        providerOutcome = await adapter.queryStatus(attempt.providerReference);
      } else if (adapter.queryStatusByPaymentId) {
        providerOutcome = await adapter.queryStatusByPaymentId(payment.id);
      }
    } catch {
      providerOutcome = { result: PROVIDER_RESULT.UNKNOWN };
    }
    const outcome = providerOutcome.result;

    if (
      outcome !== PROVIDER_RESULT.SUCCEEDED &&
      outcome !== PROVIDER_RESULT.FAILED
    ) {
      return payment;
    }
    if (
      outcome === PROVIDER_RESULT.FAILED &&
      payment.status === PAYMENT_STATUS.FAILED
    ) {
      return payment;
    }

    return this.attempts.manager.transaction(async (tx) => {
      const attemptRow = await tx.findOneByOrFail(PaymentAttempt, {
        id: attempt.id,
      });
      attemptRecoveryTransition(attemptRow.status, outcome);
      await tx.update(
        PaymentAttempt,
        { id: attemptRow.id },
        { status: outcome },
      );

      const fresh = await tx.findOneByOrFail(Payment, { id: payment.id });

      if (fresh.status === PAYMENT_STATUS.CREATED) {
        transition(fresh.status, PAYMENT_STATUS.PROCESSING);
        await tx.update(Payment, { id: payment.id }, {
          status: PAYMENT_STATUS.PROCESSING,
        });
      }

      const current: PaymentStatus =
        fresh.status === PAYMENT_STATUS.CREATED
          ? PAYMENT_STATUS.PROCESSING
          : fresh.status;
      recoveryTransition(current, outcome);
      if (outcome === PROVIDER_RESULT.SUCCEEDED) {
        await tx.update(
          Payment,
          { id: payment.id },
          {
            status: outcome,
            capturedMinor: fresh.amountMinor,
          },
        );
      } else {
        await tx.update(Payment, { id: payment.id }, { status: outcome });
      }

      const updated = await tx.findOneByOrFail(Payment, { id: payment.id });
      if (
        outcome === PROVIDER_RESULT.SUCCEEDED &&
        fresh.status !== PAYMENT_STATUS.SUCCEEDED
      ) {
        await this.outbox.writeSucceeded(tx, updated);
      }
      if (
        outcome === PROVIDER_RESULT.FAILED &&
        current !== PAYMENT_STATUS.FAILED
      ) {
        await this.outbox.writeFailed(tx, updated, providerOutcome.failureReason);
      }

      return updated;
    });
  }
}
