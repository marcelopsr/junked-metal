#!/bin/sh
# Respaldo diario de jm.db (SQLite). Uso: backup.sh [install]
# "install" agrega la línea de cron (04:10 diario) sin duplicar.
set -eu
DIR=$(cd "$(dirname "$0")" && pwd)
DB="${DB_FILE:-$DIR/data/jm.db}"
OUT="$DIR/data/backups"
if [ "${1:-}" = install ]; then
  L="10 4 * * * $DIR/backup.sh >> $DIR/data/backups/backup.log 2>&1"
  mkdir -p "$OUT"
  { crontab -l 2>/dev/null | grep -vF "$DIR/backup.sh" || true; echo "$L"; } | crontab -
  exit 0
fi
mkdir -p "$OUT"
F="$OUT/jm-$(date +%Y%m%d).db"
rm -f "$F" "$F.gz"
sqlite3 "$DB" ".backup '$F'"
gzip -f "$F"
find "$OUT" -name 'jm-*.db.gz' -mtime +14 -delete
echo "$(date -Is) ok $F.gz"
