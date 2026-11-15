export type RefundStatus = 'requested' | 'processing' | 'succeeded' | 'failed' | 'unknown';

export const REFUND_ALLOWED: Record<RefundStatus, RefundStatus[]> = {
  requested: ['processing'],
  processing: ['succeeded', 'failed', 'unknown'],
  unknown: ['succeeded', 'failed'],
  succeeded: [],
  failed: [],
};

export function refundTransition(from: RefundStatus, to: RefundStatus): void {
  if (!REFUND_ALLOWED[from].includes(to)) {
    throw new Error(`illegal refund transition ${from}->${to}`);
  }
}
