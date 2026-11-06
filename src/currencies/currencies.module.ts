import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './currency.entity.ts';
import { CurrenciesService } from './currencies.service.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Currency])],
  providers: [CurrenciesService],
  exports: [CurrenciesService], // payments (step 10) + providers (step 23) use it
})
export class CurrenciesModule {}
