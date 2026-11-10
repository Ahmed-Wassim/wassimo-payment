import { Controller, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiError } from '../common/api-error.ts';
import type { RawWebhookRequest } from './raw-webhook-request.ts';
import { WebhooksService } from './webhooks.service.ts';

@Controller()
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('webhooks/provider')
  async ingest(@Req() req: RawWebhookRequest) {
    const providerCode = (req.headers['x-provider-code'] as string | undefined)?.trim();
    if (!providerCode) {
      throw new ApiError(
        'validation_error',
        HttpStatus.BAD_REQUEST,
        'x-provider-code header required',
      );
    }

    if (!req.rawBody) {
      throw new ApiError(
        'validation_error',
        HttpStatus.BAD_REQUEST,
        'raw body required',
      );
    }

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      }
    }

    return this.webhooks.ingest(providerCode, headers, req.rawBody);
  }
}