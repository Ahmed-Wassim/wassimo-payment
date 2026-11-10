import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service.ts';
import { ProviderAccount } from './entities/provider-account.entity.ts';
import { Provider } from './entities/provider.entity.ts';
import { ProvidersController } from './providers.controller.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { UsersModule } from '../users/users.module.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, ProviderAccount]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [ProvidersService],
  exports: [ProvidersService],
  controllers: [ProvidersController],
})
export class ProvidersModule {}