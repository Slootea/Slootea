import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEconomyModule1745100000000 implements MigrationInterface {
  name = 'AddEconomyModule1745100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== ENUMS ====================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "transaction_type_enum" AS ENUM ('income', 'expense');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_method_enum" AS ENUM ('cash', 'credit_card', 'bank_transfer', 'check', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "transaction_source_enum" AS ENUM ('manual', 'parasut');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "parasut_sync_status_enum" AS ENUM ('idle', 'syncing', 'success', 'error');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ==================== TRANSACTION CATEGORIES ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transaction_categories" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "type" "transaction_type_enum" NOT NULL,
        "color" VARCHAR(50),
        "icon" VARCHAR(100),
        "parentId" UUID REFERENCES "transaction_categories"("id") ON DELETE SET NULL,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transaction_categories_org_name" ON "transaction_categories" ("organizationId", "name")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transaction_categories_org_type" ON "transaction_categories" ("organizationId", "type")
    `);

    // ==================== TRANSACTIONS ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL,
        "type" "transaction_type_enum" NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "currency" VARCHAR(10) DEFAULT 'TRY',
        "description" VARCHAR(500) NOT NULL,
        "date" DATE NOT NULL,
        "paymentMethod" "payment_method_enum" DEFAULT 'cash',
        "categoryId" UUID REFERENCES "transaction_categories"("id") ON DELETE SET NULL,
        "source" "transaction_source_enum" DEFAULT 'manual',
        "parasutId" VARCHAR(255),
        "notes" TEXT,
        "referenceNumber" VARCHAR(255),
        "contactName" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_org_date" ON "transactions" ("organizationId", "date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_org_type" ON "transactions" ("organizationId", "type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_org_category" ON "transactions" ("organizationId", "categoryId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_org_parasut" ON "transactions" ("organizationId", "parasutId") WHERE "parasutId" IS NOT NULL
    `);

    // ==================== PARASUT INTEGRATIONS ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parasut_integrations" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL UNIQUE,
        "companyId" VARCHAR(255) NOT NULL,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT NOT NULL,
        "username" VARCHAR(255),
        "tokenExpiresAt" TIMESTAMP NOT NULL,
        "syncStatus" "parasut_sync_status_enum" DEFAULT 'idle',
        "lastSyncAt" TIMESTAMP,
        "lastSyncError" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parasut_integrations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "parasut_sync_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_type_enum"`);
  }
}
