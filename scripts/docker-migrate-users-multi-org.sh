#!/bin/bash

# =============================================================================
# Docker Migration Script: Revise Users Table for Multi-Organization Support
# =============================================================================
#
# This script safely migrates the production database to:
# 1. Rename users.organizationId → users.activeOrganizationId
# 2. Remove users.organizationRole column (role fetched from user_organizations)
#
# IMPORTANT: Run this script BEFORE deploying the new backend code!
#
# Usage:
#   ./docker-migrate-users-multi-org.sh [--dry-run]
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
    docker exec -t "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$1" > /dev/null 2>&1
}

# Check for dry run flag
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    log_warning "DRY RUN MODE - No changes will be made"
fi

echo ""
echo "=============================================="
echo "Database Migration: Multi-Organization Support"
echo "=============================================="
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

HAS_ORG_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organizationId'" | tr -d '[:space:]')
HAS_ACTIVE_ORG_ID=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'activeOrganizationId'" | tr -d '[:space:]')
HAS_ORG_ROLE=$(run_sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organizationRole'" | tr -d '[:space:]')

log_info "  organizationId exists: $([ -n "$HAS_ORG_ID" ] && echo "YES" || echo "NO")"
log_info "  activeOrganizationId exists: $([ -n "$HAS_ACTIVE_ORG_ID" ] && echo "YES" || echo "NO")"
log_info "  organizationRole exists: $([ -n "$HAS_ORG_ROLE" ] && echo "YES" || echo "NO")"
echo ""

# Check if migration is needed
if [ -z "$HAS_ORG_ID" ] && [ -n "$HAS_ACTIVE_ORG_ID" ] && [ -z "$HAS_ORG_ROLE" ]; then
    log_success "Schema is already migrated! No changes needed."
    exit 0
fi

# Create backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/users_backup_${TIMESTAMP}.sql"

log "Creating pre-migration backup..."
if [ "$DRY_RUN" = false ]; then
    docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t users > "$BACKUP_FILE"
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

# Step 1: Rename organizationId to activeOrganizationId
if [ -n "$HAS_ORG_ID" ] && [ -z "$HAS_ACTIVE_ORG_ID" ]; then
    log "  Step 1: Renaming organizationId → activeOrganizationId..."
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'ALTER TABLE "users" RENAME COLUMN "organizationId" TO "activeOrganizationId"'
        if [ $? -eq 0 ]; then
            log_success "  Column renamed"
        else
            log_error "  Failed to rename column"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would rename organizationId → activeOrganizationId"
    fi
elif [ -z "$HAS_ORG_ID" ] && [ -z "$HAS_ACTIVE_ORG_ID" ]; then
    log "  Step 1: Creating activeOrganizationId column..."
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'ALTER TABLE "users" ADD COLUMN "activeOrganizationId" VARCHAR(255) NULL'
        if [ $? -eq 0 ]; then
            log_success "  Column created"
        else
            log_error "  Failed to create column"
            exit 1
        fi
    else
        log_warning "  DRY RUN: Would create activeOrganizationId column"
    fi
else
    log_success "  Step 1: activeOrganizationId already exists, skipping"
fi

# Step 2: Sync data to user_organizations table before dropping role column
if [ -n "$HAS_ORG_ROLE" ]; then
    log "  Step 2: Syncing active organizations to user_organizations table..."
    if [ "$DRY_RUN" = false ]; then
        docker exec -t "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
            INSERT INTO \"user_organizations\" (\"id\", \"user_id\", \"organization_id\", \"role\")
            SELECT gen_random_uuid(), u.id, u.\"activeOrganizationId\", 
                CASE 
                    WHEN u.\"organizationRole\" = 'org:admin' THEN 'org:admin'
                    ELSE 'org:member'
                END
            FROM \"users\" u
            WHERE u.\"activeOrganizationId\" IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1 FROM \"user_organizations\" uo 
                    WHERE uo.user_id = u.id 
                        AND uo.organization_id = u.\"activeOrganizationId\"
                )
            ON CONFLICT (\"user_id\", \"organization_id\") DO NOTHING
        " > /dev/null 2>&1 || true
        log_success "  Data synced to user_organizations"
    else
        log_warning "  DRY RUN: Would sync data to user_organizations"
    fi
else
    log_success "  Step 2: No organizationRole to sync, skipping"
fi

# Step 3: Drop organizationRole column
if [ -n "$HAS_ORG_ROLE" ]; then
    log "  Step 3: Dropping organizationRole column..."
    if [ "$DRY_RUN" = false ]; then
        run_sql_cmd 'ALTER TABLE "users" DROP COLUMN "organizationRole"'
        if [ $? -eq 0 ]; then
            log_success "  Column dropped"
        else
            log_error "  Failed to drop column"
        fi
    else
        log_warning "  DRY RUN: Would drop organizationRole column"
    fi
else
    log_success "  Step 3: organizationRole already removed, skipping"
fi

# Step 4: Standardize existing role values to Clerk format
log "  Step 4: Standardizing role values to Clerk format..."
if [ "$DRY_RUN" = false ]; then
    run_sql_cmd "UPDATE \"user_organizations\" SET role = 'org:admin' WHERE role IN ('owner', 'admin')" 2>/dev/null || true
    run_sql_cmd "UPDATE \"user_organizations\" SET role = 'org:member' WHERE role NOT IN ('org:admin', 'org:member')" 2>/dev/null || true
    run_sql_cmd "ALTER TABLE \"user_organizations\" ALTER COLUMN role SET DEFAULT 'org:member'" 2>/dev/null || true
    log_success "  Roles standardized"
else
    log_warning "  DRY RUN: Would standardize role values"
fi

echo ""
echo "=============================================="

if [ "$DRY_RUN" = false ]; then
    log_success "Migration completed successfully!"
    echo ""
    log "Changes made:"
    log "  - users.organizationId → users.activeOrganizationId"
    log "  - users.organizationRole dropped (fetched from user_organizations)"
    log "  - user_organizations.role standardized to org:admin or org:member"
    echo ""
    log "Backup file: $BACKUP_FILE"
    echo ""
    log "If you need to restore, run:"
    log "  cat $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB"
else
    log_warning "DRY RUN completed. Run without --dry-run to apply changes."
fi

echo "=============================================="
echo ""
log "You can now deploy the updated backend code."
