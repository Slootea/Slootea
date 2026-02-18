import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Revise Users Table for Multi-Organization Support
 * 
 * Changes:
 * 1. Rename `organizationId` to `activeOrganizationId` in users table
 *    - This clarifies that this is the user's currently selected/active organization
 *    - The actual memberships are tracked in `user_organizations` table
 * 
 * 2. Drop `organizationRole` column from users table
 *    - Role is now fetched from `user_organizations` table for the active organization
 *    - This eliminates data duplication and ensures consistency
 * 
 * The `user_organizations` table remains the single source of truth for:
 *    - Which organizations a user belongs to
 *    - What role they have in each organization
 * 
 * The `activeOrganizationId` in users table indicates which organization
 * is currently selected when the user logs in.
 */
export class ReviseUsersTableForMultiOrg1708300800000 implements MigrationInterface {
  name = 'ReviseUsersTableForMultiOrg1708300800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Check if organizationId column exists and rename to activeOrganizationId
    const hasOrganizationId = await this.columnExists(queryRunner, 'users', 'organizationId');
    const hasActiveOrganizationId = await this.columnExists(queryRunner, 'users', 'activeOrganizationId');

    if (hasOrganizationId && !hasActiveOrganizationId) {
      console.log('Renaming organizationId to activeOrganizationId...');
      await queryRunner.query(`
        ALTER TABLE "users" 
        RENAME COLUMN "organizationId" TO "activeOrganizationId"
      `);
    } else if (!hasOrganizationId && !hasActiveOrganizationId) {
      // Column doesn't exist at all, create it
      console.log('Creating activeOrganizationId column...');
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "activeOrganizationId" VARCHAR(255) NULL
      `);
    } else {
      console.log('activeOrganizationId column already exists, skipping rename.');
    }

    // Step 2: Drop organizationRole column if it exists
    const hasOrganizationRole = await this.columnExists(queryRunner, 'users', 'organizationRole');
    
    if (hasOrganizationRole) {
      console.log('Dropping organizationRole column...');
      await queryRunner.query(`
        ALTER TABLE "users" 
        DROP COLUMN "organizationRole"
      `);
    } else {
      console.log('organizationRole column does not exist, skipping drop.');
    }

    // Step 3: Ensure user_organizations table exists with proper structure
    const tableExists = await queryRunner.hasTable('user_organizations');
    
    if (!tableExists) {
      console.log('Creating user_organizations table...');
      await queryRunner.query(`
        CREATE TABLE "user_organizations" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" UUID NOT NULL,
          "organization_id" VARCHAR(255) NOT NULL,
          "role" TEXT DEFAULT 'org:member',
          "joined_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE ("user_id", "organization_id")
        )
      `);
    }

    // Step 4: Migrate any existing data - sync users' active organization to user_organizations
    // This ensures all existing users have at least their active organization in the junction table
    console.log('Syncing existing user data to user_organizations table...');
    await queryRunner.query(`
      INSERT INTO "user_organizations" ("user_id", "organization_id", "role")
      SELECT u.id, u."activeOrganizationId", 'org:member'
      FROM "users" u
      WHERE u."activeOrganizationId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "user_organizations" uo 
          WHERE uo.user_id = u.id 
            AND uo.organization_id = u."activeOrganizationId"
        )
      ON CONFLICT ("user_id", "organization_id") DO NOTHING
    `);

    console.log('Migration completed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Rename activeOrganizationId back to organizationId
    const hasActiveOrganizationId = await this.columnExists(queryRunner, 'users', 'activeOrganizationId');
    
    if (hasActiveOrganizationId) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        RENAME COLUMN "activeOrganizationId" TO "organizationId"
      `);
    }

    // Step 2: Re-add organizationRole column
    const hasOrganizationRole = await this.columnExists(queryRunner, 'users', 'organizationRole');
    
    if (!hasOrganizationRole) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "organizationRole" VARCHAR(255) NULL
      `);
    }

    // Step 3: Restore organizationRole from user_organizations table
    await queryRunner.query(`
      UPDATE "users" u
      SET "organizationRole" = uo.role
      FROM "user_organizations" uo
      WHERE uo.user_id = u.id AND uo.organization_id = u."organizationId"
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
}
