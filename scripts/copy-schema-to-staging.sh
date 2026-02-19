#!/bin/bash
# ======================================
# STAGING-ENV-1 — Copy Schema to Staging
# ======================================
# Copies schema (no data) from production Supabase to staging Supabase.
# Run manually when staging schema needs to be updated after migrations.
#
# Prerequisites:
#   - pg_dump and psql installed (included with PostgreSQL)
#   - Replace the placeholder URLs below with actual connection strings
#     from Supabase → Project Settings → Database → Connection string (URI)
#
# Usage:
#   bash scripts/copy-schema-to-staging.sh
# ======================================

set -euo pipefail

# ── Replace these with your actual Supabase database connection strings ──
# Find them at: https://supabase.com/dashboard → Project → Settings → Database → Connection string
PROD_DB_URL="${PROD_DB_URL:-<production-database-url>}"
STAGING_DB_URL="${STAGING_DB_URL:-<staging-database-url>}"

if [[ "$PROD_DB_URL" == *"<"* ]] || [[ "$STAGING_DB_URL" == *"<"* ]]; then
  echo "ERROR: Replace placeholder database URLs before running this script."
  echo "  Set PROD_DB_URL and STAGING_DB_URL environment variables, or edit this file."
  exit 1
fi

DUMP_FILE="/tmp/evidly-schema-$(date +%Y%m%d-%H%M%S).sql"

echo "Dumping schema from production..."
pg_dump "$PROD_DB_URL" --schema-only --no-owner --no-acl -f "$DUMP_FILE"
echo "  → Saved to $DUMP_FILE"

echo "Applying schema to staging..."
psql "$STAGING_DB_URL" -f "$DUMP_FILE"

echo "Done. Staging schema is now in sync with production."
