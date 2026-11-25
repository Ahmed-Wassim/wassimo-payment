import {
  Table,
  TableForeignKey,
  TableUnique,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateUsersRolesPermissions1794254878805 implements MigrationInterface {
  name = 'CreateUsersRolesPermissions1794254878805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          { name: 'code', type: 'text', isPrimary: true },
          { name: 'name', type: 'text' },
          { name: 'group_name', type: 'text' },
        ],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'organization_id', type: 'uuid', isNullable: true },
          { name: 'name', type: 'text' },
          { name: 'created_by', type: 'uuid', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          { name: 'role_id', type: 'uuid', isPrimary: true },
          { name: 'permission_code', type: 'text', isPrimary: true },
        ],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'email', type: 'varchar', length: '255' },
          { name: 'password_hash', type: 'varchar', length: '255' },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: "'active'",
          },
          { name: 'is_super_admin', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [
          new TableUnique({ name: 'UQ_users_email', columnNames: ['email'] }),
        ],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'org_memberships',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'organization_id', type: 'uuid' },
          { name: 'role_id', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_org_memberships_user_id',
            columnNames: ['user_id'],
          }),
        ],
      }),
    );

    await queryRunner.createForeignKeys('roles', [
      new TableForeignKey({
        name: 'FK_roles_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
      new TableForeignKey({
        name: 'FK_roles_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'NO ACTION',
      }),
    ]);
    await queryRunner.createForeignKeys('role_permissions', [
      new TableForeignKey({
        name: 'FK_role_permissions_role_id',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
      new TableForeignKey({
        name: 'FK_role_permissions_permission_code',
        columnNames: ['permission_code'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['code'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    ]);
    await queryRunner.createForeignKeys('org_memberships', [
      new TableForeignKey({
        name: 'FK_org_memberships_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
      new TableForeignKey({
        name: 'FK_org_memberships_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
      new TableForeignKey({
        name: 'FK_org_memberships_role_id',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('org_memberships');
    await queryRunner.dropTable('role_permissions');
    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('users');
    await queryRunner.dropTable('permissions');
  }
}
