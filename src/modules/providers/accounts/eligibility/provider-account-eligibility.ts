import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../../../../common/errors/api-error.ts';
import { PROVIDER_ACCOUNT_STATUS } from '../entity/provider-account.entity.ts';

interface ProviderAccountEligibility {
  status: string;
  environment: string;
  supportedCurrencies: string[];
  supportedMethods: string[];
}

export interface ProviderAccountEligibilityContext {
  environment: string;
  currency: string;
  method: string;
}

export function ensureProviderAccountEligible(
  account: ProviderAccountEligibility,
  context: ProviderAccountEligibilityContext,
): void {
  const reasons: string[] = [];
  if (account.status !== PROVIDER_ACCOUNT_STATUS.ENABLED) {
    reasons.push('account_disabled');
  }
  if (account.environment !== context.environment) {
    reasons.push('environment_mismatch');
  }
  if (!account.supportedCurrencies.includes(context.currency.toUpperCase())) {
    reasons.push('currency_unsupported');
  }
  if (!account.supportedMethods.includes(context.method)) {
    reasons.push('method_unsupported');
  }
  if (reasons.length > 0) {
    throw new ApiError(
      'provider_account_not_eligible',
      HttpStatus.CONFLICT,
      'the selected provider account cannot process this payment',
      { reasons },
    );
  }
}
