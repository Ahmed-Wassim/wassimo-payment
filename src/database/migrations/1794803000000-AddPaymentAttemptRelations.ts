import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentAttemptRelations1794803000000
  implements MigrationInterface
{
  name = 'AddPaymentAttemptRelations1794803000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_attempts"
      ADD CONSTRAINT "FK_payment_attempts_payment_id"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_attempts"
      ADD CONSTRAINT "FK_payment_attempts_organization_id"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_attempts"
      ADD CONSTRAINT "FK_payment_attempts_provider_account_id"
      FOREIGN KEY ("provider_account_id") REFERENCES "provider_accounts"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_attempts"
      DROP CONSTRAINT "FK_payment_attempts_provider_account_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_attempts"
      DROP CONSTRAINT "FK_payment_attempts_organization_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_attempts"
      DROP CONSTRAINT "FK_payment_attempts_payment_id"
    `);
  }
}
