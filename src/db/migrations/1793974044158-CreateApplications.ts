import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApplications1793974044158 implements MigrationInterface {
  name = 'CreateApplications1793974044158';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "applications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "status" character varying(255) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organization_id" uuid NOT NULL, CONSTRAINT "UQ_7482543b92c5b8b51b988f890e5" UNIQUE ("slug"), CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_8808eef8dd417f90bcf91cb9fb6" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_8808eef8dd417f90bcf91cb9fb6"`,
    );
    await queryRunner.query(`DROP TABLE "applications"`);
  }
}
