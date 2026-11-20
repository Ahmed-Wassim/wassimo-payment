import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboxEvents1794700000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        correlation_id TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        published_at TIMESTAMPTZ
      )`);
    await q.query(
      `CREATE INDEX outbox_events_pending ON outbox_events (status, next_attempt_at)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE outbox_events`);
  }
}
