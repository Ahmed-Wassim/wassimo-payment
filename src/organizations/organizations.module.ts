import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service.ts';
import { Organization } from './organization.entity.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
