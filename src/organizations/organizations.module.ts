import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service.ts';
import { Organization } from './organization.entity.ts';
import { OrganizationsController } from './organizations.controller.ts';
import { Application } from '../applications/application.entity.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Application])],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
