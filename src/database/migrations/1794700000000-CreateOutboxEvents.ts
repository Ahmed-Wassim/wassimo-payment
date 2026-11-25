import {
  Table,
  TableIndex,
  TableUnique,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateOutboxEvents1794700000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.createTable(
      new Table({
        name: 'outbox_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'event_id', type: 'uuid' },
          { name: 'event_type', type: 'text' },
          { name: 'payload', type: 'jsonb' },
          { name: 'correlation_id', type: 'text' },
          { name: 'occurred_at', type: 'timestamptz' },
          { name: 'status', type: 'text', default: "'pending'" },
          { name: 'attempts', type: 'int', default: 0 },
          { name: 'next_attempt_at', type: 'timestamptz', default: 'now()' },
          { name: 'last_error', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'published_at', type: 'timestamptz', isNullable: true },
        ],
        uniques: [new TableUnique({ columnNames: ['event_id'] })],
      }),
    );
    await q.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'outbox_events_pending',
        columnNames: ['status', 'next_attempt_at'],
      }),
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.dropIndex('outbox_events', 'outbox_events_pending');
    await q.dropTable('outbox_events');
  }
}
