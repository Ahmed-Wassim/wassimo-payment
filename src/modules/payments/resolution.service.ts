import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import { ProviderOutcomeResult } from '../providers/integrations/adapter.ts';
import { PaymentProviderFactory } from '../providers/integrations/payment-provider.factory.ts';
import { ProviderAccountsService } from '../providers/accounts/provider-accounts.service.ts';
import { attemptRecoveryTransition, AttemptStatus } from './attempt-states.ts';
import { PaymentAttempt } from './entities/payment-attempt.entity.ts';
import { Payment } from './entities/payment.entity.ts';
import { PaymentStatus, recoveryTransition, transition } from './states.ts';
import { PaymentsService } from './payments.service.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
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

    if (payment.status === 'succeeded' || payment.status === 'expired') {
      throw new ApiError(
        'nothing_to_resolve',
        HttpStatus.CONFLICT,
        'nothing unresolved on this payment',
      );
    }

    const recoverable = payment.status === 'failed';
    const selectableStatuses: AttemptStatus[] = recoverable
      ? ['failed']
      : ['unknown', 'initiated'];
    const attempt = await this.attempts
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.providerAccount', 'providerAccount')
      .where('a.payment_id = :pid', { pid: payment.id })
      .andWhere('a.status IN (:...statuses)', {
        statuses: selectableStatuses,
      })
      .orderBy("CASE WHEN a.status = 'unknown' THEN 0 ELSE 1 END")
      .addOrderBy('a.createdAt', 'ASC')
      .getOne();

    if (!attempt) {
      throw new ApiError(
        'nothing_to_resolve',
        HttpStatus.CONFLICT,
        'nothing unresolved on this payment',
      );
    }

    let account;
    try {
      account = await this.providers.requireById(attempt.providerAccount.id);
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

    let outcome: ProviderOutcomeResult = 'unknown';
    if (attempt.providerReference) {
      try {
        outcome = (await adapter.queryStatus(attempt.providerReference)).result;
      } catch {
        outcome = 'unknown';
      }
    }

    if (outcome !== 'succeeded' && outcome !== 'failed') {
      return payment;
    }
    if (outcome === 'failed' && payment.status === 'failed') {
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

      if (fresh.status === 'created') {
        transition(fresh.status, 'processing');
        await tx.update(Payment, { id: payment.id }, { status: 'processing' });
      }

      const current: PaymentStatus =
        fresh.status === 'created' ? 'processing' : fresh.status;
      recoveryTransition(current, outcome);
      if (outcome === 'succeeded') {
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
      if (outcome === 'succeeded' && fresh.status !== 'succeeded') {
        await this.outbox.writeSucceeded(tx, updated);
      }
      if (outcome === 'failed' && current !== 'failed') {
        await this.outbox.writeFailed(tx, updated);
      }

      return updated;
    });
  }
}
