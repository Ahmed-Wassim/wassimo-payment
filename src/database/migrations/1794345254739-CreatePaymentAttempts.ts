import {
  Table,
  TableIndex,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreatePaymentAttempts1794345254739 implements MigrationInterface {
  name = 'CreatePaymentAttempts1794345254739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'payment_id', type: 'uuid' },
          { name: 'organization_id', type: 'uuid' },
          { name: 'provider_account_id', type: 'uuid' },
          { name: 'operation', type: 'text', default: "'charge'" },
          { name: 'status', type: 'text', default: "'initiated'" },
          { name: 'provider_reference', type: 'text', isNullable: true },
          { name: 'diagnostics', type: 'jsonb', default: "'{}'::jsonb" },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createIndex(
      'payment_attempts',
      new TableIndex({
        name: 'payment_attempts_payment',
        columnNames: ['payment_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('payment_attempts', 'payment_attempts_payment');
    await queryRunner.dropTable('payment_attempts');
  }
}
