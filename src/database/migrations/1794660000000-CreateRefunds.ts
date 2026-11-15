import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefunds1794660000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL REFERENCES payments(id),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
        currency CHAR(3) NOT NULL REFERENCES currencies(code),
        status TEXT NOT NULL DEFAULT 'requested',
        provider_ref TEXT,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX refunds_payment ON refunds (payment_id)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE refunds`);
  }
}
