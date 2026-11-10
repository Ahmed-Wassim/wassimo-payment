import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.ts';
import { CredentialsModule } from '../credentials/credentials.module.ts';
import { CurrenciesModule } from '../currencies/currencies.module.ts';
import { ProvidersModule } from '../providers/providers.module.ts';
import { Payment } from './entities/payment.entity.ts';
import { PaymentsService } from './payments.service.ts';
import { PaymentsController } from './payments.controller.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    AuthModule,
    CredentialsModule,
    CurrenciesModule,
    ProvidersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
