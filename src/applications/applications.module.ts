import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service.ts';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity.ts';

@Module({
  imports: [TypeOrmModule.forFeature([Application])],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
