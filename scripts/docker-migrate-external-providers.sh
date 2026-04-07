#!/bin/bash

# =============================================================================
# Docker Migration Script: Add External Providers Support
# =============================================================================
#
# This script safely migrates the production database to:
# 1. Create external_providers table
# 2. Create external_provider_service_options table
# 3. Add externalProviderId to availability table
# 4. Add externalProviderId to blocked_times table
# 5. Add externalProviderId to appointments table
# 6. Create indexes for performant queries
# 7. Add check constraints for provider type validation
#
# This enables organizations to have external service providers who are not 
# members of the Clerk organization but can still provide services.
#
# Usage:
#   ./docker-migrate-external-providers.sh [--dry-run]
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
echo "Database Migration: Add External Providers Support"
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

HAS_EXT_PROVIDERS=$(run_sql "SELECT table_name FROM information_schema.tables WHERE table_name = 'external_providers'" | tr -d '[:space:]')
HAS_EXT_PROVIDER_SERVICES=$(run_sql "SELECT table_name FROM information_schema.tables WHERE table_name = 'external_provider_service_options'" | tr -d '[:space:]')
HAS_AVAIL_EXT_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'availability' AND column_name = 'externalProviderId'" | tr -d '[:space:]')
HAS_BLOCKED_EXT_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'blocked_times' AND column_name = 'externalProviderId'" | tr -d '[:space:]')
HAS_APPT_EXT_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'externalProviderId'" | tr -d '[:space:]')

log_info "  external_providers table exists: $([ -n "$HAS_EXT_PROVIDERS" ] && echo "YES" || echo "NO")"
log_info "  external_provider_service_options table exists: $([ -n "$HAS_EXT_PROVIDER_SERVICES" ] && echo "YES" || echo "NO")"
log_info "  availability.externalProviderId exists: $([ -n "$HAS_AVAIL_EXT_ID" ] && echo "YES" || echo "NO")"
log_info "  blocked_times.externalProviderId exists: $([ -n "$HAS_BLOCKED_EXT_ID" ] && echo "YES" || echo "NO")"
log_info "  appointments.externalProviderId exists: $([ -n "$HAS_APPT_EXT_ID" ] && echo "YES" || echo "NO")"
echo ""

# Check if full migration is already done
if [ -n "$HAS_EXT_PROVIDERS" ] && [ -n "$HAS_EXT_PROVIDER_SERVICES" ] && [ -n "$HAS_AVAIL_EXT_ID" ] && [ -n "$HAS_BLOCKED_EXT_ID" ] && [ -n "$HAS_APPT_EXT_ID" ]; then
    log_success "Schema is already fully migrated! No changes needed."
    exit 0
fi

# Create backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/external_providers_migration_backup_${TIMESTAMP}.sql"

log "Creating pre-migration backup of affected tables..."
if [ "$DRY_RUN" = false ]; then
    docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -t availability -t blocked_times -t appointments > "$BACKUP_FILE"
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

# Step 1: Create external_providers table
if [ -z "$HAS_EXT_PROVIDERS" ]; then
    log "  Step 1: Creating external_providers table..."
    SQL='CREATE TABLE "external_providers" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organizationId" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "imageBase64" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    )'
    if [ "$DRY_RUN" = false ]; then
        # First ensure uuid-ossp extension exists
        run_sql_cmd 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'
        run_sql_cmd "$SQL"
        if [ $? -eq 0 ]; then
            log_success "  external_providers table created"
        else
            log_error "  Failed to create external_providers table"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would create external_providers table"
    fi
else
    log_success "  Step 1: external_providers table already exists, skipping"
fi

# Step 2: Create external_provider_service_options table
if [ -z "$HAS_EXT_PROVIDER_SERVICES" ]; then
    log "  Step 2: Creating external_provider_service_options table..."
    SQL='CREATE TABLE "external_provider_service_options" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "externalProviderId" UUID NOT NULL REFERENCES "external_providers"("id") ON DELETE CASCADE,
        "serviceOptionId" UUID NOT NULL REFERENCES "service_options"("id") ON DELETE CASCADE,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "customDuration" INTEGER,
        "customDescription" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE("externalProviderId", "serviceOptionId")
    )'
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd "$SQL"
        if [ $? -eq 0 ]; then
            log_success "  external_provider_service_options table created"
        else
            log_error "  Failed to create external_provider_service_options table"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would create external_provider_service_options table"
    fi
else
    log_success "  Step 2: external_provider_service_options table already exists, skipping"
fi

# Step 3: Add externalProviderId to availability table
if [ -z "$HAS_AVAIL_EXT_ID" ]; then
    log "  Step 3: Adding externalProviderId to availability table..."
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'ALTER TABLE "availability" ADD COLUMN "externalProviderId" UUID REFERENCES "external_providers"("id") ON DELETE CASCADE'
        if [ $? -eq 0 ]; then
            log_success "  externalProviderId column added to availability"
        else
            log_error "  Failed to add externalProviderId to availability"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would add externalProviderId to availability table"
    fi
else
    log_success "  Step 3: availability.externalProviderId already exists, skipping"
fi

# Step 4: Add externalProviderId to blocked_times table
if [ -z "$HAS_BLOCKED_EXT_ID" ]; then
    log "  Step 4: Adding externalProviderId to blocked_times table..."
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'ALTER TABLE "blocked_times" ADD COLUMN "externalProviderId" UUID REFERENCES "external_providers"("id") ON DELETE CASCADE'
        if [ $? -eq 0 ]; then
            log_success "  externalProviderId column added to blocked_times"
        else
            log_error "  Failed to add externalProviderId to blocked_times"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would add externalProviderId to blocked_times table"
    fi
else
    log_success "  Step 4: blocked_times.externalProviderId already exists, skipping"
fi

# Step 5: Add externalProviderId to appointments table
if [ -z "$HAS_APPT_EXT_ID" ]; then
    log "  Step 5: Adding externalProviderId to appointments table..."
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'ALTER TABLE "appointments" ADD COLUMN "externalProviderId" UUID REFERENCES "external_providers"("id") ON DELETE SET NULL'
        if [ $? -eq 0 ]; then
            log_success "  externalProviderId column added to appointments"
        else
            log_error "  Failed to add externalProviderId to appointments"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would add externalProviderId to appointments table"
    fi
else
    log_success "  Step 5: appointments.externalProviderId already exists, skipping"
fi

# Step 6: Create indexes
log "  Step 6: Creating indexes..."
if [ "$DRY_RUN" = false ]; then
    # Index for external_providers by organization
    run_sql_cmd 'CREATE INDEX IF NOT EXISTS "IDX_external_providers_organizationId" ON "external_providers"("organizationId")'
    # Index for external_provider_service_options
    run_sql_cmd 'CREATE INDEX IF NOT EXISTS "IDX_ext_provider_services_providerId" ON "external_provider_service_options"("externalProviderId")'
    run_sql_cmd 'CREATE INDEX IF NOT EXISTS "IDX_ext_provider_services_serviceId" ON "external_provider_service_options"("serviceOptionId")'
    # Index for availability external provider
    run_sql_cmd 'CREATE INDEX IF NOT EXISTS "IDX_availability_externalProviderId" ON "availability"("externalProviderId") WHERE "externalProviderId" IS NOT NULL'
    # Index for blocked_times external provider
    run_sql_cmd 'CREATE INDEX IF NOT EXISTS "IDX_blocked_times_externalProviderId" ON "blocked_times"("externalProviderId") WHERE "externalProviderId" IS NOT NULL'
    # Index for appointments external provider
    run_sql_cmd 'CREATE INDEX IF NOT EXISTS "IDX_appointments_externalProviderId" ON "appointments"("externalProviderId") WHERE "externalProviderId" IS NOT NULL'
    log_success "  Indexes created"
else
    log_warning "  DRY RUN: Would create indexes"
fi

# Step 7: Add check constraints for availability and blocked_times
# These ensure that either userId OR externalProviderId is set, but not both
log "  Step 7: Adding check constraints..."
if [ "$DRY_RUN" = false ]; then
    # Check if constraint already exists for availability
    HAS_AVAIL_CONSTRAINT=$(run_sql "SELECT constraint_name FROM information_schema.check_constraints WHERE constraint_name = 'chk_availability_provider'" | tr -d '[:space:]')
    if [ -z "$HAS_AVAIL_CONSTRAINT" ]; then
        run_sql_cmd 'ALTER TABLE "availability" ADD CONSTRAINT "chk_availability_provider" CHECK (("userId" IS NOT NULL AND "externalProviderId" IS NULL) OR ("userId" IS NULL AND "externalProviderId" IS NOT NULL))'
        log_success "  Availability check constraint added"
    else
        log_success "  Availability check constraint already exists"
    fi
    
    # Check if constraint already exists for blocked_times
    HAS_BLOCKED_CONSTRAINT=$(run_sql "SELECT constraint_name FROM information_schema.check_constraints WHERE constraint_name = 'chk_blocked_time_provider'" | tr -d '[:space:]')
    if [ -z "$HAS_BLOCKED_CONSTRAINT" ]; then
        run_sql_cmd 'ALTER TABLE "blocked_times" ADD CONSTRAINT "chk_blocked_time_provider" CHECK (("userId" IS NOT NULL AND "externalProviderId" IS NULL) OR ("userId" IS NULL AND "externalProviderId" IS NOT NULL))'
        log_success "  Blocked times check constraint added"
    else
        log_success "  Blocked times check constraint already exists"
    fi
else
    log_warning "  DRY RUN: Would add check constraints"
fi

echo ""
log "Migration complete!"
echo ""

# Verify migration
log "Verifying migration..."

VERIFY_EP=$(run_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'external_providers'" | tr -d '[:space:]')
VERIFY_EPS=$(run_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'external_provider_service_options'" | tr -d '[:space:]')
VERIFY_AVAIL=$(run_sql "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'availability' AND column_name = 'externalProviderId'" | tr -d '[:space:]')
VERIFY_BLOCKED=$(run_sql "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'blocked_times' AND column_name = 'externalProviderId'" | tr -d '[:space:]')
VERIFY_APPT=$(run_sql "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'externalProviderId'" | tr -d '[:space:]')

if [ "$VERIFY_EP" = "1" ] && [ "$VERIFY_EPS" = "1" ] && [ "$VERIFY_AVAIL" = "1" ] && [ "$VERIFY_BLOCKED" = "1" ] && [ "$VERIFY_APPT" = "1" ]; then
    log_success "All migrations verified successfully!"
else
    log_error "Some migrations may have failed. Please check the database manually."
    exit 1
fi

echo ""
log_info "Summary:"
log_info "  - Created external_providers table"
log_info "  - Created external_provider_service_options table"
log_info "  - Added externalProviderId to availability table"
log_info "  - Added externalProviderId to blocked_times table"
log_info "  - Added externalProviderId to appointments table"
log_info "  - Created necessary indexes"
log_info "  - Added check constraints for provider validation"
echo ""
log_success "Migration completed successfully!"

if [ "$DRY_RUN" = false ]; then
    log_info "Backup file saved at: $BACKUP_FILE"
    log_info "You can delete the backup once you've verified everything works correctly."
fi
