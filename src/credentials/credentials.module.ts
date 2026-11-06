import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service.js';
import { ApiCredential } from './api-credential.entity.ts';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ApiCredential])],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
