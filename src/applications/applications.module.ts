import { Module, forwardRef } from '@nestjs/common';
import { ApplicationsService } from './applications.service.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { UsersModule } from '../users/users.module.ts';
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
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
