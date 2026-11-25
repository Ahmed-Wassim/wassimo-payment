import {
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateRefunds1794660000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.createTable(
      new Table({
        name: 'refunds',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'payment_id', type: 'uuid' },
          { name: 'organization_id', type: 'uuid' },
          { name: 'amount_minor', type: 'bigint' },
          { name: 'currency', type: 'char', length: '3' },
          { name: 'status', type: 'text', default: "'requested'" },
          { name: 'provider_ref', type: 'text', isNullable: true },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        checks: [new TableCheck({ expression: 'amount_minor > 0' })],
      }),
    );
    await q.createForeignKeys('refunds', [
      new TableForeignKey({
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        columnNames: ['currency'],
        referencedTableName: 'currencies',
        referencedColumnNames: ['code'],
      }),
    ]);
    await q.createIndex(
      'refunds',
      new TableIndex({ name: 'refunds_payment', columnNames: ['payment_id'] }),
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.dropIndex('refunds', 'refunds_payment');
    await q.dropTable('refunds');
  }
}
