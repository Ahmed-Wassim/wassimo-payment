import {
  Table,
  TableForeignKey,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class CreateApiCredentials1793979951211 implements MigrationInterface {
  name = 'CreateApiCredentials1793979951211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'api_credentials',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'key_id', type: 'text' },
          { name: 'secret_hash', type: 'text' },
          { name: 'prefix', type: 'varchar', length: '255' },
          { name: 'environment', type: 'varchar', length: '255' },
          { name: 'scopes', type: 'jsonb', default: "'[]'::jsonb" },
          {
            name: 'status',
            type: 'varchar',
            length: '255',
            default: "'active'",
          },
          { name: 'last_used_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'revoked_at', type: 'timestamptz', isNullable: true },
          { name: 'application_id', type: 'uuid' },
        ],
        uniques: [
          { name: 'UQ_fad1c132ff87f73ac4b886276ab', columnNames: ['key_id'] },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'api_credentials',
      new TableForeignKey({
        name: 'FK_143f5313f8e5f505c983801959c',
        columnNames: ['application_id'],
        referencedTableName: 'applications',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'api_credentials',
      'FK_143f5313f8e5f505c983801959c',
    );
    await queryRunner.dropTable('api_credentials');
  }
}
