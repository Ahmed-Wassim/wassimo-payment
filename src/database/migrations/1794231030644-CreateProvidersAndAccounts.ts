import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProvidersAndAccounts1794231030644 implements MigrationInterface {
    name = 'CreateProvidersAndAccounts1794231030644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "providers" ("code" text NOT NULL, "name" text NOT NULL, CONSTRAINT "PK_cdc1db37b0ed3c1c6bc8c1f0458" PRIMARY KEY ("code"))`);
        await queryRunner.query(`INSERT INTO "providers" ("code", "name") VALUES ('mock', 'Mock Provider'), ('paytabs', 'PayTabs')`);
        await queryRunner.query(`CREATE TABLE "provider_accounts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organization_id" uuid NOT NULL, "provider_code" text NOT NULL, "environment" text NOT NULL, "display_name" text NOT NULL, "status" text NOT NULL DEFAULT 'disabled', "supported_currencies" jsonb NOT NULL, "supported_methods" jsonb NOT NULL, "config" jsonb NOT NULL DEFAULT '{}', "credentials_ref" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_30803043b7efd4483786901ddc0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "provider_accounts" ADD CONSTRAINT "FK_provider_accounts_organization_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")`);
        await queryRunner.query(`ALTER TABLE "provider_accounts" ADD CONSTRAINT "FK_provider_accounts_provider_code" FOREIGN KEY ("provider_code") REFERENCES "providers"("code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "provider_accounts" DROP CONSTRAINT "FK_provider_accounts_provider_code"`);
        await queryRunner.query(`ALTER TABLE "provider_accounts" DROP CONSTRAINT "FK_provider_accounts_organization_id"`);
        await queryRunner.query(`DROP TABLE "provider_accounts"`);
        await queryRunner.query(`DELETE FROM providers WHERE code IN ('mock', 'paytabs')`);
        await queryRunner.query(`DROP TABLE "providers"`);
    }

}
