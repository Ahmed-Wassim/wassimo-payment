import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BindProviderAccountsToApplications1794489000000
  implements MigrationInterface {
  name = 'BindProviderAccountsToApplications1794489000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "provider_accounts"
        ADD "application_id" uuid
    `);

    await queryRunner.query(`
        UPDATE provider_accounts
        SET application_id = (
          SELECT id FROM applications WHERE slug = 'payment-consumer'
        )
    `);

    await queryRunner.query(`
        ALTER TABLE "provider_accounts"
        ALTER COLUMN "application_id" SET NOT NULL
    `);

    await queryRunner.query(`
        ALTER TABLE "provider_accounts"
        ADD CONSTRAINT "FK_provider_accounts_application_id"
        FOREIGN KEY ("application_id")
        REFERENCES "applications"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "provider_accounts"
        DROP CONSTRAINT "FK_provider_accounts_application_id"
    `);
    await queryRunner.query(`
        ALTER TABLE "provider_accounts"
        DROP COLUMN "application_id"
    `);
  }
}
