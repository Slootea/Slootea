import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add organizationId to Appointments Table
 * 
 * This migration adds an organizationId column to the appointments table
 * to ensure proper multi-tenant data isolation. Previously, appointments
 * were queried through the user_organizations join table, which could
 * leak data when users belong to multiple organizations.
 * 
 * Changes:
 * 1. Add organizationId column to appointments table
 * 2. Populate existing appointments with organizationId from their linked client
 *    or from the service option's organization
 * 3. Add indexes for performant queries
 */
export class AddOrganizationIdToAppointments1740000000000 implements MigrationInterface {
  name = 'AddOrganizationIdToAppointments1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Check if organizationId column already exists
    const hasOrganizationId = await this.columnExists(queryRunner, 'appointments', 'organizationId');
    
    if (!hasOrganizationId) {
      console.log('Adding organizationId column to appointments table...');
      await queryRunner.query(`
        ALTER TABLE "appointments" 
        ADD COLUMN "organizationId" VARCHAR(255) NULL
      `);
    } else {
      console.log('organizationId column already exists, skipping.');
    }

    // Step 2: Populate organizationId from linked client (if exists)
    console.log('Populating organizationId from linked clients...');
    await queryRunner.query(`
      UPDATE "appointments" a
      SET "organizationId" = c."organizationId"
      FROM "clients" c
      WHERE a."clientId" = c.id
        AND a."organizationId" IS NULL
        AND c."organizationId" IS NOT NULL
    `);

    // Step 3: Populate remaining appointments from service option's organizationId
    console.log('Populating organizationId from service options...');
    await queryRunner.query(`
      UPDATE "appointments" a
      SET "organizationId" = so."organizationId"
      FROM "service_options" so
      WHERE a."serviceOptionId" = so.id
        AND a."organizationId" IS NULL
        AND so."organizationId" IS NOT NULL
    `);

    // Step 4: For any remaining appointments, use the user's active organization
    console.log('Populating organizationId from user active organization...');
    await queryRunner.query(`
      UPDATE "appointments" a
      SET "organizationId" = u."activeOrganizationId"
      FROM "users" u
      WHERE a."userId" = u.id
        AND a."organizationId" IS NULL
        AND u."activeOrganizationId" IS NOT NULL
    `);

    // Step 5: Add indexes for performant queries
    console.log('Creating indexes on appointments...');
    
    // Check if indexes exist before creating
    const indexExists = await this.indexExists(queryRunner, 'IDX_appointments_organization_startTime');
    if (!indexExists) {
      await queryRunner.query(`
        CREATE INDEX "IDX_appointments_organization_startTime" 
        ON "appointments" ("organizationId", "startTime")
      `);
    }

    const indexExists2 = await this.indexExists(queryRunner, 'IDX_appointments_organization_user_startTime');
    if (!indexExists2) {
      await queryRunner.query(`
        CREATE INDEX "IDX_appointments_organization_user_startTime" 
        ON "appointments" ("organizationId", "userId", "startTime")
      `);
    }

    console.log('Migration completed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    console.log('Dropping indexes...');
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_appointments_organization_startTime"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_appointments_organization_user_startTime"
    `);

    // Drop column
    console.log('Dropping organizationId column...');
    await queryRunner.query(`
      ALTER TABLE "appointments" 
      DROP COLUMN IF EXISTS "organizationId"
    `);

    console.log('Migration reverted successfully.');
  }

  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    
    return result.length > 0;
  }

  private async indexExists(
    queryRunner: QueryRunner,
    indexName: string
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname = $1
    `, [indexName]);
    
    return result.length > 0;
  }
}
