import {
  TableColumn,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class TightenTimestampColumns1793968100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of [
      ['organizations', 'created_at'],
      ['organizations', 'updated_at'],
      ['currencies', 'created_at'],
    ]) {
      await queryRunner.changeColumn(
        table,
        column,
        new TableColumn({
          name: column,
          type: 'timestamptz',
          isNullable: false,
          default: 'now()',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of [
      ['organizations', 'created_at'],
      ['organizations', 'updated_at'],
      ['currencies', 'created_at'],
    ]) {
      await queryRunner.changeColumn(
        table,
        column,
        new TableColumn({
          name: column,
          type: 'timestamptz',
          isNullable: true,
          default: 'CURRENT_TIMESTAMP',
        }),
      );
    }
  }
}
