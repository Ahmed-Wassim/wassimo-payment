import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TightenTimestampColumns1793968100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "created_at" SET NOT NULL, ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "updated_at" SET NOT NULL, ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "currencies" ALTER COLUMN "created_at" SET NOT NULL, ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "created_at" DROP NOT NULL, ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "updated_at" DROP NOT NULL, ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "currencies" ALTER COLUMN "created_at" DROP NOT NULL, ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
  }
}
