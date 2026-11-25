import { TableIndex, type MigrationInterface, type QueryRunner } from 'typeorm';

export class EnforceSingleActiveCredentialPerEnvironment1794710000000 implements MigrationInterface {
  name = 'EnforceSingleActiveCredentialPerEnvironment1794710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'api_credentials',
      new TableIndex({
        name: 'UQ_api_credentials_one_active_per_environment',
        columnNames: ['application_id', 'environment'],
        isUnique: true,
        where: "status = 'active'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'api_credentials',
      'UQ_api_credentials_one_active_per_environment',
    );
  }
}
