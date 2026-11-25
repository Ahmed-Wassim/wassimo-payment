import { Table, type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateOrganization1793814650820 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'slug', type: 'varchar', length: '255', isUnique: true },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'is_platform', type: 'boolean', default: false },
          {
            name: 'status',
            type: 'varchar',
            length: '255',
            default: "'active'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('organizations');
  }
}
