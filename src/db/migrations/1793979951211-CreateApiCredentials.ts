import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiCredentials1793979951211 implements MigrationInterface {
  name = 'CreateApiCredentials1793979951211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_credentials" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key_id" text NOT NULL, "secret_hash" text NOT NULL, "prefix" character varying(255) NOT NULL, "environment" character varying(255) NOT NULL, "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb, "status" character varying(255) NOT NULL DEFAULT 'active', "last_used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "revoked_at" TIMESTAMP WITH TIME ZONE, "application_id" uuid NOT NULL, CONSTRAINT "UQ_fad1c132ff87f73ac4b886276ab" UNIQUE ("key_id"), CONSTRAINT "PK_3e97de2b2f8c5d0897b67e89e3c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_credentials" ADD CONSTRAINT "FK_143f5313f8e5f505c983801959c" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`
            INSERT INTO api_credentials (application_id, key_id, secret_hash, prefix, environment, scopes)
            SELECT id, 'edf6286f', 'eee1119dc8a5173aa986066b1597e526e99ac98d5ca8f60b69ce607cbbf63aca', 'wpk_edf6', 'test', '["payments:create"]'
            FROM applications
            WHERE slug = 'wassimo-order'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_credentials" DROP CONSTRAINT "FK_143f5313f8e5f505c983801959c"`,
    );
    await queryRunner.query(`DROP TABLE "api_credentials"`);
  }
}
