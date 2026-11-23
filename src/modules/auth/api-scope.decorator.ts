import { SetMetadata } from '@nestjs/common';
import type { ApiScopeCode } from './api-scopes.ts';

export const API_SCOPE_KEY = 'api-scope';

export const ApiScope = (scope: ApiScopeCode) =>
  SetMetadata(API_SCOPE_KEY, scope);
