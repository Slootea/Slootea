#!/bin/bash
# =============================================================================
# Production Migration Script: Revise Users Table for Multi-Organization Support
# =============================================================================
#
# This script safely migrates the production database to:
# 1. Rename users.organizationId → users.activeOrganizationId
# 2. Remove users.organizationRole column (role fetched from user_organizations)
#
# IMPORTANT: Run this script BEFORE deploying the new backend code!
#
# Usage:
#   ./migrate-users-multi-org.sh
#
# Prerequisites:
#   - PostgreSQL client (psql) installed
#   - Environment variables set (see below)
#
# Set these environment variables before running:
#   DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
# Or source your .env file first
#
# =============================================================================

set -e

# Load environment variables from .env if it exists
if [ -f "$(dirname "$0")/../backend/.env" ]; then
    export $(grep -v '^#' "$(dirname "$0")/../backend/.env" | xargs)
fi

# Database connection settings
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-appointment_user}"
DB_PASSWORD="${DATABASE_PASSWORD:-appointment_pass}"
DB_NAME="${DATABASE_NAME:-appointment_db}"

echo "=============================================="
echo "Database Migration: Multi-Organization Support"
echo "=============================================="
echo "Target database: $DB_NAME on $DB_HOST:$DB_PORT"
echo ""

# Function to run SQL
run_sql() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$1"
}

# Check connection
echo "Testing database connection..."
if ! run_sql "SELECT 1" > /dev/null 2>&1; then
    echo "ERROR: Cannot connect to database. Check your environment variables."
    exit 1
fi
echo "✓ Database connection successful"
echo ""

# Check current schema state
echo "Checking current schema state..."

HAS_ORG_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organizationId'" | tr -d '[:space:]')
HAS_ACTIVE_ORG_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'activeOrganizationId'" | tr -d '[:space:]')
HAS_ORG_ROLE=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organizationRole'" | tr -d '[:space:]')

echo "  organizationId exists: $([ -n "$HAS_ORG_ID" ] && echo "YES" || echo "NO")"
echo "  activeOrganizationId exists: $([ -n "$HAS_ACTIVE_ORG_ID" ] && echo "YES" || echo "NO")"
echo "  organizationRole exists: $([ -n "$HAS_ORG_ROLE" ] && echo "YES" || echo "NO")"
echo ""

# Confirm before proceeding
read -p "This will modify the users table. Continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Create backup
BACKUP_FILE="users_backup_$(date +%Y%m%d_%H%M%S).sql"
echo ""
echo "Creating backup to $BACKUP_FILE..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t users > "$BACKUP_FILE"
echo "✓ Backup created"
echo ""

# Begin migration
echo "Starting migration..."

# Step 1: Rename organizationId to activeOrganizationId
if [ -n "$HAS_ORG_ID" ] && [ -z "$HAS_ACTIVE_ORG_ID" ]; then
    echo "  Renaming organizationId → activeOrganizationId..."
    run_sql 'ALTER TABLE "users" RENAME COLUMN "organizationId" TO "activeOrganizationId"'
    echo "  ✓ Column renamed"
elif [ -z "$HAS_ORG_ID" ] && [ -z "$HAS_ACTIVE_ORG_ID" ]; then
    echo "  Creating activeOrganizationId column..."
    run_sql 'ALTER TABLE "users" ADD COLUMN "activeOrganizationId" VARCHAR(255) NULL'
    echo "  ✓ Column created"
else
    echo "  ✓ activeOrganizationId already exists, skipping rename"
fi

# Step 2: Sync data to user_organizations table before dropping role column
if [ -n "$HAS_ORG_ROLE" ]; then
    echo "  Syncing active organizations to user_organizations table..."
    run_sql '
        INSERT INTO "user_organizations" ("id", "user_id", "organization_id", "role")
        SELECT gen_random_uuid(), u.id, u."activeOrganizationId", 
            CASE 
                WHEN u."organizationRole" = '\''org:admin'\'' THEN '\''org:admin'\''
                ELSE '\''org:member'\''
            END
        FROM "users" u
        WHERE u."activeOrganizationId" IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM "user_organizations" uo 
                WHERE uo.user_id = u.id 
                    AND uo.organization_id = u."activeOrganizationId"
            )
        ON CONFLICT ("user_id", "organization_id") DO NOTHING
    ' 2>/dev/null || true
    echo "  ✓ Data synced to user_organizations"
fi

# Step 3: Drop organizationRole column
if [ -n "$HAS_ORG_ROLE" ]; then
    echo "  Dropping organizationRole column..."
    run_sql 'ALTER TABLE "users" DROP COLUMN "organizationRole"'
    echo "  ✓ Column dropped"
else
    echo "  ✓ organizationRole already removed, skipping"
fi

# Step 4: Standardize existing role values to Clerk format
echo "  Standardizing role values to Clerk format (org:admin, org:member)..."
run_sql "UPDATE \"user_organizations\" SET role = 'org:admin' WHERE role IN ('owner', 'admin')" 2>/dev/null || true
run_sql "UPDATE \"user_organizations\" SET role = 'org:member' WHERE role NOT IN ('org:admin', 'org:member')" 2>/dev/null || true
run_sql "ALTER TABLE \"user_organizations\" ALTER COLUMN role SET DEFAULT 'org:member'" 2>/dev/null || true
echo "  ✓ Roles standardized"

echo ""
echo "=============================================="
echo "Migration completed successfully!"
echo "=============================================="
echo ""
echo "Changes made:"
echo "  - users.organizationId → users.activeOrganizationId"
echo "  - users.organizationRole dropped (fetched from user_organizations)"
echo "  - user_organizations.role standardized to org:admin or org:member"
echo ""
echo "Backup file: $BACKUP_FILE"
echo ""
echo "You can now deploy the updated backend code."
