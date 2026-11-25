import {
  Table,
  TableForeignKey,
  TableUnique,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateProviderCredentials1794490000000 implements MigrationInterface {
  name = 'CreateProviderCredentials1794490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'provider_credentials',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'provider_account_id', type: 'uuid' },
          { name: 'encrypted_payload', type: 'text' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_provider_credentials_provider_account_id',
            columnNames: ['provider_account_id'],
          }),
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'provider_credentials',
      new TableForeignKey({
        name: 'FK_provider_credentials_provider_account_id',
        columnNames: ['provider_account_id'],
        referencedTableName: 'provider_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('provider_credentials');
  }
}
