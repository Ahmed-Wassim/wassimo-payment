import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service.ts';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity.ts';
import { ApplicationsController } from './applications.controller.ts';
import { Organization } from '../organizations/organization.entity.ts';
import { ApiCredential } from '../credentials/api-credential.entity.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application, Organization, ApiCredential,
    ]),
  ],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
