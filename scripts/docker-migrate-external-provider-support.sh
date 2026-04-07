#!/bin/bash

# Migration script: Add external provider support to appointments, availabilities, and blocked_times
# This script adds externalProviderId columns and makes userId nullable
# Run this BEFORE deploying the new code

set -e

CONTAINER_NAME="appointment_db"
DB_USER="${POSTGRES_USER:-appointment_user}"
DB_NAME="${POSTGRES_DB:-appointment_db}"

echo "🔄 Starting migration: Add external provider support..."

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Container '${CONTAINER_NAME}' is not running"
    echo "   Start it with: docker-compose up -d postgres"
    exit 1
fi

echo "📦 Connected to container: ${CONTAINER_NAME}"

# Run migrations
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" <<'EOF'

-- ============================================
-- Migration: Add External Provider Support
-- ============================================

BEGIN;

-- 1. Add externalProviderId to appointments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'externalProviderId') THEN
        ALTER TABLE appointments ADD COLUMN "externalProviderId" uuid;
        ALTER TABLE appointments ADD CONSTRAINT "FK_appointments_external_provider" 
            FOREIGN KEY ("externalProviderId") REFERENCES external_providers(id) ON DELETE CASCADE;
        COMMENT ON COLUMN appointments."externalProviderId" IS 'External provider ID (if appointment is with external provider)';
        RAISE NOTICE 'Added externalProviderId to appointments';
    ELSE
        RAISE NOTICE 'Column externalProviderId already exists in appointments';
    END IF;
END $$;

-- 2. Make userId nullable in appointments (if not already)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'userId' AND is_nullable = 'NO') THEN
        ALTER TABLE appointments ALTER COLUMN "userId" DROP NOT NULL;
        RAISE NOTICE 'Made userId nullable in appointments';
    ELSE
        RAISE NOTICE 'userId already nullable in appointments';
    END IF;
END $$;

-- 3. Add externalProviderId to availabilities table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'availabilities' AND column_name = 'externalProviderId') THEN
        ALTER TABLE availabilities ADD COLUMN "externalProviderId" uuid;
        ALTER TABLE availabilities ADD CONSTRAINT "FK_availabilities_external_provider" 
            FOREIGN KEY ("externalProviderId") REFERENCES external_providers(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added externalProviderId to availabilities';
    ELSE
        RAISE NOTICE 'Column externalProviderId already exists in availabilities';
    END IF;
END $$;

-- 4. Make userId nullable in availabilities (if not already)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'availabilities' AND column_name = 'userId' AND is_nullable = 'NO') THEN
        ALTER TABLE availabilities ALTER COLUMN "userId" DROP NOT NULL;
        RAISE NOTICE 'Made userId nullable in availabilities';
    ELSE
        RAISE NOTICE 'userId already nullable in availabilities';
    END IF;
END $$;

-- 5. Add externalProviderId to blocked_times table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'blocked_times' AND column_name = 'externalProviderId') THEN
        ALTER TABLE blocked_times ADD COLUMN "externalProviderId" uuid;
        ALTER TABLE blocked_times ADD CONSTRAINT "FK_blocked_times_external_provider" 
            FOREIGN KEY ("externalProviderId") REFERENCES external_providers(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added externalProviderId to blocked_times';
    ELSE
        RAISE NOTICE 'Column externalProviderId already exists in blocked_times';
    END IF;
END $$;

-- 6. Make userId nullable in blocked_times (if not already)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'blocked_times' AND column_name = 'userId' AND is_nullable = 'NO') THEN
        ALTER TABLE blocked_times ALTER COLUMN "userId" DROP NOT NULL;
        RAISE NOTICE 'Made userId nullable in blocked_times';
    ELSE
        RAISE NOTICE 'userId already nullable in blocked_times';
    END IF;
END $$;

-- 7. Add CHECK constraints (userId OR externalProviderId must be set)
-- Note: CHECK constraints are optional but recommended for data integrity
-- These ensure that either userId or externalProviderId is always set

DO $$
BEGIN
    -- Availabilities check constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_availabilities_provider') THEN
        ALTER TABLE availabilities ADD CONSTRAINT "CHK_availabilities_provider" 
            CHECK ("userId" IS NOT NULL OR "externalProviderId" IS NOT NULL);
        RAISE NOTICE 'Added CHECK constraint to availabilities';
    ELSE
        RAISE NOTICE 'CHECK constraint already exists on availabilities';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add CHECK constraint to availabilities (may already exist with different name)';
END $$;

DO $$
BEGIN
    -- Blocked times check constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CHK_blocked_times_provider') THEN
        ALTER TABLE blocked_times ADD CONSTRAINT "CHK_blocked_times_provider" 
            CHECK ("userId" IS NOT NULL OR "externalProviderId" IS NOT NULL);
        RAISE NOTICE 'Added CHECK constraint to blocked_times';
    ELSE
        RAISE NOTICE 'CHECK constraint already exists on blocked_times';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add CHECK constraint to blocked_times (may already exist with different name)';
END $$;

COMMIT;

-- Show final table structure
\echo ''
\echo '✅ Migration completed! Verifying schema:'
\echo ''
\echo 'appointments table columns:'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name IN ('userId', 'externalProviderId')
ORDER BY column_name;

\echo ''
\echo 'availabilities table columns:'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'availabilities' AND column_name IN ('userId', 'externalProviderId')
ORDER BY column_name;

\echo ''
\echo 'blocked_times table columns:'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'blocked_times' AND column_name IN ('userId', 'externalProviderId')
ORDER BY column_name;

EOF

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "You can now safely deploy the new code."
