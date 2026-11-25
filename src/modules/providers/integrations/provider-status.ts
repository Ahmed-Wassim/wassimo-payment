export const PROVIDER_STATUS = {
  PAYTABS: {
    APPROVED: 'A',
    VOIDED: 'V',
    ERROR: 'E',
    DECLINED: 'D',
    CANCELED: 'C',
    EXPIRED: 'X',
  },
  PAYMOB: { DECLINED: 'DECLINED' },
  FAWATERAK: {
    PAID: 'paid',
    FAILED: 'failed',
    EXPIRED: 'expired',
    CANCELED: 'canceled',
    PENDING: 'pending',
  },
} as const;
