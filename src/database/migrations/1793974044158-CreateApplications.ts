import {
  Table,
  TableForeignKey,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateApplications1793974044158 implements MigrationInterface {
  name = 'CreateApplications1793974044158';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'applications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'slug', type: 'varchar', length: '255' },
          { name: 'name', type: 'varchar', length: '255' },
          {
            name: 'status',
            type: 'varchar',
            length: '255',
            default: "'active'",
          },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'organization_id', type: 'uuid' },
        ],
        uniques: [
          { name: 'UQ_7482543b92c5b8b51b988f890e5', columnNames: ['slug'] },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'applications',
      new TableForeignKey({
        name: 'FK_8808eef8dd417f90bcf91cb9fb6',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'applications',
      'FK_8808eef8dd417f90bcf91cb9fb6',
    );
    await queryRunner.dropTable('applications');
  }
}
