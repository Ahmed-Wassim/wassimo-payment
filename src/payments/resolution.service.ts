import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../common/api-error.ts';
import { PaymentProviderFactory } from '../providers/payment-provider.factory.ts';
import { ProvidersService } from '../providers/providers.service.ts';
import { attemptTransition } from './attempt-states.ts';
import { PaymentAttempt } from './entities/payment-attempt.entity.ts';
import { Payment } from './entities/payment.entity.ts';
import { transition } from './states.ts';
import { PaymentsService } from './payments.service.ts';
import { isUuid } from './uuid.ts';

@Injectable()
export class ResolutionService {
  constructor(
    @InjectRepository(PaymentAttempt)
    private readonly attempts: Repository<PaymentAttempt>,
    @InjectRepository(Payment)
    private readonly payments: PaymentsService,
    private readonly providers: ProvidersService,
    private readonly factory: PaymentProviderFactory,
  ) {}

  async resolve(auth: AuthContext, paymentId: string): Promise<Payment> {
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

    if (payment.status !== 'created' && payment.status !== 'processing') {
      throw new ApiError(
        'nothing_to_resolve',
        HttpStatus.CONFLICT,
        'nothing unresolved on this payment',
      );
    }

    const attempt = await this.attempts
      .createQueryBuilder('a')
      .where('a.paymentId = :pid', { pid: payment.id })
      .andWhere('a.status IN (:...statuses)', {
        statuses: ['unknown', 'initiated'],
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
      account = await this.providers.requireById(attempt.providerAccountId);
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
    if (account.organizationId !== payment.organizationId) {
      throw new ApiError(
        'provider_account_not_found',
        HttpStatus.NOT_FOUND,
        'unknown provider account for this organization',
      );
    }

    const adapter = this.factory.forAccount(account);

    let outcome: 'succeeded' | 'failed' | 'unknown' = 'unknown';
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

    return this.attempts.manager.transaction(async (tx) => {
      const attemptRow = await tx.findOneByOrFail(PaymentAttempt, {
        id: attempt.id,
      });
      attemptTransition(attemptRow.status, outcome);
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

      const current = fresh.status === 'created' ? 'processing' : fresh.status;
      transition(current, outcome);

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

      return tx.findOneByOrFail(Payment, { id: payment.id });
    });
  }
}
