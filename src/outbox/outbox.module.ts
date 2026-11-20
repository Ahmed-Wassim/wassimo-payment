import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from './entities/outbox-event.entity.ts';
import { OutboxPublisherService } from './outbox.publisher.ts';
import { OutboxService } from './outbox.service.ts';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent])],
  exports: [OutboxService],
  providers: [OutboxService, OutboxPublisherService],
})
export class OutboxModule {}
