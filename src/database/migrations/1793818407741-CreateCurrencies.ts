import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCurrencies1793818407741 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "currencies" (
                "id" SERIAL PRIMARY KEY,
                "code" VARCHAR(3) NOT NULL UNIQUE,
                "exponent" SMALLINT NOT NULL CHECK ("exponent" >= 0 AND "exponent" <= 4),
                "symbol" TEXT NOT NULL,
                "enabled"    BOOLEAN NOT NULL DEFAULT true,
                "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "currencies"`);
  }
}
