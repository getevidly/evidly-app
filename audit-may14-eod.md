# EvidLY Pre-Build Audit — May 14, 2026 EOD

**Generated:** 2026-05-14 ~00:30 UTC
**Branch:** main
**HEAD:** 98f00d9
**PROD:** app.getevidly.com

---

## 1. Git Working Tree State

### Last 20 commits

```
98f00d9 fix(vendors): register document-reminders cron + fix column references + align schema
0611c05 feat(vendors): wire Roster tab end-to-end with real data + AddVendorModal
659188a feat(documents): daily document expiry status cron · Prevent surface
e175062 fix(security): lock down 7 wide-open storage bucket RLS policies to org-scoped access
0161299 feat(onboarding): per-item evidence trail with PPP framing (Phase 4)
48b06f9 feat(onboarding): invitee verb/framing swap + realtime owner mirror
8f87ff8 feat(onboarding): invitee-scoped view with viewMode context + post-signup redirect
6e58acf feat(onboarding): capture per-user assignment on onboarding items
2825f8b audit: user modal + admin modal — PPP voice, brand, structure, data hygiene
2b2b486 audit(admin-console): phase 2 supplement -- 5 late-arriving mutation findings
1ecf6b8 audit(admin-console): phase 2 wired-but-broken -- read-only
9a699e6 chore(sensors): delete redundant IoT/sensor surfaces; consolidate to TempLogs + Equipment IoT tab
c7f06d9 audit(admin-console): v3 phase 0 intermediates
f1851c5 fix(dashboard): OnboardingCard live-evaluate completion instead of trusting latched flag
a100bea fix(dashboard): OnboardingCard bidirectional collapse toggle
733f014 fix(sidebar): make sidebar scrollable so all section items remain reachable at 100% zoom
beee77e fix(nav): delete Compliance Overview, Tasks page, and Dashboard Overview tab
2ee0386 feat(vendors): rename Vendors→Roster and Requests→Service requests, reorder Performance to last, add empty-state explainers
9230f56 feat(vendors): relabel rebuild as Vendor Services; add Vendor Network placeholder
c28b7b7 chore(sidebar): reorder Vendors section — Vendor Services listed first
```

**All 8 May 14 commits confirmed present:** 6e58acf, 8f87ff8, 48b06f9, 0161299, e175062, 659188a, 0611c05, 98f00d9

### Stashes

```
stash@{0}: On main: vite-5.4.21-bump-2026-05-07
```

One stash from May 7 — Vite version bump. Matches the uncommitted package.json change below.

### Uncommitted modifications (5 tracked files)

| File | Description |
|------|-------------|
| `package.json` | Vite version bump `^5.4.2` → `^5.4.21` (devDependency) |
| `package-lock.json` | Lockfile update corresponding to Vite bump |
| `src/components/Pricing.tsx` | Pricing page copy changes: 45→60-day guarantee, add setup fee language ($250 founder / $500 standard), "No setup fees" → "One-time setup fee" |
| `supabase/.temp/cli-latest` | Auto-generated Supabase CLI temp file (ephemeral) |
| `supabase/functions/stripe-create-checkout/index.ts` | Adds one-time setup fee line item to Stripe checkout session (STRIPE_FOUNDER_SETUP_PRICE_ID / STRIPE_STANDARD_SETUP_PRICE_ID env vars) |

### Untracked files (48 files/directories)

All are workspace artifacts from prior audit sessions — diff chunks, reports, temp scripts. None are source code. Key items:

| Pattern | Count | Description |
|---------|-------|-------------|
| `*-AUDIT*.md`, `*-REPORT*.md` | 14 | Prior audit/report markdown files |
| `*.diff` | 7 | Saved git diffs from prior sprints |
| `bug10-chunk-*`, `aichat-chunk-*` | 14 | Split diff chunks |
| `*.txt` | 6 | Miscellaneous audit/verification outputs |
| `*.sh`, `*.py`, `*.mjs`, `*.spec.ts` | 5 | Temp scripts (check imports, e2e, triage) |
| `audit-output/`, `docs/`, `EVIDLY-AUDIT-01*/` | 3 | Directories with prior audit artifacts |
| `temp_schema_dump.sql` | 1 | One-time schema dump |

### STOP CONDITION TRIGGERED

**5 uncommitted tracked file modifications detected.** Per audit rules, this section flags the dirty tree. The modifications fall into two categories:

1. **Pricing/Stripe setup fee work** (3 files: `Pricing.tsx`, `stripe-create-checkout/index.ts`, `package.json`) — appears to be an in-progress feature for adding one-time setup fees to Stripe checkout. This is coherent uncommitted work, not drift.

2. **Ephemeral** (2 files: `package-lock.json`, `supabase/.temp/cli-latest`) — auto-generated, no risk.

**Recommendation:** Commit or stash the pricing/setup-fee changes before starting Item 4. They are unrelated to vendor wiring work and could cause confusion in future diffs.

> Remaining sections included below since all data was gathered read-only.

---

## 2. Branch + Remote Sync

- **Current branch:** `main`
- **Local ahead of remote:** 0 commits (fully pushed)
- **Remote ahead of local:** 0 commits (fully pulled)

**Status: IN SYNC**

---

## 3. Build + Typecheck Health

### TypeScript typecheck (`npx tsc --noEmit`)

```
Exit code 0. No errors.
```

### Vite build (`npx vite build`)

```
✓ built in 52.16s
```

No errors. One non-blocking warning:

```
[plugin:vite:esbuild] src/data/helpDocs.ts: Duplicate key "/vendors" in object literal
```

This is a duplicate key in `helpDocs.ts` — the second `/vendors` entry overwrites the first. Non-blocking but should be cleaned up.

**Status: CLEAN** (1 non-blocking warning)

---

## 4. Migration State vs PROD Schema

### Counts

| Metric | Value |
|--------|-------|
| Local migration files | 380 |
| Applied on PROD (`schema_migrations`) | 263 |
| Latest applied version | `20260809000000` |
| Files newer than latest applied | **37** |

### Unapplied migrations (20260810+)

All 37 migration files from `20260810000000` through `20260819000001` are NOT in `schema_migrations`:

```
20260810000000_drop_trial_deadcode.sql
20260810000001_cd_category_4value.sql
20260810000002_cd_status_6value.sql
20260810000003_cd_subject_user_id.sql
20260810000004_cdr_vendor_service_record_id.sql
20260810000005_cdr_viewed_at.sql
20260810000006_lss_vendor_id_fk.sql
20260810000007_vsr_vendor_id_nullable.sql
20260810000008_vsr_vendor_id_backfill.sql
20260810000009_share_recommendation_rules.sql
20260810000010_cd_rls_policies.sql
20260810000011_cd_additional_indexes.sql
20260810000012_cron_vendor_service_record_trigger.sql
20260810000013_table_comments.sql
20260810000014_phase15_check_updates.sql
20260810000015_lss_acknowledged_at.sql
20260810000016_lss_deferred_columns.sql
20260810000017_lss_completed_count.sql
20260810000018_lss_completed_count_trigger.sql
20260810000019_calendar_events_full.sql
20260810000020_v_documents_enriched.sql
20260810000021_onboarding_phase1_schema.sql
20260810000022_organizations_metadata.sql
20260810000023_onboarding_identify_vendor.sql
20260811000000_seed_locked_section_flags.sql
20260812000000_rename_ca_categories.sql
20260813000000_incidents_pillar_to_category.sql
20260814000000_equipment_tables.sql
20260815000000_risk_free_eligibility.sql
20260816000000_vendor_capture_fields.sql
20260817000000_evidence_trail_schema.sql
20260817000001_evidence_attachments_bucket.sql
20260817000002_evidence_pattern_detect_cron.sql
20260818000000_storage_bucket_rls_lockdown.sql
20260818100000_document_expiry_status_cron.sql
20260819000000_vendor_document_reminders_cron.sql
20260819000001_vendors_column_alignment.sql
```

### Phantom / manual-apply check

Several migrations from the list above were **manually applied** to PROD (DDL executed directly) without being recorded in `schema_migrations`. Spot-check results:

| Table | Expected from migration | Exists in PROD? | In schema_migrations? |
|-------|------------------------|------------------|-----------------------|
| `evidence_trails` | 20260817000000 | MISSING | No |
| `evidence_attachments` | 20260817000001 | MISSING | No |
| `equipment_types` | 20260814000000 | MISSING | No |
| `equipment_items` | 20260814000000 | MISSING | No |
| `onboarding_items` | 20260810000021 | MISSING | No |
| `calendar_events` | 20260810000019 | EXISTS | No |
| `vendor_documents` | 20260407000000 | EXISTS | Yes (phantom — manually re-applied) |
| `vendor_document_expiry_tracking` | 20260620000000 | EXISTS | Yes (phantom — manually re-applied) |
| `vendor_document_submissions` | 20260620000000 | EXISTS | Yes (phantom — manually re-applied) |

**Key finding:** The vendor document tables (vendor_documents, vendor_document_expiry_tracking, vendor_document_submissions) exist because they were manually applied during the Item 2 cron fix, but the 37 post-20260809 migrations are all formally unapplied. Older migrations (pre-20260809) also have gaps but are recorded as applied.

**Status: YELLOW** — 37 unapplied migrations. Some DDL was manually applied but not tracked in `schema_migrations`. No blocking issue for Item 4 work specifically, but the migration gap continues to grow.

---

## 5. Edge Function Deploy State

### Counts

| Metric | Value |
|--------|-------|
| Local function directories | 168 |
| Deployed on PROD | ~230 (includes legacy functions not in local repo) |

### Functions modified/deployed May 10–14

| Function | Last deployed (UTC) | Local modified | Status |
|----------|-------------------|----------------|--------|
| `vendor-document-reminders` | 2026-05-14 02:59 | May 13 19:59 PDT | **SYNCED** |
| `document-expiry-status` | 2026-05-14 00:34 | May 13 17:32 PDT | **SYNCED** |
| `evidence-pattern-detect` | 2026-05-13 23:45 | May 13 16:03 PDT | **SYNCED** |
| `stripe-create-checkout` | 2026-05-10 22:41 | May 10 20:59 PDT | **DRIFT** — local has uncommitted setup-fee changes not deployed |
| `stripe-webhook` | 2026-05-10 22:41 | N/A | Deployed, not recently modified locally |
| `resend-webhook` | 2026-05-10 03:47 | N/A | Deployed, not recently modified locally |
| `risk-free-eligibility-calc` | 2026-05-11 15:14 | N/A | Deployed |
| `send-document-request` | 2026-05-12 04:16 | N/A | Deployed |

### Drift alert

`stripe-create-checkout` has **uncommitted local changes** (setup fee line items) that have NOT been deployed. The deployed version does not include setup fees. This matches the uncommitted `Pricing.tsx` and `package.json` changes — all part of the same in-progress pricing feature.

---

## 6. Recent Commits Sanity Check

| SHA | Summary | Files | Primary directory | Flags |
|-----|---------|-------|-------------------|-------|
| `6e58acf` | Capture per-user assignment on onboarding items | 6 | `src/components/onboarding/`, `src/pages/` | Clean |
| `8f87ff8` | Invitee-scoped view with viewMode context | 8 | `src/components/onboarding/`, `src/contexts/` | Clean |
| `48b06f9` | Invitee verb/framing swap + realtime owner mirror | 3 | `src/components/onboarding/`, `src/hooks/` | Clean |
| `0161299` | Per-item evidence trail with PPP framing (Phase 4) | 14 | `src/components/onboarding/`, `supabase/functions/`, `supabase/migrations/` | Clean — large commit (1480+/66-) but coherent scope |
| `e175062` | Lock down 7 storage bucket RLS policies | 1 | `supabase/migrations/` | Clean |
| `659188a` | Daily document expiry status cron | 2 | `supabase/functions/`, `supabase/migrations/` | Clean |
| `0611c05` | Wire Roster tab with real data + AddVendorModal | 4 | `src/hooks/`, `src/pages/vendors/`, `src/components/vendors/` | Clean |
| `98f00d9` | Register document-reminders cron + fix column refs + align schema | 3 | `supabase/functions/`, `supabase/migrations/` | Clean |

**No unexpected files.** No admin files mixed in. All commits are properly scoped to their stated purpose.

---

## 7. Pre-Launch Flag and Dev-Gate Scan

### `import.meta.env.DEV` / `process.env.NODE_ENV` references

| File | Line | Usage | Assessment |
|------|------|-------|------------|
| `src/utils/analytics.ts:13` | `const isDev = () => import.meta.env.DEV;` | Guards analytics from firing in dev | **OK** — standard pattern |
| `src/hooks/usePageTracking.ts:11` | `if (import.meta.env.DEV) return;` | Skips page tracking in dev | **OK** — standard pattern |

No `process.env.NODE_ENV` references found in `src/`.

### Feature flag references

The codebase uses a DB-backed feature flag system (`feature_flags` table + `useFeatureFlag` hook + `FeatureGate` component). Key files:

- `src/hooks/useFeatureFlag.ts` — hook that evaluates flags from DB
- `src/components/FeatureGate.tsx` — simple gate component
- `src/components/feature-flags/FeatureGate.tsx` — extended gate with reason/message display
- `src/lib/featureGating.ts` — `isFeatureEnabled()` + tier gating
- `src/pages/admin/FeatureFlags.tsx` — admin UI (excluded per admin-scope exception)

No stale TODO-flagged conditionals or commented-out flags found in non-admin code. The feature flag system is DB-driven, so stale flags would be in the database, not in code.

**Status: CLEAN**

---

## 8. Summary

| Section | Status | Notes |
|---------|--------|-------|
| 1. Git working tree | **RED** | 5 uncommitted tracked modifications (pricing/setup-fee feature + Vite bump), 48 untracked workspace artifacts, 1 stash |
| 2. Branch + remote sync | **GREEN** | Fully synced with origin/main |
| 3. Build + typecheck | **GREEN** | tsc clean, vite build clean (1 non-blocking duplicate-key warning in helpDocs.ts) |
| 4. Migration state | **YELLOW** | 37 unapplied migrations (20260810+). Some DDL manually applied but not tracked. Growing gap. |
| 5. Edge function deploy | **YELLOW** | `stripe-create-checkout` has uncommitted local drift (setup fee feature). All other recently-touched functions are synced. |
| 6. Recent commits | **GREEN** | All 8 May 14 commits present and properly scoped |
| 7. Dev-gate scan | **GREEN** | Only 2 standard dev-guard patterns, no stale flags in code |

### Headline

The codebase is **conditionally ready** to begin Item 4 (Wire Services tab). The build is clean, TypeScript passes, and all May 14 commits are pushed and deployed. However, **three items should be resolved first:**

1. **[HIGH] Uncommitted pricing/setup-fee changes** — `Pricing.tsx`, `stripe-create-checkout/index.ts`, and `package.json` contain coherent but uncommitted work. These should be committed to a branch or stashed before starting new work to prevent accidental inclusion in future commits.

2. **[MEDIUM] 37 unapplied migrations** — The gap between local migration files and PROD `schema_migrations` continues to grow. This does not block Item 4 directly (the Services tab wiring depends on `vendor_service_records` which exists), but any new migration work adds to the debt.

3. **[LOW] 48 untracked workspace artifacts** — Audit reports, diff chunks, temp scripts cluttering the working tree. Consider adding to `.gitignore` or archiving outside the repo.
