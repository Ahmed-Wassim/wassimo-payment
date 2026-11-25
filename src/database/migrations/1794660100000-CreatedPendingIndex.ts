import { TableIndex, type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreatedPendingIndex1794660100000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.createIndex(
      'payments',
      new TableIndex({
        name: 'payments_created_pending',
        columnNames: ['created_at'],
        where: "status = 'created'",
      }),
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.dropIndex('payments', 'payments_created_pending');
  }
}
