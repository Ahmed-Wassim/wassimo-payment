import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganization1793814650820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "organizations" (
                "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "slug" VARCHAR(255) NOT NULL UNIQUE,
                "name" VARCHAR(255) NOT NULL,
                "is_platform" BOOLEAN NOT NULL DEFAULT false,
                "status" VARCHAR(255) NOT NULL DEFAULT 'active',
                "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE organizations`);
  }
}
