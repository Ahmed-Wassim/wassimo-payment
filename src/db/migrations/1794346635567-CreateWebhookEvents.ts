import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookEvents1794346635567 implements MigrationInterface {
  name = 'CreateWebhookEvents1794346635567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "webhook_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "provider_account_id" uuid, "provider_event_id" text, "event_type" text NOT NULL, "raw_payload" jsonb NOT NULL, "status" text NOT NULL DEFAULT 'pending', "error" text, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "processed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_webhook_events_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "webhook_events_dedupe" ON "webhook_events" (COALESCE("provider_account_id", '00000000-0000-0000-0000-000000000000'::uuid), "provider_event_id") WHERE "provider_event_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."webhook_events_dedupe"`);
    await queryRunner.query(`DROP TABLE "webhook_events"`);
  }
}
