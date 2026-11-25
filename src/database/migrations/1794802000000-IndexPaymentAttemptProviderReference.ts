import { TableIndex, type MigrationInterface, type QueryRunner } from 'typeorm';

export class IndexPaymentAttemptProviderReference1794802000000 implements MigrationInterface {
  name = 'IndexPaymentAttemptProviderReference1794802000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'payment_attempts',
      new TableIndex({
        name: 'payment_attempts_provider_reference',
        columnNames: ['provider_reference'],
        where: '"provider_reference" IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'payment_attempts',
      'payment_attempts_provider_reference',
    );
  }
}
