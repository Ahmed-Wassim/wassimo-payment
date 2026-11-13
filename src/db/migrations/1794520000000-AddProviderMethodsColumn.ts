import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderMethodsColumn1794520000000
  implements MigrationInterface {
  name = 'AddProviderMethodsColumn1794520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "providers"
        ADD "methods" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "providers"
        DROP COLUMN "methods"
    `);
  }
}
