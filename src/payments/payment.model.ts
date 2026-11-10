import { Payment } from './entities/payment.entity.ts';
import { PaymentStatus } from './states.ts';

export type PaymentStatusDetail =
  | 'recorded, not charged'
  | 'with the provider; outcome pending'
  | 'money confirmed captured; terminal'
  | 'no money moved; terminal — create a NEW payment'
  | 'abandoned and never charged; create a NEW payment';

export interface PaymentPublicModel {
  id: string;
  reference: string;
  amount_minor: number;
  currency: string;
  status: string;
  status_detail: PaymentStatusDetail;
  captured_minor: number;
  refunded_confirmed_minor: number;
  method: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_DETAIL: Record<PaymentStatus, PaymentStatusDetail> = {
  created: 'recorded, not charged',
  processing: 'with the provider; outcome pending',
  succeeded: 'money confirmed captured; terminal',
  failed: 'no money moved; terminal — create a NEW payment',
  expired: 'abandoned and never charged; create a NEW payment',
};

export function toPaymentModel(p: Payment): PaymentPublicModel {
  return {
    id: p.id,
    reference: p.reference,
    amount_minor: Number(p.amountMinor),
    currency: p.currency,
    status: p.status,
    status_detail: STATUS_DETAIL[p.status],
    captured_minor: Number(p.capturedMinor),
    refunded_confirmed_minor: Number(p.refundedConfirmedMinor),
    method: p.method,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}