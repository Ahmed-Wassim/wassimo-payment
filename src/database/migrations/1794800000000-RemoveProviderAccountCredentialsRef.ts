import {
  TableColumn,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class RemoveProviderAccountCredentialsRef1794800000000 implements MigrationInterface {
  name = 'RemoveProviderAccountCredentialsRef1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('provider_accounts', 'credentials_ref');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'provider_accounts',
      new TableColumn({
        name: 'credentials_ref',
        type: 'text',
        isNullable: true,
      }),
    );
  }
}
