import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';
import { AuthContext } from '../auth/auth-context.ts';
import { ApiError } from '../../common/api-error.ts';
import { CreatePaymentDto } from '../payments/dto/create-payment.dto.ts';
import { IdempotencyKey } from './entities/idempotency-key.entity.ts';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) {}

  fingerprint(dto: CreatePaymentDto): string {
    const canonical = JSON.stringify({
      reference: dto.reference,
      amount_minor: dto.amount_minor,
      currency: dto.currency.toUpperCase(),
      provider_account_id: dto.provider_account_id,
      method: dto.method,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  async execute(
    auth: AuthContext,
    key: string,
    fingerprint: string,
    operation: (tx: EntityManager) => Promise<{ id: string }>,
  ): Promise<{ id: string }> {
    return this.repo.manager.transaction(async (tx) => {
      const where = {
        organizationId: auth.organizationId,
        applicationId: auth.applicationId,
        key,
      };

      const existing = await tx.findOneBy(IdempotencyKey, where);
      if (existing) {
        if (existing.requestHash !== fingerprint) {
          throw new ApiError(
            'idempotency_key_conflict',
            HttpStatus.CONFLICT,
            'idempotency key reused with different request data',
          );
        }
        return { id: existing.paymentId };
      }

      const created = await operation(tx);
      try {
        await tx.insert(IdempotencyKey, {
          ...where,
          requestHash: fingerprint,
          paymentId: created.id,
        });
      } catch (e) {
        if ((e as { code?: string })?.code === '23505') {
          const winner = await tx.findOneBy(IdempotencyKey, where);
          if (winner) {
            if (winner.requestHash !== fingerprint) {
              throw new ApiError(
                'idempotency_key_conflict',
                HttpStatus.CONFLICT,
                'idempotency key reused with different request data',
              );
            }
            return { id: winner.paymentId };
          }
        }
        throw e;
      }
      return { id: created.id };
    });
  }
}
