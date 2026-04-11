import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSmsSettingsAndTemplates1741200000000 implements MigrationInterface {
  name = 'AddSmsSettingsAndTemplates1741200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create organization_sms_settings table (if not exists - may be created by InitialSchema)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_sms_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "username" character varying(50),
        "password" character varying(100),
        "sourceAddr" character varying(20),
        "templateLanguage" character varying(10) NOT NULL DEFAULT 'tr',
        "useGlobalCredentials" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_organization_sms_settings_orgId" UNIQUE ("organizationId"),
        CONSTRAINT "PK_organization_sms_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sms_settings_org_id" ON "organization_sms_settings" ("organizationId")
    `);

    // Create sms_templates table (enum and table may already exist from InitialSchema)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sms_event_type_enum" AS ENUM (
          'APPOINTMENT_CREATED',
          'APPOINTMENT_REMINDER',
          'APPOINTMENT_CANCELED',
          'APPOINTMENT_RESCHEDULED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying(255),
        "eventType" "sms_event_type_enum" NOT NULL,
        "language" character varying(10) NOT NULL DEFAULT 'tr',
        "name" character varying(100) NOT NULL,
        "content" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sms_templates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sms_template_org_id" ON "sms_templates" ("organizationId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sms_template_event_type" ON "sms_templates" ("eventType")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sms_template_language" ON "sms_templates" ("language")
    `);

    // Insert default SMS templates - Turkish
    await queryRunner.query(`
      INSERT INTO "sms_templates" ("organizationId", "eventType", "language", "name", "content", "isActive", "isDefault")
      VALUES 
        (NULL, 'APPOINTMENT_CREATED', 'tr', 'Randevu Oluşturuldu', 'Merhaba {{clientName}}, {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} için oluşturuldu. Onay için: {{confirmationLink}}', true, true),
        (NULL, 'APPOINTMENT_REMINDER', 'tr', 'Randevu Hatırlatma', 'Hatırlatma: {{clientName}}, {{appointmentDate}} tarihinde saat {{appointmentTime}} için {{serviceName}} randevunuz bulunmaktadır. {{organizationName}}', true, true),
        (NULL, 'APPOINTMENT_CANCELED', 'tr', 'Randevu İptal', '{{clientName}}, {{appointmentDate}} tarihindeki {{serviceName}} randevunuz iptal edilmiştir. Yeni randevu için: {{appointmentLink}}', true, true),
        (NULL, 'APPOINTMENT_RESCHEDULED', 'tr', 'Randevu Güncellendi', '{{clientName}}, {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} olarak güncellenmiştir. {{organizationName}}', true, true)
    `);

    // Insert default SMS templates - English
    await queryRunner.query(`
      INSERT INTO "sms_templates" ("organizationId", "eventType", "language", "name", "content", "isActive", "isDefault")
      VALUES 
        (NULL, 'APPOINTMENT_CREATED', 'en', 'Appointment Created', 'Hi {{clientName}}, your {{serviceName}} appointment is scheduled for {{appointmentDate}} at {{appointmentTime}}. Confirm: {{confirmationLink}}', true, true),
        (NULL, 'APPOINTMENT_REMINDER', 'en', 'Appointment Reminder', 'Reminder: {{clientName}}, you have a {{serviceName}} appointment on {{appointmentDate}} at {{appointmentTime}}. {{organizationName}}', true, true),
        (NULL, 'APPOINTMENT_CANCELED', 'en', 'Appointment Canceled', '{{clientName}}, your {{serviceName}} appointment on {{appointmentDate}} has been canceled. Book again: {{appointmentLink}}', true, true),
        (NULL, 'APPOINTMENT_RESCHEDULED', 'en', 'Appointment Rescheduled', '{{clientName}}, your {{serviceName}} appointment has been rescheduled to {{appointmentDate}} at {{appointmentTime}}. {{organizationName}}', true, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sms_template_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sms_template_event_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sms_template_org_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_templates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sms_event_type_enum"`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sms_settings_org_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_sms_settings"`);
  }
}
