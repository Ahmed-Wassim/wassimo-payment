import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomers1794655711271 implements MigrationInterface {
  name = 'CreateCustomers1794655711271';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_id" uuid NOT NULL, "name" character varying(255), "email" character varying(255), "phone" character varying(32), "street" character varying(255), "city" character varying(255), "state" character varying(255), "country" character(2), "zip" character varying(32), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_customers_payment_id" UNIQUE ("payment_id"), CONSTRAINT "PK_customers_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD CONSTRAINT "customers_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" DROP CONSTRAINT "customers_payment_id_fkey"`,
    );
    await queryRunner.query(`DROP TABLE "customers"`);
  }
}
