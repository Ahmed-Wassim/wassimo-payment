import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service.ts';
import { ProviderAccount } from './provider-account.entity.ts';
import { Provider } from './provider.entity.ts';
import { ProvidersController } from './providers.controller.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, ProviderAccount])],
  providers: [ProvidersService],
  exports: [ProvidersService],
  controllers: [ProvidersController],
})
export class ProvidersModule {}
