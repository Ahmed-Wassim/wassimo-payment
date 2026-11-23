import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableProviderAccountsByDefault1794801000000
  implements MigrationInterface
{
  name = 'EnableProviderAccountsByDefault1794801000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_accounts"
      ALTER COLUMN "status" SET DEFAULT 'enabled'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_accounts"
      ALTER COLUMN "status" SET DEFAULT 'disabled'
    `);
  }
}
