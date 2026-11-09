import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.ts';
import { CredentialsModule } from '../credentials/credentials.module.ts';
import { ProvidersModule } from '../providers/providers.module.ts';
import { OptionsController } from './options.controller.ts';

@Module({
  imports: [AuthModule, CredentialsModule, ProvidersModule],
  controllers: [OptionsController],
})
export class OptionsModule {}
