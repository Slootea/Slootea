import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryAndAutomation1744750000000 implements MigrationInterface {
  name = 'AddInventoryAndAutomation1744750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== ENUMS ====================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "inventory_category_enum" AS ENUM ('consumable', 'retail');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "stock_adjustment_type_enum" AS ENUM ('manual', 'appointment', 'purchase', 'correction');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "automation_node_type_enum" AS ENUM (
          'trigger_stock_critical',
          'trigger_stock_out',
          'trigger_stock_adjusted',
          'trigger_manual',
          'condition_stock_level',
          'condition_item_category',
          'action_api_call',
          'action_webhook',
          'action_notification',
          'action_adjust_stock'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "execution_status_enum" AS ENUM ('running', 'completed', 'failed', 'partial');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ==================== INVENTORY ITEMS ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_items" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "sku" VARCHAR(255),
        "description" TEXT,
        "category" "inventory_category_enum" DEFAULT 'consumable',
        "unit" VARCHAR(50) DEFAULT 'pcs',
        "currentStock" DECIMAL(10,2) DEFAULT 0,
        "minStockAlert" DECIMAL(10,2) DEFAULT 0,
        "costPerUnit" DECIMAL(10,2),
        "retailPrice" DECIMAL(10,2),
        "imageBase64" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inventory_items_org_name" ON "inventory_items" ("organizationId", "name")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_inventory_items_org_sku" ON "inventory_items" ("organizationId", "sku") WHERE "sku" IS NOT NULL
    `);

    // ==================== SERVICE INVENTORY USAGE ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_inventory_usage" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "serviceOptionId" UUID NOT NULL REFERENCES "service_options"("id") ON DELETE CASCADE,
        "inventoryItemId" UUID NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
        "quantityUsed" DECIMAL(10,2) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_inventory_usage_unique" ON "service_inventory_usage" ("serviceOptionId", "inventoryItemId")
    `);

    // ==================== STOCK ADJUSTMENTS ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_adjustments" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "inventoryItemId" UUID NOT NULL REFERENCES "inventory_items"("id") ON DELETE CASCADE,
        "type" "stock_adjustment_type_enum" DEFAULT 'manual',
        "quantity" DECIMAL(10,2) NOT NULL,
        "stockAfter" DECIMAL(10,2) NOT NULL,
        "reason" TEXT,
        "appointmentId" UUID,
        "adjustedBy" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_item_created" ON "stock_adjustments" ("inventoryItemId", "createdAt")
    `);

    // ==================== AUTOMATION WORKFLOWS ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_workflows" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_automation_workflows_org_active" ON "automation_workflows" ("organizationId", "isActive")
    `);

    // ==================== AUTOMATION NODES ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_nodes" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "workflowId" UUID NOT NULL REFERENCES "automation_workflows"("id") ON DELETE CASCADE,
        "type" "automation_node_type_enum" NOT NULL,
        "label" VARCHAR(255),
        "config" JSONB DEFAULT '{}',
        "position" JSONB NOT NULL,
        "nextNodeIds" UUID[] DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    // ==================== AUTOMATION EXECUTIONS ====================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_executions" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL,
        "workflowId" UUID NOT NULL REFERENCES "automation_workflows"("id") ON DELETE CASCADE,
        "status" "execution_status_enum" DEFAULT 'running',
        "context" JSONB DEFAULT '{}',
        "nodeResults" JSONB DEFAULT '[]',
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP DEFAULT now(),
        "completedAt" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_automation_executions_org_created" ON "automation_executions" ("organizationId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_automation_executions_workflow_created" ON "automation_executions" ("workflowId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting FK dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_nodes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_workflows"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_adjustments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_inventory_usage"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_items"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "execution_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "automation_node_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_adjustment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_category_enum"`);
  }
}
