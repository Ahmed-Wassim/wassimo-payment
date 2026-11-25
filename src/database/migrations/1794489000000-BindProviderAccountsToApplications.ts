import {
  TableColumn,
  TableForeignKey,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class BindProviderAccountsToApplications1794489000000 implements MigrationInterface {
  name = 'BindProviderAccountsToApplications1794489000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'provider_accounts',
      new TableColumn({
        name: 'application_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
        UPDATE provider_accounts
        SET application_id = (
          SELECT id FROM applications WHERE slug = 'payment-consumer'
        )
    `);

    await queryRunner.changeColumn(
      'provider_accounts',
      'application_id',
      new TableColumn({
        name: 'application_id',
        type: 'uuid',
        isNullable: false,
      }),
    );
    await queryRunner.createForeignKey(
      'provider_accounts',
      new TableForeignKey({
        name: 'FK_provider_accounts_application_id',
        columnNames: ['application_id'],
        referencedTableName: 'applications',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'provider_accounts',
      'FK_provider_accounts_application_id',
    );
    await queryRunner.dropColumn('provider_accounts', 'application_id');
  }
}
