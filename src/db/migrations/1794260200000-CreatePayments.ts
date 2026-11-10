import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1794260200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id"          UUID NOT NULL REFERENCES "organizations"("id"),
        "application_id"           UUID NOT NULL REFERENCES "applications"("id"),
        "reference"                TEXT NOT NULL,
        "amount_minor"             BIGINT NOT NULL CHECK ("amount_minor" > 0),
        "currency"                 CHAR(3) NOT NULL REFERENCES "currencies"("code"),
        "status"                   TEXT NOT NULL DEFAULT 'created',
        "provider_account_id"      UUID REFERENCES "provider_accounts"("id"),
        "method"                   TEXT,
        "captured_minor"           BIGINT NOT NULL DEFAULT 0 CHECK ("captured_minor" >= 0),
        "refunded_confirmed_minor" BIGINT NOT NULL DEFAULT 0 CHECK ("refunded_confirmed_minor" >= 0),
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "payments_org_reference"
        ON "payments" ("organization_id", "reference")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
  }
}
