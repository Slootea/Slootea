#!/bin/bash

# =============================================================================
# Docker Migration Script: Add organizationId to Appointments Table
# =============================================================================
#
# This script safely migrates the production database to:
# 1. Add organizationId column to appointments table
# 2. Backfill existing appointments with their organization from linked data
# 3. Create indexes for performant queries
#
# This fixes the multi-tenant data isolation bug where appointments could be
# visible across organizations.
#
# Usage:
#   ./docker-migrate-appointments-org-id.sh [--dry-run]
#
# Options:
#   --dry-run   Show what would be done without actually executing
#
# =============================================================================

set -e

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-appointment_db}"
POSTGRES_USER="${POSTGRES_USER:-appointment_user}"
POSTGRES_DB="${POSTGRES_DB:-appointment_db}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log functions
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ $1${NC}"
}

# Function to run SQL in container
run_sql() {
    docker exec -t "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "$1" 2>/dev/null | tr -d '\r'
}

run_sql_cmd() {
    docker exec -t "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$1" 2>/dev/null
}

# Check for dry run flag
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    log_warning "DRY RUN MODE - No changes will be made"
fi

echo ""
echo "=========================================================="
echo "Database Migration: Add organizationId to Appointments"
echo "=========================================================="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container '$CONTAINER_NAME' is not running!"
    log_info "Make sure your Docker containers are up with: docker-compose up -d"
    exit 1
fi

log "Target database: $POSTGRES_DB"
log "Container: $CONTAINER_NAME"
echo ""

# Test database connection
log "Testing database connection..."
if ! run_sql "SELECT 1" > /dev/null 2>&1; then
    log_error "Cannot connect to database!"
    exit 1
fi
log_success "Database connection successful"
echo ""

# Check current schema state
log "Checking current schema state..."

HAS_ORG_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'organizationId'" | tr -d '[:space:]')
APPOINTMENT_COUNT=$(run_sql "SELECT COUNT(*) FROM appointments" | tr -d '[:space:]')
NULL_ORG_COUNT=$(run_sql "SELECT COUNT(*) FROM appointments WHERE \"organizationId\" IS NULL" 2>/dev/null | tr -d '[:space:]' || echo "$APPOINTMENT_COUNT")

log_info "  organizationId column exists: $([ -n "$HAS_ORG_ID" ] && echo "YES" || echo "NO")"
log_info "  Total appointments: $APPOINTMENT_COUNT"
if [ -n "$HAS_ORG_ID" ]; then
    log_info "  Appointments without organizationId: $NULL_ORG_COUNT"
fi
echo ""

# Check if migration is needed
if [ -n "$HAS_ORG_ID" ] && [ "$NULL_ORG_COUNT" = "0" ]; then
    log_success "Schema is already migrated and all data populated! No changes needed."
    exit 0
fi

# Create backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/appointments_backup_${TIMESTAMP}.sql"

log "Creating pre-migration backup..."
if [ "$DRY_RUN" = false ]; then
    docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t appointments > "$BACKUP_FILE"
    if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        log_error "Failed to create backup!"
        exit 1
    fi
else
    log_warning "DRY RUN: Would create backup at $BACKUP_FILE"
fi

echo ""
log "Starting migration..."

# Step 1: Add organizationId column if it doesn't exist
if [ -z "$HAS_ORG_ID" ]; then
    log "  Step 1: Adding organizationId column to appointments..."
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'ALTER TABLE "appointments" ADD COLUMN "organizationId" VARCHAR(255) NULL'
        if [ $? -eq 0 ]; then
            log_success "  Column added"
        else
            log_error "  Failed to add column"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would add organizationId column"
    fi
else
    log_success "  Step 1: organizationId column already exists, skipping"
fi

# Step 2: Populate organizationId from linked clients
log "  Step 2: Populating organizationId from linked clients..."
if [ "$DRY_RUN" = false ]; then
    UPDATED=$(run_sql '
        UPDATE "appointments" a
        SET "organizationId" = c."organizationId"
        FROM "clients" c
        WHERE a."clientId" = c.id
          AND a."organizationId" IS NULL
          AND c."organizationId" IS NOT NULL
        RETURNING a.id
    ' | wc -l | tr -d '[:space:]')
    log_success "  Updated $UPDATED appointments from clients"
else
    WOULD_UPDATE=$(run_sql '
        SELECT COUNT(*) 
        FROM "appointments" a
        JOIN "clients" c ON a."clientId" = c.id
        WHERE a."organizationId" IS NULL
          AND c."organizationId" IS NOT NULL
    ' | tr -d '[:space:]')
    log_warning "  DRY RUN: Would update $WOULD_UPDATE appointments from clients"
fi

# Step 3: Populate remaining appointments from service options
log "  Step 3: Populating organizationId from service options..."
if [ "$DRY_RUN" = false ]; then
    UPDATED=$(run_sql '
        UPDATE "appointments" a
        SET "organizationId" = so."organizationId"
        FROM "service_options" so
        WHERE a."serviceOptionId" = so.id
          AND a."organizationId" IS NULL
          AND so."organizationId" IS NOT NULL
        RETURNING a.id
    ' | wc -l | tr -d '[:space:]')
    log_success "  Updated $UPDATED appointments from service options"
else
    WOULD_UPDATE=$(run_sql '
        SELECT COUNT(*) 
        FROM "appointments" a
        JOIN "service_options" so ON a."serviceOptionId" = so.id
        WHERE a."organizationId" IS NULL
          AND so."organizationId" IS NOT NULL
    ' | tr -d '[:space:]')
    log_warning "  DRY RUN: Would update $WOULD_UPDATE appointments from service options"
fi

# Step 4: Populate remaining from user's active organization
log "  Step 4: Populating organizationId from user's active organization..."
if [ "$DRY_RUN" = false ]; then
    UPDATED=$(run_sql '
        UPDATE "appointments" a
        SET "organizationId" = u."activeOrganizationId"
        FROM "users" u
        WHERE a."userId" = u.id
          AND a."organizationId" IS NULL
          AND u."activeOrganizationId" IS NOT NULL
        RETURNING a.id
    ' | wc -l | tr -d '[:space:]')
    log_success "  Updated $UPDATED appointments from users"
else
    WOULD_UPDATE=$(run_sql '
        SELECT COUNT(*) 
        FROM "appointments" a
        JOIN "users" u ON a."userId" = u.id
        WHERE a."organizationId" IS NULL
          AND u."activeOrganizationId" IS NOT NULL
    ' | tr -d '[:space:]')
    log_warning "  DRY RUN: Would update $WOULD_UPDATE appointments from users"
fi

# Step 5: Create indexes
log "  Step 5: Creating performance indexes..."

IDX1_EXISTS=$(run_sql "SELECT indexname FROM pg_indexes WHERE indexname = 'IDX_appointments_organization_startTime'" | tr -d '[:space:]')
IDX2_EXISTS=$(run_sql "SELECT indexname FROM pg_indexes WHERE indexname = 'IDX_appointments_organization_user_startTime'" | tr -d '[:space:]')

if [ -z "$IDX1_EXISTS" ]; then
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'CREATE INDEX "IDX_appointments_organization_startTime" ON "appointments" ("organizationId", "startTime")'
        log_success "  Created index: IDX_appointments_organization_startTime"
    else
        log_warning "  DRY RUN: Would create index IDX_appointments_organization_startTime"
    fi
else
    log_success "  Index IDX_appointments_organization_startTime already exists"
fi

if [ -z "$IDX2_EXISTS" ]; then
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'CREATE INDEX "IDX_appointments_organization_user_startTime" ON "appointments" ("organizationId", "userId", "startTime")'
        log_success "  Created index: IDX_appointments_organization_user_startTime"
    else
        log_warning "  DRY RUN: Would create index IDX_appointments_organization_user_startTime"
    fi
else
    log_success "  Index IDX_appointments_organization_user_startTime already exists"
fi

# Final check
echo ""
if [ "$DRY_RUN" = false ]; then
    REMAINING_NULL=$(run_sql 'SELECT COUNT(*) FROM appointments WHERE "organizationId" IS NULL' | tr -d '[:space:]')
    if [ "$REMAINING_NULL" != "0" ]; then
        log_warning "Warning: $REMAINING_NULL appointments still have NULL organizationId"
        log_info "These may be orphaned records. You can review them with:"
        log_info "  docker exec -t $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT id, \"userId\", \"serviceOptionId\", \"clientId\" FROM appointments WHERE \"organizationId\" IS NULL'"
    else
        log_success "All appointments have organizationId populated!"
    fi
fi

echo ""
echo "=========================================================="

if [ "$DRY_RUN" = false ]; then
    log_success "Migration completed successfully!"
    echo ""
    log "Changes made:"
    log "  - Added organizationId column to appointments table"
    log "  - Backfilled organizationId from linked clients/services/users"
    log "  - Created performance indexes for organization-scoped queries"
    echo ""
    log "Backup file: $BACKUP_FILE"
    echo ""
    log "If you need to restore, run:"
    log "  cat $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB"
else
    log_warning "DRY RUN completed. Run without --dry-run to apply changes."
fi

echo "=========================================================="
echo ""
log "You can now deploy the updated backend code."
