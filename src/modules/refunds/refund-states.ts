export const REFUND_STATUS = {
  REQUESTED: 'requested',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
} as const;

export type RefundStatus =
  (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const REFUND_ALLOWED: Record<RefundStatus, RefundStatus[]> = {
  [REFUND_STATUS.REQUESTED]: [REFUND_STATUS.PROCESSING],
  [REFUND_STATUS.PROCESSING]: [
    REFUND_STATUS.SUCCEEDED,
    REFUND_STATUS.FAILED,
    REFUND_STATUS.UNKNOWN,
  ],
  [REFUND_STATUS.UNKNOWN]: [REFUND_STATUS.SUCCEEDED, REFUND_STATUS.FAILED],
  [REFUND_STATUS.SUCCEEDED]: [],
  [REFUND_STATUS.FAILED]: [],
};

export function refundTransition(from: RefundStatus, to: RefundStatus): void {
  if (!REFUND_ALLOWED[from].includes(to)) {
    throw new Error(`illegal refund transition ${from}->${to}`);
  }
}
