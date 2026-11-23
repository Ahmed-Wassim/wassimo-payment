import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity.ts';
import { CurrenciesService } from './currencies.service.ts';
import { CurrenciesController } from './currencies.controller.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { UsersModule } from '../users/users.module.ts';
import { CurrenciesSeeder } from './seeder/currencies.seeder.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([Currency]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [CurrenciesService, CurrenciesSeeder],
  exports: [CurrenciesService],
  controllers: [CurrenciesController],
})
export class CurrenciesModule {}
