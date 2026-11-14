import { Module, forwardRef } from '@nestjs/common';
import { CredentialsService } from './credentials.service.ts';
import { ApiCredential } from './entities/api-credential.entity.ts';
import { CredentialsController } from './credentials.controller.ts';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.ts';
import { UsersModule } from '../users/users.module.ts';
import { Application } from '../applications/entities/application.entity.ts';
import { Organization } from '../organizations/entities/organization.entity.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiCredential, Application, Organization]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [CredentialsService],
  exports: [CredentialsService],
  controllers: [CredentialsController],
})
export class CredentialsModule {}