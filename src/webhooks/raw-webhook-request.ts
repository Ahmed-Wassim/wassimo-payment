import type { Request } from 'express';

export interface RawWebhookRequest extends Request {
  rawBody?: Buffer;
}