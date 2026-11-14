import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdempotencyKeys1794260300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id"),
        "application_id"  UUID NOT NULL REFERENCES "applications"("id"),
        "key"             TEXT NOT NULL,
        "request_hash"    TEXT NOT NULL,
        "payment_id"      UUID NOT NULL REFERENCES "payments"("id"),
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idempotency_keys_scope_key"
        ON "idempotency_keys" ("organization_id", "application_id", "key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
