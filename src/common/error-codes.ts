export const ERROR_CODES = [
  'unauthorized',
  'validation_error',
  'invalid_currency',
  'invalid_amount',
  'provider_account_not_found',
  'provider_account_not_eligible',
  'payment_reference_conflict',
  'idempotency_key_conflict',
  'unresolved_attempt',
  'not_found',
  'payment_not_chargeable',
  'nothing_to_resolve',
  'refund_not_allowed',
  'encryption_key_missing',
  'provider_credentials_missing',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
