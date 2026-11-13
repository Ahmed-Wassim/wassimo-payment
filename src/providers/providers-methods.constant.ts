import type { ProviderMethod } from './entities/provider.entity.ts';

export const MOCK_METHODS = [
  { code: 'card', name: 'Card', is_special: false },
] satisfies ProviderMethod[];

export const PAYTABS_METHODS = [
  { code: 'all', name: 'All Available Methods', is_special: true },
  { code: 'creditcard', name: 'Credit / Debit Card' },
  { code: 'amex', name: 'American Express' },
  { code: 'mada', name: 'mada' },
  { code: 'unionpay', name: 'UnionPay' },
  { code: 'omannet', name: 'OmanNet Debit' },
  { code: 'knet', name: 'KNET' },
  { code: 'knetdebit', name: 'KNET Debit' },
  { code: 'knetcredit', name: 'KNET Credit' },
  { code: 'urpay', name: 'UrPay' },
  { code: 'stcpay', name: 'STC Pay' },
  { code: 'stcpayqr', name: 'STC Pay QR' },
  { code: 'meezaqr', name: 'Meeza QR' },
  { code: 'applepay', name: 'Apple Pay' },
  { code: 'samsungpay', name: 'Samsung Pay' },
  { code: 'paypal', name: 'PayPal' },
  { code: 'valu', name: 'ValU' },
  { code: 'installment', name: 'NBE Installments' },
  { code: 'forsa', name: 'Forsa' },
  { code: 'halan', name: 'Halan' },
  { code: 'tamara', name: 'Tamara' },
  { code: 'amaninstallments', name: 'Aman Installments' },
  { code: 'souhoola', name: 'Souhoola' },
  { code: 'tabby', name: 'Tabby' },
  { code: 'aman', name: 'Aman' },
  { code: 'sadad', name: 'SADAD' },
  { code: 'touchpoints', name: 'TouchPoints' },
  { code: 'tru', name: 'TRU' },
] satisfies ProviderMethod[];

export const PAYFORT_METHODS = [
  { code: 'all', name: 'All Available Methods', is_special: true },
  { code: 'visa', name: 'Visa' },
  { code: 'mastercard', name: 'Mastercard' },
  { code: 'amex', name: 'American Express' },
  { code: 'meeza', name: 'Meeza' },
  { code: 'mada', name: 'mada' },
  { code: 'sadad', name: 'SADAD' },
  { code: 'naps', name: 'NAPS' },
  { code: 'knet', name: 'KNET' },
  { code: 'omannet', name: 'OmanNet' },
  { code: 'benefit', name: 'Benefit' },
  { code: 'tabby', name: 'Tabby' },
  { code: 'tamara', name: 'Tamara' },
  { code: 'valu', name: 'ValU' },
  { code: 'apple_pay', name: 'Apple Pay' },
  { code: 'stc_pay', name: 'STC Pay' },
] satisfies ProviderMethod[];

export const PROVIDER_CATALOGUES = [
  { code: 'mock', name: 'Mock Provider', methods: MOCK_METHODS },
  { code: 'paytabs', name: 'PayTabs', methods: PAYTABS_METHODS },
  { code: 'payfort', name: 'PayFort', methods: PAYFORT_METHODS },
] as const;
