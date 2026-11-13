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

    await queryRunner.query(`
      INSERT INTO "permissions" ("code", "name", "group_name") VALUES
        ('org:read',             'View organization',        'organization'),
        ('org:update',           'Edit organization',        'organization'),
        ('org:members:read',     'View members',             'members'),
        ('org:members:manage',   'Manage members',           'members'),
        ('apps:read',            'View applications',        'applications'),
        ('apps:create',          'Create applications',      'applications'),
        ('apps:update',          'Edit applications',        'applications'),
        ('keys:read',            'View API keys',            'keys'),
        ('keys:issue',           'Issue API keys',           'keys'),
        ('keys:revoke',          'Revoke API keys',          'keys'),
        ('platform:orgs:read',   'View all organizations',   'platform'),
        ('platform:orgs:filter', 'Filter by organization',   'platform');
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("id", "organization_id", "name")
      SELECT '00000000-0000-0000-0000-000000000001', NULL, 'Super Admin';
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_code")
      SELECT '00000000-0000-0000-0000-000000000001', "code" FROM "permissions";
    `);

    await queryRunner.query(`
      INSERT INTO "users" ("email", "password_hash", "is_super_admin")
      VALUES ('superadmin@wassimo.local', '$2b$10$8RK5fNTSm20/LluvZWPCBu3jX53axu0l48O9cdIM3mnBO73I6Og3e', true);
    `);

    await queryRunner.query(`
      INSERT INTO "org_memberships" ("user_id", "organization_id", "role_id")
      SELECT u."id", o."id", '00000000-0000-0000-0000-000000000001'
      FROM "users" u CROSS JOIN "organizations" o
      WHERE u."is_super_admin" = true AND o."slug" = 'wassimo';
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
