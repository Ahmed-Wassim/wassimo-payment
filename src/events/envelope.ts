export const EVENTS_EXCHANGE = 'wassimo.events';

export const PAYMENT_SUCCEEDED_EVENT = 'payment.succeeded';
export const PAYMENT_FAILED_EVENT = 'payment.failed';

export interface Envelope<TPayload> {
  event_id: string;
  event_type: string;
  version: '1';
  occurred_at: string;
  correlation_id: string;
  producer: 'wassimo-payment';
  payload: TPayload;
}

export interface PaymentSucceededPayload {
  payment_id: string;
  reference: string;
  amount_minor: number;
  currency: string;
}

export interface PaymentFailedPayload {
  payment_id: string;
  reference: string;
  reason_code?: string;
  message?: string;
}
