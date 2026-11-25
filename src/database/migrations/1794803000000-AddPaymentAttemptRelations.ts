import {
  TableForeignKey,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class AddPaymentAttemptRelations1794803000000 implements MigrationInterface {
  name = 'AddPaymentAttemptRelations1794803000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKeys('payment_attempts', [
      new TableForeignKey({
        name: 'FK_payment_attempts_payment_id',
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        name: 'FK_payment_attempts_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        name: 'FK_payment_attempts_provider_account_id',
        columnNames: ['provider_account_id'],
        referencedTableName: 'provider_accounts',
        referencedColumnNames: ['id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKeys('payment_attempts', [
      new TableForeignKey({
        name: 'FK_payment_attempts_provider_account_id',
        columnNames: ['provider_account_id'],
        referencedTableName: 'provider_accounts',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        name: 'FK_payment_attempts_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
      }),
      new TableForeignKey({
        name: 'FK_payment_attempts_payment_id',
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
      }),
    ]);
  }
}
