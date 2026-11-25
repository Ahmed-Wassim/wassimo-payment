import { Table, type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateWebhookEvents1794346635567 implements MigrationInterface {
  name = 'CreateWebhookEvents1794346635567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'provider_account_id', type: 'uuid', isNullable: true },
          { name: 'provider_event_id', type: 'text', isNullable: true },
          { name: 'event_type', type: 'text' },
          { name: 'raw_payload', type: 'jsonb' },
          { name: 'status', type: 'text', default: "'pending'" },
          { name: 'error', type: 'text', isNullable: true },
          { name: 'received_at', type: 'timestamptz', default: 'now()' },
          { name: 'processed_at', type: 'timestamptz', isNullable: true },
        ],
      }),
    );
    // QueryRunner's TableIndex accepts columns, not expressions; this unique index uses COALESCE.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "webhook_events_dedupe" ON "webhook_events" (COALESCE("provider_account_id", '00000000-0000-0000-0000-000000000000'::uuid), "provider_event_id") WHERE "provider_event_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('webhook_events', 'webhook_events_dedupe');
    await queryRunner.dropTable('webhook_events');
  }
}
