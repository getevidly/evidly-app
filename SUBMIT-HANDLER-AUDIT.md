# MODAL SUBMIT HANDLER INTEGRITY AUDIT — PHASE 1 REPORT

**Date:** 2026-04-21
**Auditor:** Claude Code (READ-ONLY — no files modified)
**Scope:** Every modal/form that writes to Supabase

---

## 1. EXECUTIVE SUMMARY

| Severity | Count |
|----------|-------|
| CRITICAL | 15    |
| HIGH     | 18    |
| MEDIUM   | 21    |
| LOW      | 3     |
| **Total** | **57** |

**42 write-bearing components audited.** 15 modal components + 27 page/hook
write handlers examined. 57 findings across 5 failure modes.

The two known bugs (TempLogs cross-org read — fixed; IncidentLog fake
TEAM_MEMBERS — unfixed) are confirmed. **Ten additional CRITICAL findings**
were discovered:

1. **VoiceButton.jsx** writes `org_id` instead of `organization_id` to two
   tables — rows are created with NULL org, invisible to org-scoped queries.
2. **IncidentLog.tsx** writes `reported_by: 'Current User'` and
   `performed_by: 'Current User'` (literal strings) to Supabase rows.
3. **IncidentLog.tsx** writes `assigned_to: <random TEAM_MEMBERS pick>` to
   the `incidents` table in production mode.
4. **AddCertificationModal.tsx** — Both INSERT and UPDATE on
   `employee_certifications` completely lack `organization_id`.
5. **LogServiceModal.jsx** — The `location_service_schedules` upsert is
   missing `organization_id` in the payload.
6. **Calendar.tsx** — UPDATE on `calendar_events` filtered only by `id`,
   no `organization_id` in WHERE clause. **Cross-org write vulnerability.**
7. **Calendar.tsx** — DELETE on `calendar_events` filtered only by `id`,
   no `organization_id` filter AND no org guard. **Cross-org delete vulnerability.**
8. **HACCP.tsx** — UPDATE on `haccp_plans` filtered only by `id`,
   no `organization_id` in WHERE clause. **Cross-org write vulnerability.**
9. **HACCP.tsx** — UPDATE on `haccp_corrective_actions` filtered only by `id`,
   no `organization_id` in WHERE clause. **Cross-org write vulnerability.**
10. **SelfAudit.tsx** — `buildDemoSections()` called unconditionally for ALL
    users in `startAudit()`. Production users get pre-filled fake failures
    that are persisted to `self_inspection_sessions` on audit completion.
11. **TempLogs.tsx** — Batch insert sets `facility_id` to `organization_id`
    (FK violation) — batch temp logging always fails in production.
12. **TempLogs.tsx** — Cooldown persistence writes 10 non-existent columns
    to `cooldown_temp_checks`, missing required `cooldown_log_id` — always fails.
13. **TempLogs.tsx** — `fetchHistory()` filters on non-existent
    `organization_id` column (`temperature_logs` uses `facility_id`) —
    history tab broken in production.

---

## 2. CRITICAL FINDINGS

### C-1: IncidentLog — Fake assignee written to Supabase
- **File:** `src/pages/IncidentLog.tsx:707,722`
- **Table:** `incidents`
- **What:** `handleCreateIncident()` picks a random name from module-scoped
  `TEAM_MEMBERS` (`['Sarah Chen', 'Maria Garcia', ...]`) and writes it as
  `assigned_to` in the Supabase INSERT on line 722. This executes in the
  `!isDemoMode` branch (line 712), so production incidents get fake assignees.
- **Fix direction:** Replace `TEAM_MEMBERS` random pick with actual user
  selection (dropdown of real team members from `user_profiles`), or set
  `assigned_to: null` and let user assign manually.

### C-2: IncidentLog — 'Current User' literal in Supabase writes
- **File:** `src/pages/IncidentLog.tsx:723,738,800,845`
- **Tables:** `incidents` (`reported_by`), `incident_timeline` (`performed_by`)
- **What:** Four Supabase writes use the hardcoded string `'Current User'`
  instead of `profile?.full_name` or `user?.email`. This is written to
  production rows, making the audit trail useless.
- **Fix direction:** Replace `'Current User'` with `profile?.full_name ||
  user?.email || 'Unknown'`.

### C-3: VoiceButton — Wrong column name `org_id` instead of `organization_id`
- **File:** `src/components/voice/VoiceButton.jsx:52,88`
- **Tables:** `temperature_logs`, `corrective_actions`
- **What:** Writes `org_id: orgId` to both tables. If these tables use the
  column `organization_id` (as most tables in the schema do), the row is
  created with `organization_id = NULL`. The row exists but is invisible to
  all org-scoped queries and potentially visible to cross-org reads.
- **Blast radius:** Every voice-logged temp reading and voice-created CA
  since this component shipped.
- **Fix direction:** Change `org_id` → `organization_id` in both INSERT
  payloads. Audit existing rows for NULL `organization_id` and backfill.

### C-4: IncidentLog — TEAM_MEMBERS array in assignee filter (prod path)
- **File:** `src/pages/IncidentLog.tsx:1731`
- **What:** The assignee filter dropdown always renders fake `TEAM_MEMBERS`
  names, including for production users. While this doesn't corrupt data
  (filtering only), it means production users see "Sarah Chen" etc. as
  assignee options, and if they create incidents, the random assignment from
  C-1 writes these names.
- **Fix direction:** In prod mode, populate from `user_profiles` query
  scoped to org. In demo mode, keep fake names.

### C-5: IncidentLog — Reassign writes fake name to Supabase
- **File:** `src/pages/IncidentLog.tsx:880-910`
- **Tables:** `incidents` (`assigned_to`), `incident_timeline`
- **What:** The reassign/escalate handlers (handleVerify, handleEscalate)
  update `assigned_to` using names from the same `TEAM_MEMBERS` array
  (selected from dropdown at line 1731). In production, a user would pick
  from these fake names and the selected fake name is written to Supabase.
- **Fix direction:** Same as C-1/C-4 — real team members from DB.

### C-6: AddCertificationModal — Missing organization_id on INSERT and UPDATE
- **File:** `src/components/training/AddCertificationModal.tsx:119,125`
- **Table:** `employee_certifications`
- **What:** Both the INSERT (line 125) and UPDATE (line 119) payloads
  contain `user_id`, `certification_name`, `issue_date`, `expiration_date`,
  `status`, `file_url`, `notes` — but NO `organization_id`. The update is
  scoped only by `.eq('id', existingCert.id)` with no org check. If the
  table requires `organization_id`, inserts fail silently. If it doesn't
  require it, records are unscoped to any org — a multi-tenancy gap.
- **Fix direction:** Add `organization_id: profile?.organization_id` to
  both INSERT and UPDATE payloads. Add org guard before write.

### C-7: Calendar — UPDATE on calendar_events missing organization_id filter
- **File:** `src/pages/Calendar.tsx:497-510`
- **Table:** `calendar_events`
- **What:** The update is filtered only by `.eq('id', editingEvent.id)`.
  There is NO `.eq('organization_id', orgId)` in the WHERE clause. While
  `orgId` is checked for truthiness at line 492-493 (early return if falsy),
  it is never added to the update filter. If a user manipulates
  `editingEvent.id` client-side, they could update a row belonging to a
  different organization. **Cross-org write vulnerability.**
- **Fix direction:** Add `.eq('organization_id', orgId)` to the update chain.

### C-8: Calendar — DELETE on calendar_events missing organization_id filter AND guard
- **File:** `src/pages/Calendar.tsx:609-612`
- **Table:** `calendar_events`
- **What:** The delete is filtered only by `.eq('id', selectedEvent.id)`.
  There is NO `.eq('organization_id', orgId)` filter. Furthermore, unlike
  the save handler, the delete handler has **no `organization_id` guard at
  all** — it does not check that `profile?.organization_id` is truthy before
  executing the Supabase delete. A user could delete any organization's
  event by ID. **Cross-org delete vulnerability.**
- **Fix direction:** Add `if (!profile?.organization_id) return;` guard and
  `.eq('organization_id', orgId)` to the delete chain.

### C-9: LogServiceModal — location_service_schedules upsert missing organization_id
- **File:** `src/components/services/LogServiceModal.jsx:115`
- **Table:** `location_service_schedules`
- **What:** The upsert payload at line 115 includes `location_id`,
  `service_type_code`, `last_service_date`, `next_due_date`, `last_price`,
  `frequency` — but NO `organization_id`. If the table has an
  `organization_id` column for RLS enforcement, it is not being set.
  Additionally, the upsert result is not error-checked (no `if (error)`),
  so failures are silently swallowed.
- **Fix direction:** Add `organization_id: orgId` to the upsert payload.
  Check the error result.

### C-10: HACCP — UPDATE on haccp_plans missing organization_id filter
- **File:** `src/pages/HACCP.tsx:965`
- **Table:** `haccp_plans`
- **What:** `handleMarkReviewed()` calls
  `.update({ last_reviewed: ..., status: 'active' }).eq('id', planId)` with
  NO `.eq('organization_id', orgId)` in the WHERE clause. The `isDemoMode`
  check (line 958) gates the branch, but there is no `organization_id` guard
  before the write. Any authenticated user could mark another org's HACCP
  plan as reviewed by supplying a known plan ID. Additionally, the `.then()`
  has no `.catch()` — errors are silently swallowed.
  **Cross-org write vulnerability.**
- **Fix direction:** Add `.eq('organization_id', profile?.organization_id)`
  to the update chain. Add org guard and error handling.

### C-11: HACCP — UPDATE on haccp_corrective_actions missing organization_id filter
- **File:** `src/pages/HACCP.tsx:980-984`
- **Table:** `haccp_corrective_actions`
- **What:** `handleVerifyAction()` calls
  `.update({ verified_by: ..., status: 'resolved', resolved_at: ... }).eq('id', actionId)`
  with NO `.eq('organization_id', orgId)`. Same cross-org pattern as C-10.
  Additionally uses fallback `verified_by: profile?.full_name || 'Manager'`
  — the literal `'Manager'` would be written if profile hasn't loaded.
  The `.then()` has no `.catch()`.
  **Cross-org write vulnerability.**
- **Fix direction:** Add `.eq('organization_id', profile?.organization_id)`
  to the update chain. Add org guard. Replace `'Manager'` fallback with
  early return if profile is null.

### C-12: SelfAudit — `buildDemoSections()` called for ALL users, fake data persisted
- **File:** `src/pages/SelfAudit.tsx:538`
- **Table:** `self_inspection_sessions`
- **What:** `startAudit()` calls `buildDemoSections()` unconditionally at
  line 538, not just for demo mode. `buildDemoSections()` (lines 145-165)
  pre-fills 6 of 7 sections with randomized pass/na statuses and 3 hardcoded
  failures with fabricated notes (e.g., "Walk-in cooler cooling log showed
  135 F to 80 F in 2 hours"). When a production user starts an audit, these
  fake sections are loaded into state. The `createDbSession` call at line 469
  persists the session metadata, and `updateDbSession` at line 498 persists
  the `sections_json` — so a real user who progresses through the audit will
  persist fabricated inspection failures to Supabase.
  **Fake data written to production database.**
- **Fix direction:** Call `buildDemoSections()` only when `isDemoMode` is
  true; use `buildSections()` (the blank version) for production users.

### C-13: TempLogs — Batch insert sets `facility_id` to `organization_id` (FK violation)
- **File:** `src/pages/TempLogs.tsx:845`
- **Table:** `temperature_logs`
- **What:** The batch insert maps `facility_id: profile?.organization_id`
  instead of the equipment's `location_id`. The `temperature_logs` table
  has `facility_id REFERENCES locations(id)` — the `organization_id` UUID
  will never match a `locations.id`, causing an FK constraint violation.
  **Every batch temp log insert fails in production.** Compare with the
  single-entry insert (line 727) which correctly uses
  `(selectedEquipment as any).location_id`. The payload also includes a
  non-existent column `location_id` (line 846) which the table doesn't have.
- **Fix direction:** Change `facility_id` to use
  `(eq as any)?.location_id` from the equipment record. Remove the
  phantom `location_id` field from the payload.

### C-14: TempLogs — Cooldown persistence writes entirely wrong schema
- **File:** `src/pages/TempLogs.tsx:1590`
- **Table:** `cooldown_temp_checks`
- **What:** The insert sends 10 fields (`organization_id`, `food_item`,
  `start_temp`, `start_time`, `end_temp`, `end_time`, `status`, `location`,
  `started_by`, `checks`) — **none of which exist on the table**. The actual
  table schema is: `cooldown_log_id` (NOT NULL FK to `cooldown_logs`),
  `temperature_value`, `check_time`, `stage`. The required `cooldown_log_id`
  is missing. A parent `cooldown_logs` row must be created first. This
  insert **always fails**. The error is caught in `.then()` but only logged
  as `console.warn` — users see a success toast (fired before the insert at
  line 1586) and believe cooldown data was saved.
- **Fix direction:** Restructure: create a `cooldown_logs` parent row first,
  then insert individual `cooldown_temp_checks` referencing `cooldown_log_id`.
  Move success toast after confirmed write.

### C-15: TempLogs — `fetchHistory()` filters on non-existent `organization_id` column
- **File:** `src/pages/TempLogs.tsx:618`
- **Table:** `temperature_logs`
- **What:** The history query uses `.eq('organization_id',
  profile?.organization_id)` but `temperature_logs` has NO `organization_id`
  column — it uses `facility_id` (FK to `locations.id`) with RLS enforcing
  org isolation through a `locations` → `user_profiles` join. PostgREST
  returns an error for the unknown column, which is caught at line 622 and
  sets `pageError`. **The history tab is broken for all production users.**
  The a846f28 fix may have introduced this regression.
- **Fix direction:** Remove the `.eq('organization_id', ...)` filter and
  rely on RLS for org isolation, or filter via a join/sub-select on
  `facility_id IN (locations for this org)`.

---

## 3. HIGH FINDINGS

### H-1: CorrectiveActions — DEMO_LOCATIONS in location dropdown (no isDemoMode gate)
- **File:** `src/pages/CorrectiveActions.tsx:60-66,303,761`
- **What:** `DEMO_LOCATIONS` array with fake location IDs/names is used
  unconditionally in the create CA modal's location dropdown (line 761) and
  in building the location name for new CA records (line 303). While
  CorrectiveActions has NO Supabase writes (local state only), production
  users see fake locations.
- **Severity:** HIGH — misleading UI; no data corruption since no DB write.

### H-2: CorrectiveActions — DEMO_TEAM_MEMBERS in assignee dropdown
- **File:** `src/pages/CorrectiveActions.tsx:30,778`
- **What:** `DEMO_TEAM_MEMBERS` imported from demo data module, used in
  assignee dropdown unconditionally. Same issue as H-1 — no Supabase write
  but production users see fake names.

### H-3: Analysis — TEAM_MEMBERS in assign dropdown
- **File:** `src/pages/Analysis.tsx:56,812`
- **What:** `TEAM_MEMBERS` array (`['Maria Garcia', 'John Smith', ...]`)
  populates the "assign to" dropdown. The `assignAlert` handler (line 408)
  only updates local state, not Supabase. HIGH because prod users see fake
  names in the UI.

### H-4: AuditReport — Fully fake data, no isDemoMode gate
- **File:** `src/pages/AuditReport.tsx:31,43`
- **What:** `LOCATIONS` and `USERS` arrays used unconditionally to generate
  all audit report data. No Supabase reads or writes. Entire page is
  fabricated data for all users. No `isDemoMode` check anywhere in the file.
- **Severity:** HIGH — customers see a fake audit report with "Sarah Chen"
  and "Location 1".

### H-5: BusinessIntelligence — LOCATIONS array in location filter
- **File:** `src/pages/BusinessIntelligence.tsx:40-46,301`
- **What:** `LOCATIONS` array with `{ id: 'all', name: 'All Locations' },
  { id: 'loc1', ... }` used unconditionally in the location filter. Not
  gated by isDemoMode. Production users see "Location 1/2/3" in location
  filter.

### H-6: BusinessIntelligence — `org_id` column name in risk_plans upsert
- **File:** `src/pages/BusinessIntelligence.tsx:184`
- **Table:** `risk_plans`
- **What:** Uses `org_id: orgId` and `onConflict: 'org_id,signal_id'`.
  This may be intentional if `risk_plans` uses `org_id` as its column name.
  **Needs manual verification** against the actual table schema. If the
  column is `organization_id`, same issue as C-3.

### H-7: AuditTrail — LOCATIONS/USERS arrays (partially gated)
- **File:** `src/pages/AuditTrail.tsx:54,55,803`
- **What:** LOCATIONS and USERS defined unconditionally, but the location
  filter dropdown IS gated at line 803: `isDemoMode ? LOCATIONS : []`.
  However, the data generation functions (lines 117-302) use these arrays
  unconditionally. If `isDemoMode` is false, no records are generated (good),
  but the arrays exist and could be referenced.
- **Severity:** HIGH (mitigated) — data generation appears to only run
  conditionally, but the gating is implicit not explicit.

### H-8: PlaybookBuilder — LOCATIONS array unconditional
- **File:** `src/pages/PlaybookBuilder.tsx:39,497`
- **What:** `LOCATIONS` array used unconditionally in the location-assignment
  multi-select for playbook steps. Production users see "Location 1/2/3".

### H-9: PhotoEvidencePage — LOCATIONS array unconditional
- **File:** `src/pages/PhotoEvidencePage.tsx:55,489`
- **What:** `LOCATIONS` array used unconditionally in filter. Production
  users see "Location 1/2/3".

### H-10: CorrectiveActions — KITCHEN_STAFF_NAME breaks real users
- **File:** `src/pages/CorrectiveActions.tsx:67,202`
- **What:** `KITCHEN_STAFF_NAME = 'Lisa Nguyen'` is hardcoded and used at
  line 202 to filter which CAs a `kitchen_staff` user can see. Real
  kitchen_staff users would never match this name, so they always see zero
  corrective actions. Functionally broken for that role in production.

### H-11: IncidentLog — "Mark as Filed" never persisted to Supabase
- **File:** `src/pages/IncidentLog.tsx:1091-1094`
- **Tables:** `incidents` (should write `regulatory_report_filed_at`)
- **What:** The "Mark as Filed" button for regulatory reports only updates
  local component state. It does NOT write `regulatory_report_filed_at` to
  Supabase. The change is lost on page refresh. Users believe they've
  recorded filing but it is never persisted. Compliance risk.

### H-12: Calendar — Form default `location: 'Location 1'` not gated by isDemoMode
- **File:** `src/pages/Calendar.tsx:296,407`
- **Table:** `calendar_events`
- **What:** The form `resetForm()` initializes `location: 'Location 1'` — a
  fake string — for all users. If a live user creates an event without
  changing the location, this fake string is written to the database. The
  dropdown rendering IS gated by `isDemoMode` but the form default is not.

### H-13: IncidentLog — `regulatory_report_required` not in Supabase INSERT
- **File:** `src/pages/IncidentLog.tsx:713-726 vs 755`
- **Table:** `incidents`
- **What:** The create form captures `regulatoryReportRequired` in local
  state (line 755) but the Supabase INSERT payload (lines 713-726) does not
  include this field. Regulatory tracking data is ephemeral.

### H-14: HACCP — New Corrective Action form never persisted to Supabase
- **File:** `src/pages/HACCP.tsx:1817-1839`
- **Table:** `haccp_corrective_actions` (should write here but doesn't)
- **What:** The "Add Corrective Action" form in the HACCP Corrective Actions
  tab only saves to local component state (`setLiveCorrectiveActions`). There
  is NO Supabase INSERT. The record has a client-generated ID
  (`ca-manual-${Date.now()}`), uses `profile?.full_name || 'Current User'`
  for `actionBy`, and uses `LOCATION_ID_MAP[selectedLocation] || '1'` for
  `locationId` (hardcoded fallback). All data is lost on page refresh.
  **Compliance risk** — users believe they recorded a corrective action but
  it was never persisted.
- **Fix direction:** Add a Supabase INSERT to `haccp_corrective_actions`
  in the prod branch, mirroring the local state update. Include proper
  `organization_id` and guard. Remove `'Current User'` and `'1'` fallbacks.

### H-15: Checklists — DELETE on checklist_templates missing org_id scope
- **File:** `src/pages/Checklists.tsx:1343`
- **Table:** `checklist_templates`
- **What:** `handleDeleteTemplate()` calls
  `.delete().eq('id', templateId)` with NO `.eq('organization_id', ...)`
  filter. There IS a pre-submit guard at line 1332 (`if (isDemoMode ||
  !profile?.organization_id)`) but the org_id is never added to the DELETE
  WHERE clause. Additionally, the return value is not captured — if the
  delete fails, the success toast fires anyway (silent failure).
- **Fix direction:** Add `.eq('organization_id', profile.organization_id)`
  to the delete chain. Capture the `{ error }` return and handle it.

### H-16: Checklists — DELETE on checklist_templates (edit path) missing org_id scope + destructive pattern
- **File:** `src/pages/Checklists.tsx:1379`
- **Table:** `checklist_templates`
- **What:** `handleEditTemplate()` uses a destructive "delete-then-recreate"
  pattern: it deletes the existing template (`.delete().eq('id',
  template.id)` — no org_id scope) then opens the create modal for the user
  to re-enter data. Same silent failure as H-15. If the delete succeeds but
  the user cancels the modal, the original template is permanently lost.
- **Fix direction:** Add `.eq('organization_id', profile.organization_id)`
  to the delete chain. Consider refactoring to an UPDATE-in-place pattern
  instead of delete-then-recreate.

### H-17: Equipment — Location dropdown empty in live mode, `location_id: ''` written
- **File:** `src/pages/Equipment.tsx:679,1800`
- **Table:** `equipment`
- **What:** The `locations` state is initialized as
  `isDemoMode ? DEMO_LOCATIONS : []` on line 679. In live mode, the
  `fetchEquipment()` effect (line 713) fetches locations from Supabase but
  only uses them to build `locMap` for mapping names onto existing equipment
  — the `locations` state variable that populates the Add Equipment form
  dropdown (line 1701) and location filter (line 849) is **never populated
  from Supabase**. Result: (a) the location filter shows zero locations,
  (b) the form's location dropdown is empty, (c) the insert's
  `location_id: locations[0]?.id ?? ''` at line 1800 evaluates to `''`,
  writing an empty string to the database. Every piece of equipment added
  in live mode has `location_id: ''`.
- **Fix direction:** Set `locations` state from the Supabase query result
  in `fetchEquipment()`.

### H-18: TempLogs — Receiving temp logs `food_category` column mismatch
- **File:** `src/pages/TempLogs.tsx:1008`
- **Table:** `receiving_temp_logs`
- **What:** The insert sends `food_category: item.category || null` but the
  table column is `item_category`, not `food_category`. Supabase either
  silently drops the value (category data lost) or returns an error.
- **Fix direction:** Change `food_category` to `item_category`.

---

## 4. MEDIUM FINDINGS

### M-1: Equipment — Success toast fires when no DB write occurred + green error styling
- **File:** `src/pages/Equipment.tsx:1822-1824,1816-1818`
- **Table:** `equipment`
- **What:** The insert IS properly guarded by `if (!isDemoMode &&
  profile?.organization_id)` at line 1794. However: (1) The success toast
  at line 1823 fires unconditionally after the guard block — if the guard
  short-circuits (demo mode or no org), the toast still fires. (2) Error
  toasts use a green `showToast()` helper (line 1843, `bg-green-600`)
  making failures visually indistinguishable from success.
- **Fix direction:** Move success toast inside the guard block after
  confirming no error. Use `toast.error()` from sonner for failures.

### M-2: Checklists — Template creation has org guard but error handling is console.error
- **File:** `src/pages/Checklists.tsx:905`
- **Table:** `checklist_templates`
- **What:** Insert includes `organization_id`. Error path at line 955 does
  `console.error(error)` then `toast.error(...)` — acceptable but error is
  also logged to console in production.

### M-3: HACCP — Multiple writes lack explicit org guard
- **File:** `src/pages/HACCP.tsx:467,487`
- **Tables:** `haccp_plans`, `haccp_critical_control_points`
- **What:** Both inserts include `organization_id: profile?.organization_id`.
  The function is gated by `isDemoMode` check but no explicit `if
  (!profile?.organization_id) return` guard before the write. If a race
  condition occurs where profile is null, the write proceeds with null org.
- **Fix direction:** Add guard.

### M-4: SelfAudit — Insert uses org_id
- **File:** `src/pages/SelfAudit.tsx:469`
- **Table:** `self_audits`
- **What:** Insert includes `organization_id: profile?.organization_id`.
  Gated by `isDemoMode` but no explicit null guard. Same pattern as M-3.

### M-5: SensorHub — Insert has org guard via conditional
- **File:** `src/pages/SensorHub.tsx:259`
- **Table:** `iot_sensors`
- **What:** Insert is inside `if (!isDemoMode && profile?.organization_id)`
  block — properly guarded. However, on error, only `toast.error` is called
  with the raw error message, which could leak internal details.
- **Severity:** MEDIUM — error message exposure.

### M-6: Onboarding — Multiple inserts with minimal error handling
- **File:** `src/pages/Onboarding.tsx:83-153`
- **Tables:** `user_profiles`, `onboarding_checklist_items`, `locations`
- **What:** Several inserts in the onboarding flow. Error handling exists
  but is inconsistent — some errors show toast, others log to console.
  Organization_id is present in all writes.

### M-7: ReportSettings — Completely silent error handling on all writes
- **File:** `src/components/ReportSettings.tsx:150-179`
- **Table:** `report_subscriptions`
- **What:** The save loop performs updates and inserts but never checks the
  error return from either Supabase call. If any write fails, user sees no
  error — the `finally` block just sets `saving = false`. Org guard is
  proper (line 146).

### M-8: LogServiceModal — Upsert and certificate update errors swallowed
- **File:** `src/components/services/LogServiceModal.jsx:113,103`
- **Tables:** `location_service_schedules`, `vendor_service_records`
- **What:** The `location_service_schedules` upsert result is not captured
  or error-checked — if it fails, execution continues to show a success
  toast. The certificate URL update at line 103 also has no error check.

### M-9: SB1383Compliance — No org_id guard before INSERT
- **File:** `src/pages/SB1383Compliance.tsx:225`
- **Table:** `sb1383_compliance`
- **What:** The insert includes `organization_id: profile?.organization_id`
  but there is no early-return guard if `profile?.organization_id` is falsy.
  If profile hasn't loaded, the insert proceeds with `organization_id:
  undefined`. The SELECT at line 136 has the same issue — queries with
  `.eq('organization_id', profile?.organization_id)` without checking
  truthiness first, which could match rows where `organization_id IS NULL`.
  Also uses `alert()` instead of `toast.error()` for errors (line 250).
- **Fix direction:** Add `if (!profile?.organization_id) return;` guard
  before both the INSERT and SELECT.

### M-10: K12Compliance — No org_id guard before INSERT or SELECT
- **File:** `src/pages/K12Compliance.tsx:268,166,183`
- **Tables:** `nslp_claim_periods`, `locations`
- **What:** Same pattern as M-9. The insert at line 268 includes
  `organization_id: profile?.organization_id` but no falsy guard. The
  SELECT queries at lines 166 and 183 use `.eq('organization_id',
  profile?.organization_id)` without checking truthiness. Also uses
  `alert()` instead of `toast.error()` and `window.location.reload()`
  instead of data refetch.
- **Fix direction:** Add `if (!profile?.organization_id) return;` guard.

### M-11: SelfAudit — Silent error handling on all 3 DB helpers
- **File:** `src/pages/SelfAudit.tsx:479,501,531`
- **Table:** `self_inspection_sessions`
- **What:** All three catch blocks (`createDbSession`, `updateDbSession`,
  `finalizeDbSession`) are empty `catch { // silent }`. The comment says
  "localStorage is the primary save" but users are never notified that
  server persistence failed. The history fetch at line 434 has the same
  silent catch.

### M-12: MockInspection — Silent error handling on all DB operations
- **File:** `src/pages/MockInspection.tsx:141,162,182,206`
- **Table:** `mock_inspection_sessions`
- **What:** All four catch blocks are empty `catch { // silent }`. Same
  pattern as M-11. Users get no notification when DB writes fail.

### M-13: Settings — Missing org_id guard on organizations updates
- **File:** `src/pages/Settings.tsx:1667,1762`
- **Table:** `organizations`
- **What:** Two update handlers (SB 1383 enrollment at line 1667, K-12
  enrollment at line 1762) use `.eq('id', profile?.organization_id)` without
  an explicit falsy guard. Practically safe (`.eq('id', null)` matches
  nothing) but inconsistent with the guarded pattern at line 1570.

### M-14: Checklists — checklist_responses INSERT silent failure
- **File:** `src/pages/Checklists.tsx:1277`
- **Table:** `checklist_responses`
- **What:** The insert return value is not captured:
  `await supabase.from('checklist_responses').insert(responsesToInsert);`
  has no `const { error }` destructuring. If this insert fails, the
  completion record (line 1245) is already written — leaving an orphaned
  completion with zero responses. The user sees a success toast regardless.

### M-15: Checklists — alerts INSERT silent failure + dead location_id ternary

- **File:** `src/pages/Checklists.tsx:1307,1310`
- **Table:** `alerts`
- **What:** Two issues: (1) The `location_id` in the alert payload is a dead
  ternary: `location_id: selectedTemplate?.id ? undefined : undefined` —
  always evaluates to `undefined` regardless. The actual location was fetched
  at line 1236 as `locationData?.id` but is never used in the alert payload.
  HACCP CCP failure alerts are created without any location association.
  (2) The insert return value is not captured — silent failure if the alerts
  insert fails.
- **Fix direction:** Replace dead ternary with
  `location_id: locationData?.id || null`. Capture the `{ error }` return.

### M-16: Vendors — 4 inserts with no error handling (silent success toasts)
- **File:** `src/pages/Vendors.tsx:896,983,1223,1627`
- **Tables:** `vendor_upload_requests`, `vendor_contact_log`
- **What:** Four Supabase inserts in the Vendors page (document request,
  per-document request, upload link, COI request) all have proper org guards
  and include `organization_id`, but none capture the `{ error }` return.
  Success toasts fire unconditionally. The COI request at line 1627 is
  fire-and-forget (no `await`), making it worse — an unhandled promise
  rejection if the insert fails.
- **Fix direction:** Destructure `{ error }` from all four inserts. Add
  `await` to line 1627. Show `toast.error` on failure.

### M-17: Vendors — Empty string fallback for organizationId prop
- **File:** `src/pages/Vendors.tsx:1858`
- **What:** `<ServiceRequestsTab organizationId={profile?.organization_id
  || ''} />` passes an empty string when profile hasn't loaded. Downstream
  components (`RequestServiceModal`, `useServiceRequests`) may execute
  unscoped queries or writes with an empty org ID.
- **Fix direction:** Pass `profile?.organization_id ?? null` and add a
  guard in the downstream component.

### M-18: Equipment — Form fields silently discarded on save
- **File:** `src/pages/Equipment.tsx:1798-1815`
- **Table:** `equipment`
- **What:** Three form fields present in the UI — `warranty_contact`
  (line 1767), `useful_life_years` (line 1771), and `replacement_cost`
  (line 1775) — are not included in the insert payload. The fetching query
  (line 738-739) reads these columns, confirming they exist in the DB. Users
  fill in these fields but the data is silently discarded on save.
- **Fix direction:** Add these three fields to the insert payload, reading
  from `formData`.

### M-19: Equipment — No refetch after successful insert
- **File:** `src/pages/Equipment.tsx:1820-1824`
- **Table:** `equipment`
- **What:** After a successful insert, the code shows a toast and closes
  the modal but never calls `fetchEquipment()` or triggers a re-fetch. The
  `useEffect` only runs when `isDemoMode` or `profile?.organization_id`
  changes. Newly added equipment is invisible in the list until page refresh.
- **Fix direction:** Call `fetchEquipment()` after successful insert.

### M-20: TempLogs — Silent failure on all 4 insert operations
- **File:** `src/pages/TempLogs.tsx:727,860,1016,1590`
- **Tables:** `temperature_logs`, `receiving_temp_logs`, `cooldown_temp_checks`
- **What:** All four insert operations use the pattern
  `if (!error) { ...success... }` with NO `else` branch. When inserts fail,
  the user sees the loading spinner stop with no feedback (single/batch) or
  a premature success toast (cooldown, which is fire-and-forget). No write
  in this file has user-facing error feedback.
- **Fix direction:** Add `else { toast.error('...'); }` branches to all
  four insert operations. Move cooldown success toast after confirmed write.

### M-21: TempLogs — Batch insert includes phantom `location_id` column
- **File:** `src/pages/TempLogs.tsx:846`
- **Table:** `temperature_logs`
- **What:** The batch insert payload includes `location_id: (eq as any)
  ?.location_id` but `temperature_logs` has no `location_id` column (it uses
  `facility_id`). Supabase may silently ignore or error.
- **Fix direction:** Remove `location_id` from the batch payload (already
  covered by fixing `facility_id` in C-13).

---

## 5. LOW FINDINGS

### L-1: WelcomeModal — No form reset needed (no form state)
- **File:** `src/components/WelcomeModal.tsx`
- **What:** Simple profile update (`onboarding_completed: true`). No form
  state to reset. Clean.

### L-2: InviteVendorModal — Proper cleanup on close
- **File:** `src/components/vendor/InviteVendorModal.tsx`
- **What:** `resetForm()` called on close. Error preserved on submit
  failure (modal stays open). Clean pattern.

### L-3: AddVendorModal — Proper cleanup on close
- **File:** `src/components/vendor/AddVendorModal.tsx`
- **What:** `resetForm()` called on close. Uses `useCreateVendor` hook
  which handles org_id. Clean pattern.

---

## 6. INVENTORY TABLE

| File | Component | Write Op(s) | Target Table(s) | Status |
|------|-----------|------------|-----------------|--------|
| `IncidentLog.tsx` | Create Incident Modal | INSERT | `incidents`, `incident_timeline` | **CRITICAL** (C-1,C-2,C-5) |
| `VoiceButton.jsx` | Voice Command | INSERT | `temperature_logs`, `corrective_actions` | **CRITICAL** (C-3) |
| `Checklists.tsx` | Create Template Modal | INSERT | `checklist_templates`, `checklist_template_items` | CLEAN (M-2 minor) |
| `Checklists.tsx` | Complete Checklist Modal | INSERT | `checklist_completions`, `checklist_responses`, `alerts` | **ISSUE** (M-14, M-15) |
| `Checklists.tsx` | Delete Template | DELETE | `checklist_templates` | **HIGH** (H-15, H-16) |
| `Calendar.tsx` | Add/Edit Event Modal | INSERT/UPDATE/DELETE | `calendar_events`, `frequency_change_log`, `vendor_changes` | **CRITICAL** (C-7,C-8) |
| `HACCP.tsx` | Create Plan Modal | INSERT | `haccp_plans`, `haccp_critical_control_points` | CLEAN (M-3 minor) |
| `HACCP.tsx` | Review/CA Modals | UPDATE | `haccp_plans`, `haccp_corrective_actions` | **CRITICAL** (C-10,C-11) |
| `HACCP.tsx` | New CA Form | NONE (local only) | — | **HIGH** (H-14 — should write but doesn't) |
| `TempLogs.tsx` | Single Temp Log | INSERT | `temperature_logs` | CLEAN (M-20 silent failure) |
| `TempLogs.tsx` | Batch Temp Log | INSERT | `temperature_logs` | **CRITICAL** (C-13) — always fails (FK violation) |
| `TempLogs.tsx` | Receiving Temp | INSERT | `receiving_temp_logs` | **HIGH** (H-18) — wrong column name |
| `TempLogs.tsx` | Cooldown Persist | INSERT | `cooldown_temp_checks` | **CRITICAL** (C-14) — wrong schema, always fails |
| `TempLogs.tsx` | fetchHistory | SELECT | `temperature_logs` | **CRITICAL** (C-15) — non-existent column filter |
| `Equipment.tsx` | Equipment Form Modal | INSERT | `equipment` | **HIGH** (H-17) + M-1, M-18, M-19 |
| `Vendors.tsx` | Upload Request Modals | INSERT | `vendor_upload_requests`, `vendor_contact_log` | **ISSUE** (M-16, M-17) |
| `AddVendorModal.tsx` | Add Vendor Modal | INSERT (via hook) | `vendors`, `vendor_client_relationships` | CLEAN |
| `InviteVendorModal.tsx` | Invite Modal | INSERT | `user_invitations` | CLEAN |
| `TeamInviteModal.tsx` | Invite Modal | INSERT/UPDATE | `user_invitations` | CLEAN |
| `LogServiceModal.jsx` | Log Service Modal | INSERT/UPDATE/UPSERT | `vendor_service_records`, `location_service_schedules` | **CRITICAL** (C-9) |
| `ReportSettings.tsx` | Report Settings | UPDATE/INSERT | `report_settings` | CLEAN |
| `ProfileModal.tsx` | Profile Modal | UPDATE | `user_profiles` | CLEAN |
| `AddCertificationModal.tsx` | Certification Modal | INSERT/UPDATE | `employee_certifications` | **CRITICAL** (C-6) |
| `WelcomeModal.tsx` | Welcome Modal | UPDATE | `user_profiles` | CLEAN |
| `SelfAudit.tsx` | Self Audit | INSERT/UPDATE | `self_inspection_sessions` | **CRITICAL** (C-12) + M-4, M-11 |
| `MockInspection.tsx` | Mock Inspection | INSERT/UPDATE | `mock_inspection_sessions` | CLEAN (M-12 silent errors) |
| `SensorHub.tsx` | Sensor Registration | INSERT | `iot_sensors` | CLEAN (M-5 minor) |
| `ScoringBreakdown.tsx` | Add Location | INSERT | `locations` | NEEDS-MANUAL-REVIEW |
| `SB1383Compliance.tsx` | Log Compliance | INSERT | `sb1383_compliance` | **ISSUE** (M-9) |
| `K12Compliance.tsx` | Log Claim Period | INSERT | `nslp_claim_periods` | **ISSUE** (M-10) |
| `Settings.tsx` | Settings Forms | UPDATE/INSERT | `organization_settings`, `locations`, `notification_settings` | CLEAN (M-13 minor) |
| `BusinessIntelligence.tsx` | Risk Plan Modal | UPSERT | `risk_plans` | **ISSUE** (H-6) |
| `CorrectiveActions.tsx` | Create CA Modal | NONE (local only) | — | N/A (H-1,H-2 UI) |
| `Analysis.tsx` | Alert Actions | UPDATE | `ai_insights` | CLEAN (H-3 UI) |
| `AuditReport.tsx` | — | NONE | — | N/A (H-4 UI) |
| `AIAdvisor.tsx` | — | NONE | — | N/A (UI only) |
| `Onboarding.tsx` | Onboarding Steps | INSERT/UPDATE | `user_profiles`, `locations`, `onboarding_checklist_items` | CLEAN (M-6 minor) |
| `FacilitySafety.tsx` | Inspection Form | NONE (local only) | — | N/A |
| `Alerts.tsx` | Alert Actions | NONE (local only) | — | N/A |

**Admin-only pages** (platform_admin gated — lower blast radius):
| File | Status |
|------|--------|
| `admin/Configure.tsx` | CLEAN |
| `admin/IntelligenceAdmin.tsx` | CLEAN |
| `admin/AdminOrgs.tsx` | CLEAN |
| `admin/AdminUsers.tsx` | CLEAN |
| `admin/SupportTickets.tsx` | CLEAN |
| `admin/GuidedTours.tsx` | CLEAN |
| `admin/PartnerDemos.jsx` | CLEAN |
| `admin/DemoTours.jsx` | CLEAN |
| `admin/EmailSequenceManager.tsx` | CLEAN |
| `admin/SalesPipeline.tsx` | CLEAN |

---

## 7. PATTERNS

### Pattern A: Hardcoded `'Current User'` strings in Supabase writes
**Occurrences:** 4 (all in IncidentLog.tsx)
**Root cause:** No utility to get the current user's display name.
**Recommendation:** Create a `useCurrentUserName()` hook or use
`profile?.full_name || user?.email || 'Unknown'` consistently.

### Pattern B: Module-scoped fake name/location arrays used in prod UI
**Occurrences:** 12+ files
**Root cause:** Demo data arrays defined at module scope with no isDemoMode
gate on consumption. Some files gate correctly (e.g., `isDemoMode ? DEMO_X
: []`), others don't.
**Recommendation:** Enforce pattern: `const items = isDemoMode ? DEMO_ITEMS
: realItems;` at point of use. Never render module-scoped fake arrays
unconditionally.

### Pattern C: Missing `if (!profile?.organization_id) return` guard
**Occurrences:** 8+ write handlers
**Root cause:** Many handlers use `if (!isDemoMode && profile?.organization_id)`
as the Supabase write condition, which is correct. But some use
`profile?.organization_id` inside the INSERT payload without a prior guard,
risking NULL organization_id if profile is still loading.
**Recommendation:** Standardize: every handler that writes to Supabase
should start with `if (!profile?.organization_id) { toast.error(...); return; }`.

### Pattern E: Schema drift — code sends columns that don't exist on the table
**Occurrences:** 3 confirmed (TempLogs batch `location_id`, TempLogs
cooldown 10 wrong columns, TempLogs receiving `food_category`)
**Root cause:** Schema was refactored (e.g., `cooldown_logs` +
`cooldown_temp_checks` split) but the client code was never updated.
Column renames (`item_category` → `food_category`) not propagated.
**Recommendation:** Run a schema-vs-code reconciliation. Consider using
Supabase type generation (`supabase gen types typescript`) to catch
mismatches at build time.

### Pattern D: `org_id` vs `organization_id` column name inconsistency
**Occurrences:** 2 confirmed (VoiceButton.jsx), 2 need verification
(BusinessIntelligence.tsx `risk_plans`, Vendors.tsx `intelligence_signals`
at line 489)
**Root cause:** Some tables may use `org_id` (e.g., `task_definitions` uses
`org_id`), while most use `organization_id`. No enforced convention.
**Recommendation:** Verify each table's actual column name. Fix mismatches.
Consider a shared constant or type for the org column name.

---

## 8. RECOMMENDED FIX ORDER

| Priority | Finding | Reason |
|----------|---------|--------|
| **1** | C-7 + C-8: Calendar cross-org UPDATE + DELETE | **Security vulnerability.** No `organization_id` filter on update/delete — any user can modify/delete any org's calendar events by ID. |
| **1** | C-10 + C-11: HACCP cross-org UPDATE | **Security vulnerability.** No `organization_id` filter on haccp_plans or haccp_corrective_actions updates. Same cross-org pattern as Calendar. |
| **2** | C-15: TempLogs fetchHistory broken | `.eq('organization_id', ...)` on a column that doesn't exist — history tab broken for ALL production users. Immediate UX impact. |
| **3** | C-13: TempLogs batch insert FK violation | `facility_id` set to org UUID instead of location ID — batch temp logging always fails. |
| **3** | C-14: TempLogs cooldown wrong schema | Insert sends 10 non-existent columns — cooldown data never persisted. |
| **4** | C-3: VoiceButton `org_id` mismatch | Every voice-logged temp & CA since launch has NULL org. Existing data needs backfill. Highest blast radius. |
| **5** | C-6: AddCertificationModal missing `organization_id` | Every certification ever created/updated via this modal has no org scoping. Multi-tenancy gap. |
| **6** | C-9: LogServiceModal `location_service_schedules` missing org_id | Schedule records created without org — affects service calendar accuracy. Error silently swallowed. |
| **7** | C-1 + C-5: IncidentLog fake TEAM_MEMBERS in writes | Production incidents have fake assignees. Need real team member lookup. |
| **8** | C-2: IncidentLog `'Current User'` literals | Audit trail is broken — all entries say "Current User" instead of real name. |
| **9** | C-12: SelfAudit fake sections in prod | `buildDemoSections()` called for ALL users — fabricated inspection failures persisted to DB on audit completion. |
| **10** | H-18: TempLogs receiving `food_category` column mismatch | Category data silently lost on every receiving temp log. |
| **11** | H-14: HACCP new CA form never persisted | Users create corrective actions that vanish on refresh. Compliance risk. |
| **12** | H-15 + H-16: Checklists DELETE missing org_id scope | Template deletes not scoped by org. Destructive edit pattern can lose templates. |
| **13** | H-17: Equipment locations dropdown empty in live mode | Every piece of equipment added gets `location_id: ''`. |
| **14** | H-1 + H-2: CorrectiveActions fake dropdowns | Production users see "Location 1" and "Maria Garcia" in CA creation form. No data corruption but terrible UX. |
| **15** | H-4: AuditReport fully fabricated | Entire page shows fake data to all users. No isDemoMode gate at all. |

---

## APPENDIX: Files with fake LOCATIONS/USERS arrays — no Supabase write

These files display fake data to production users but do NOT write it to
Supabase. Ranked by customer visibility:

| File | Arrays | isDemoMode gated? |
|------|--------|-------------------|
| `AuditReport.tsx` | LOCATIONS, USERS | **NO** |
| `CorrectiveActions.tsx` | DEMO_LOCATIONS, DEMO_TEAM_MEMBERS | **NO** |
| `CorrectiveActionDetail.tsx` | DEMO_TEAM_MEMBERS | **NO** |
| `Analysis.tsx` | TEAM_MEMBERS | **NO** (dropdown only) |
| `BusinessIntelligence.tsx` | LOCATIONS | **NO** |
| `PlaybookBuilder.tsx` | LOCATIONS | **NO** |
| `PhotoEvidencePage.tsx` | LOCATIONS | **NO** |
| `AIAdvisor.tsx` | TEAM_MEMBERS | **NO** (dropdown only) |
| `AuditTrail.tsx` | LOCATIONS, USERS | Partially (filter yes, data gen unclear) |
| `Calendar.tsx` | LOCATIONS | **YES** (line 1690: `isDemoMode && LOCATIONS.map`) |
| `Equipment.tsx` | DEMO_LOCATIONS, DEMO_EQUIPMENT | **YES** (lines 679,764) |
| `FacilitySafety.tsx` | DEMO_LOCATIONS | **YES** |
| `Checklists.tsx` | DEMO_TODAY_CHECKLISTS, DEMO_HISTORY | **YES** |
| `Deficiencies.tsx` | DEMO_DEFICIENCIES | **YES** |

---

*End of Phase 1 report. No files were modified.*
