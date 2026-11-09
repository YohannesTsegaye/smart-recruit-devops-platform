#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-smart_recruit}"
DB_USER="${DB_USER:-smart_recruit}"
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.dump>"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

PGPASSWORD="$PGPASSWORD" pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  "$BACKUP_FILE"

echo "Database restored from $BACKUP_FILE"
