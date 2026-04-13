#!/bin/bash
# deploy.sh — EvidLY dual deploy: staging + prod
# Run from either evidly-app or evidly-landing root directory
# Usage: bash deploy.sh

set -e

REPO=$(basename "$PWD")
echo "=== EvidLY Deploy: $REPO ==="
echo ""

# Step 1 — confirm clean working tree
if [[ -n $(git status --porcelain) ]]; then
  echo "ERROR: Uncommitted changes detected. Commit first."
  git status --short
  exit 1
fi

COMMIT=$(git log --oneline -1)
echo "Commit: $COMMIT"
echo ""

# Step 2 — deploy to staging (no --prod flag = preview/staging deployment)
echo "--- Deploying to STAGING ---"
STAGING_URL=$(npx vercel --yes 2>&1 | grep "https://" | tail -1)
echo "Staging URL: $STAGING_URL"
echo ""

# Step 3 — deploy to prod
echo "--- Deploying to PROD ---"
npx vercel --prod --yes
echo ""

# Step 4 — if evidly-app: deploy all edge functions to production
if [[ "$REPO" == "evidly-app" ]]; then
  echo "--- Deploying edge functions to PROD ---"
  npx supabase functions deploy --project-ref irxgmhxhmxtzfwuieblc
  echo ""
fi

# Step 5 — if evidly-app: apply latest migration to staging Supabase
if [[ "$REPO" == "evidly-app" ]]; then
  echo "--- Syncing latest migration to staging Supabase ---"
  LATEST_MIGRATION=$(ls supabase/migrations/*.sql 2>/dev/null | sort | tail -1)
  if [[ -n "$LATEST_MIGRATION" ]]; then
    echo "Applying: $LATEST_MIGRATION"
    npx supabase db query --linked -f "$LATEST_MIGRATION"
    echo "Migration applied to staging."
  else
    echo "No migration files found — skipping."
  fi
  echo ""
fi

echo "=== Deploy complete ==="
echo "Staging: $STAGING_URL"
echo "Prod:    https://app.getevidly.com (evidly-app) or https://www.getevidly.com (evidly-landing)"
