export type AttemptStatus = 'initiated' | 'succeeded' | 'failed' | 'unknown';

export const ATTEMPT_ALLOWED: Record<AttemptStatus, AttemptStatus[]> = {
  initiated: ['succeeded', 'failed', 'unknown'],
  unknown: ['succeeded', 'failed'],
  succeeded: [],
  failed: [],
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
  if (from === 'failed' && to === 'succeeded') return;
  attemptTransition(from, to);
}
