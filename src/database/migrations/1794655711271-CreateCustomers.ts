import {
  Table,
  TableForeignKey,
  TableUnique,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateCustomers1794655711271 implements MigrationInterface {
  name = 'CreateCustomers1794655711271';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'payment_id', type: 'uuid' },
          { name: 'name', type: 'varchar', length: '255', isNullable: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          { name: 'phone', type: 'varchar', length: '32', isNullable: true },
          { name: 'street', type: 'varchar', length: '255', isNullable: true },
          { name: 'city', type: 'varchar', length: '255', isNullable: true },
          { name: 'state', type: 'varchar', length: '255', isNullable: true },
          { name: 'country', type: 'char', length: '2', isNullable: true },
          { name: 'zip', type: 'varchar', length: '32', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_customers_payment_id',
            columnNames: ['payment_id'],
          }),
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'customers',
      new TableForeignKey({
        name: 'customers_payment_id_fkey',
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('customers', 'customers_payment_id_fkey');
    await queryRunner.dropTable('customers');
  }
}
