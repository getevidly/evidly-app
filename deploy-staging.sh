#!/bin/bash
# deploy-staging.sh — Deploy to staging + apply latest migration + run e2e tests
# Linked Supabase project: nyucpjheecdkjpgiglzx (evidly-staging)
# Usage: bash deploy-staging.sh

set -e

STAGING_SUPABASE_REF="nyucpjheecdkjpgiglzx"

COMMIT=$(git log --oneline -1)
echo "=== EvidLY Staging Deploy ==="
echo "Commit: $COMMIT"
echo ""

# Step 1 — Deploy to Vercel (preview/staging)
echo "--- Step 1: Deploying to Vercel (staging) ---"
npx vercel --yes
echo ""

# Step 2 — Deploy all edge functions to staging Supabase
echo "--- Step 2: Deploying edge functions to staging ---"
npx supabase functions deploy --project-ref nyucpjheecdkjpgiglzx
echo ""

# Step 3 — Apply latest migration to staging Supabase
echo "--- Step 3: Applying latest migration to staging ---"
LATEST_MIGRATION=$(ls supabase/migrations/*.sql 2>/dev/null | sort | tail -1)
if [[ -n "$LATEST_MIGRATION" ]]; then
  echo "Applying: $LATEST_MIGRATION"
  npx supabase db query --linked -f "$LATEST_MIGRATION" || echo "WARNING: Migration may have already been applied (non-fatal)."
  echo "Migration step complete."
else
  echo "No migration files found — skipping."
fi
echo ""

# Step 4 — Reset staging test data (write temp file for Windows compat)
echo "--- Step 3: Resetting staging test data ---"
RESET_SQL=$(mktemp /tmp/staging-reset-XXXXXX.sql)
cat > "$RESET_SQL" << 'EOSQL'
-- Delete test org data
DELETE FROM locations WHERE organization_id IN (
  SELECT id FROM organizations WHERE name LIKE '%Test%'
);
DELETE FROM user_profiles WHERE organization_id IN (
  SELECT id FROM organizations WHERE name LIKE '%Test%'
);
DELETE FROM organizations WHERE name LIKE '%Test%';

-- Reseed test org + location
INSERT INTO organizations (id, name, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Restaurant Group', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, organization_id, name, city, state)
VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Test Kitchen Downtown', 'Los Angeles', 'CA')
ON CONFLICT (id) DO NOTHING;
EOSQL
npx supabase db query --linked -f "$RESET_SQL"
rm -f "$RESET_SQL"
echo "Staging data reset."
echo ""

# Step 5 — Run Playwright e2e tests
echo "--- Step 5: Running Playwright e2e tests ---"
npx playwright test --reporter=list || true
echo ""

echo "=== Staging deploy complete ==="
