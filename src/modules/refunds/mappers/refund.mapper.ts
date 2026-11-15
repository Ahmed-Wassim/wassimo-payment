import type { Refund } from '../entities/refund.entity.ts';

export type RefundModel = {
  id: string;
  payment_id: string;
  amount_minor: number;
  currency: string;
  status: string;
  provider_ref: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export function toRefundModel(r: Refund): RefundModel {
  return {
    id: r.id,
    payment_id: r.paymentId,
    amount_minor: Number(r.amountMinor),
    currency: r.currency,
    status: r.status,
    provider_ref: r.providerRef,
    reason: r.reason,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}
