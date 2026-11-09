import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencySymbolUrl1794260000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "currencies"
      ADD COLUMN "symbol_url" TEXT
    `);

    await queryRunner.query(`
      UPDATE "currencies" SET "symbol_url" = CASE "code"
        WHEN 'EGP' THEN 'https://flagcdn.com/eg.svg'
        WHEN 'SAR' THEN 'https://flagcdn.com/sa.svg'
        WHEN 'USD' THEN 'https://flagcdn.com/us.svg'
        WHEN 'EUR' THEN 'https://flagcdn.com/eu.svg'
        WHEN 'AED' THEN 'https://flagcdn.com/ae.svg'
        ELSE "symbol_url"
      END
      WHERE "code" IN ('EGP', 'SAR', 'USD', 'EUR', 'AED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "currencies"
      DROP COLUMN "symbol_url"
    `);
  }
}
