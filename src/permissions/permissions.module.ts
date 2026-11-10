import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../users/entities/permission.entity.ts';
import { PermissionsSeeder } from './permissions.seeder.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Permission])],
  providers: [PermissionsSeeder],
  exports: [PermissionsSeeder],
})
export class PermissionsModule {}