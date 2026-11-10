import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service.ts';
import { Organization } from './entities/organization.entity.ts';
import { OrganizationsController } from './organizations.controller.ts';
import { Application } from '../applications/entities/application.entity.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { UsersModule } from '../users/users.module.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Application]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
