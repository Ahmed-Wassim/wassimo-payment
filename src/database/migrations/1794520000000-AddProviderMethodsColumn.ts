import {
  TableColumn,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class AddProviderMethodsColumn1794520000000 implements MigrationInterface {
  name = 'AddProviderMethodsColumn1794520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'providers',
      new TableColumn({
        name: 'methods',
        type: 'jsonb',
        default: "'[]'::jsonb",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('providers', 'methods');
  }
}
