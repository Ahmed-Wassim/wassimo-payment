import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedPendingIndex1794660100000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE INDEX payments_created_pending
        ON payments (created_at)
        WHERE status = 'created'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX payments_created_pending`);
  }
}
