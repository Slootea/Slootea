import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPricingToServiceOptions1742920000000 implements MigrationInterface {
  name = 'AddPricingToServiceOptions1742920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add showPrice column to service_options
    await queryRunner.query(`
      ALTER TABLE "service_options" 
      ADD COLUMN IF NOT EXISTS "showPrice" boolean NOT NULL DEFAULT false
    `);

    // Add price column to service_options
    await queryRunner.query(`
      ALTER TABLE "service_options" 
      ADD COLUMN IF NOT EXISTS "price" decimal(10,2) NOT NULL DEFAULT 0
    `);

    // Add currency column to organization_settings
    await queryRunner.query(`
      ALTER TABLE "organization_settings" 
      ADD COLUMN IF NOT EXISTS "currency" varchar(10) NOT NULL DEFAULT 'TL'
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON COLUMN "service_options"."showPrice" IS 'Whether to display price on booking page'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "service_options"."price" IS 'Service price (0 = free)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "organization_settings"."currency" IS 'Organization currency (TL, USD)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_options" DROP COLUMN IF EXISTS "showPrice"
    `);

    await queryRunner.query(`
      ALTER TABLE "service_options" DROP COLUMN IF EXISTS "price"
    `);

    await queryRunner.query(`
      ALTER TABLE "organization_settings" DROP COLUMN IF EXISTS "currency"
    `);
  }
}
