export type PaymentStatus = 'created' | 'processing' | 'succeeded' | 'failed' | 'expired';

export const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  created: ['processing'],
  processing: ['succeeded', 'failed'],
  succeeded: [],
  failed: [],
  expired: [],
};

export function transition(from: PaymentStatus, to: PaymentStatus): void {
  if (!ALLOWED[from].includes(to)) {
    throw new Error(`illegal payment transition ${from}->${to}`);
  }
}

export function recoveryTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (from === 'failed' && to === 'succeeded') return;
  transition(from, to);
}