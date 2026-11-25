import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { ErrorCode } from './error-codes.ts';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.UNAUTHORIZED]: 'unauthorized',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.BAD_REQUEST]: 'validation_error',
};

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('payment.http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse();
    let status: number;
    let body: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      const current = payload as { error?: { code?: string } };
      if (current?.error?.code) {
        body = payload;
      } else {
        body = {
          error: {
            code: STATUS_TO_CODE[status] ?? 'unspecified_error',
            message: exception.message,
            details: payload,
          },
        };
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        error: {
          code: 'unspecified_error',
          message: 'internal error',
          details: null,
        },
      };
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const span = trace.getActiveSpan();
      if (exception instanceof Error) {
        span?.recordException(exception);
        this.logger.error(exception.message);
      } else {
        this.logger.error(String(exception));
      }
      span?.setStatus({ code: SpanStatusCode.ERROR });
    }

    this.logger.log(`status=${status}`);
    res.status(status).json(body);
  }
}
