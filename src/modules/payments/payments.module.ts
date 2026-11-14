import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.ts';
import { CredentialsModule } from '../credentials/credentials.module.ts';
import { CurrenciesModule } from '../currencies/currencies.module.ts';
import { ProvidersModule } from '../providers/providers.module.ts';
import { IdempotencyModule } from '../idempotency/idempotency.module.ts';
import { CustomersModule } from '../customers/customers.module.ts';
import { Payment } from './entities/payment.entity.ts';
import { PaymentAttempt } from './entities/payment-attempt.entity.ts';
import { ChargeService } from './charge.service.ts';
import { PaymentsService } from './payments.service.ts';
import { PaymentsController } from './payments.controller.ts';
import { ResolutionService } from './resolution.service.ts';
import { ReturnController } from './return.controller.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAttempt]),
    AuthModule,
    CredentialsModule,
    CurrenciesModule,
    ProvidersModule,
    IdempotencyModule,
    CustomersModule,
  ],
  controllers: [PaymentsController, ReturnController],
  providers: [PaymentsService, ChargeService, ResolutionService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
