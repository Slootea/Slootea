import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `service_records` table — a per-client log of services rendered.
 *
 * Notes:
 *  - `serviceDate` is a pure DATE (no time, no timezone) so changing the
 *    organization's timezone setting later does NOT shift stored values.
 *    The frontend constructs/renders the date using the org timezone.
 *  - Org members AND admins can CRUD via the controller; the table itself
 *    has no per-row role information.
 */
export class AddServiceRecords1747000000000 implements MigrationInterface {
  name = 'AddServiceRecords1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" varchar NOT NULL,
        "clientId" uuid NOT NULL,
        "serviceOptionId" uuid NOT NULL,
        "serviceDate" date NOT NULL,
        "note" text,
        "createdByUserId" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_records_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "service_records"
       ADD CONSTRAINT "FK_service_records_client"
       FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE "service_records"
       ADD CONSTRAINT "FK_service_records_service_option"
       FOREIGN KEY ("serviceOptionId") REFERENCES "service_options"("id") ON DELETE RESTRICT`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_service_records_org_client_date"
       ON "service_records" ("organizationId", "clientId", "serviceDate")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_service_records_org_date"
       ON "service_records" ("organizationId", "serviceDate")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_service_records_org_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_service_records_org_client_date"`);
    await queryRunner.query(
      `ALTER TABLE "service_records" DROP CONSTRAINT IF EXISTS "FK_service_records_service_option"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_records" DROP CONSTRAINT IF EXISTS "FK_service_records_client"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "service_records"`);
  }
}
