import { Table, type MigrationInterface, type QueryRunner } from 'typeorm';

export class ProofOfRunner1793471943782 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'proof_of_runner',
        columns: [{ name: 'id', type: 'int', isNullable: true }],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('proof_of_runner', true);
  }
}
