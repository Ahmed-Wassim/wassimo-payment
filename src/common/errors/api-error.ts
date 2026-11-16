import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes.ts';

export class ApiError extends HttpException {
  readonly code: ErrorCode;

  constructor(
    code: ErrorCode,
    status: HttpStatus,
    message: string,
    details?: unknown,
  ) {
    super({ error: { code, message, details: details ?? null } }, status);
    this.code = code;
  }
}
