export class ProviderTimeoutError extends Error {
  providerRef?: string;

  constructor(message = 'provider request timed out', providerRef?: string) {
    super(message);
    this.name = 'ProviderTimeoutError';
    this.providerRef = providerRef;
  }
}

export class ProviderConfigError extends Error {
  constructor(message = 'provider configuration error') {
    super(message);
    this.name = 'ProviderConfigError';
  }
}

export type CheckoutCustomer = CustomerDetails;

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

export type ProviderResult = 'succeeded' | 'failed' | 'pending' | 'unknown';

export type ProviderOutcomeResult = Exclude<ProviderResult, 'pending'>;

export interface Outcome {
  result: ProviderOutcomeResult;
}

export interface RefundInput {
  paymentId: string;
  providerReference: string;
  amountMinor: bigint;
  currency: string;
}

export interface RefundResult {
  providerRef: string;
}

export interface ProviderEvent {
  providerEventId: string | null;
  eventType: string;
  result: ProviderResult;
  providerReference: string | null;
  raw: unknown;
}

import type { CustomerDetails } from '../../customers/customer-details.ts';
import type { ProviderCode } from '../provider-code.ts';

export interface ProviderAdapter {
  readonly providerCode: ProviderCode;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  queryStatus(providerReference: string): Promise<Outcome>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
    query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null>;
}
