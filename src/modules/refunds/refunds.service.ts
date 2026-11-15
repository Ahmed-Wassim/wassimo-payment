import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/api-error.ts';
import { isUuid } from '../../common/is-uuid.ts';
import { PaymentProviderFactory } from '../providers/factories/payment-provider.factory.ts';
import { ProvidersService } from '../providers/providers.service.ts';
import { PaymentAttempt } from '../payments/entities/payment-attempt.entity.ts';
import { PaymentsService } from '../payments/payments.service.ts';
import { ProviderTimeoutError } from '../providers/adapter/adapter.ts';
import { refundTransition, type RefundStatus } from './refund-states.ts';
import { Refund } from './entities/refund.entity.ts';

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    private readonly dataSource: DataSource,
    private readonly payments: PaymentsService,
    private readonly providers: ProvidersService,
    private readonly factory: PaymentProviderFactory,
  ) {}

  async request(
    auth: AuthContext,
    paymentId: string,
    dto: { amount_minor: number; reason?: string },
  ): Promise<{ refund: Refund; raceLost: boolean }> {
    if (!isUuid(paymentId)) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'malformed payment id');
    }
    if (!Number.isInteger(dto.amount_minor) || dto.amount_minor <= 0) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'amount_minor must be a positive integer');
    }

    const payment = await this.payments.loadById(paymentId);
    if (!payment || payment.organizationId !== auth.organizationId) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'payment not found');
    }
    if (payment.status !== 'succeeded') {
      throw new ApiError('refund_not_allowed', HttpStatus.CONFLICT, `payment status is '${payment.status}'; refunds need 'succeeded'`);
    }

    const available = BigInt(payment.capturedMinor) - BigInt(payment.refundedConfirmedMinor);
    if (BigInt(dto.amount_minor) > available) {
      throw new ApiError('refund_not_allowed', HttpStatus.CONFLICT, 'refund exceeds the confirmed refundable amount', { available: Number(available) });
    }

    const attempt = await this.dataSource
      .getRepository(PaymentAttempt)
      .createQueryBuilder('a')
      .where('a.payment_id = :pid', { pid: payment.id })
      .andWhere("a.status = 'succeeded'")
      .orderBy('a.created_at', 'DESC')
      .getOne();
    if (!attempt || !attempt.providerReference) {
      throw new ApiError('refund_not_allowed', HttpStatus.CONFLICT, 'provider reference unknown — resolve the payment first');
    }

    let account;
    try {
      account = await this.providers.requireById(attempt.providerAccountId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
      }
      throw e;
    }
    if (account.organizationId !== payment.organizationId) {
      throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
    }
    const adapter = await this.factory.forAccount(account);

    const refund = await this.dataSource.transaction(async (tx) =>
      tx.save(Refund, {
        paymentId: payment.id,
        organizationId: payment.organizationId,
        amountMinor: String(dto.amount_minor),
        currency: payment.currency,
        status: 'requested',
        providerRef: null,
        reason: dto.reason ?? null,
      }),
    );

    let refundRef: string | null = null;
    let outcome: 'succeeded' | 'failed' | 'unknown' = 'unknown';
    try {
      const result = await adapter.refund({
        paymentId: payment.id,
        providerReference: attempt.providerReference,
        amountMinor: BigInt(String(dto.amount_minor)),
        currency: payment.currency,
      });
      refundRef = result.providerRef;
      outcome = 'succeeded';
    } catch (e) {
      outcome = e instanceof ProviderTimeoutError ? 'unknown' : 'failed';
    }

    return this.dataSource.transaction(async (tx) => {
      const row = await tx.findOneByOrFail(Refund, { id: refund.id });
      refundTransition(row.status as RefundStatus, 'processing');
      refundTransition('processing', outcome);
      await tx.update(Refund, { id: row.id }, { status: outcome, providerRef: refundRef });
      let raceLost = false;
      if (outcome === 'succeeded') {
        raceLost = await this.arbitrateConfirm(tx, row.id, String(dto.amount_minor), payment.id);
      }
      return { refund: await tx.findOneByOrFail(Refund, { id: row.id }), raceLost };
    });
  }

  async resolve(
    auth: AuthContext,
    paymentId: string,
    refundId: string,
  ): Promise<{ refund: Refund; raceLost: boolean }> {
    if (!isUuid(paymentId) || !isUuid(refundId)) {
      throw new ApiError('validation_error', HttpStatus.BAD_REQUEST, 'malformed refund path');
    }
    const refund = await this.refunds.findOne({ where: { id: refundId, paymentId } });
    if (!refund || refund.organizationId !== auth.organizationId) {
      throw new ApiError('not_found', HttpStatus.NOT_FOUND, 'refund not found');
    }
    if (refund.status !== 'unknown' && refund.status !== 'processing') {
      throw new ApiError('nothing_to_resolve', HttpStatus.CONFLICT, 'nothing unresolved on this refund');
    }
    if (!refund.providerRef) {
      throw new ApiError('nothing_to_resolve', HttpStatus.CONFLICT, 'no provider reference yet — nothing to query');
    }

    const attempt = await this.dataSource
      .getRepository(PaymentAttempt)
      .findOne({ where: { paymentId, status: 'succeeded' }, order: { createdAt: 'DESC' } });
    if (!attempt) {
      throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
    }
    let account;
    try {
      account = await this.providers.requireById(attempt.providerAccountId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new ApiError('provider_account_not_found', HttpStatus.NOT_FOUND, 'unknown provider account for this organization');
      }
      throw e;
    }
    const adapter = await this.factory.forAccount(account);
    const outcome = (await adapter.queryStatus(refund.providerRef)).result;
    if (outcome !== 'succeeded' && outcome !== 'failed') {
      return { refund, raceLost: false };
    }

    return this.dataSource.transaction(async (tx) => {
      const row = await tx.findOneByOrFail(Refund, { id: refund.id });
      refundTransition(row.status as RefundStatus, outcome);
      await tx.update(Refund, { id: row.id }, { status: outcome });
      let raceLost = false;
      if (outcome === 'succeeded') {
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
      refundTransition('processing', 'failed');
      await tx.update(Refund, { id: refundId }, { status: 'failed' });
      console.error(`refund ${refundId}: lost available race at confirm`);
      return true;
    }
    return false;
  }
}
