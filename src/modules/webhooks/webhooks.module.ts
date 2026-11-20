import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxModule } from '../../outbox/outbox.module.ts';
import { ProvidersModule } from '../providers/providers.module.ts';
import { PaymentAttempt } from '../payments/entities/payment-attempt.entity.ts';
import { Payment } from '../payments/entities/payment.entity.ts';
import { WebhookEvent } from './entities/webhook-event.entity.ts';
import { WebhooksController } from './webhooks.controller.ts';
import { WebhooksService } from './webhooks.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent, PaymentAttempt, Payment]),
    ProvidersModule,
    OutboxModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}