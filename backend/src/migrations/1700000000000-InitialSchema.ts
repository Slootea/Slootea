import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration - creates all base tables.
 * This must run BEFORE any other migrations that assume tables exist.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums first
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "appointment_status_enum" AS ENUM ('pending_confirmation', 'confirmed', 'cancelled', 'completed', 'no_show');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "booking_link_type_enum" AS ENUM ('all_options', 'specific_option', 'campaign');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "day_of_week_enum" AS ENUM ('0', '1', '2', '3', '4', '5', '6');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "penalty_type_enum" AS ENUM ('ban', 'suspension');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "penalty_status_enum" AS ENUM ('active', 'expired', 'removed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sms_event_type_enum" AS ENUM ('APPOINTMENT_CREATED', 'APPOINTMENT_REMINDER', 'APPOINTMENT_CANCELED', 'APPOINTMENT_RESCHEDULED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. users table (no FK dependencies)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "clerkId" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255),
        "lastName" VARCHAR(255),
        "businessName" VARCHAR(255),
        "phone" VARCHAR(255),
        "timezone" VARCHAR(255),
        "activeOrganizationId" VARCHAR(255),
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    // 2. organizations table (no FK dependencies)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" VARCHAR(255) PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "industry" VARCHAR(255),
        "size" INTEGER,
        "phone" VARCHAR(255),
        "location" VARCHAR(255),
        "website" VARCHAR(255),
        "logo_url" TEXT,
        "email" VARCHAR(255),
        "onboarded" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      )
    `);

    // 3. user_organizations (depends on users, organizations)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_organizations" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "organization_id" VARCHAR(255) NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "role" TEXT DEFAULT 'org:member',
        "joined_at" TIMESTAMP DEFAULT now(),
        UNIQUE("user_id", "organization_id")
      )
    `);

    // 4. service_options (depends on users)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_options" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "imageBase64" TEXT,
        "duration" INTEGER NOT NULL,
        "showPrice" BOOLEAN DEFAULT false,
        "price" DECIMAL(10,2) DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "sortOrder" INTEGER DEFAULT 0,
        "organizationId" VARCHAR(255),
        "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    // 5. user_service_options (depends on users, service_options)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service_options" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "serviceOptionId" UUID NOT NULL REFERENCES "service_options"("id") ON DELETE CASCADE,
        "isActive" BOOLEAN DEFAULT true,
        "customDuration" INTEGER,
        "customDescription" TEXT,
        "createdAt" TIMESTAMP DEFAULT now(),
        UNIQUE("userId", "serviceOptionId")
      )
    `);

    // 6. external_providers (no FK dependencies, just organizationId string)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "external_providers" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "imageBase64" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_external_providers_org" ON "external_providers" ("organizationId")`);

    // 7. external_provider_service_options (depends on external_providers, service_options)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "external_provider_service_options" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "externalProviderId" UUID NOT NULL REFERENCES "external_providers"("id") ON DELETE CASCADE,
        "serviceOptionId" UUID NOT NULL REFERENCES "service_options"("id") ON DELETE CASCADE,
        "isActive" BOOLEAN DEFAULT true,
        "customDuration" INTEGER,
        "customDescription" TEXT,
        "createdAt" TIMESTAMP DEFAULT now(),
        UNIQUE("externalProviderId", "serviceOptionId")
      )
    `);

    // 8. booking_links (depends on service_options)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_links" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "slug" VARCHAR(255) NOT NULL UNIQUE,
        "name" VARCHAR(255),
        "type" "booking_link_type_enum" DEFAULT 'all_options',
        "isActive" BOOLEAN DEFAULT true,
        "expiresAt" TIMESTAMP,
        "organizationId" VARCHAR(255),
        "serviceOptionId" UUID REFERENCES "service_options"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    // 9. clients (no FK dependencies)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255),
        "phone" VARCHAR(255) NOT NULL,
        "notes" TEXT,
        "totalAppointments" INTEGER DEFAULT 0,
        "completedAppointments" INTEGER DEFAULT 0,
        "cancelledAppointments" INTEGER DEFAULT 0,
        "noShowAppointments" INTEGER DEFAULT 0,
        "lastAppointmentAt" TIMESTAMP,
        "totalPoints" INTEGER DEFAULT 0,
        "availablePoints" INTEGER DEFAULT 0,
        "level" VARCHAR(20) DEFAULT 'bronze',
        "currentStreak" INTEGER DEFAULT 0,
        "longestStreak" INTEGER DEFAULT 0,
        "totalReferrals" INTEGER DEFAULT 0,
        "successfulReferrals" INTEGER DEFAULT 0,
        "referralCode" VARCHAR(255),
        "referredBy" VARCHAR(255),
        "spinWheelSpins" INTEGER DEFAULT 0,
        "lastSpinAt" TIMESTAMP,
        "organizationId" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_clients_org_phone" ON "clients" ("organizationId", "phone")`);

    // 10. client_penalties (depends on clients)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_penalties" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "clientId" UUID NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
        "organizationId" VARCHAR(255) NOT NULL,
        "type" "penalty_type_enum" NOT NULL,
        "status" "penalty_status_enum" DEFAULT 'active',
        "reason" TEXT,
        "expiresAt" TIMESTAMP,
        "issuedBy" VARCHAR(255),
        "removedBy" VARCHAR(255),
        "removedAt" TIMESTAMP,
        "removalReason" TEXT,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_client_penalties_client_org" ON "client_penalties" ("clientId", "organizationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_client_penalties_org_status" ON "client_penalties" ("organizationId", "status")`);

    // 11. appointments (depends on users, service_options, booking_links, clients, external_providers)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255),
        "startTime" TIMESTAMP NOT NULL,
        "endTime" TIMESTAMP NOT NULL,
        "clientName" VARCHAR(255) NOT NULL,
        "clientEmail" VARCHAR(255),
        "clientPhone" VARCHAR(255),
        "status" "appointment_status_enum" DEFAULT 'pending_confirmation',
        "confirmationToken" VARCHAR(255) NOT NULL UNIQUE,
        "confirmedAt" TIMESTAMP,
        "reminderSentAt" TIMESTAMP,
        "notes" TEXT,
        "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
        "externalProviderId" UUID REFERENCES "external_providers"("id") ON DELETE CASCADE,
        "serviceOptionId" UUID NOT NULL REFERENCES "service_options"("id") ON DELETE CASCADE,
        "bookingLinkId" UUID REFERENCES "booking_links"("id") ON DELETE SET NULL,
        "clientId" UUID REFERENCES "clients"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_appointments_org_start" ON "appointments" ("organizationId", "startTime")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_appointments_org_user_start" ON "appointments" ("organizationId", "userId", "startTime")`);

    // 12. availabilities (depends on users, service_options, external_providers)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "availabilities" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "dayOfWeek" "day_of_week_enum" NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
        "externalProviderId" UUID REFERENCES "external_providers"("id") ON DELETE CASCADE,
        "serviceOptionId" UUID REFERENCES "service_options"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now(),
        CONSTRAINT "chk_availability_provider" CHECK ("userId" IS NOT NULL OR "externalProviderId" IS NOT NULL)
      )
    `);

    // 13. blocked_times (depends on users, external_providers)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blocked_times" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "date" DATE NOT NULL,
        "startTime" TIME,
        "endTime" TIME,
        "isFullDay" BOOLEAN DEFAULT false,
        "reason" VARCHAR(255),
        "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
        "externalProviderId" UUID REFERENCES "external_providers"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now(),
        CONSTRAINT "chk_blocked_time_provider" CHECK ("userId" IS NOT NULL OR "externalProviderId" IS NOT NULL)
      )
    `);

    // 14. organization_settings (no FK dependencies)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_settings" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL UNIQUE,
        "confirmationRequiredHours" INTEGER DEFAULT 24,
        "confirmationDeadlineHours" INTEGER DEFAULT 3,
        "autoCancelUnconfirmed" BOOLEAN DEFAULT true,
        "autoConfirmAppointments" BOOLEAN DEFAULT true,
        "bufferTimeMinutes" INTEGER DEFAULT 15,
        "maxAppointmentsPerDay" INTEGER DEFAULT 10,
        "minAdvanceBookingHours" INTEGER DEFAULT 24,
        "maxAdvanceBookingDays" INTEGER DEFAULT 30,
        "allowProviderSelection" BOOLEAN DEFAULT false,
        "autoAssignProvider" BOOLEAN DEFAULT false,
        "providerSelectionMode" VARCHAR(50) DEFAULT 'auto_assign',
        "showProviderNames" BOOLEAN DEFAULT true,
        "showProviderPhotos" BOOLEAN DEFAULT true,
        "welcomeMessage" TEXT,
        "bookingInstructions" TEXT,
        "confirmationMessage" TEXT,
        "cancellationPolicy" TEXT,
        "sendEmailReminders" BOOLEAN DEFAULT false,
        "sendSmsReminders" BOOLEAN DEFAULT false,
        "reminderHoursBefore" INTEGER DEFAULT 24,
        "timezone" VARCHAR(50) DEFAULT 'UTC',
        "currency" VARCHAR(10) DEFAULT 'TL',
        "aiAssistantEnabled" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);

    // 15. organization_whatsapp_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_whatsapp_settings" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL UNIQUE,
        "enabled" BOOLEAN DEFAULT false,
        "wabaId" VARCHAR(255),
        "phoneNumberId" VARCHAR(255),
        "accessToken" TEXT,
        "tokenExpiresAt" TIMESTAMP,
        "displayPhoneNumber" VARCHAR(20),
        "templateLanguage" VARCHAR(10) DEFAULT 'tr',
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_whatsapp_settings_org_id" ON "organization_whatsapp_settings" ("organizationId")`);

    // 16. organization_sms_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_sms_settings" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL UNIQUE,
        "enabled" BOOLEAN DEFAULT false,
        "username" VARCHAR(50),
        "password" VARCHAR(100),
        "sourceAddr" VARCHAR(20),
        "templateLanguage" VARCHAR(10) DEFAULT 'tr',
        "useGlobalCredentials" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sms_settings_org_id" ON "organization_sms_settings" ("organizationId")`);

    // 17. organization_notification_parameters
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_notification_parameters" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255) NOT NULL UNIQUE,
        "appointmentCreated" BOOLEAN DEFAULT true,
        "appointmentReminder" BOOLEAN DEFAULT true,
        "appointmentCanceled" BOOLEAN DEFAULT true,
        "appointmentRescheduled" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notification_params_org_id" ON "organization_notification_parameters" ("organizationId")`);

    // 18. sms_templates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_templates" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "organizationId" VARCHAR(255),
        "eventType" "sms_event_type_enum" NOT NULL,
        "language" VARCHAR(10) DEFAULT 'tr',
        "name" VARCHAR(100) NOT NULL,
        "content" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "isDefault" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sms_template_org_id" ON "sms_templates" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sms_template_event_type" ON "sms_templates" ("eventType")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sms_template_language" ON "sms_templates" ("language")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order of creation (respecting FK dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_notification_parameters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_sms_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_whatsapp_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blocked_times"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availabilities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_penalties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "external_provider_service_options"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "external_providers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service_options"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_options"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    
    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "sms_event_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "penalty_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "penalty_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "day_of_week_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "booking_link_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_status_enum"`);
  }
}
