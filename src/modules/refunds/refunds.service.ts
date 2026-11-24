import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/errors/api-error.ts';
import { isUuid } from '../../common/utils/is-uuid.ts';
import { PaymentProviderFactory } from '../providers/integrations/payment-provider.factory.ts';
import { ProviderAccountsService } from '../providers/accounts/provider-accounts.service.ts';
import { PROVIDER_CODE } from '../providers/provider-code.ts';
import { PaymentAttempt } from '../payments/entities/payment-attempt.entity.ts';
import { Payment } from '../payments/entities/payment.entity.ts';
import { PAYMENT_STATUS } from '../payments/states.ts';
import { ATTEMPT_STATUS } from '../payments/attempt-states.ts';
import { PaymentsService } from '../payments/payments.service.ts';
import {
  ProviderOutcomeResult,
  ProviderOutcomeUnknownError,
  ProviderTimeoutError,
  PROVIDER_RESULT,
} from '../providers/integrations/adapter.ts';
import {
  REFUND_STATUS,
  refundTransition,
  type RefundStatus,
} from './refund-states.ts';
import { Refund } from './entities/refund.entity.ts';

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    private readonly dataSource: DataSource,
    private readonly payments: PaymentsService,
    private readonly providers: ProviderAccountsService,
    private readonly factory: PaymentProviderFactory,
  ) {}

  async request(
    auth: { organizationId: string; applicationId?: string },
    paymentId: string,
    dto: { amount_minor: number; reason?: string },
  ): Promise<{ refund: Refund; raceLost: boolean }> {
    if (!isUuid(paymentId)) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'malformed payment id');
    }
    if (!Number.isSafeInteger(dto.amount_minor) || dto.amount_minor <= 0) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'amount_minor must be a positive safe integer');
    }

    const payment = await this.payments.loadById(paymentId, auth);
    if (!payment) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'payment not found');
    }
    if (payment.status !== PAYMENT_STATUS.SUCCEEDED) {
      throw new ApiError('refund_not_allowed', HttpStatus.CONFLICT, `payment status is '${payment.status}'; refunds need '${REFUND_STATUS.SUCCEEDED}'`);
    }

    const attempt = await this.dataSource
      .getRepository(PaymentAttempt)
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.providerAccount', 'providerAccount')
      .where('a.payment_id = :pid', { pid: payment.id })
      .andWhere('a.status = :status', { status: ATTEMPT_STATUS.SUCCEEDED })
      .orderBy('a.created_at', 'DESC')
      .getOne();
    if (!attempt || !attempt.providerReference) {
      throw new ApiError('refund_not_allowed', HttpStatus.CONFLICT, 'provider reference unknown — resolve the payment first');
    }

    let account;
    try {
      account = await this.providers.requireById(attempt.providerAccount.id);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
      }
      throw e;
    }
    if (account.organization.id !== payment.organizationId) {
      throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
    }
    if (
      account.providerCode === PROVIDER_CODE.Fawaterak &&
      !dto.reason?.trim()
    ) {
      throw new ApiError(
        'validation_error',
        HttpStatus.BAD_REQUEST,
        'reason is required for Fawaterak refunds',
      );
    }
    const adapter = await this.factory.forAccount(account);

    const refund = await this.dataSource.transaction(async (tx) => {
      const currentPayment = await tx.findOne(Payment, {
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentPayment || currentPayment.status !== PAYMENT_STATUS.SUCCEEDED) {
        throw new ApiError(
          'refund_not_allowed',
          HttpStatus.CONFLICT,
          'payment is no longer refundable',
        );
      }

      const reservedRefunds = await tx.find(Refund, {
        where: {
          paymentId: payment.id,
          status: In([
            REFUND_STATUS.REQUESTED,
            REFUND_STATUS.PROCESSING,
            REFUND_STATUS.UNKNOWN,
          ]),
        },
        select: { amountMinor: true },
      });
      const reservedMinor = reservedRefunds.reduce(
        (sum, row) => sum + BigInt(row.amountMinor),
        0n,
      );
      const availableMinor =
        BigInt(currentPayment.capturedMinor) -
        BigInt(currentPayment.refundedConfirmedMinor) -
        reservedMinor;
      if (BigInt(dto.amount_minor) > availableMinor) {
        throw new ApiError(
          'refund_not_allowed',
          HttpStatus.CONFLICT,
          'refund exceeds the available refundable amount',
          { available: Number(availableMinor) },
        );
      }

      return tx.save(Refund, {
        paymentId: payment.id,
        organizationId: payment.organizationId,
        amountMinor: String(dto.amount_minor),
        currency: payment.currency,
        status: REFUND_STATUS.REQUESTED,
        providerRef: null,
        reason: dto.reason ?? null,
      });
    });

    let refundRef: string | null = null;
    let outcome: ProviderOutcomeResult = PROVIDER_RESULT.UNKNOWN;
    try {
      const result = await adapter.refund({
        paymentId: payment.id,
        providerReference: attempt.providerReference,
        amountMinor: BigInt(String(dto.amount_minor)),
        currency: payment.currency,
        reason: dto.reason ?? null,
      });
      refundRef = result.providerRef;
      outcome = result.result;
    } catch (e) {
      if (
        e instanceof ProviderTimeoutError ||
        e instanceof ProviderOutcomeUnknownError
      ) {
        outcome = PROVIDER_RESULT.UNKNOWN;
        refundRef = e.providerRef ?? null;
      } else {
        outcome = PROVIDER_RESULT.FAILED;
      }
    }

    return this.dataSource.transaction(async (tx) => {
      const row = await tx.findOneByOrFail(Refund, { id: refund.id });
      refundTransition(row.status, REFUND_STATUS.PROCESSING);
      refundTransition(REFUND_STATUS.PROCESSING, outcome);
      await tx.update(Refund, { id: row.id }, { status: outcome, providerRef: refundRef });
      let raceLost = false;
      if (outcome === PROVIDER_RESULT.SUCCEEDED) {
        raceLost = await this.arbitrateConfirm(tx, row.id, String(dto.amount_minor), payment.id);
      }
      return { refund: await tx.findOneByOrFail(Refund, { id: row.id }), raceLost };
    });
  }

  async resolve(
    auth: { organizationId: string; applicationId?: string },
    paymentId: string,
    refundId: string,
  ): Promise<{ refund: Refund; raceLost: boolean }> {
    if (!isUuid(paymentId) || !isUuid(refundId)) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'malformed refund path');
    }
    const payment = await this.payments.loadById(paymentId, auth);
    const refund = await this.refunds.findOne({ where: { id: refundId, paymentId } });
    if (!payment || !refund || refund.organizationId !== auth.organizationId) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'refund not found');
    }
    if (
      refund.status !== REFUND_STATUS.UNKNOWN &&
      refund.status !== REFUND_STATUS.PROCESSING
    ) {
      throw new ApiError('nothing_to_resolve', HttpStatus.CONFLICT, 'nothing unresolved on this refund');
    }
    if (!refund.providerRef) {
      throw new ApiError(
        'nothing_to_resolve',
        HttpStatus.CONFLICT,
        'provider refund reference was not returned; reconcile with the provider before retrying',
      );
    }

    const attempt = await this.dataSource
      .getRepository(PaymentAttempt)
      .findOne({
        where: {
          payment: { id: paymentId },
          status: ATTEMPT_STATUS.SUCCEEDED,
        },
        relations: { providerAccount: true },
        order: { createdAt: 'DESC' },
      });
    if (!attempt) {
      throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
    }
    let account;
    try {
      account = await this.providers.requireById(attempt.providerAccount.id);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
      }
      throw e;
    }
    const adapter = await this.factory.forAccount(account);
    let outcome: ProviderOutcomeResult = PROVIDER_RESULT.UNKNOWN;
    if (adapter.queryRefundStatus) {
      try {
        outcome = (await adapter.queryRefundStatus(refund.providerRef)).result;
      } catch {
        outcome = PROVIDER_RESULT.UNKNOWN;
      }
    }
    if (
      outcome !== PROVIDER_RESULT.SUCCEEDED &&
      outcome !== PROVIDER_RESULT.FAILED
    ) {
      return { refund, raceLost: false };
    }

    return this.dataSource.transaction(async (tx) => {
      const row = await tx.findOneByOrFail(Refund, { id: refund.id });
      refundTransition(row.status, outcome);
      await tx.update(Refund, { id: row.id }, { status: outcome });
      let raceLost = false;
      if (outcome === PROVIDER_RESULT.SUCCEEDED) {
        raceLost = await this.arbitrateConfirm(tx, row.id, refund.amountMinor, refund.paymentId);
      }
      return { refund: await tx.findOneByOrFail(Refund, { id: row.id }), raceLost };
    });
  }

  private async arbitrateConfirm(
    tx: EntityManager,
    refundId: string,
    amountMinor: string,
    paymentId: string,
  ): Promise<boolean> {
    const res = (await tx.query(
      `UPDATE payments
          SET refunded_confirmed_minor = refunded_confirmed_minor + $1,
              updated_at = NOW()
        WHERE id = $2
          AND refunded_confirmed_minor + $1 <= captured_minor`,
      [amountMinor, paymentId],
    )) as [unknown, number] | { rowCount?: number };
    const affected = Array.isArray(res) ? res[1] : (res.rowCount ?? 0);
    if (affected === 0) {
      refundTransition(REFUND_STATUS.PROCESSING, REFUND_STATUS.FAILED);
      await tx.update(Refund, { id: refundId }, { status: REFUND_STATUS.FAILED });
      console.error(`refund ${refundId}: lost available race at confirm`);
      return true;
    }
    return false;
  }
}
