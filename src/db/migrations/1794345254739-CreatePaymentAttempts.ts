import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentAttempts1794345254739 implements MigrationInterface {
  name = 'CreatePaymentAttempts1794345254739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_attempts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_id" uuid NOT NULL, "organization_id" uuid NOT NULL, "provider_account_id" uuid NOT NULL, "operation" text NOT NULL DEFAULT 'charge', "status" text NOT NULL DEFAULT 'initiated', "provider_reference" text, "diagnostics" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_payment_attempts_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "payment_attempts_payment" ON "payment_attempts" ("payment_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."payment_attempts_payment"`);
    await queryRunner.query(`DROP TABLE "payment_attempts"`);
  }
}
