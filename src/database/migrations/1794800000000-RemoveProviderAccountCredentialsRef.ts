import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProviderAccountCredentialsRef1794800000000
  implements MigrationInterface
{
  name = 'RemoveProviderAccountCredentialsRef1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_accounts"
      DROP COLUMN "credentials_ref"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_accounts"
      ADD "credentials_ref" text
    `);
  }
}
