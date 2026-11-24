import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexPaymentAttemptProviderReference1794802000000
  implements MigrationInterface
{
  name = 'IndexPaymentAttemptProviderReference1794802000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "payment_attempts_provider_reference" ON "payment_attempts" ("provider_reference") WHERE "provider_reference" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "payment_attempts_provider_reference"`,
    );
  }
}
