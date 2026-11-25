import {
  TableColumn,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class EnableProviderAccountsByDefault1794801000000 implements MigrationInterface {
  name = 'EnableProviderAccountsByDefault1794801000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'provider_accounts',
      'status',
      new TableColumn({ name: 'status', type: 'text', default: "'enabled'" }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'provider_accounts',
      'status',
      new TableColumn({ name: 'status', type: 'text', default: "'disabled'" }),
    );
  }
}
