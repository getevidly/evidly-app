# Sprint Zero — Verification Report

**Date:** 2026-05-07
**Commits:** 0.1 (`4eded36`) → 0.2 (`0341ec4`) → 0.3 (`3f3f719`) → 0.4 (`d164b8e`) → 0.5 (this commit)

---

## Schema Summary

### Tables created

| # | Table | Migration | Columns | Key constraints |
|---|-------|-----------|---------|----------------|
| 1 | `service_type_definitions` | `20260801000000` | 18 | `code` UNIQUE, self-FK `parent_code` |
| 2 | `vendor_service_records` | `20260802000000` | 35 | `event_id` UNIQUE, 3 CHECK constraints |
| 3 | `location_service_schedules` | `20260803000000` | 15 | UNIQUE `(org_id, loc_id, service_type_code)` |
| 4 | `service_reschedule_requests` | `20260803000000` | 22 | 6 CHECK constraints, partial UNIQUE on pending |

### Seed data

- `service_type_definitions`: 7 codes (KEC, FPM, GFX, RGC, FS, FA, SP)
- All other tables: 0 rows

### Dead code removed (Sprint Zero 0.1)

- 5 dead migrations deleted
- 1 dead edge function deleted (`vendor-service-token`)
- 1 dead page deleted (`VendorServiceUpdate.tsx`)
- 1 dead lib deleted
- 1 dead placeholder migration deleted (`20260719000000_service_reschedule_requests.sql`, removed in 0.4)

### Edge function updated

- `hoodops-webhook` — aligned with new schema in Sprint 0.3, logAudit fix in 0.5

---

## Test Results

### Test 1 — KEC service.completed (idempotency)

**Event:** `service.completed` with `service_type_code=KEC`, `event_id=sprint-zero-05-test-kec-001`

**First POST:**
- HTTP 200
- Response: `{"ok":true,"event":"service.completed","event_id":"sprint-zero-05-test-kec-001","next_due":"2026-07-30"}`
- Row inserted into `vendor_service_records` with `source='hoodops'`, `safeguard_type='hood_cleaning'`
- Schedule row upserted into `location_service_schedules` with `next_due_date='2026-07-30'`

**Second POST (identical payload):**
- HTTP 200
- Same response body
- `SELECT count(*) FROM vendor_service_records WHERE event_id = 'sprint-zero-05-test-kec-001'` → **1** (idempotent, no duplicate)

**Result: PASS**

#### Webhook bug found and fixed

Smoke testing surfaced a 500 Internal Server Error on all POST requests that
reached the try block. Root cause: the `logAudit` helper (lines 112-126) used
`.catch(() => {})` chained on a PostgrestBuilder thenable targeting
`platform_audit_log` — a table that does not exist in PROD. When the chain
failed, the outer catch block also called `await logAudit(...)`, producing an
uncaught exception that crashed the Deno runtime.

Fix applied in this commit: wrapped the logAudit body in a proper `try/catch`
block. The `.catch(() => {})` chain was removed. The missing audit table is
tracked as item #5 below. Note: one orphaned `vendor_service_records` row
(deterministic event_id from pre-fix debugging) was cleaned up during testing.

**Hidden side effect.** The pre-fix webhook had committed the
vendor_service_records upsert before logAudit threw. Result:
smoke testing left 1 orphaned row (event_id
`18309b08-b9a6-4031-9676-fc55504f8b9c-5b9a9960-462c-4d29-a9cd-38bbca3d157e-KEC-2026-05-07`)
that returned 500 to the caller despite committing data.
Verified cleanup removed it. The bug's pattern — upsert
succeeds, audit throws, 500 returns — meant the pre-fix
webhook would have leaked partial data on any audit failure
in production. The fix eliminates this specific failure mode.
More broadly, audit logging should not block successful event
processing; the post-fix `logAudit` with try/catch makes audit
a true side effect.

### Test 2 — FS unmapped service_type_code

**Event:** `service.completed` with `service_type_code=FS`, `event_id=sprint-zero-05-test-fs-001`

**POST:**
- HTTP 200
- Response: `{"received":true,"processed":false,"reason":"unmapped_service_type_code"}`
- `SELECT count(*) FROM vendor_service_records WHERE event_id = 'sprint-zero-05-test-fs-001'` → **0** (not persisted)

**Result: PASS**

### Cleanup

- Deleted test KEC row from `vendor_service_records` (1 row)
- Deleted test KEC row from `location_service_schedules` (1 row)
- Deleted orphaned debugging row from `vendor_service_records` (1 row)
- Final state: `vsr=0, lss=0, srr=0`

---

## Tracking Items for Sprint A

1. **db push backlog** — ~78 placeholder migrations prevent `npx supabase db push --linked`. Workaround: apply via `db query --file` + manual INSERT into `schema_migrations`. Sprint A should reconcile or squash the backlog.

2. **HOODOPS_WEBHOOK_SECRET not set** — The env var is referenced in the webhook but not set in PROD secrets. Webhook is fail-open (accepts any caller). Must be set before launch.

3. **FS integration deferred** — Fire suppression (`FS`) is unmapped in `SERVICE_CODE_TO_SAFEGUARD`. The webhook acknowledges FS events with 200 but does not persist them. Future dedicated integration required.

4. **Reschedule webhook flow untested** — `reschedule.confirmed`, `reschedule.declined`, and `reschedule.updated` event handlers exist but were not smoke-tested (no pending reschedule rows to test against). Integration test required when reschedule UI is built.

5. **Audit log infrastructure** — `platform_audit_log` and `vendor_contact_log` tables don't exist. The HoodOps webhook silently swallows audit failures. Sprint A first commit should create both tables and remove the silent-swallow fallback in `logAudit`. Required before launch — webhook events and vendor contact actions must persist audit records.
