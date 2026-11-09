import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service.ts';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity.ts';
import { ApplicationsController } from './applications.controller.ts';
import { Organization } from '../organizations/entities/organization.entity.ts';
import { ApiCredential } from '../credentials/entities/api-credential.entity.ts';

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
