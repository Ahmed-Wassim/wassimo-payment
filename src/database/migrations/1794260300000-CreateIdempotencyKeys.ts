import {
  Table,
  TableForeignKey,
  TableIndex,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateIdempotencyKeys1794260300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'idempotency_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'organization_id', type: 'uuid' },
          { name: 'application_id', type: 'uuid' },
          { name: 'key', type: 'text' },
          { name: 'request_hash', type: 'text' },
          { name: 'payment_id', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKeys('idempotency_keys', [
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
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
      }),
    ]);
    await queryRunner.createIndex(
      'idempotency_keys',
      new TableIndex({
        name: 'idempotency_keys_scope_key',
        columnNames: ['organization_id', 'application_id', 'key'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('idempotency_keys');
  }
}
