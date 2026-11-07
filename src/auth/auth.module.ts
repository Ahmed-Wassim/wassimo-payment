import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard.ts';
import { CredentialsModule } from '../credentials/credentials.module.ts';

@Module({
  imports: [CredentialsModule],
  exports: [ApiKeyGuard],
  providers: [ApiKeyGuard],
})
export class AuthModule {}
