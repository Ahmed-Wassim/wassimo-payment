import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleActiveCredentialPerEnvironment1794710000000
  implements MigrationInterface
{
  name = 'EnforceSingleActiveCredentialPerEnvironment1794710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_api_credentials_one_active_per_environment"
      ON "api_credentials" ("application_id", "environment")
      WHERE "status" = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "UQ_api_credentials_one_active_per_environment"`,
    );
  }
}
