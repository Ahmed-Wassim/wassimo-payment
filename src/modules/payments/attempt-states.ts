export const PAYMENT_ATTEMPT_OPERATION = {
  CHARGE: 'charge',
} as const;

export type PaymentAttemptOperation =
  (typeof PAYMENT_ATTEMPT_OPERATION)[keyof typeof PAYMENT_ATTEMPT_OPERATION];

export const ATTEMPT_STATUS = {
  INITIATED: 'initiated',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
} as const;

export type AttemptStatus =
  (typeof ATTEMPT_STATUS)[keyof typeof ATTEMPT_STATUS];

export const CHARGE_OUTCOME = {
  NONE: 'none',
  UNKNOWN: 'unknown',
  FAILED: 'failed',
} as const;

export type ChargeOutcome =
  (typeof CHARGE_OUTCOME)[keyof typeof CHARGE_OUTCOME];

export const ATTEMPT_ALLOWED: Record<AttemptStatus, AttemptStatus[]> = {
  [ATTEMPT_STATUS.INITIATED]: [
    ATTEMPT_STATUS.SUCCEEDED,
    ATTEMPT_STATUS.FAILED,
    ATTEMPT_STATUS.UNKNOWN,
  ],
  [ATTEMPT_STATUS.UNKNOWN]: [
    ATTEMPT_STATUS.SUCCEEDED,
    ATTEMPT_STATUS.FAILED,
  ],
  [ATTEMPT_STATUS.SUCCEEDED]: [],
  [ATTEMPT_STATUS.FAILED]: [],
};

export function attemptTransition(
  from: AttemptStatus,
  to: AttemptStatus,
): void {
  if (!ATTEMPT_ALLOWED[from].includes(to)) {
    throw new Error(`illegal attempt transition ${from}->${to}`);
  }
}

export function attemptRecoveryTransition(
  from: AttemptStatus,
  to: AttemptStatus,
): void {
  if (from === ATTEMPT_STATUS.FAILED && to === ATTEMPT_STATUS.SUCCEEDED) return;
  attemptTransition(from, to);
}
