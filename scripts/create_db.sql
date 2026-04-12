-- ============================================
-- Slootea Database Initialization Script
-- ============================================
-- This script creates all tables, enums, indexes, and default data
-- for a fresh Slootea database installation.
--
-- Prerequisites:
--   - PostgreSQL 13+
--   - uuid-ossp extension
--
-- Usage:
--   psql -U postgres -d slootea -f create_db.sql
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE "appointment_status_enum" AS ENUM (
    'pending_confirmation', 
    'confirmed', 
    'cancelled', 
    'completed', 
    'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "booking_link_type_enum" AS ENUM (
    'all_options', 
    'specific_option', 
    'campaign'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "day_of_week_enum" AS ENUM (
    '0', '1', '2', '3', '4', '5', '6'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "penalty_type_enum" AS ENUM (
    'ban', 
    'suspension'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "penalty_status_enum" AS ENUM (
    'active', 
    'expired', 
    'removed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "sms_event_type_enum" AS ENUM (
    'APPOINTMENT_CREATED', 
    'APPOINTMENT_REMINDER', 
    'APPOINTMENT_CANCELED', 
    'APPOINTMENT_RESCHEDULED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- 1. users table (no FK dependencies)
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
);

-- 2. organizations table (no FK dependencies)
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
);

-- 3. user_organizations (junction table for multi-org support)
CREATE TABLE IF NOT EXISTS "user_organizations" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" VARCHAR(255) NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "role" TEXT DEFAULT 'org:member',
  "joined_at" TIMESTAMP DEFAULT now(),
  UNIQUE("user_id", "organization_id")
);

-- 4. service_options (services offered by organizations)
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
);

COMMENT ON COLUMN "service_options"."showPrice" IS 'Whether to display price on booking page';
COMMENT ON COLUMN "service_options"."price" IS 'Service price (0 = free)';

-- 5. user_service_options (providers assigned to services)
CREATE TABLE IF NOT EXISTS "user_service_options" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "serviceOptionId" UUID NOT NULL REFERENCES "service_options"("id") ON DELETE CASCADE,
  "isActive" BOOLEAN DEFAULT true,
  "customDuration" INTEGER,
  "customDescription" TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  UNIQUE("userId", "serviceOptionId")
);

-- 6. external_providers (non-user providers for services)
CREATE TABLE IF NOT EXISTS "external_providers" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "organizationId" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "imageBase64" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_external_providers_org" ON "external_providers" ("organizationId");

-- 7. external_provider_service_options (external providers assigned to services)
CREATE TABLE IF NOT EXISTS "external_provider_service_options" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "externalProviderId" UUID NOT NULL REFERENCES "external_providers"("id") ON DELETE CASCADE,
  "serviceOptionId" UUID NOT NULL REFERENCES "service_options"("id") ON DELETE CASCADE,
  "isActive" BOOLEAN DEFAULT true,
  "customDuration" INTEGER,
  "customDescription" TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  UNIQUE("externalProviderId", "serviceOptionId")
);

-- 8. booking_links (shareable links for appointment booking)
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
);

-- 9. clients (customers who book appointments)
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_clients_org_phone" ON "clients" ("organizationId", "phone");

-- 10. client_penalties (bans/suspensions for clients)
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
);

CREATE INDEX IF NOT EXISTS "idx_client_penalties_client_org" ON "client_penalties" ("clientId", "organizationId");
CREATE INDEX IF NOT EXISTS "idx_client_penalties_org_status" ON "client_penalties" ("organizationId", "status");

-- 11. appointments (booked appointments)
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
);

CREATE INDEX IF NOT EXISTS "idx_appointments_org_start" ON "appointments" ("organizationId", "startTime");
CREATE INDEX IF NOT EXISTS "idx_appointments_org_user_start" ON "appointments" ("organizationId", "userId", "startTime");
CREATE INDEX IF NOT EXISTS "IDX_appointments_organization_startTime" ON "appointments" ("organizationId", "startTime");
CREATE INDEX IF NOT EXISTS "IDX_appointments_organization_user_startTime" ON "appointments" ("organizationId", "userId", "startTime");

-- 12. availabilities (provider work schedules)
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
);

-- 13. blocked_times (provider time-off/blocked slots)
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
);

-- 14. organization_settings (org-level configuration)
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
);

COMMENT ON COLUMN "organization_settings"."currency" IS 'Organization currency (TL, USD)';

-- 15. organization_whatsapp_settings (WhatsApp Business API config)
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
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_settings_org_id" ON "organization_whatsapp_settings" ("organizationId");

-- 16. organization_sms_settings (SMS provider config)
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
);

CREATE INDEX IF NOT EXISTS "idx_sms_settings_org_id" ON "organization_sms_settings" ("organizationId");

-- 17. organization_notification_parameters (notification preferences)
CREATE TABLE IF NOT EXISTS "organization_notification_parameters" (
  "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "organizationId" VARCHAR(255) NOT NULL UNIQUE,
  "appointmentCreated" BOOLEAN DEFAULT true,
  "appointmentReminder" BOOLEAN DEFAULT true,
  "appointmentCanceled" BOOLEAN DEFAULT true,
  "appointmentRescheduled" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notification_params_org_id" ON "organization_notification_parameters" ("organizationId");

-- 18. sms_templates (SMS message templates)
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
);

CREATE INDEX IF NOT EXISTS "idx_sms_template_org_id" ON "sms_templates" ("organizationId");
CREATE INDEX IF NOT EXISTS "idx_sms_template_event_type" ON "sms_templates" ("eventType");
CREATE INDEX IF NOT EXISTS "idx_sms_template_language" ON "sms_templates" ("language");

-- ============================================
-- TypeORM Migrations Table
-- ============================================
-- This table tracks which migrations have been applied
CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL PRIMARY KEY,
  "timestamp" BIGINT NOT NULL,
  "name" VARCHAR(255) NOT NULL
);

-- Insert migration records to mark all migrations as applied
INSERT INTO "migrations" ("timestamp", "name") VALUES
  (1700000000000, 'InitialSchema1700000000000'),
  (1708300800000, 'ReviseUsersTableForMultiOrg1708300800000'),
  (1708300900000, 'StandardizeRolesToClerkFormat1708300900000'),
  (1740000000000, 'AddOrganizationIdToAppointments1740000000000'),
  (1741200000000, 'AddSmsSettingsAndTemplates1741200000000'),
  (1742920000000, 'AddPricingToServiceOptions1742920000000')
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default SMS Templates - Turkish
INSERT INTO "sms_templates" ("organizationId", "eventType", "language", "name", "content", "isActive", "isDefault")
VALUES 
  (NULL, 'APPOINTMENT_CREATED', 'tr', 'Randevu Oluşturuldu', 'Merhaba {{clientName}}, {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} için oluşturuldu. Onay için: {{confirmationLink}}', true, true),
  (NULL, 'APPOINTMENT_REMINDER', 'tr', 'Randevu Hatırlatma', 'Hatırlatma: {{clientName}}, {{appointmentDate}} tarihinde saat {{appointmentTime}} için {{serviceName}} randevunuz bulunmaktadır. {{organizationName}}', true, true),
  (NULL, 'APPOINTMENT_CANCELED', 'tr', 'Randevu İptal', '{{clientName}}, {{appointmentDate}} tarihindeki {{serviceName}} randevunuz iptal edilmiştir. Yeni randevu için: {{appointmentLink}}', true, true),
  (NULL, 'APPOINTMENT_RESCHEDULED', 'tr', 'Randevu Güncellendi', '{{clientName}}, {{serviceName}} randevunuz {{appointmentDate}} tarihinde saat {{appointmentTime}} olarak güncellenmiştir. {{organizationName}}', true, true)
ON CONFLICT DO NOTHING;

-- Default SMS Templates - English
INSERT INTO "sms_templates" ("organizationId", "eventType", "language", "name", "content", "isActive", "isDefault")
VALUES 
  (NULL, 'APPOINTMENT_CREATED', 'en', 'Appointment Created', 'Hi {{clientName}}, your {{serviceName}} appointment is scheduled for {{appointmentDate}} at {{appointmentTime}}. Confirm: {{confirmationLink}}', true, true),
  (NULL, 'APPOINTMENT_REMINDER', 'en', 'Appointment Reminder', 'Reminder: {{clientName}}, you have a {{serviceName}} appointment on {{appointmentDate}} at {{appointmentTime}}. {{organizationName}}', true, true),
  (NULL, 'APPOINTMENT_CANCELED', 'en', 'Appointment Canceled', '{{clientName}}, your {{serviceName}} appointment on {{appointmentDate}} has been canceled. Book again: {{appointmentLink}}', true, true),
  (NULL, 'APPOINTMENT_RESCHEDULED', 'en', 'Appointment Rescheduled', '{{clientName}}, your {{serviceName}} appointment has been rescheduled to {{appointmentDate}} at {{appointmentTime}}. {{organizationName}}', true, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify all tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- ============================================
-- END OF SCRIPT
-- ============================================
