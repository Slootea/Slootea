#!/bin/bash

# Database Migration Script: Remove Deprecated Tables
# This script removes tables that are no longer used:
# - business_settings (replaced by organization_settings)
# - organization_whatsapp_templates (no longer needed)
# - organization_email_settings (email notifications removed)
# - organization_message_templates (no longer needed)
# - organization_sms_settings (SMS notifications removed)
#
# IMPORTANT: Run this AFTER deploying the new backend code that doesn't reference these tables.
# 
# Usage:
#   ./migrate-remove-deprecated-tables.sh [--dry-run]
#
# Options:
#   --dry-run   Show what would be done without actually executing

set -e

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-appointment_db}"
POSTGRES_USER="${POSTGRES_USER:-appointment_user}"
POSTGRES_DB="${POSTGRES_DB:-appointment_db}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Tables to drop
TABLES_TO_DROP=(
    "business_settings"
    "organization_whatsapp_templates"
    "organization_email_settings"
    "organization_message_templates"
    "organization_sms_settings"
)

# Log function
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

# Check for dry run flag
DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    log_warning "DRY RUN MODE - No changes will be made"
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container '$CONTAINER_NAME' is not running!"
    exit 1
fi

log "Starting database migration..."
log "Target database: $POSTGRES_DB"
log "Container: $CONTAINER_NAME"
echo ""

# First, create a backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/pre_migration_backup_${TIMESTAMP}.sql"

log "Creating pre-migration backup..."
if [ "$DRY_RUN" = false ]; then
    docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"
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
log "Checking tables to drop..."

# Check which tables exist
for table in "${TABLES_TO_DROP[@]}"; do
    EXISTS=$(docker exec -t "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | tr -d '\r')
    
    if [ "$EXISTS" = "t" ]; then
        # Get row count
        ROW_COUNT=$(docker exec -t "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d '\r' | tr -d ' ')
        log "  Table '$table' exists with $ROW_COUNT rows"
        
        if [ "$DRY_RUN" = false ]; then
            # Drop the table
            log "  Dropping table '$table'..."
            docker exec -t "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP TABLE IF EXISTS $table CASCADE;" > /dev/null 2>&1
            if [ $? -eq 0 ]; then
                log_success "  Dropped table '$table'"
            else
                log_error "  Failed to drop table '$table'"
            fi
        else
            log_warning "  DRY RUN: Would drop table '$table'"
        fi
    else
        log "  Table '$table' does not exist (skipping)"
    fi
done

echo ""

if [ "$DRY_RUN" = false ]; then
    log_success "Migration completed successfully!"
    log "Backup is available at: $BACKUP_FILE"
    log ""
    log "If you need to restore, run:"
    log "  cat $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB"
else
    log_warning "DRY RUN completed. Run without --dry-run to apply changes."
fi
