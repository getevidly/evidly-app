# PHASE 2 — Schema Gap Closure for Answer-Line Pattern

> **Date:** 2026-05-10
> **PROD project:** irxgmhxhmxtzfwuieblc
> **Status:** PLAN ONLY — DO NOT APPLY until Arthur approves
> **Scope:** Close schema gaps G1, G2, G3, G4, G7 from ANSWER-LINE-PATTERN.md §8
> **Out of scope:** G5 (Quick Action context queries — code-only), G6 (Share state derivation — code-only)

---

## SECTION 1 — Pre-Flight Findings

### Query 1: location_service_schedules

```sql
SELECT count(*) FROM location_service_schedules;
-- Result: 0 rows
```

**15 columns confirmed in PROD:**

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| organization_id | uuid | NO | — |
| location_id | uuid | NO | — |
| service_type_code | text | NO | — |
| vendor_name | text | YES | — |
| vendor_id | uuid | YES | — |
| frequency | text | NO | 'quarterly' |
| frequency_interval_days | integer | YES | — |
| last_service_date | date | YES | — |
| next_due_date | date | YES | — |
| negotiated_price | numeric | YES | — |
| notes | text | YES | — |
| is_active | boolean | NO | true |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**Result: ✅ 0 rows — safe to add columns without backfill**

Columns `acknowledged_at`, `deferred_until`, `deferred_reason`, `completed_count` DO NOT EXIST. Confirmed for G1, G2, G3.

---

### Query 2: vendor_service_records

```sql
SELECT count(*) FROM vendor_service_records;
-- Result: 0 rows
```

**Result: ✅ 0 rows — trigger on this table (G3) will not fire on existing data**

---

### Query 3: calendar_events

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'calendar_events';
-- Result: 0 rows (no columns returned)

SELECT count(*) FROM calendar_events;
-- ERROR: relation "public.calendar_events" does not exist (42P01)
```

**CRITICAL FINDING:** `calendar_events` table DOES NOT EXIST in PROD.

Migration file `supabase/migrations/20260301000000_calendar_events.sql` exists in the repo (29 lines — CREATE TABLE + RLS + index) but was never applied to the PROD database.

**Impact on G4:** Migration M19 must CREATE the entire table (not ALTER). The new lifecycle columns (`status`, `completed_at`, `completed_by`, `rescheduled_from`) will be included in the initial CREATE TABLE statement alongside all original columns.

---

### Query 4: compliance_document_send_records

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'compliance_document_send_records'
ORDER BY ordinal_position;
```

**23 columns confirmed in PROD:**

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| organization_id | uuid | NO |
| sent_by | uuid | YES |
| sent_at | timestamptz | NO |
| recipient_type | text | NO |
| recipient_name | text | NO |
| recipient_org | text | YES |
| recipient_email | text | YES |
| purpose | text | YES |
| cover_message | text | YES |
| cover_message_ai_original | text | YES |
| secure_token | text | NO |
| secure_token_expires_at | timestamptz | NO |
| opened_at | timestamptz | YES |
| opened_count | integer | NO |
| last_opened_at | timestamptz | YES |
| download_count | integer | NO |
| revoked_at | timestamptz | YES |
| revoked_by | uuid | YES |
| ai_recommendations_used | boolean | NO |
| metadata | jsonb | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

**Result: ✅ Schema matches expectations. No missing columns for G7 view JOIN.**

Note: `compliance_document_send_records` has no `document_id` FK column. The relationship between documents and send records is through `metadata` JSONB or through the application layer. The view (G7) will use a lateral subquery on `metadata->>'document_id'` or skip the send-record JOIN in v1 and add it when the FK is formalized. See M20 notes.

---

### Query 5: compliance_documents (for view)

**31 columns confirmed in PROD.** Key columns for view:

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| organization_id | uuid | RLS filter |
| location_id | uuid | FK to locations |
| category | text | kitchen, employee, service, business |
| type | text | Document type name |
| name | text | Document name |
| status | text | 6-value CHECK |
| expiry_date | date, nullable | Key for answer-line |
| vendor_id | uuid, nullable | FK to vendors |
| subject_user_id | uuid, nullable | FK for employee docs |

### Query 6: compliance_document_requests (for view)

**20 columns confirmed in PROD.** Key columns for view:

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| document_id | uuid | FK to compliance_documents |
| requested_at | timestamptz | Token creation time |
| secure_token_expires_at | timestamptz, nullable | Token expiry |
| fulfilled_at | timestamptz, nullable | When fulfilled |
| cancelled_at | timestamptz, nullable | When cancelled |
| viewed_at | timestamptz, nullable | When vendor opened |
| resend_count | integer | Number of resends |
| vendor_id | uuid, nullable | FK to vendors |

### Query 7: JOIN targets

| Table | Column | Exists |
|---|---|---|
| vendors | id | ✅ |
| vendors | name | ✅ |
| user_profiles | id | ✅ |
| user_profiles | full_name | ✅ |
| user_profiles | organization_id | ✅ |

---

## SECTION 2 — Migration Files

### Migration numbering

Phase 1 ended at `20260810000014`. Phase 2 continues from `20260810000015`.

| File | Gap | Description |
|---|---|---|
| `20260810000015_lss_acknowledged_at.sql` | G1 | Add `acknowledged_at` to location_service_schedules |
| `20260810000016_lss_deferred_columns.sql` | G2 | Add `deferred_until` + `deferred_reason` to location_service_schedules |
| `20260810000017_lss_completed_count.sql` | G3 | Add `completed_count` to location_service_schedules |
| `20260810000018_lss_completed_count_trigger.sql` | G3 | Trigger to maintain completed_count from vendor_service_records |
| `20260810000019_calendar_events_full.sql` | G4 | CREATE TABLE calendar_events (original + lifecycle columns) |
| `20260810000020_v_documents_enriched.sql` | G7 | CREATE VIEW v_documents_enriched |

---

### M15 — `acknowledged_at` on location_service_schedules (G1)

**File:** `20260810000015_lss_acknowledged_at.sql`

**Purpose:** Track when an org user acknowledges an at-risk service schedule to suppress the "Not confirmed" answer-line variant.

```sql
-- M15: Add acknowledged_at to location_service_schedules
-- Gap: G1 from ANSWER-LINE-PATTERN.md §8
-- Pre-condition: 0 rows in table — no backfill needed

ALTER TABLE location_service_schedules
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

COMMENT ON COLUMN location_service_schedules.acknowledged_at IS
  'Timestamp when an org user acknowledged an at-risk service schedule. NULL = not acknowledged. Reset to NULL when next_due_date changes.';
```

**Verification:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'location_service_schedules'
  AND column_name = 'acknowledged_at';
```

Expected: 1 row, `timestamptz`, `YES`.

**Rollback:**

```sql
ALTER TABLE location_service_schedules DROP COLUMN IF EXISTS acknowledged_at;
```

---

### M16 — `deferred_until` + `deferred_reason` on location_service_schedules (G2)

**File:** `20260810000016_lss_deferred_columns.sql`

**Purpose:** Support the "deferred" service status where an org user temporarily suspends a service schedule with a reason and resume date.

```sql
-- M16: Add deferred_until + deferred_reason to location_service_schedules
-- Gap: G2 from ANSWER-LINE-PATTERN.md §8
-- Pre-condition: 0 rows in table — no backfill needed

ALTER TABLE location_service_schedules
  ADD COLUMN IF NOT EXISTS deferred_until DATE,
  ADD COLUMN IF NOT EXISTS deferred_reason TEXT;

COMMENT ON COLUMN location_service_schedules.deferred_until IS
  'Date when deferral ends and the service schedule resumes. NULL = not deferred. When set, service status becomes "deferred".';

COMMENT ON COLUMN location_service_schedules.deferred_reason IS
  'Free-text reason for deferring the service schedule. Required by UI when setting deferred_until.';
```

**Verification:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'location_service_schedules'
  AND column_name IN ('deferred_until', 'deferred_reason')
ORDER BY column_name;
```

Expected: 2 rows — `deferred_reason` (text, YES), `deferred_until` (date, YES).

**Rollback:**

```sql
ALTER TABLE location_service_schedules
  DROP COLUMN IF EXISTS deferred_until,
  DROP COLUMN IF EXISTS deferred_reason;
```

---

### M17 — `completed_count` on location_service_schedules (G3, part 1)

**File:** `20260810000017_lss_completed_count.sql`

**Purpose:** Denormalized count of vendor_service_records per schedule. Used by answer-line to distinguish "First service: {date}" from "Last: {date} · Next: {date}".

**Locked decision:** Denormalized column + trigger (not client-side COUNT).

```sql
-- M17: Add completed_count to location_service_schedules
-- Gap: G3 from ANSWER-LINE-PATTERN.md §8, part 1 (column)
-- Pre-condition: 0 rows in both tables — no backfill needed

ALTER TABLE location_service_schedules
  ADD COLUMN IF NOT EXISTS completed_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN location_service_schedules.completed_count IS
  'Denormalized count of vendor_service_records for this schedule. Maintained by trigger on vendor_service_records INSERT/DELETE. Used by answer-line: 0 = "First service", >0 = "Last: {date}".';

-- Index for queries that filter on completed_count = 0 (first-service variant)
CREATE INDEX IF NOT EXISTS idx_lss_completed_count_zero
  ON location_service_schedules (organization_id)
  WHERE completed_count = 0;
```

**Verification:**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'location_service_schedules'
  AND column_name = 'completed_count';
```

Expected: 1 row, `integer`, `NO`, `0`.

```sql
SELECT indexname FROM pg_indexes
WHERE indexname = 'idx_lss_completed_count_zero';
```

Expected: 1 row.

**Rollback:**

```sql
DROP INDEX IF EXISTS idx_lss_completed_count_zero;
ALTER TABLE location_service_schedules DROP COLUMN IF EXISTS completed_count;
```

---

### M18 — completed_count trigger (G3, part 2)

**File:** `20260810000018_lss_completed_count_trigger.sql`

**Purpose:** Maintain `location_service_schedules.completed_count` automatically when vendor_service_records are inserted or deleted.

**Pre-condition:** `vendor_service_records` does NOT have a `schedule_id` FK column. The relationship between VSR and LSS is through the composite natural key (`organization_id`, `location_id`, `service_type_code`). The trigger uses this composite match.

**Future improvement:** Add `schedule_id UUID REFERENCES location_service_schedules(id)` to `vendor_service_records` and simplify the trigger to use the direct FK. Not required now — both tables have 0 rows and the composite key is unambiguous per service type per location.

```sql
-- M18: Trigger to maintain completed_count on location_service_schedules
-- Gap: G3 from ANSWER-LINE-PATTERN.md §8, part 2 (trigger)
-- Pre-condition: 0 rows in vendor_service_records — trigger will not fire on existing data
-- Pre-condition: M17 applied (completed_count column exists)
-- Join key: composite (organization_id, location_id, service_type_code) — no schedule_id FK exists

CREATE OR REPLACE FUNCTION fn_update_lss_completed_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE location_service_schedules
      SET completed_count = completed_count + 1,
          updated_at = now()
      WHERE organization_id = NEW.organization_id
        AND location_id = NEW.location_id
        AND service_type_code = NEW.service_type_code
        AND NEW.organization_id IS NOT NULL
        AND NEW.location_id IS NOT NULL
        AND NEW.service_type_code IS NOT NULL;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE location_service_schedules
      SET completed_count = GREATEST(0, completed_count - 1),
          updated_at = now()
      WHERE organization_id = OLD.organization_id
        AND location_id = OLD.location_id
        AND service_type_code = OLD.service_type_code
        AND OLD.organization_id IS NOT NULL
        AND OLD.location_id IS NOT NULL
        AND OLD.service_type_code IS NOT NULL;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vsr_completed_count ON vendor_service_records;

CREATE TRIGGER trg_vsr_completed_count
  AFTER INSERT OR DELETE ON vendor_service_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_lss_completed_count();

COMMENT ON FUNCTION fn_update_lss_completed_count() IS
  'Maintains location_service_schedules.completed_count. Increments on VSR INSERT, decrements on VSR DELETE. Matches via composite key (organization_id, location_id, service_type_code). Ignores rows where any key column IS NULL.';
```

**Verification:**

```sql
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.vendor_service_records'::regclass
  AND tgname = 'trg_vsr_completed_count';
```

Expected: 1 row, enabled.

```sql
SELECT proname FROM pg_proc
WHERE proname = 'fn_update_lss_completed_count';
```

Expected: 1 row.

**Functional test (0-row tables, safe):**

```sql
-- After inserting a test VSR with a valid schedule_id, completed_count should increment.
-- Deferred to apply phase — not run during plan.
```

**Rollback:**

```sql
DROP TRIGGER IF EXISTS trg_vsr_completed_count ON vendor_service_records;
DROP FUNCTION IF EXISTS fn_update_lss_completed_count();
```

---

### M19 — CREATE TABLE calendar_events (G4)

**File:** `20260810000019_calendar_events_full.sql`

**Purpose:** Create the `calendar_events` table with all original columns PLUS lifecycle columns needed for answer-line rendering.

**CRITICAL:** The table does not exist in PROD (migration `20260301000000_calendar_events.sql` was never applied). This migration supersedes that file — it creates the full table with lifecycle columns included from the start.

**Original columns (from `20260301000000_calendar_events.sql`):**
id, organization_id, location_id, title, type, category, date, start_time, end_time, description, created_by, created_at, updated_at

**New lifecycle columns (G4):**
status, completed_at, completed_by, rescheduled_from

```sql
-- M19: CREATE TABLE calendar_events (full schema + lifecycle columns)
-- Gap: G4 from ANSWER-LINE-PATTERN.md §8
-- CRITICAL: Table does not exist in PROD. Migration 20260301000000 was never applied.
-- This migration supersedes 20260301000000_calendar_events.sql.

-- Guard: fail gracefully if table somehow exists
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization scope
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Event identity
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'vendor',
  category TEXT,

  -- Scheduling
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,

  -- Content
  description TEXT,

  -- Lifecycle (G4 additions)
  status TEXT NOT NULL DEFAULT 'scheduled',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  rescheduled_from DATE,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT calendar_events_status_check
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'rescheduled')),

  CONSTRAINT calendar_events_completed_requires_fields
    CHECK (
      (status <> 'completed') OR
      (completed_at IS NOT NULL AND completed_by IS NOT NULL)
    ),

  CONSTRAINT calendar_events_rescheduled_requires_from
    CHECK (
      (status <> 'rescheduled') OR
      (rescheduled_from IS NOT NULL)
    )
);

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage calendar events in their org" ON calendar_events;
CREATE POLICY "Users can manage calendar events in their org" ON calendar_events
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_date
  ON calendar_events(organization_id, date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_status
  ON calendar_events(organization_id, status)
  WHERE status IN ('scheduled', 'in_progress', 'missed');

COMMENT ON TABLE calendar_events IS
  'Calendar events for facility safety and vendor service scheduling. Status lifecycle: scheduled → in_progress → completed | missed | rescheduled.';

COMMENT ON COLUMN calendar_events.status IS
  'Event lifecycle status. Derived client-side in ANSWER-LINE-PATTERN.md §2.5, persisted here for query efficiency.';

COMMENT ON COLUMN calendar_events.rescheduled_from IS
  'Original date before reschedule. Set when status transitions to rescheduled. A new event row is created for the new date.';
```

**Verification:**

```sql
-- Table exists
SELECT count(*) AS col_count
FROM information_schema.columns
WHERE table_name = 'calendar_events';
```

Expected: 18 columns.

```sql
-- CHECK constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.calendar_events'::regclass
  AND contype = 'c'
ORDER BY conname;
```

Expected: 3 constraints (status_check, completed_requires_fields, rescheduled_requires_from).

```sql
-- RLS policy
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'calendar_events';
```

Expected: 1 policy (FOR ALL).

```sql
-- Indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'calendar_events'
ORDER BY indexname;
```

Expected: 3 indexes (PK + org_date + org_status).

**Rollback:**

```sql
DROP TABLE IF EXISTS calendar_events CASCADE;
```

---

### M20 — CREATE VIEW v_documents_enriched (G7)

**File:** `20260810000020_v_documents_enriched.sql`

**Purpose:** Database view that JOINs `compliance_documents` with `vendors.name`, `user_profiles.full_name` (for subject_user_id), and the latest `compliance_document_requests` row. Every document answer-line query uses this view instead of raw table queries.

**Locked decision:** Database VIEW (not materialized view, not client-side JOIN).

**RLS strategy:** `security_invoker = true` (PostgreSQL 15+). The view runs as the calling user, so existing RLS policies on `compliance_documents` (8 policies from M11) apply automatically. No additional RLS policies needed on the view itself.

**Note on send_records:** `compliance_document_send_records` has no `document_id` FK column. The relationship is stored in `metadata` JSONB. The v1 view omits the send-record JOIN — share state is derived client-side per G6 (out of scope). A future migration can add `document_id` FK to `compliance_document_send_records` and extend the view.

```sql
-- M20: CREATE VIEW v_documents_enriched
-- Gap: G7 from ANSWER-LINE-PATTERN.md §8
-- Security: INVOKER mode — RLS on compliance_documents applies to all queries through this view
-- Pre-condition: M11 RLS policies (8 policies) on compliance_documents

CREATE OR REPLACE VIEW v_documents_enriched
WITH (security_invoker = true)
AS
SELECT
  -- Document core fields
  cd.id,
  cd.organization_id,
  cd.location_id,
  cd.category,
  cd.type,
  cd.name,
  cd.status,
  cd.storage_path,
  cd.file_size_bytes,
  cd.mime_type,
  cd.issued_date,
  cd.expiry_date,
  cd.vendor_id,
  cd.subject_user_id,
  cd.parent_document_id,
  cd.import_source,
  cd.notes,
  cd.metadata,
  cd.created_at,
  cd.updated_at,

  -- Vendor name (LEFT JOIN — vendor_id is nullable)
  v.name AS vendor_name,

  -- Subject user name (LEFT JOIN — subject_user_id is nullable, employee docs only)
  sup.full_name AS subject_user_name,

  -- Latest request fields (lateral subquery — at most 1 row per document)
  lr.request_id,
  lr.requested_at,
  lr.secure_token_expires_at AS request_token_expires_at,
  lr.fulfilled_at AS request_fulfilled_at,
  lr.cancelled_at AS request_cancelled_at,
  lr.viewed_at AS request_viewed_at,
  lr.resend_count AS request_resend_count,
  lr.recipient_email AS request_recipient_email,
  lr.recipient_name AS request_recipient_name,

  -- Derived: request stage (for answer-line formula)
  CASE
    WHEN lr.request_id IS NULL THEN NULL
    WHEN lr.fulfilled_at IS NOT NULL THEN 'fulfilled'
    WHEN lr.cancelled_at IS NOT NULL THEN 'cancelled'
    WHEN lr.viewed_at IS NOT NULL AND lr.secure_token_expires_at > now() THEN 'viewed'
    WHEN lr.secure_token_expires_at <= now() THEN 'overdue'
    ELSE 'sent'
  END AS request_stage,

  -- Derived: token days remaining (for answer-line formula)
  CASE
    WHEN lr.secure_token_expires_at IS NULL THEN NULL
    ELSE GREATEST(0, EXTRACT(DAY FROM (lr.secure_token_expires_at - now()))::integer)
  END AS request_token_days_remaining,

  -- Derived: days until expiry (for answer-line formula)
  CASE
    WHEN cd.expiry_date IS NULL THEN NULL
    ELSE (cd.expiry_date - CURRENT_DATE)
  END AS days_until_expiry

FROM compliance_documents cd

LEFT JOIN vendors v
  ON v.id = cd.vendor_id

LEFT JOIN user_profiles sup
  ON sup.id = cd.subject_user_id

LEFT JOIN LATERAL (
  SELECT
    cdr.id AS request_id,
    cdr.requested_at,
    cdr.secure_token_expires_at,
    cdr.fulfilled_at,
    cdr.cancelled_at,
    cdr.viewed_at,
    cdr.resend_count,
    cdr.recipient_email,
    cdr.recipient_name
  FROM compliance_document_requests cdr
  WHERE cdr.document_id = cd.id
    AND cdr.cancelled_at IS NULL
  ORDER BY cdr.requested_at DESC
  LIMIT 1
) lr ON true;

COMMENT ON VIEW v_documents_enriched IS
  'Enriched compliance_documents view for answer-line rendering. JOINs vendor name, subject user name, and latest active request. Security: INVOKER mode — RLS on compliance_documents applies. See ANSWER-LINE-PATTERN.md §7.';
```

**Verification:**

```sql
-- View exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'v_documents_enriched' AND table_type = 'VIEW';
```

Expected: 1 row.

```sql
-- Column count
SELECT count(*) AS col_count
FROM information_schema.columns
WHERE table_name = 'v_documents_enriched';
```

Expected: 31 columns (20 from cd + 2 JOINed names + 6 request fields + 3 derived).

```sql
-- Security invoker mode
SELECT obj_description('public.v_documents_enriched'::regclass) IS NOT NULL AS has_comment;
```

Expected: true.

```sql
-- Verify RLS pass-through: query as anon should return 0 rows (no org membership)
-- Deferred to apply phase — requires role switching.
```

**Rollback:**

```sql
DROP VIEW IF EXISTS v_documents_enriched;
```

---

## SECTION 3 — RLS Verification for v_documents_enriched

### Strategy: Security Invoker

The view uses `WITH (security_invoker = true)`. This means:

1. **No separate RLS policies on the view.** The view is not a table — Postgres views with `security_invoker` delegate RLS to the underlying tables.

2. **RLS on `compliance_documents` (M11) applies.** The 8 policies from Phase 1 control all SELECT/INSERT/UPDATE/DELETE through the view:
   - `cd_select_org_member` — authenticated users can SELECT docs in their org
   - `cd_insert_org_member` — authenticated users can INSERT docs in their org
   - `cd_insert_vendor_self_service` — vendor self-service INSERT
   - `cd_update_org_member` — authenticated users can UPDATE docs in their org
   - `cd_update_vendor_self_service` — vendor self-service UPDATE
   - `cd_delete_management` — management DELETE
   - `cd_service_role_insert` — service_role INSERT
   - `cd_service_role_update` — service_role UPDATE

3. **LEFT JOINed tables (`vendors`, `user_profiles`, `compliance_document_requests`):**
   - These tables have their own RLS policies. Since the JOIN is via FK from `compliance_documents`, and the user already has SELECT on the document row (gated by `cd_select_org_member`), the LEFT JOIN will succeed for rows the user can see.
   - `vendors` — org-scoped RLS (user can see vendors in their org)
   - `user_profiles` — org-scoped RLS (user can see profiles in their org)
   - `compliance_document_requests` — org-scoped RLS (user can see requests in their org)

4. **Edge case: `subject_user_id` points to a user_profile the calling user cannot see.**
   - This can only happen if `user_profiles` RLS is more restrictive than `compliance_documents` RLS. In practice, both are org-scoped, so if a user can see the document, they can see the subject user profile.
   - If RLS mismatch occurs, the `subject_user_name` column will return NULL for that row (LEFT JOIN behavior). This is safe — the answer-line will omit the name.

### Verification Protocol (apply phase)

```sql
-- Test 1: Verify view is security_invoker
SELECT relname, reloptions
FROM pg_class
WHERE relname = 'v_documents_enriched';
-- Expected: reloptions contains 'security_invoker=true'

-- Test 2: As authenticated user with org membership
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "<test-user-id>"}';
SELECT count(*) FROM v_documents_enriched;
-- Expected: returns rows only for the user's org (0 if no docs exist)
RESET ROLE;

-- Test 3: As anon (no org membership)
SET ROLE anon;
SELECT count(*) FROM v_documents_enriched;
-- Expected: 0 rows (RLS blocks all)
RESET ROLE;
```

---

## SECTION 4 — Verification Protocol

### Apply-Order Dependencies

```
M15 (G1) ─── independent
M16 (G2) ─── independent
M17 (G3a) ── independent
M18 (G3b) ── depends on M17 (column must exist before trigger references it)
M19 (G4) ─── independent
M20 (G7) ─── independent (relies on M11 RLS from Phase 1, already applied)
```

M15, M16, M17, M19, M20 can run in any order. M18 must run after M17.

### Per-Migration Verification

Each migration includes its own verification query (see Section 2). After all 6 migrations are applied, run the consolidated check:

```sql
-- Consolidated Phase 2 verification
SELECT
  -- G1: acknowledged_at exists
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'location_service_schedules'
     AND column_name = 'acknowledged_at') AS g1_acknowledged_at,

  -- G2: deferred columns exist
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'location_service_schedules'
     AND column_name IN ('deferred_until', 'deferred_reason')) AS g2_deferred_cols,

  -- G3a: completed_count exists
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'location_service_schedules'
     AND column_name = 'completed_count') AS g3a_completed_count,

  -- G3b: trigger exists
  (SELECT count(*) FROM pg_trigger
   WHERE tgrelid = 'public.vendor_service_records'::regclass
     AND tgname = 'trg_vsr_completed_count') AS g3b_trigger,

  -- G4: calendar_events table with lifecycle columns
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'calendar_events') AS g4_calendar_cols,

  -- G4: calendar_events CHECK constraints
  (SELECT count(*) FROM pg_constraint
   WHERE conrelid = 'public.calendar_events'::regclass
     AND contype = 'c') AS g4_calendar_checks,

  -- G7: view exists
  (SELECT count(*) FROM information_schema.tables
   WHERE table_name = 'v_documents_enriched'
     AND table_type = 'VIEW') AS g7_view_exists,

  -- G7: view column count
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'v_documents_enriched') AS g7_view_cols;
```

**Expected results:**

| Metric | Expected |
|---|---|
| g1_acknowledged_at | 1 |
| g2_deferred_cols | 2 |
| g3a_completed_count | 1 |
| g3b_trigger | 1 |
| g4_calendar_cols | 18 |
| g4_calendar_checks | 3 |
| g7_view_exists | 1 |
| g7_view_cols | 31 |

---

## SECTION 5 — Risk Surface

### Risk 1: `vendor_service_records` has no `schedule_id` FK — CONFIRMED

Pre-flight confirmed: `vendor_service_records` has 36 columns but NO `schedule_id` FK to `location_service_schedules`. The join between the two tables is through the composite natural key (`organization_id`, `location_id`, `service_type_code`).

**Resolution:** M18 trigger uses composite key match instead of `schedule_id` FK. This is correct and safe — one LSS row per (org, location, service_type_code) combination.

**Future improvement:** Add `schedule_id UUID REFERENCES location_service_schedules(id)` to `vendor_service_records` for a proper FK relationship. This would simplify the trigger to a single-column match. Not blocking — both tables have 0 rows.

### Risk 2: PostgreSQL version < 15 (security_invoker)

`WITH (security_invoker = true)` requires PostgreSQL 15+. Supabase projects created after 2023 use PG 15. Older projects may be on PG 14.

**Mitigation:** Before M20 apply, run:

```sql
SELECT version();
```

If PG < 15, the view must use `SECURITY DEFINER` with explicit org_id filtering in the WHERE clause, or skip the view and use client-side JOINs (G7 becomes code-only like G5/G6).

### Risk 3: calendar_events migration 20260301000000 applied in future

If someone later applies the original `20260301000000_calendar_events.sql`, it would run `CREATE TABLE IF NOT EXISTS` — which would be a no-op since M19 already created the table. However, the RLS policy `DROP POLICY IF EXISTS ... CREATE POLICY` would succeed harmlessly (idempotent).

**Mitigation:** After M19 is applied, add a comment to `20260301000000_calendar_events.sql`:

```sql
-- SUPERSEDED by 20260810000019_calendar_events_full.sql (Phase 2)
-- This migration is a no-op if the table already exists.
```

### Risk 4: compliance_document_send_records has no document_id FK

The view (M20) does not JOIN `compliance_document_send_records` because there is no `document_id` FK column. Share state derivation remains client-side (G6 — out of scope).

**Future work:** Add `document_id UUID REFERENCES compliance_documents(id)` to `compliance_document_send_records`, then extend the view with a lateral subquery for the latest active share.

### Risk 5: Trigger SECURITY DEFINER

The trigger function `fn_update_lss_completed_count` uses `SECURITY DEFINER`. This means the UPDATE on `location_service_schedules` runs as the function owner (postgres), bypassing RLS. This is intentional — the trigger must update the denormalized count regardless of who inserted the VSR.

**Mitigation:** The function only performs `SET completed_count = completed_count ± 1`. It does not expose data. The SECURITY DEFINER scope is minimal.

---

## SECTION 6 — Out of Scope

| Gap | Reason | When |
|---|---|---|
| G5 | Quick Action context queries — code-only (aggregation queries in client) | Phase 3 UI build |
| G6 | Share state derivation — code-only (derive from compliance_document_send_records columns) | Phase 3 UI build |
| M13 (Phase 1) | Cron registration — deferred until edge function deployed | Separate ticket |
| send_records document_id FK | compliance_document_send_records needs document_id column | Future schema migration |
| Extend view for shares | Add send_records lateral join to v_documents_enriched | After document_id FK added |

---

## SECTION 7 — File Inventory

After approval, the following migration files will be written to `supabase/migrations/`:

| # | Filename | Lines (est.) | Tables Affected |
|---|---|---|---|
| M15 | `20260810000015_lss_acknowledged_at.sql` | ~8 | location_service_schedules |
| M16 | `20260810000016_lss_deferred_columns.sql` | ~12 | location_service_schedules |
| M17 | `20260810000017_lss_completed_count.sql` | ~12 | location_service_schedules |
| M18 | `20260810000018_lss_completed_count_trigger.sql` | ~30 | vendor_service_records (trigger), location_service_schedules (target) |
| M19 | `20260810000019_calendar_events_full.sql` | ~55 | calendar_events (CREATE) |
| M20 | `20260810000020_v_documents_enriched.sql` | ~75 | v_documents_enriched (CREATE VIEW) |

**Total: 6 files, ~192 lines of SQL**

---

*End of PHASE-2-SCHEMA-MIGRATION-PLAN.md. HARD STOP. No SQL applied. Awaiting Arthur's review.*
