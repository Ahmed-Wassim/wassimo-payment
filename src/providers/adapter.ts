export class ProviderTimeoutError extends Error {
  constructor(message = 'provider request timed out') {
    super(message);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderConfigError extends Error {
  constructor(message = 'provider configuration error') {
    super(message);
    this.name = 'ProviderConfigError';
  }
}

export interface CheckoutCustomer {
  name?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

export interface CheckoutInput {
  paymentId: string;
  amountMinor: bigint;
  currency: string;
  method: string;
  accountConfig?: Record<string, unknown>;
  customerDetails?: CheckoutCustomer | null;
}

export interface CheckoutResult {
  providerReference: string | null;
  redirectUrl: string;
}

export interface Outcome {
  result: 'succeeded' | 'failed' | 'unknown';
}

export interface ProviderEvent {
  providerEventId: string | null;
  eventType: string;
  result: 'succeeded' | 'failed' | 'pending' | 'unknown';
  providerReference: string | null;
  raw: unknown;
}

import type { ProviderCode } from './provider-code.ts';

export interface AdapterCapabilities {
  methods: string[];
  operations: string[];
  environments: string[];
}

export interface ProviderAdapter {
  readonly providerCode: ProviderCode;
  capabilities(): AdapterCapabilities;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  queryStatus(providerReference: string): Promise<Outcome>;
  verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): Promise<ProviderEvent | null>;
}
