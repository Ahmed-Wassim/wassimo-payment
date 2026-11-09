import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity.ts';
import { CurrenciesService } from './currencies.service.ts';
import { CurrenciesController } from './currencies.controller.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Currency])],
  providers: [CurrenciesService],
  exports: [CurrenciesService],
  controllers: [CurrenciesController],
})
export class CurrenciesModule {}
