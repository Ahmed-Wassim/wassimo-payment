import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersRolesPermissions1794254878805 implements MigrationInterface {
  name = 'CreateUsersRolesPermissions1794254878805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "group_name" TEXT NOT NULL,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("code")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" UUID,
        "name" TEXT NOT NULL,
        "created_by" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" UUID NOT NULL,
        "permission_code" TEXT NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_code")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "status" VARCHAR(32) NOT NULL DEFAULT 'active',
        "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "org_memberships" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "role_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_org_memberships_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_org_memberships" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
        ADD CONSTRAINT "FK_roles_organization_id"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      ALTER TABLE "roles"
        ADD CONSTRAINT "FK_roles_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions"
        ADD CONSTRAINT "FK_role_permissions_role_id"
        FOREIGN KEY ("role_id") REFERENCES "roles"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      ALTER TABLE "role_permissions"
        ADD CONSTRAINT "FK_role_permissions_permission_code"
        FOREIGN KEY ("permission_code") REFERENCES "permissions"("code")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      ALTER TABLE "org_memberships"
        ADD CONSTRAINT "FK_org_memberships_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      ALTER TABLE "org_memberships"
        ADD CONSTRAINT "FK_org_memberships_organization_id"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      ALTER TABLE "org_memberships"
        ADD CONSTRAINT "FK_org_memberships_role_id"
        FOREIGN KEY ("role_id") REFERENCES "roles"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "org_memberships" DROP CONSTRAINT "FK_org_memberships_role_id"`);
    await queryRunner.query(`ALTER TABLE "org_memberships" DROP CONSTRAINT "FK_org_memberships_organization_id"`);
    await queryRunner.query(`ALTER TABLE "org_memberships" DROP CONSTRAINT "FK_org_memberships_user_id"`);
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_permission_code"`);
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_role_id"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_created_by"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_organization_id"`);
    await queryRunner.query(`DROP TABLE "org_memberships"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
