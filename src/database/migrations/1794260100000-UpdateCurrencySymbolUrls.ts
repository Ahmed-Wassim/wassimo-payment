import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCurrencySymbolUrls1794260100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "currencies" SET "symbol_url" = CASE "code"
        WHEN 'EGP' THEN 'https://api.iconify.design/tabler/currency-pound.svg'
        WHEN 'SAR' THEN 'https://api.iconify.design/hugeicons/saudi-riyal.svg'
        WHEN 'USD' THEN 'https://api.iconify.design/mdi/currency-usd.svg'
        WHEN 'EUR' THEN 'https://api.iconify.design/mdi/currency-eur.svg'
        WHEN 'AED' THEN 'https://api.iconify.design/tabler/currency-dirham.svg'
        ELSE "symbol_url"
      END
      WHERE "code" IN ('EGP', 'SAR', 'USD', 'EUR', 'AED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
