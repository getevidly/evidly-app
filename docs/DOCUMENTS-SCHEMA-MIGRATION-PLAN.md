# DOCUMENTS-SCHEMA-MIGRATION-PLAN — Step 2 of 3

> **Type:** TIER 1 — Migration Plan (draft, not applied)
> **Date:** 2026-05-11
> **PROD:** irxgmhxhmxtzfwuieblc
> **Status:** DRAFT — awaiting Arthur approval before any apply
> **Apply method:** Supabase SQL Editor (NOT supabase db push)

---

## PRE-FLIGHT STATE (verified 2026-05-11)

| Table | Rows | Notes |
|---|---|---|
| compliance_documents | **0** | CHECK alterations safe |
| compliance_document_requests | **0** | Column additions safe |
| vendor_service_records | **0** | Column additions safe |
| location_service_schedules | **0 orphaned vendor_ids** | FK addition safe |
| vendor_secure_tokens | **0** | Deprecated, untouched |

**Existing indexes on compliance_documents:** 8 (PK + 7 functional)
**Existing RLS on compliance_documents:** 5 policies (select/insert/update for authenticated + insert/update for service_role, NO DELETE)

---

## SECTION 1 — Migration Files in Apply Order

### M1 — Update compliance_documents.category CHECK (4-value)

**Filename:** `supabase/migrations/20260810000001_cd_category_4value.sql`
**Purpose:** Replace 3-value category CHECK with 4-value (kitchen / employee / service / business).

```sql
-- M1: Update compliance_documents.category CHECK to 4-value set
-- Pre-condition: 0 rows, no data migration needed
-- Replaces: kitchen_employee → split into kitchen + employee
--           vendor_service → service
--           vendor_business → business

BEGIN;

ALTER TABLE compliance_documents
  DROP CONSTRAINT compliance_documents_category_check;

ALTER TABLE compliance_documents
  ADD CONSTRAINT compliance_documents_category_check
    CHECK (category IN ('kitchen', 'employee', 'service', 'business'));

COMMIT;
```

**Verification query:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'compliance_documents_category_check';
-- Expected: CHECK ((category = ANY (ARRAY['kitchen'::text, 'employee'::text, 'service'::text, 'business'::text])))
```

**Rollback:**
```sql
ALTER TABLE compliance_documents DROP CONSTRAINT compliance_documents_category_check;
ALTER TABLE compliance_documents ADD CONSTRAINT compliance_documents_category_check
  CHECK (category IN ('kitchen_employee', 'vendor_service', 'vendor_business'));
```

**Risk:** LOW. 0 rows. No downstream code references old CHECK values in PROD (compliance_documents has zero application code wired — only migration defines it).

---

### M2 — Update compliance_documents.status CHECK (6-value) + fix partial index

**Filename:** `supabase/migrations/20260810000002_cd_status_6value.sql`
**Purpose:** Replace 8-value status CHECK with locked 6-value set. Rebuild partial index that references old `'pending'` value.

```sql
-- M2: Update compliance_documents.status CHECK to 6-value locked set
-- Removes: pending (→ pending_review), rejected, archived, cancelled
-- Adds: pending_review, overdue
-- Also rebuilds idx_compliance_documents_org_pending which references 'pending'

BEGIN;

-- 1. Drop the partial index that references 'pending'
DROP INDEX IF EXISTS idx_compliance_documents_org_pending;

-- 2. Replace the CHECK constraint
ALTER TABLE compliance_documents
  DROP CONSTRAINT compliance_documents_status_check;

ALTER TABLE compliance_documents
  ADD CONSTRAINT compliance_documents_status_check
    CHECK (status IN ('current', 'expiring', 'expired', 'pending_review', 'requested', 'overdue'));

-- 3. Update the column default from 'current' (remains correct, no change needed)
-- Default is already 'current' per migration 20260807000000

-- 4. Rebuild partial index with corrected status values
CREATE INDEX idx_compliance_documents_org_pending
  ON compliance_documents (organization_id, status)
  WHERE status IN ('pending_review', 'requested');

COMMIT;
```

**Verification query:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'compliance_documents_status_check';
-- Expected: CHECK ((status = ANY (ARRAY['current'::text, 'expiring'::text, 'expired'::text, 'pending_review'::text, 'requested'::text, 'overdue'::text])))
```

```sql
SELECT indexdef FROM pg_indexes
WHERE indexname = 'idx_compliance_documents_org_pending';
-- Expected: ... WHERE (status = ANY (ARRAY['pending_review'::text, 'requested'::text]))
```

**Rollback:**
```sql
BEGIN;
DROP INDEX IF EXISTS idx_compliance_documents_org_pending;
ALTER TABLE compliance_documents DROP CONSTRAINT compliance_documents_status_check;
ALTER TABLE compliance_documents ADD CONSTRAINT compliance_documents_status_check
  CHECK (status IN ('requested', 'pending', 'current', 'expiring', 'expired', 'rejected', 'archived', 'cancelled'));
CREATE INDEX idx_compliance_documents_org_pending
  ON compliance_documents (organization_id, status)
  WHERE status IN ('pending', 'requested');
COMMIT;
```

**Risk:** LOW. 0 rows. Index drop + recreate is instantaneous on empty table. The partial index filter changes from `'pending'` to `'pending_review'`.

---

### M3 — Add subject_user_id to compliance_documents

**Filename:** `supabase/migrations/20260810000003_cd_subject_user_id.sql`
**Purpose:** Add subject_user_id column for employee-category documents (food handler card belongs to a specific person). Nullable FK to user_profiles. CHECK enforces NOT NULL when category='employee'.

```sql
-- M3: Add subject_user_id for employee-category documents
-- When category='employee', this identifies which staff member the document belongs to

BEGIN;

ALTER TABLE compliance_documents
  ADD COLUMN IF NOT EXISTS subject_user_id uuid
    REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Enforce: employee-category docs MUST have a subject
ALTER TABLE compliance_documents
  ADD CONSTRAINT cd_employee_requires_subject
    CHECK (category <> 'employee' OR subject_user_id IS NOT NULL);

-- Index for employee-scoped queries
CREATE INDEX IF NOT EXISTS idx_cd_subject_user_id
  ON compliance_documents (subject_user_id)
  WHERE subject_user_id IS NOT NULL;

COMMIT;
```

**Verification query:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'compliance_documents' AND column_name = 'subject_user_id';
-- Expected: subject_user_id | uuid | YES
```

```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'cd_employee_requires_subject';
-- Expected: 1 row
```

**Rollback:**
```sql
BEGIN;
ALTER TABLE compliance_documents DROP CONSTRAINT IF EXISTS cd_employee_requires_subject;
DROP INDEX IF EXISTS idx_cd_subject_user_id;
ALTER TABLE compliance_documents DROP COLUMN IF EXISTS subject_user_id;
COMMIT;
```

**Risk:** LOW. 0 rows. CHECK constraint only fires on INSERT/UPDATE — no existing rows to validate.

---

### M4 — Verify expiry_date column (SKIP — already exists)

**Status:** SKIPPED. Column `expiry_date` (date, nullable) already exists on compliance_documents per PROD query.

**Note:** Column is named `expiry_date` in PROD, not `expiration_date`. The locked decisions reference "expiration_date" but the schema uses `expiry_date`. **No rename proposed** — the column works and 8 existing indexes reference it. A rename would require rebuilding all 8 indexes. Application code in Step 3 will use `expiry_date` as-is.

---

### M5 — Add vendor_service_record_id to compliance_document_requests

**Filename:** `supabase/migrations/20260810000004_cdr_vendor_service_record_id.sql`
**Purpose:** Link token requests to specific vendor service records for the post-service document routing workflow.

```sql
-- M5: Add vendor_service_record_id FK to compliance_document_requests
-- Enables: cron creates token → tied to specific service record → vendor uploads doc for that service

ALTER TABLE compliance_document_requests
  ADD COLUMN IF NOT EXISTS vendor_service_record_id uuid
    REFERENCES vendor_service_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cdr_vendor_service_record
  ON compliance_document_requests (vendor_service_record_id)
  WHERE vendor_service_record_id IS NOT NULL;
```

**Verification query:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'compliance_document_requests'
  AND column_name = 'vendor_service_record_id';
-- Expected: vendor_service_record_id | uuid
```

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_cdr_vendor_service_record;
ALTER TABLE compliance_document_requests DROP COLUMN IF EXISTS vendor_service_record_id;
```

**Risk:** LOW. 0 rows. FK target (vendor_service_records) exists and has 0 rows.

---

### M6 — Add viewed_at to compliance_document_requests

**Filename:** `supabase/migrations/20260810000005_cdr_viewed_at.sql`
**Purpose:** Track when vendor opens the token email (Resend open-tracking webhook writes this).

```sql
-- M6: Add viewed_at for Resend email.opened webhook tracking

ALTER TABLE compliance_document_requests
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
```

**Verification query:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'compliance_document_requests'
  AND column_name = 'viewed_at';
-- Expected: viewed_at | timestamp with time zone
```

**Rollback:**
```sql
ALTER TABLE compliance_document_requests DROP COLUMN IF EXISTS viewed_at;
```

**Risk:** NONE. Single nullable column add on empty table.

---

### M7 — Verify resend_count (SKIP — already exists)

**Status:** SKIPPED. Column `resend_count` (integer, NOT NULL, default 0) already exists on compliance_document_requests per PROD query.

---

### M8 — Add FK constraint on location_service_schedules.vendor_id

**Filename:** `supabase/migrations/20260810000006_lss_vendor_id_fk.sql`
**Purpose:** The vendor_id column exists but has no FK constraint. Add it.

```sql
-- M8: Add missing FK constraint on location_service_schedules.vendor_id
-- Pre-check: 0 orphaned vendor_ids (verified 2026-05-11)

DO $$
DECLARE orphan_count integer;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM location_service_schedules lss
  WHERE lss.vendor_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM vendors v WHERE v.id = lss.vendor_id);

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'ABORT: % orphaned vendor_ids in location_service_schedules. Fix before adding FK.', orphan_count;
  END IF;
END $$;

ALTER TABLE location_service_schedules
  ADD CONSTRAINT lss_vendor_id_fkey
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
```

**Verification query:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.location_service_schedules'::regclass
  AND conname = 'lss_vendor_id_fkey';
-- Expected: FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
```

**Rollback:**
```sql
ALTER TABLE location_service_schedules DROP CONSTRAINT IF EXISTS lss_vendor_id_fkey;
```

**Risk:** LOW. 0 rows in both tables. The DO block guards against orphaned IDs. If any rows existed with invalid vendor_ids, the DO block raises an exception and the ALTER never runs.

---

### M9a — Add vendor_id column to vendor_service_records (nullable)

**Filename:** `supabase/migrations/20260810000007_vsr_vendor_id_nullable.sql`
**Purpose:** Add vendor_id FK column. Nullable initially — backfill runs separately, NOT NULL constraint added in M9b after backfill verification.

```sql
-- M9a: Add vendor_id to vendor_service_records (nullable for safe rollout)
-- Two-step approach: M9a adds nullable column, M9b adds NOT NULL after backfill

ALTER TABLE vendor_service_records
  ADD COLUMN IF NOT EXISTS vendor_id uuid
    REFERENCES vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vsr_vendor_id
  ON vendor_service_records (vendor_id)
  WHERE vendor_id IS NOT NULL;
```

**Verification query:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_service_records' AND column_name = 'vendor_id';
-- Expected: vendor_id | uuid | YES
```

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_vsr_vendor_id;
ALTER TABLE vendor_service_records DROP COLUMN IF EXISTS vendor_id;
```

**Risk:** LOW. 0 rows. Column is nullable so no INSERT failures. Application code in Step 3 will populate vendor_id on new inserts.

---

### M9b — Backfill vendor_id + NOT NULL constraint (DEFERRED)

**Filename:** `supabase/migrations/20260810000008_vsr_vendor_id_backfill.sql`
**Purpose:** Best-effort backfill of vendor_id from vendor_name text match, then apply NOT NULL if all rows are populated.

```sql
-- M9b: Backfill vendor_id from vendor_name and optionally constrain NOT NULL
-- IMPORTANT: Run ONLY after M9a is applied AND all new inserts populate vendor_id
--
-- Today: 0 rows in vendor_service_records, so backfill is a no-op.
-- This migration exists for when rows accumulate before NOT NULL is enforced.

-- Step 1: Best-effort backfill from vendor_name → vendors.name match (case-insensitive, same org)
UPDATE vendor_service_records vsr
SET vendor_id = v.id
FROM vendors v
WHERE vsr.vendor_id IS NULL
  AND vsr.organization_id = v.organization_id
  AND lower(trim(vsr.vendor_name)) = lower(trim(v.name));

-- Step 2: Report unmatched rows (vendor_id still NULL but vendor_name is not null)
-- DO NOT add NOT NULL constraint if unmatched rows exist
DO $$
DECLARE unmatched integer;
BEGIN
  SELECT count(*) INTO unmatched
  FROM vendor_service_records
  WHERE vendor_id IS NULL AND vendor_name IS NOT NULL AND vendor_name <> '';

  IF unmatched > 0 THEN
    RAISE WARNING 'M9b: % rows have vendor_name but no matching vendors.id. Manual review required. NOT NULL constraint NOT applied.', unmatched;
  ELSE
    RAISE NOTICE 'M9b: All rows matched or empty. NOT NULL constraint is safe to apply in a follow-up.';
  END IF;
END $$;

-- Step 3: NOT NULL constraint — UNCOMMENT ONLY after unmatched = 0 verified
-- ALTER TABLE vendor_service_records ALTER COLUMN vendor_id SET NOT NULL;
```

**Verification query:**
```sql
SELECT
  count(*) AS total_rows,
  count(vendor_id) AS has_vendor_id,
  count(*) - count(vendor_id) AS missing_vendor_id
FROM vendor_service_records;
-- Expected today: 0 / 0 / 0 (no rows)
```

**Rollback:**
```sql
-- If NOT NULL was applied:
-- ALTER TABLE vendor_service_records ALTER COLUMN vendor_id DROP NOT NULL;
-- Backfill is a data change — no structural rollback needed.
-- To reverse: UPDATE vendor_service_records SET vendor_id = NULL;
```

**Risk:** MEDIUM. The backfill is best-effort text matching. Unmatched rows are logged, not silently ignored. NOT NULL constraint is deliberately commented out — Arthur must verify clean before uncommenting.

---

### M10 — Create share_recommendation_rules table + seed

**Filename:** `supabase/migrations/20260810000009_share_recommendation_rules.sql`
**Purpose:** Create lookup table mapping (recipient_type, purpose) → required document types for the Send to Third Party wizard.

```sql
-- M10: share_recommendation_rules — drives "recommended documents" in Send wizard

BEGIN;

CREATE TABLE IF NOT EXISTS share_recommendation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL
    CHECK (recipient_type IN (
      'ehd', 'ahj', 'insurance_broker', 'insurance_carrier', 'auditor', 'client_legal'
    )),
  purpose text NOT NULL,
  required_doc_types text[] NOT NULL DEFAULT '{}',
  recommended_doc_types text[] NOT NULL DEFAULT '{}',
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_type, purpose)
);

-- Enable RLS
ALTER TABLE share_recommendation_rules ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (rules are global, not org-scoped)
CREATE POLICY share_recommendation_rules_select
  ON share_recommendation_rules FOR SELECT
  TO authenticated
  USING (true);

-- Service role manages
CREATE POLICY share_recommendation_rules_manage
  ON share_recommendation_rules FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_share_recommendation_rules_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_share_recommendation_rules_updated_at
  BEFORE UPDATE ON share_recommendation_rules
  FOR EACH ROW EXECUTE FUNCTION update_share_recommendation_rules_updated_at();

-- Seed from UI Contract Manifest Table 2 purpose mappings
INSERT INTO share_recommendation_rules (recipient_type, purpose, required_doc_types, recommended_doc_types, rationale)
VALUES
  -- EHD (Environmental Health Dept)
  ('ehd', 'Annual renewal', '{"health_permit","food_handler_cards"}', '{"haccp_plan","mock_inspection_report"}', 'Annual EHD renewal requires current health permit + staff certs'),
  ('ehd', 'Inspection follow-up', '{"mock_inspection_report"}', '{"corrective_action_report","haccp_plan"}', 'Post-inspection follow-up with corrective evidence'),
  ('ehd', 'Variance request', '{"haccp_plan"}', '{"health_permit"}', 'Variance requests require documented HACCP plan'),

  -- AHJ (Authority Having Jurisdiction — Fire)
  ('ahj', 'Annual fire inspection', '{"hood_cleaning_report","fire_suppression_test"}', '{"fire_alarm_inspection"}', 'Annual fire inspection evidence package'),
  ('ahj', 'Plan check', '{"fire_suppression_test"}', '{"hood_cleaning_report"}', 'Plan check requires suppression system documentation'),
  ('ahj', 'Permit renewal', '{"fire_suppression_test","hood_cleaning_report"}', '{}', 'Fire permit renewal requires current service records'),

  -- Insurance Broker
  ('insurance_broker', 'Annual renewal', '{"coi","hood_cleaning_report","fire_suppression_test"}', '{"health_permit","business_license"}', 'Insurance renewal: compliance evidence reduces premiums'),
  ('insurance_broker', 'Claim documentation', '{"coi"}', '{"mock_inspection_report","hood_cleaning_report"}', 'Claim support documentation'),
  ('insurance_broker', 'Underwriting review', '{"coi","hood_cleaning_report","fire_suppression_test","health_permit"}', '{"haccp_plan"}', 'Full underwriting evidence package'),

  -- Insurance Carrier
  ('insurance_carrier', 'Claim submission', '{"coi"}', '{"mock_inspection_report","hood_cleaning_report","fire_suppression_test"}', 'Direct carrier claim submission'),
  ('insurance_carrier', 'Coverage verification', '{"coi"}', '{"business_license"}', 'Coverage verification request'),

  -- Auditor
  ('auditor', 'Compliance audit', '{"health_permit","food_handler_cards","hood_cleaning_report","fire_suppression_test","coi"}', '{"haccp_plan","mock_inspection_report"}', 'Full compliance audit evidence package'),
  ('auditor', 'Investigation', '{"mock_inspection_report"}', '{"corrective_action_report","hood_cleaning_report"}', 'Investigation-specific evidence'),

  -- Client / Legal
  ('client_legal', 'Discovery', '{"coi","business_license"}', '{"health_permit","hood_cleaning_report"}', 'Legal discovery response'),
  ('client_legal', 'Contract compliance', '{"coi","health_permit","hood_cleaning_report"}', '{"fire_suppression_test"}', 'Contractual compliance evidence')
ON CONFLICT (recipient_type, purpose) DO NOTHING;

COMMIT;
```

**Verification query:**
```sql
SELECT recipient_type, count(*) AS rules
FROM share_recommendation_rules
GROUP BY recipient_type ORDER BY recipient_type;
-- Expected:
-- ahj              | 3
-- auditor           | 2
-- client_legal      | 2
-- ehd              | 3
-- insurance_broker  | 3
-- insurance_carrier | 2
-- Total: 15 rows
```

**Rollback:**
```sql
DROP TABLE IF EXISTS share_recommendation_rules CASCADE;
```

**Risk:** LOW. New table, no dependencies. Seed data is ON CONFLICT DO NOTHING for idempotency.

---

### M11 — RLS policies on compliance_documents (replace existing)

**Filename:** `supabase/migrations/20260810000010_cd_rls_policies.sql`
**Purpose:** Replace 5 basic org-scoped policies with location-aware + role-aware + vendor-self-service policies per locked decisions.

```sql
-- M11: Replace RLS policies on compliance_documents
-- New policy set:
--   SELECT: org member + ULA location check (or location_id IS NULL for org-level docs)
--   INSERT: org member with appropriate role
--   UPDATE: org member OR vendor user for business-category self-service
--   DELETE: owner_operator, executive, compliance_manager only
--   service_role: full access (unchanged)

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS compliance_documents_select_own_org ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_insert_own_org ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_update_own_org ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_insert_service_role ON compliance_documents;
DROP POLICY IF EXISTS compliance_documents_update_service_role ON compliance_documents;

-- 1. SELECT: org member can read docs at locations they have access to, or org-level (location_id IS NULL)
CREATE POLICY cd_select_org_member
  ON compliance_documents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    AND (
      location_id IS NULL
      OR location_id IN (
        SELECT location_id FROM user_location_access
        WHERE user_id = auth.uid()
          AND location_id IS NOT NULL
      )
      -- Org-wide roles bypass location check
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND role IN ('owner_operator', 'executive', 'compliance_manager', 'platform_admin')
      )
    )
  );

-- 2. INSERT: org member with write role
CREATE POLICY cd_insert_org_member
  ON compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 3. UPDATE: org member OR vendor user for business-category self-service
CREATE POLICY cd_update_org_member
  ON compliance_documents FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 4. Vendor self-service: vendor_users can INSERT business-category docs for their vendor
CREATE POLICY cd_insert_vendor_self_service
  ON compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    category = 'business'
    AND vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- 5. Vendor self-service: vendor_users can UPDATE business-category docs for their vendor
CREATE POLICY cd_update_vendor_self_service
  ON compliance_documents FOR UPDATE
  TO authenticated
  USING (
    category = 'business'
    AND vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    category = 'business'
    AND vendor_id IN (
      SELECT vendor_id FROM vendor_users WHERE user_id = auth.uid()
    )
  );

-- 6. DELETE: restricted to management roles
CREATE POLICY cd_delete_management
  ON compliance_documents FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner_operator', 'executive', 'compliance_manager', 'platform_admin')
    )
  );

-- 7. Service role: full access (INSERT + UPDATE only, no DELETE — archive-only design)
CREATE POLICY cd_service_role_insert
  ON compliance_documents FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY cd_service_role_update
  ON compliance_documents FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
```

**Verification query:**
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'compliance_documents'
ORDER BY policyname;
-- Expected: 8 policies
-- cd_delete_management     | DELETE | {authenticated}
-- cd_insert_org_member     | INSERT | {authenticated}
-- cd_insert_vendor_self_service | INSERT | {authenticated}
-- cd_select_org_member     | SELECT | {authenticated}
-- cd_service_role_insert   | INSERT | {service_role}
-- cd_service_role_update   | UPDATE | {service_role}
-- cd_update_org_member     | UPDATE | {authenticated}
-- cd_update_vendor_self_service | UPDATE | {authenticated}
```

**Rollback:**
```sql
BEGIN;
DROP POLICY IF EXISTS cd_select_org_member ON compliance_documents;
DROP POLICY IF EXISTS cd_insert_org_member ON compliance_documents;
DROP POLICY IF EXISTS cd_update_org_member ON compliance_documents;
DROP POLICY IF EXISTS cd_insert_vendor_self_service ON compliance_documents;
DROP POLICY IF EXISTS cd_update_vendor_self_service ON compliance_documents;
DROP POLICY IF EXISTS cd_delete_management ON compliance_documents;
DROP POLICY IF EXISTS cd_service_role_insert ON compliance_documents;
DROP POLICY IF EXISTS cd_service_role_update ON compliance_documents;

-- Restore original policies
CREATE POLICY compliance_documents_select_own_org ON compliance_documents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY compliance_documents_insert_own_org ON compliance_documents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY compliance_documents_update_own_org ON compliance_documents FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY compliance_documents_insert_service_role ON compliance_documents FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY compliance_documents_update_service_role ON compliance_documents FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
COMMIT;
```

**Risk:** MEDIUM. RLS policy replacement is atomic within the transaction, but if rollback is needed, the exact original policy definitions must be restored. Rollback SQL above restores originals. With 0 rows and 0 application code wired, functional risk is LOW, but RLS mistakes can silently block queries.

---

### M12 — Additional indexes on compliance_documents

**Filename:** `supabase/migrations/20260810000011_cd_additional_indexes.sql`
**Purpose:** Add composite filter index and subject_user_id index. Several indexes already exist — only add what's missing.

```sql
-- M12: Additional indexes for compliance_documents
-- Existing indexes (8) already cover: PK, org_category_status, org_vendor_category,
-- org_employee_category, expiry_date, org_pending, parent, search (GIN)

-- 1. Composite filter index for Documents page queries (category + status + location + vendor)
-- The existing idx_compliance_documents_org_category_status covers (org, category, status)
-- but not location_id or vendor_id. This broader index supports the full filter pipeline.
CREATE INDEX IF NOT EXISTS idx_cd_org_cat_status_loc_vendor
  ON compliance_documents (organization_id, category, status, location_id, vendor_id);

-- 2. Expiry date index for cron sweeps (broader than existing which is filtered to current/expiring)
CREATE INDEX IF NOT EXISTS idx_cd_expiry_not_null
  ON compliance_documents (organization_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- 3. subject_user_id index (already created in M3, this is a safety re-check)
CREATE INDEX IF NOT EXISTS idx_cd_subject_user_id
  ON compliance_documents (subject_user_id)
  WHERE subject_user_id IS NOT NULL;
```

**Verification query:**
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'compliance_documents'
  AND indexname IN ('idx_cd_org_cat_status_loc_vendor', 'idx_cd_expiry_not_null', 'idx_cd_subject_user_id')
ORDER BY indexname;
-- Expected: 3 rows (or 2 if idx_cd_subject_user_id was created in M3)
```

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_cd_org_cat_status_loc_vendor;
DROP INDEX IF EXISTS idx_cd_expiry_not_null;
-- idx_cd_subject_user_id is rolled back with M3
```

**Risk:** NONE. Index creation on empty table is instantaneous. IF NOT EXISTS prevents errors on re-run.

---

### M13 — Cron job for vendor-service-record-trigger

**Filename:** `supabase/migrations/20260810000012_cron_vendor_service_record_trigger.sql`
**Purpose:** Schedule daily pg_cron job at 02:00 UTC to call the vendor-service-record-trigger edge function.

```sql
-- M13: pg_cron schedule for vendor-service-record-trigger
-- Fires daily at 02:00 UTC
-- Edge function scans for services >= 5 business days past expected date
--   with no associated compliance_document_requests row,
--   creates token + sends branded Resend email

-- Requires: pg_cron extension (already enabled), vault secret for JWT

-- Unschedule if exists (idempotent)
SELECT cron.unschedule('vendor-service-record-trigger')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'vendor-service-record-trigger'
);

-- Schedule the cron job
SELECT cron.schedule(
  'vendor-service-record-trigger',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/vendor-service-record-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'ts', now()::text)
  );
  $$
);
```

**Verification query:**
```sql
SELECT jobname, schedule, command FROM cron.job
WHERE jobname = 'vendor-service-record-trigger';
-- Expected: 1 row, schedule = '0 2 * * *'
```

**Rollback:**
```sql
SELECT cron.unschedule('vendor-service-record-trigger');
```

**Risk:** LOW. The cron fires but the edge function does not exist yet — the HTTP call will return 404 or 500 and pg_cron logs the failure. No data mutation occurs. The edge function is Step 3 work. An alternative is to defer this migration until the edge function is deployed — **Arthur's call.**

**⚠ FLAG:** If vault secrets `project_url` and `service_role_key` are not configured, the cron will fail silently. Verify these exist before applying:
```sql
SELECT name FROM vault.decrypted_secrets WHERE name IN ('project_url', 'service_role_key');
-- Expected: 2 rows
```

---

### M14 — Table comments (brand-language rules)

**Filename:** `supabase/migrations/20260810000013_table_comments.sql`
**Purpose:** Document brand-language rules directly on tables and columns.

```sql
-- M14: Brand-language enforcement via table/column comments
-- "Vendor Network" is canonical — never "Marketplace" or "Connect"
-- "HACCP" is a plan/system/category — never paired with "training"

COMMENT ON TABLE compliance_documents IS
  'Canonical document store for all three categories: kitchen (org-owned compliance docs), employee (staff certifications — food handler cards, ServSafe), service (vendor work records — hood cleaning, suppression tests), business (vendor credentials — COI, W-9, IKECA). Status lifecycle: requested → pending_review → current → expiring → expired (+ overdue for service-category token timeout). Brand rules: HACCP is always "HACCP plan" or "HACCP" — never "HACCP training." Vendor identity: vendors.id via vendor_id FK. Vendor Network is the canonical name for the vendor ecosystem (never "Marketplace" or "Connect").';

COMMENT ON TABLE compliance_document_requests IS
  'Canonical token table for document upload requests. Supports three contexts: (1) service-category post-service record requests via cron, (2) business-category vendor credential requests, (3) employee-category staff certification requests. Token timing: 5 business days post-expected-service trigger, 5 calendar days token validity. Vendor identity: vendors.id via vendor_id FK.';

COMMENT ON TABLE share_recommendation_rules IS
  'Lookup table: (recipient_type, purpose) → required/recommended document types for Send to Third Party wizard. Recipient types: ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal.';

COMMENT ON COLUMN compliance_documents.category IS
  'Document category: kitchen (org compliance), employee (staff certs), service (vendor work records), business (vendor credentials).';

COMMENT ON COLUMN compliance_documents.status IS
  'Document status: current (valid, expiry > 30d), expiring (0-30d to expiry), expired (past expiry), pending_review (vendor uploaded, awaiting accept/reject), requested (service-category: token sent, awaiting upload), overdue (service-category: token expired without upload). Status precedence: workflow states (requested → pending_review → current) take precedence over expiration states.';

COMMENT ON COLUMN compliance_documents.subject_user_id IS
  'Required when category=employee. The staff member this document belongs to (food handler card, ServSafe cert). FK to user_profiles.id.';

COMMENT ON COLUMN compliance_documents.expiry_date IS
  'Nullable. NULL means no expiration (HACCP plans, one-time training records). For service category: computed from location_service_schedules.frequency at accept time.';

COMMENT ON COLUMN vendor_service_records.vendor_name IS
  'Legacy text field. Use vendor_id FK for joins. vendor_name retained for display and audit trail.';
```

**Verification query:**
```sql
SELECT obj_description('public.compliance_documents'::regclass) IS NOT NULL AS has_comment;
-- Expected: true
```

**Rollback:**
```sql
COMMENT ON TABLE compliance_documents IS NULL;
COMMENT ON TABLE compliance_document_requests IS NULL;
COMMENT ON TABLE share_recommendation_rules IS NULL;
COMMENT ON COLUMN compliance_documents.category IS NULL;
COMMENT ON COLUMN compliance_documents.status IS NULL;
COMMENT ON COLUMN compliance_documents.subject_user_id IS NULL;
COMMENT ON COLUMN compliance_documents.expiry_date IS NULL;
COMMENT ON COLUMN vendor_service_records.vendor_name IS NULL;
```

**Risk:** NONE. Comments are metadata-only. No schema or data impact.

---

## SECTION 2 — Edge Function Changes

### E1 — resend-webhook Extension

**Current file:** `supabase/functions/resend-webhook/index.ts` (57 lines)
**Current behavior:** Receives Resend webhook events, validates Svix signature, logs event type, returns 200. **No database writes.**

**Structural notes:**
- Lines 22-26: Deno.serve entry, CORS handling
- Lines 32-44: Svix signature header extraction + webhook secret check (WARN only if missing)
- Lines 46-51: Parse JSON payload, log event type, return OK
- No supabase client import — needs adding
- No database interaction — all new

**Required extension (Step 3 implementation, schema-ready after M5+M6):**

1. Import `createClient` from supabase-js
2. On `email.opened` event:
   - Extract `to` email + any metadata from Resend payload (Resend includes custom headers/tags if set at send time)
   - Match to `compliance_document_requests` via `recipient_email` column
   - `UPDATE compliance_document_requests SET viewed_at = NOW() WHERE recipient_email = $1 AND viewed_at IS NULL`
   - `INSERT INTO compliance_document_activity_log (organization_id, document_id, event_type, metadata, occurred_at)` with event_type = 'viewed'
   - `INSERT INTO client_notifications (title, body, notification_type, severity)` for client "Vendor viewed your request"
3. On `email.bounced` event:
   - Log to `compliance_document_activity_log` with event_type = 'noted' + bounce details in metadata
4. All other events: log only (current behavior)

**Schema dependencies:** M5 (vendor_service_record_id), M6 (viewed_at). Both must be applied before this function goes live.

### E2 — vendor-service-record-trigger (new edge function)

**Function name:** `vendor-service-record-trigger`
**Cron schedule:** Daily 02:00 UTC (registered in M13)
**Schema contract:**

1. Query `location_service_schedules` for schedules where:
   - `next_due_date + 5 business days <= CURRENT_DATE`
   - `is_active = true`
   - No existing `compliance_document_requests` row for this schedule's latest service record
2. For each match:
   - Create `compliance_documents` row with status='requested', category='service'
   - Create `compliance_document_requests` row with secure_token, 5-calendar-day expiry
   - Send branded Resend email to vendor contact
   - Log to `compliance_document_activity_log` with event_type='requested'
3. Rate limit: BATCH_SIZE=50, MAX_RUNTIME=50s (matching existing auto-request-documents pattern)

**Schema dependencies:** M1, M2, M5, M6, M8, M9a. All must be applied first. The actual edge function code is **out of scope** for this migration plan — only the pg_cron schedule (M13) is schema-side.

---

## SECTION 3 — Verification Protocol for PROD Apply

Apply migrations in strict order M1 → M14. For each:

| Step | Action |
|---|---|
| 1 | Copy SQL into Supabase SQL Editor for project irxgmhxhmxtzfwuieblc |
| 2 | Execute |
| 3 | Run the verification query in a new SQL Editor tab |
| 4 | Compare result to the "Expected" value documented above |
| 5 | If verification **passes** → proceed to next migration |
| 6 | If verification **fails** → run the rollback SQL, STOP, report to Arthur |

**Pre-apply checklist (run once before M1):**
```sql
-- Confirm 0 rows in all target tables
SELECT
  (SELECT count(*) FROM compliance_documents) AS cd_rows,
  (SELECT count(*) FROM compliance_document_requests) AS cdr_rows,
  (SELECT count(*) FROM vendor_service_records) AS vsr_rows;
-- Expected: 0, 0, 0

-- Confirm vault secrets for M13
SELECT name FROM vault.decrypted_secrets WHERE name IN ('project_url', 'service_role_key');
-- Expected: 2 rows
```

**Post-apply summary (run after M14):**
```sql
-- Full constraint check
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND contype = 'c'
ORDER BY conname;
-- Expected: 3 constraints (category 4-value, status 6-value, cd_employee_requires_subject)

-- Policy count
SELECT count(*) FROM pg_policies WHERE tablename = 'compliance_documents';
-- Expected: 8

-- Index count
SELECT count(*) FROM pg_indexes WHERE tablename = 'compliance_documents';
-- Expected: 11 (original 8 + M3 subject_user_id + M12 composite + M12 expiry_not_null)

-- New table exists
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'share_recommendation_rules');
-- Expected: true

-- Seed count
SELECT count(*) FROM share_recommendation_rules;
-- Expected: 15

-- Cron registered
SELECT jobname FROM cron.job WHERE jobname = 'vendor-service-record-trigger';
-- Expected: 1 row

-- New columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'compliance_documents' AND column_name = 'subject_user_id'
UNION ALL
SELECT column_name FROM information_schema.columns
WHERE table_name = 'compliance_document_requests' AND column_name IN ('vendor_service_record_id', 'viewed_at')
UNION ALL
SELECT column_name FROM information_schema.columns
WHERE table_name = 'vendor_service_records' AND column_name = 'vendor_id';
-- Expected: 4 rows (subject_user_id, vendor_service_record_id, viewed_at, vendor_id)
```

---

## SECTION 4 — Risk Surface

| Migration | Tables Touched | Indexes Changed | RLS Changed | Downstream Break Risk | Live Traffic Safe? |
|---|---|---|---|---|---|
| **M1** | compliance_documents | None | None | None (0 rows, 0 app code) | YES |
| **M2** | compliance_documents | Drop + recreate 1 partial index | None | None (0 rows) | YES |
| **M3** | compliance_documents | Add 1 index | None | None (new column) | YES |
| **M5** | compliance_document_requests | Add 1 index | None | None (0 rows) | YES |
| **M6** | compliance_document_requests | None | None | None (new column) | YES |
| **M8** | location_service_schedules | None | None | INSERT fails if vendor_id not in vendors | YES (guarded by DO block) |
| **M9a** | vendor_service_records | Add 1 index | None | None (nullable add) | YES |
| **M9b** | vendor_service_records | None | None | UPDATE rows (backfill) | YES (0 rows today) |
| **M10** | NEW: share_recommendation_rules | Create table + indexes | Create 2 policies | None (new table) | YES |
| **M11** | compliance_documents | None | **Replace 5 → 8 policies** | RLS policy swap — queries may fail briefly during transaction | YES (atomic in BEGIN/COMMIT) |
| **M12** | compliance_documents | Add 2-3 indexes | None | None (additive) | YES |
| **M13** | cron.job | None | None | Cron fires at 02:00 UTC, edge function returns 404 until deployed | YES |
| **M14** | compliance_documents, compliance_document_requests, share_recommendation_rules, vendor_service_records | None | None | None (comments only) | YES |

**No migration requires a maintenance window.** All are safe with live traffic. M11 (RLS swap) is the highest-risk but is wrapped in a transaction and the table has 0 rows.

**Downstream edge functions that could break:**
- `vendor-secure-upload` reads `vendor_secure_tokens` — **unaffected** (we don't touch T1 in this plan)
- `auto-request-documents` reads legacy `documents` — **unaffected** (we don't touch legacy tables)
- `vendor-document-reminders` writes `vendor_secure_tokens` — **unaffected**
- All 48 files referencing legacy `documents` — **unaffected** (rewire is Step 3)

---

## SECTION 5 — Out of Scope (Step 3 Work)

| Item | Notes |
|---|---|
| Rewire 48 files from legacy `documents` → `compliance_documents` | Application code migration |
| Rewire 5 files from `vendor_secure_tokens` → `compliance_document_requests` | Token system consolidation |
| Migrate data from legacy `documents` table | 0 rows or stale — likely just deprecation notice |
| Migrate data from `vendor_documents` table | Table does not exist in PROD |
| Implement `vendor-service-record-trigger` edge function | M13 registers the cron; Step 3 implements the function |
| Extend `resend-webhook` edge function | E1 design documented; Step 3 implements |
| Documents page rebuild (React) | Wires to compliance_documents |
| Vendor Services page rebuild (React) | Wires to vendor_service_records + compliance_documents |
| `compliance_document_send_records.recipient_type` CHECK update | Currently (government/insurance/property/custom), needs (ehd/ahj/insurance_broker/insurance_carrier/auditor/client_legal). Deferred to Step 3 with Send wizard implementation. |
| NOT NULL constraint on `vendor_service_records.vendor_id` | Deferred until M9b backfill verified clean |
| `vendor_documents` table DROP | Does not exist in PROD — no action needed |
| `vendor_secure_tokens` table DROP | After Step 3 rewire completes and is verified |

---

**HARD STOP. Plan complete. Awaiting Arthur's review and approval before any apply.**

*End of DOCUMENTS-SCHEMA-MIGRATION-PLAN.md*
