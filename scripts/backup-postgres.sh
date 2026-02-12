#!/bin/bash

# PostgreSQL Backup Script for Docker Container
# Backs up the appointment_db container to a specified disk/directory

set -e

# Configuration
CONTAINER_NAME="appointment_db"
BACKUP_DIR="/mnt/backup-disk/postgres-backups"  # Change this to your backup disk path
POSTGRES_USER="${POSTGRES_USER:-appointment_user}"
POSTGRES_DB="${POSTGRES_DB:-appointment_db}"
RETENTION_DAYS=7  # Number of days to keep backups

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup of $POSTGRES_DB..."

# Create the backup using pg_dump inside the container
docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "ERROR: Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
log "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -type f | wc -l)
log "Total backups retained: $BACKUP_COUNT"

log "Backup process completed."
