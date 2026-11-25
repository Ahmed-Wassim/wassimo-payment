import {
  Table,
  TableForeignKey,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateProvidersAndAccounts1794231030644 implements MigrationInterface {
  name = 'CreateProvidersAndAccounts1794231030644';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'providers',
        columns: [
          { name: 'code', type: 'text', isPrimary: true },
          { name: 'name', type: 'text' },
        ],
      }),
    );
    await queryRunner.query(
      `INSERT INTO "providers" ("code", "name") VALUES ('mock', 'Mock Provider'), ('paytabs', 'PayTabs')`,
    );
    await queryRunner.createTable(
      new Table({
        name: 'provider_accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'organization_id', type: 'uuid' },
          { name: 'provider_code', type: 'text' },
          { name: 'environment', type: 'text' },
          { name: 'display_name', type: 'text' },
          { name: 'status', type: 'text', default: "'disabled'" },
          { name: 'supported_currencies', type: 'jsonb' },
          { name: 'supported_methods', type: 'jsonb' },
          { name: 'config', type: 'jsonb', default: "'{}'" },
          { name: 'credentials_ref', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKeys('provider_accounts', [
      new TableForeignKey({
        name: 'FK_provider_accounts_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        name: 'FK_provider_accounts_provider_code',
        columnNames: ['provider_code'],
        referencedTableName: 'providers',
        referencedColumnNames: ['code'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('provider_accounts');
    await queryRunner.query(
      `DELETE FROM providers WHERE code IN ('mock', 'paytabs')`,
    );
    await queryRunner.dropTable('providers');
  }
}
