import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity.ts';
import { Payment } from '../payments/entities/payment.entity.ts';
import { CustomersService } from './customers.service.ts';
import { CustomersController } from './customers.controller.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { UsersModule } from '../users/users.module.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Payment]), AuthModule, UsersModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
