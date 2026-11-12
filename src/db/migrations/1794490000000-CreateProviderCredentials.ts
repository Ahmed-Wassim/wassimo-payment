import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProviderCredentials1794490000000
  implements MigrationInterface {
  name = 'CreateProviderCredentials1794490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "provider_credentials" (
            "id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "provider_account_id" uuid NOT NULL,
            "encrypted_payload" text NOT NULL,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_provider_credentials_provider_account_id"
                UNIQUE ("provider_account_id"),
            CONSTRAINT "PK_provider_credentials" PRIMARY KEY ("id")
        )
    `);

    await queryRunner.query(`
        ALTER TABLE "provider_credentials"
        ADD CONSTRAINT "FK_provider_credentials_provider_account_id"
        FOREIGN KEY ("provider_account_id")
        REFERENCES "provider_accounts"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE "provider_credentials"
    `);
  }
}
