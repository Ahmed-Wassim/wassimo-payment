import {
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreatePayments1794260200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'organization_id', type: 'uuid' },
          { name: 'application_id', type: 'uuid' },
          { name: 'reference', type: 'text' },
          { name: 'amount_minor', type: 'bigint' },
          { name: 'currency', type: 'char', length: '3' },
          { name: 'status', type: 'text', default: "'created'" },
          { name: 'provider_account_id', type: 'uuid', isNullable: true },
          { name: 'method', type: 'text', isNullable: true },
          { name: 'captured_minor', type: 'bigint', default: 0 },
          { name: 'refunded_confirmed_minor', type: 'bigint', default: 0 },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        checks: [
          new TableCheck({ expression: '"amount_minor" > 0' }),
          new TableCheck({ expression: '"captured_minor" >= 0' }),
          new TableCheck({ expression: '"refunded_confirmed_minor" >= 0' }),
        ],
      }),
    );
    await queryRunner.createForeignKeys('payments', [
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['application_id'],
        referencedTableName: 'applications',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['currency'],
        referencedTableName: 'currencies',
        referencedColumnNames: ['code'],
      }),
      new TableForeignKey({
        columnNames: ['provider_account_id'],
        referencedTableName: 'provider_accounts',
        referencedColumnNames: ['id'],
      }),
    ]);
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'payments_org_reference',
        columnNames: ['organization_id', 'reference'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payments');
  }
}
