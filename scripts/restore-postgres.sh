#!/bin/bash

# PostgreSQL Restore Script for Docker Container
# Restores a backup to the appointment_db container

set -e

CONTAINER_NAME="appointment_db"
POSTGRES_USER="${POSTGRES_USER:-appointment_user}"
POSTGRES_DB="${POSTGRES_DB:-appointment_db}"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -la /mnt/backup-disk/postgres-backups/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Restoring database..."

# Drop and recreate the database, then restore
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

if [ $? -eq 0 ]; then
    echo "Database restored successfully!"
else
    echo "ERROR: Restore failed!"
    exit 1
fi
