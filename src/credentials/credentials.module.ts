import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service.ts';
import { ApiCredential } from './api-credential.entity.ts';
import { CredentialsController } from './credentials.controller.ts';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ApiCredential])],
  providers: [CredentialsService],
  exports: [CredentialsService],
  controllers: [CredentialsController],
})
export class CredentialsModule {}
