import { Controller, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiError } from '../../common/api-error.ts';
import type { RawWebhookRequest } from './dto/raw-webhook-request.ts';
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

    return this.handle(providerCode, req);
  }

  @Post('webhooks/:providerCode')
  async ingestByProvider(
    @Param('providerCode') providerCode: string,
    @Req() req: RawWebhookRequest,
  ) {
    if (providerCode === 'provider') {
      const headerCode = (req.headers['x-provider-code'] as string | undefined)?.trim();
      if (!headerCode) {
        throw new ApiError(
          'validation_error',
          HttpStatus.BAD_REQUEST,
          'x-provider-code header required',
        );
      }
      return this.handle(headerCode, req);
    }
    return this.handle(providerCode, req);
  }

  private async handle(providerCode: string, req: RawWebhookRequest) {
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

    return this.webhooks.ingest(providerCode.trim().toLowerCase(), headers, req.rawBody);
  }
}