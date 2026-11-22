import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleActiveCredentialPerEnvironment1794710000000
  implements MigrationInterface
{
  name = 'EnforceSingleActiveCredentialPerEnvironment1794710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked_credentials AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY application_id, environment
            ORDER BY created_at DESC, id DESC
          ) AS position
        FROM api_credentials
        WHERE status = 'active'
      )
      UPDATE api_credentials AS credential
      SET status = 'revoked', revoked_at = now()
      FROM ranked_credentials
      WHERE credential.id = ranked_credentials.id
        AND ranked_credentials.position > 1
    `);

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
