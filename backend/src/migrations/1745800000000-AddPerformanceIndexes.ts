import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Performance indexes for hot lookup paths used during booking/availability:
 *  - availabilities & blocked_times: per-provider per-day lookups in the slot calculator
 *  - service_options: active-list fetches on the public booking page and dashboards
 *  - booking_links: organization-scoped queries
 *  - appointments: organization+status filtered scans (cron, dashboard)
 *
 * All indexes are CREATE INDEX IF NOT EXISTS so the migration is idempotent and
 * safe to re-run. CONCURRENTLY is intentionally omitted so the migration can run
 * inside the standard TypeORM transaction.
 */
export class AddPerformanceIndexes1745800000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1745800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // availabilities — slot calculator filters by (userId|externalProviderId, dayOfWeek, isActive)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_availabilities_user_day_active" ON "availabilities" ("userId", "dayOfWeek", "isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_availabilities_extprov_day_active" ON "availabilities" ("externalProviderId", "dayOfWeek", "isActive")`,
    );

    // blocked_times — slot calculator filters by (userId|externalProviderId, date)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blocked_times_user_date" ON "blocked_times" ("userId", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blocked_times_extprov_date" ON "blocked_times" ("externalProviderId", "date")`,
    );

    // booking_links — organization-scoped lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_booking_links_org" ON "booking_links" ("organizationId")`,
    );

    // service_options — active list per organization / per user
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_service_options_org_active" ON "service_options" ("organizationId", "isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_service_options_user_active" ON "service_options" ("userId", "isActive")`,
    );

    // appointments — cron and admin scans by status within an organization
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_appointments_org_status" ON "appointments" ("organizationId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appointments_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_service_options_user_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_service_options_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_booking_links_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_blocked_times_extprov_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_blocked_times_user_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_availabilities_extprov_day_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_availabilities_user_day_active"`);
  }
}
