import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Standardize Roles to Clerk Format
 * 
 * This migration updates user_organizations.role values to match Clerk's role format:
 * - 'org:admin' for administrators
 * - 'org:member' for regular members
 * 
 * Old values (owner, admin, recruiter, viewer) are converted to the new format.
 */
export class StandardizeRolesToClerkFormat1708300900000 implements MigrationInterface {
  name = 'StandardizeRolesToClerkFormat1708300900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update old role values to new Clerk-aligned format
    console.log('Updating role values to Clerk format...');
    
    // 'owner' and 'admin' become 'org:admin'
    await queryRunner.query(`
      UPDATE "user_organizations"
      SET role = 'org:admin'
      WHERE role IN ('owner', 'admin')
    `);
    
    // 'recruiter', 'viewer', and any other value become 'org:member'
    await queryRunner.query(`
      UPDATE "user_organizations"
      SET role = 'org:member'
      WHERE role NOT IN ('org:admin', 'org:member')
    `);

    // Update the default value for the column
    await queryRunner.query(`
      ALTER TABLE "user_organizations"
      ALTER COLUMN role SET DEFAULT 'org:member'
    `);

    console.log('Role standardization completed.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert org:admin -> admin, org:member -> recruiter (approximate reversal)
    console.log('Reverting role values to legacy format...');
    
    await queryRunner.query(`
      UPDATE "user_organizations"
      SET role = 'admin'
      WHERE role = 'org:admin'
    `);
    
    await queryRunner.query(`
      UPDATE "user_organizations"
      SET role = 'recruiter'
      WHERE role = 'org:member'
    `);

    await queryRunner.query(`
      ALTER TABLE "user_organizations"
      ALTER COLUMN role SET DEFAULT 'recruiter'
    `);

    console.log('Role reversion completed.');
  }
}
