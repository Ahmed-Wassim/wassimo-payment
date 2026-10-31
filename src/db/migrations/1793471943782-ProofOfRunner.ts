import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProofOfRunner1793471943782 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "proof_of_runner" (id int);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "proof_of_runner";`);
  }
}
