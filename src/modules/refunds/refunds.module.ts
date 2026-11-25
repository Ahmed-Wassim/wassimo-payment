import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.ts';
import { CredentialsModule } from '../credentials/credentials.module.ts';
import { PaymentsModule } from '../payments/payments.module.ts';
import { ProvidersModule } from '../providers/providers.module.ts';
import { PaymentAttempt } from '../payments/entities/payment-attempt.entity.ts';
import { Refund } from './entities/refund.entity.ts';
import { RefundsController } from './refunds.controller.ts';
import { RefundsService } from './refunds.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([Refund, PaymentAttempt]),
    AuthModule,
    CredentialsModule,
    PaymentsModule,
    ProvidersModule,
  ],
  controllers: [RefundsController],
  providers: [RefundsService],
})
export class RefundsModule {}
