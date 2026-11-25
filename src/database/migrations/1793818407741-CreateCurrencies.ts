import {
  Table,
  TableCheck,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateCurrencies1793818407741 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'currencies',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'code', type: 'varchar', length: '3', isUnique: true },
          { name: 'exponent', type: 'smallint' },
          { name: 'symbol', type: 'text' },
          { name: 'enabled', type: 'boolean', default: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        checks: [
          new TableCheck({ expression: '"exponent" >= 0 AND "exponent" <= 4' }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('currencies');
  }
}
