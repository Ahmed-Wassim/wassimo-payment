export const PAYMENT_STATUS = {
  CREATED: 'created',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  [PAYMENT_STATUS.CREATED]: [PAYMENT_STATUS.PROCESSING],
  [PAYMENT_STATUS.PROCESSING]: [
    PAYMENT_STATUS.SUCCEEDED,
    PAYMENT_STATUS.FAILED,
  ],
  [PAYMENT_STATUS.SUCCEEDED]: [],
  [PAYMENT_STATUS.FAILED]: [],
  [PAYMENT_STATUS.EXPIRED]: [],
};

export function transition(from: PaymentStatus, to: PaymentStatus): void {
  if (!ALLOWED[from].includes(to)) {
    throw new Error(`illegal payment transition ${from}->${to}`);
  }
}

export function recoveryTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (from === PAYMENT_STATUS.FAILED && to === PAYMENT_STATUS.SUCCEEDED) return;
  transition(from, to);
}
