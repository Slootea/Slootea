#!/bin/bash

# Migration script to add pricing columns to service_options and currency to organization_settings
# This script should be run on the production server

set -e

echo "Starting pricing migration..."

# Get the backend container name
BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'backend|api' | head -1)

if [ -z "$BACKEND_CONTAINER" ]; then
  echo "Error: Could not find backend container"
  exit 1
fi

echo "Found backend container: $BACKEND_CONTAINER"

# Run the migration
echo "Running database migration..."
docker exec "$BACKEND_CONTAINER" npm run migration:run

echo ""
echo "=== Migration completed successfully ==="
echo ""
echo "New columns added:"
echo "  - service_options.show_price (boolean, default: false)"
echo "  - service_options.price (decimal 10,2, default: 0)"
echo "  - organization_settings.currency (varchar 10, default: 'TL')"
echo ""
echo "Next steps:"
echo "  1. Restart the backend container if needed: docker restart $BACKEND_CONTAINER"
echo "  2. Configure service prices in the dashboard"
echo "  3. Set organization currency in organization settings"
