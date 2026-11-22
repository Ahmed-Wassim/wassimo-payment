import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../users/entities/permission.entity.ts';
import { AuthModule } from '../auth/auth.module.ts';
import { PermissionsController } from './permissions.controller.ts';
import { PermissionsSeeder } from './seeder/permissions.seeder.ts';
import { PermissionsService } from './permissions.service.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Permission]), AuthModule],
  controllers: [PermissionsController],
  providers: [PermissionsSeeder, PermissionsService],
  exports: [PermissionsSeeder, PermissionsService],
})
export class PermissionsModule {}
