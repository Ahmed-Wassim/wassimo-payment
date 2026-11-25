export class ProviderTimeoutError extends Error {
  providerRef?: string;

  constructor(message = 'provider request timed out', providerRef?: string) {
    super(message);
    this.name = 'ProviderTimeoutError';
    this.providerRef = providerRef;
  }
}

export class ProviderOutcomeUnknownError extends Error {
  providerRef?: string;

  constructor(message = 'provider outcome is unknown', providerRef?: string) {
    super(message);
    this.name = 'ProviderOutcomeUnknownError';
    this.providerRef = providerRef;
  }
}

export const PROVIDER_REQUEST_TIMEOUT_MS = 8_000;

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
  customerDetails?: CheckoutCustomer | null;
  returnUrl?: string | null;
}

export interface CheckoutResult {
  providerReference: string | null;
  redirectUrl: string;
}

export const PROVIDER_RESULT = {
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  PENDING: 'pending',
  UNKNOWN: 'unknown',
} as const;

export type ProviderResult =
  (typeof PROVIDER_RESULT)[keyof typeof PROVIDER_RESULT];

export type ProviderOutcomeResult = Exclude<
  ProviderResult,
  typeof PROVIDER_RESULT.PENDING
>;

export interface Outcome {
  result: ProviderOutcomeResult;
  failureReason?: string;
}

export interface RefundInput {
  paymentId: string;
  providerReference: string;
  amountMinor: bigint;
  currency: string;
  reason: string | null;
}

export interface RefundResult {
  providerRef: string | null;
  result: ProviderOutcomeResult;
}

export interface ProviderEvent {
  providerEventId: string | null;
  eventType: string;
  result: ProviderResult;
  providerReference: string | null;
  raw: unknown;
  failureReason?: string;
}

import type { CustomerDetails } from '../../customers/customer-details.ts';
import type { ProviderCode } from '../provider-code.ts';

export interface ProviderAdapter {
  readonly providerCode: ProviderCode;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  queryStatus(providerReference: string): Promise<Outcome>;
  queryStatusByPaymentId?(paymentId: string): Promise<Outcome>;
  queryRefundStatus?(refundReference: string): Promise<Outcome>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
    query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null>;
}
