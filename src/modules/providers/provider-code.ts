export const PROVIDER_CODE = {
  Mock: 'mock',
  Paytabs: 'paytabs',
  Paymob: 'paymob',
  Payfort: 'payfort',
  Fawaterak: 'fawaterak',
} as const;

export type ProviderCode = (typeof PROVIDER_CODE)[keyof typeof PROVIDER_CODE];

export function isProviderCode(value: string): value is ProviderCode {
  return Object.values(PROVIDER_CODE).includes(value as ProviderCode);
}
