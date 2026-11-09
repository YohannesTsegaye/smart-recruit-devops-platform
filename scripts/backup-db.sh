#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/smart-recruit}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-smart_recruit}"
DB_USER="${DB_USER:-smart_recruit}"
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

mkdir -p "$BACKUP_DIR"

PGPASSWORD="$PGPASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

echo "Backup created: $BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"
