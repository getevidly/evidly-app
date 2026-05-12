# ANSWER-LINE-PATTERN — Universal Product Rule

> **Type:** TIER 0 — System Rule Document (source of truth)
> **Date:** 2026-05-10
> **Status:** LOCKED — every surface rebuild references this doc
> **Scope:** All EvidLY surfaces that render a status pill
> **Reference implementation:** `EvidLY_Documents_Preview_v2.jsx` lines 159–218

---

## SECTION 1 — The Rule

### Principle 1: ANSWERS BEFORE YOU ASK

Every status pill in EvidLY pairs with a secondary line — the **answer line** — that answers "what is happening" or "what's next" using REAL DATA, not generic prose.

- The **pill** communicates state.
- The **answer line** communicates context and the next action.

**FORBIDDEN:** Generic status restatements that tell the user nothing the pill didn't already convey.
- "Valid and on file"
- "Request sent — awaiting upload"
- "Certification valid"
- "Service report on file"

**REQUIRED:** Data-templated formulas pulling from real fields.
- `"Expires Jun 1, 2026 · Maria Lopez"`
- `"Sent May 7 · Vendor not opened yet · 3 days left · Resend"`
- `"Hood Cleaning due in 12 days · CPP scheduled"`
- `"Uploaded May 5 by Cleaning Pros Plus · Review now"`

### Principle 2: TWO-CLICK ACTION RULE

Any action exposed in the answer line must reach completion in two clicks max.

- **Click 1:** The action verb in the answer line (e.g. "Resend", "Review now", "Assign vendor"). This IS the entry point — not a buried menu item.
- **Click 2:** Confirmation modal or final step that completes the action.

For multi-field actions (e.g. Send to Third Party wizard), the entry point in the answer line counts as click 1. The wizard is the "second surface" but entry is one click.

No buried menu navigation. No multi-step wizards for single-action flows.

### Principle 3: WORKFLOW PRECEDENCE

When a document has BOTH a primary status (current/expiring/expired) AND an active workflow (requested/pending_review/shared), the answer line surfaces the **WORKFLOW**.

Workflow states resolve and disappear; expiration is the steady-state default.

**Priority order (highest first):**

| Priority | State | Domain | Why highest |
|---|---|---|---|
| 0 | `overdue` (token expired) / `expired` (doc expired) | Document | Broken state — immediate fix needed |
| 1 | `requested` (token active, vendor lifecycle) | Document | Active vendor lifecycle — time-bound |
| 2 | `pending_review` (org review needed) | Document | Actionable by org user right now |
| 3 | `shared` (external share active, sub-lifecycle) | Document | External recipient lifecycle — time-bound |
| 4 | `expiring` (within 30 days) | Document | Warning, not yet broken |
| 5 | `current` (steady state) | Document | No action needed |

### Principle 4: STACKED LIFECYCLES

A document can be in a primary state (e.g. `current`) AND simultaneously shared externally.

- **Primary status pill** shows the document's own health.
- **Answer line** shows the active workflow if any.
- If multiple active workflows exist (rare — doc is both `shared` AND `pending_review`), the answer line shows the one with higher user-action urgency per the priority table above.
- When a share lifecycle completes (downloaded or expired), it stops surfacing. The answer line returns to the primary state formula.

### Principle 5: DATA-DRIVEN FORMULAS

Every answer line is a templated string. Formulas are documented as functional code, not static copy. Helper functions live in a shared module (`src/lib/answerLine.ts`) so every surface that renders a status pill calls:

```typescript
answerLine(domain: Domain, category: Category, status: Status, data: RowData): string | null
```

A `null` return means no answer line for this state — the pill alone is sufficient. This is valid only for states where no action is possible (e.g. kitchen × pending_review, which cannot occur per the locked lifecycle).

---

## SECTION 2 — Lifecycle States by Domain

### 2.1 Document Lifecycle (`compliance_documents`)

**Schema columns used:**

| Column | Type | Source Table | Notes |
|---|---|---|---|
| `expiry_date` | date, nullable | `compliance_documents` | NULL = no expiration |
| `status` | text | `compliance_documents` | CHECK: current, expiring, expired, pending_review, requested, overdue |
| `category` | text | `compliance_documents` | CHECK: kitchen, employee, service, business |
| `subject_user_id` | uuid, nullable | `compliance_documents` | Required when category=employee |
| `vendor_id` | uuid, nullable | `compliance_documents` | FK to vendors |
| `type` | text | `compliance_documents` | Document type name |
| `created_at` | timestamptz | `compliance_documents` | Record creation |
| `request.stage` | text | `compliance_document_requests` | sent, viewed, uploaded, overdue |
| `request.created_at` | timestamptz | `compliance_document_requests` | Token creation time |
| `request.viewed_at` | timestamptz | `compliance_document_requests` | Vendor opened email |
| `request.token_expires_at` | timestamptz | `compliance_document_requests` | 5 calendar days from created_at |

**Derived fields (client-side):**

| Helper | Formula | Notes |
|---|---|---|
| `daysUntil(date)` | `Math.max(0, Math.ceil((new Date(date) - now) / 86400000))` | Returns 0 if past |
| `daysAgo(date)` | `Math.max(0, Math.ceil((now - new Date(date)) / 86400000))` | Returns 0 if future |
| `tokenDaysRemaining(requestAt)` | `Math.max(0, Math.ceil((requestAt + 5d - now) / 86400000))` | 5 calendar day token window |
| `subjectUserName(id)` | Lookup `user_profiles.full_name` | For employee category display |
| `vendorName(id)` | Lookup `vendors.name` | For vendor-facing formulas |

---

#### 2.1.1 category=kitchen

| Status | Formula | Click-1 | Click-2 | Notes |
|---|---|---|---|---|
| `current` | `expiry_date ? "Expires {expiry_date}" : "No expiration on file"` | — | — | Steady state, no action |
| `expiring` | `"Expires in {daysUntil(expiry_date)} days"` | `Renew` → upload replacement modal | Confirm upload | |
| `expired` | `"Expired {daysAgo(expiry_date)} days ago"` | `Upload` → upload replacement modal | Confirm upload | |
| `pending_review` | `null` | — | — | Kitchen docs are org-uploaded; no vendor review workflow |
| `requested` | `null` | — | — | Kitchen docs are not vendor-requested |
| `overdue` | `null` | — | — | Kitchen docs have no token workflow |

---

#### 2.1.2 category=employee

| Status | Formula | Click-1 | Click-2 | Notes |
|---|---|---|---|---|
| `current` | `expiry_date ? "Expires {expiry_date} · {subjectUserName}" : "{subjectUserName}"` | — | — | Steady state |
| `expiring` | `"Expires in {daysUntil(expiry_date)} days · {subjectUserName}"` | `Renew` → upload modal | Confirm upload | |
| `expired` | `"Expired {daysAgo(expiry_date)} days ago · {subjectUserName}"` | `Upload` → upload modal | Confirm upload | |
| `pending_review` | `null` | — | — | Employee docs are self-uploaded; no org review gate |
| `requested` | `null` | — | — | Employee docs not token-requested |
| `overdue` | `null` | — | — | Employee docs have no token workflow |

---

#### 2.1.3 category=service

| Status | Formula | Click-1 | Click-2 | Notes |
|---|---|---|---|---|
| `current` | `"Next: {type} · {expiry_date} · {vendorName \|\| 'No vendor assigned'}"` | — | — | Steady state; expiry_date here represents next expected service |
| `expiring` | Vendor assigned: `"{type} due in {daysUntil(expiry_date)} days · {vendorName} scheduled"` | `Schedule` → schedule modal | Confirm | |
| | No vendor: `"{type} due in {daysUntil(expiry_date)} days · No vendor assigned"` | `Assign vendor` → vendor picker | Select + confirm | |
| `expired` | Vendor assigned: `"{type} {daysAgo(expiry_date)} days overdue · {vendorName}"` | `Follow up` → note/call log | Save note | |
| | No vendor: `"{type} {daysAgo(expiry_date)} days overdue · No vendor assigned"` | `Assign vendor` → vendor picker | Select + confirm | |
| `pending_review` | `"Uploaded {request.created_at} by {vendorName} · Review now"` | `Review now` → accept/reject modal | Accept or Reject | |
| `requested` | `"Requested {request.created_at} · Token expires in {tokenDaysRemaining} days · Resend"` | `Resend` → resend confirmation | Confirm resend | |
| | Sub-state `request.stage=sent`: `"Sent {request.created_at} · Vendor not opened yet · {tokenDaysRemaining} days left · Resend"` | `Resend` | Confirm | |
| | Sub-state `request.stage=viewed`: `"Sent {request.created_at} · Vendor opened {request.viewed_at} · {tokenDaysRemaining} days left"` | — | — | Vendor is aware; wait |
| | Sub-state `request.stage=uploaded`: — | — | — | Transitions to pending_review |
| `overdue` | `"Token expired · Resend now"` | `Resend now` → resend confirmation | Confirm resend | Sub-state `request.stage=overdue` |

---

#### 2.1.4 category=business

| Status | Formula | Click-1 | Click-2 | Notes |
|---|---|---|---|---|
| `current` | `expiry_date ? "Expires {expiry_date}" : "No expiration on file"` | — | — | Steady state |
| `expiring` | `"Expires in {daysUntil(expiry_date)} days · {vendorName} to renew"` | `Renew` → request renewal modal | Confirm request | Vendor-owned doc — org requests renewal |
| `expired` | `"Expired {daysAgo(expiry_date)} days ago · {vendorName}"` | `Follow up` → request renewal modal | Confirm request | |
| `pending_review` | `"Uploaded {request.created_at} by {vendorName} · Review now"` | `Review now` → accept/reject modal | Accept or Reject | |
| `requested` | `"Requested {request.created_at} · Awaiting vendor"` | `Resend` → resend confirmation | Confirm resend | |
| `overdue` | `null` | — | — | Business docs don't use token-expiry overdue (vendor credential lifecycle is simpler) |

---

### 2.2 Document Share Lifecycle (`compliance_document_send_records`)

Share state is independent of the document's primary status. A `current` document can have an active share. The share answer line takes precedence over the primary answer line per Principle 3 (priority 3, above `expiring` at priority 4).

**Schema columns used:**

| Column | Type | Notes |
|---|---|---|
| `sent_at` | timestamptz | When share was created |
| `recipient_name` | text | Display name of recipient |
| `recipient_type` | text | ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal |
| `opened_at` | timestamptz, nullable | NULL = not yet opened |
| `opened_count` | integer | Total opens |
| `download_count` | integer | Total downloads |
| `secure_token_expires_at` | timestamptz | When share link expires |
| `revoked_at` | timestamptz, nullable | NULL = not revoked |

**Derived fields:**

| Helper | Formula |
|---|---|
| `shareDaysRemaining(expiresAt)` | `Math.max(0, Math.ceil((new Date(expiresAt) - now) / 86400000))` |
| `shareExpired(expiresAt)` | `new Date(expiresAt) < now` |

**Share states (derived client-side):**

| State | Condition | Formula | Click-1 | Click-2 |
|---|---|---|---|---|
| `sent` | `opened_at IS NULL AND NOT shareExpired AND revoked_at IS NULL` | `"Shared with {recipient_name} · Sent {sent_at} · Not opened yet · {shareDaysRemaining} days left"` | `Open share` → share detail modal | — |
| `opened` | `opened_at IS NOT NULL AND download_count = 0 AND NOT shareExpired AND revoked_at IS NULL` | `"Shared with {recipient_name} · Opened {opened_at} · Not downloaded · {shareDaysRemaining} days left"` | `Open share` → share detail modal | — |
| `downloaded` | `download_count > 0 AND NOT shareExpired AND revoked_at IS NULL` | `"Shared with {recipient_name} · Downloaded {download_count}× · {shareDaysRemaining} days left"` | `Open share` → share detail modal | — |
| `expired` | `shareExpired AND revoked_at IS NULL` | `"Share expired · {recipient_name} {download_count > 0 ? 'downloaded' : 'never downloaded'} · Reshare"` | `Reshare` → Send wizard (pre-filled) | Confirm + send |
| `revoked` | `revoked_at IS NOT NULL` | `null` | — | — | Revoked shares are hidden from answer line |

**Stacking rule:** When a document has an active share AND is in a workflow state (e.g. `pending_review`), the workflow state answer line wins per priority order. The share indicator collapses to a small icon + tooltip on the pill row.

---

### 2.3 Service Lifecycle (`location_service_schedules` / `vendor_service_records`)

**Schema columns used:**

| Column | Type | Source Table | Notes |
|---|---|---|---|
| `next_service_date` | date | `location_service_schedules` | Next expected service date |
| `frequency` | text | `location_service_schedules` | Monthly, Quarterly, Semi-Annual, Annual |
| `vendor_id` | uuid, nullable | `location_service_schedules` | FK to vendors |
| `service_type` | text | `location_service_schedules` | Hood Cleaning, Fire Suppression Test, etc. |
| `last_completed_at` | timestamptz | `vendor_service_records` (latest) | Most recent service record |
| `completed_count` | integer | Aggregate COUNT of `vendor_service_records` | Total historical completions |
| `last_invoice_amount` | numeric | `vendor_service_records` (latest) | Most recent cost |
| `contract_rate` | numeric | `location_service_schedules` | Expected cost per service |
| `pillar` | text | `location_service_schedules` | food_safety, fire_safety |
| `compliance_reference` | text | `location_service_schedules` | "NFPA 96", "CalCode 114149", etc. |
| `acknowledged_at` | timestamptz, nullable | `location_service_schedules` | At-risk acknowledgment |
| `deferred_until` | date, nullable | `location_service_schedules` | Deferred cycle skip |

**Derived fields:**

| Helper | Formula |
|---|---|
| `daysUntilService(date)` | Same as `daysUntil()` |
| `daysOverdue(date)` | Same as `daysAgo()` |
| `vendorAssigned(vendorId)` | `vendorId !== null` |

---

#### Service status × vendor assigned / completed_count variants

| Status | Variant | Formula | Click-1 | Click-2 |
|---|---|---|---|---|
| `current` | Vendor assigned, completed_count > 0 | `"Last: {last_completed_at} · Next: {next_service_date} · {vendorName}"` | — | — |
| `current` | Vendor assigned, completed_count = 0 | `"First service: {next_service_date} · {vendorName} assigned"` | `Schedule` → schedule modal | Confirm |
| `current` | No vendor | `"Next: {next_service_date} · No vendor assigned · Assign vendor"` | `Assign vendor` → vendor picker | Select + confirm |
| `upcoming` | Vendor assigned | `"Due in {daysUntilService} days · {next_service_date} · {vendorName}"` | `Schedule` → schedule modal | Confirm |
| `upcoming` | No vendor | `"Due in {daysUntilService} days · {next_service_date} · Assign vendor"` | `Assign vendor` → vendor picker | Select + confirm |
| `at-risk` | Vendor assigned, not acknowledged | `"Due in {daysUntilService} days · {vendorName} · Not confirmed · Acknowledge"` | `Acknowledge` → ack confirmation | Confirm |
| `at-risk` | Vendor assigned, acknowledged | `"Due in {daysUntilService} days · {vendorName} · Acknowledged {acknowledged_at}"` | — | — |
| `at-risk` | No vendor | `"Due in {daysUntilService} days · No vendor assigned · Assign vendor"` | `Assign vendor` → vendor picker | Select + confirm |
| `overdue` | Vendor assigned | `"{daysOverdue} days overdue · {vendorName} · Schedule"` | `Schedule` → schedule modal | Confirm |
| `overdue` | No vendor | `"{daysOverdue} days overdue · No vendor assigned · Assign vendor"` | `Assign vendor` → vendor picker | Select + confirm |
| `deferred` | Any | `"Deferred until {deferred_until} · {reason \|\| 'No reason provided'}"` | `Resume` → un-defer confirmation | Confirm |

**Schema gap:** `acknowledged_at` and `deferred_until` columns do not currently exist on `location_service_schedules`. The preview mock data tracks `acknowledged` (boolean) and calls `onDefer` / `onAcknowledge` as handlers but the schema has no backing columns. **Follow-up ticket required** to add:
- `location_service_schedules.acknowledged_at` (timestamptz, nullable)
- `location_service_schedules.deferred_until` (date, nullable)
- `location_service_schedules.deferred_reason` (text, nullable)

**Schema gap:** `completed_count` is an aggregate computed from `COUNT(vendor_service_records)` per schedule. No denormalized column exists. The preview used `docCount` (renamed `completed_count`) as a pre-computed field on each service. **Decision needed:** compute client-side from fetched records, or denormalize into `location_service_schedules.completed_count` with trigger.

---

### 2.4 Task Lifecycle (`task_instances`)

**Schema columns used:**

| Column | Type | Notes |
|---|---|---|
| `title` | text | Task title (from definition or override) |
| `task_type` | text | temperature_log, checklist, corrective_action, document_upload, equipment_check, vendor_service, custom |
| `status` | text | pending, in_progress, completed, overdue, skipped, escalated |
| `due_at` | timestamptz | When the task is due |
| `assigned_to` | uuid | FK to user_profiles |
| `completed_at` | timestamptz, nullable | When completed |
| `completed_by` | uuid, nullable | Who completed it |
| `completion_note` | text, nullable | Completion notes |
| `escalation_level` | integer | Current escalation tier |
| `last_escalated_at` | timestamptz, nullable | When last escalated |
| `shift` | text, nullable | Shift assignment |
| `date` | date | Task date |

**Derived fields:**

| Helper | Formula |
|---|---|
| `assigneeName(id)` | Lookup `user_profiles.full_name` |
| `minutesUntilDue(due_at)` | `Math.max(0, Math.ceil((due_at - now) / 60000))` |
| `minutesOverdue(due_at)` | `Math.max(0, Math.ceil((now - due_at) / 60000))` |
| `formatDuration(mins)` | `mins >= 60 ? "{h}h {m}m" : "{m}m"` |

---

#### Task status formulas

| Status | Formula | Click-1 | Click-2 |
|---|---|---|---|
| `pending` | `"Due {due_at} · {assigneeName} · {formatDuration(minutesUntilDue)} left"` | `Start` → mark in_progress | Confirm |
| `in_progress` | `"Started by {assigneeName} · Due in {formatDuration(minutesUntilDue)}"` | `Complete` → completion modal (note optional) | Save |
| `completed` | `"Completed {completed_at} by {completedByName} {completion_note ? '· ' + completion_note : ''}"` | — | — |
| `overdue` | `"Overdue by {formatDuration(minutesOverdue)} · {assigneeName} · Start"` | `Start` → mark in_progress | Confirm |
| `skipped` | `"Skipped · {completion_note \|\| 'No reason provided'}"` | — | — |
| `escalated` | `"Escalated (level {escalation_level}) · {assigneeName} · {formatDuration(minutesOverdue)} overdue"` | `Start` → mark in_progress | Confirm |

---

### 2.5 Calendar Event Lifecycle (`calendar_events`)

**Schema columns used:**

| Column | Type | Notes |
|---|---|---|
| `title` | text | Event title |
| `type` | text | Default: 'vendor' |
| `category` | text, nullable | Event category |
| `date` | date | Event date |
| `start_time` | time, nullable | Start time |
| `end_time` | time, nullable | End time |
| `description` | text, nullable | Event description |

**Status derivation (client-side — no status column exists):**

| Derived Status | Condition | Formula | Click-1 | Click-2 |
|---|---|---|---|---|
| `scheduled` | `date > today` | `"{title} · {date} {start_time \|\| ''} · {daysUntil(date)} days away"` | `Reschedule` → date picker | Confirm |
| `today` | `date = today AND (start_time IS NULL OR start_time > now)` | `"{title} · Today {start_time \|\| 'all day'}"` | `View` → event detail | — |
| `in_progress` | `date = today AND start_time <= now AND (end_time IS NULL OR end_time > now)` | `"{title} · In progress · Started {start_time}"` | `Complete` → mark done | Confirm |
| `completed` | Manual completion flag (see gap below) | `"{title} · Completed"` | — | — |
| `missed` | `date < today AND not completed` | `"{title} · Missed {daysAgo(date)} days ago · Reschedule"` | `Reschedule` → date picker | Confirm |

**Schema gap:** `calendar_events` has no `status`, `completed_at`, or `completed_by` columns. Event completion and missed-state tracking require adding:
- `calendar_events.status` (text, CHECK: scheduled, in_progress, completed, missed, rescheduled; default 'scheduled')
- `calendar_events.completed_at` (timestamptz, nullable)
- `calendar_events.completed_by` (uuid, nullable)
- `calendar_events.rescheduled_from` (date, nullable) — original date before reschedule

**Follow-up ticket required** before calendar answer lines can render.

---

### 2.6 Quick Actions Context Surfacing

Quick Actions are role-based buttons in the header bar (defined in `src/components/layout/QuickActionsBar.tsx`). Each button currently has a static label. The answer-line pattern extends to Quick Actions by adding a context subtitle below each action label indicating what it will do for the **current** context.

**Rule:** Each Quick Action button must show a one-line data-driven subtitle based on the user's current outstanding items.

| Action | Role | Context Formula | Source Query |
|---|---|---|---|
| Checklists | owner_operator, chef, kitchen_manager | `"{N} due today · {M} overdue"` | `COUNT(task_instances) WHERE task_type='checklist' AND date=today GROUP BY status` |
| Temps | owner_operator, chef, kitchen_manager | `"{N} readings due · {M} overdue"` | `COUNT(task_instances) WHERE task_type='temperature_log' AND date=today GROUP BY status` |
| Fire Safety | owner_operator, facilities_manager | `"{N} services due this month"` | `COUNT(location_service_schedules) WHERE pillar='fire_safety' AND next_service_date <= end_of_month` |
| Equipment | facilities_manager | `"{N} items need attention"` | `COUNT(equipment) WHERE status IN ('needs_repair','overdue_pm')` |
| Vendors | facilities_manager | `"{N} docs expiring · {M} overdue"` | `COUNT(compliance_documents) WHERE category='business' AND status IN ('expiring','expired')` |
| Compliance | compliance_manager | `"{N} items need review"` | `COUNT(compliance_documents) WHERE status='pending_review'` |
| Reporting | owner_operator, executive | `null` | No actionable count — steady state |
| Settings | executive | `null` | No actionable count |

**Schema gap:** Quick Action context requires aggregation queries that are not currently implemented. The queries above are the spec — implementation is a follow-up ticket. Quick Actions currently route to static pages with no context subtitle.

---

## SECTION 3 — Reference Implementation

### TypeScript Signature

```typescript
// src/lib/answerLine.ts

type Domain = 'document' | 'share' | 'service' | 'task' | 'calendar' | 'quickAction';
type DocumentCategory = 'kitchen' | 'employee' | 'service' | 'business';
type DocumentStatus = 'current' | 'expiring' | 'expired' | 'pending_review' | 'requested' | 'overdue';
type ShareState = 'sent' | 'opened' | 'downloaded' | 'expired' | 'revoked';
type ServiceStatus = 'current' | 'upcoming' | 'at-risk' | 'overdue' | 'deferred';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped' | 'escalated';
type CalendarStatus = 'scheduled' | 'today' | 'in_progress' | 'completed' | 'missed';

interface AnswerLineResult {
  text: string;
  actionVerb: string | null;  // null = no action available
  actionHandler: string;      // handler name, e.g. "onResend", "onReviewNow"
}

function answerLine(
  domain: Domain,
  status: string,
  data: Record<string, unknown>,
  options?: { category?: string }
): AnswerLineResult | null;
```

### Helper Functions

```typescript
// src/lib/answerLine.ts — shared helpers

function daysUntil(dateStr: string | null): number | string {
  if (!dateStr || dateStr === '—') return '—';
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function daysAgo(dateStr: string | null): number | string {
  if (!dateStr || dateStr === '—') return '—';
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function tokenDaysRemaining(requestAtStr: string | null): number {
  if (!requestAtStr) return 5;
  const sentMs = new Date(requestAtStr).getTime();
  const expiryMs = sentMs + 5 * 86400000;  // 5 calendar days
  const remainingMs = expiryMs - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 86400000));
}

function shareDaysRemaining(expiresAtStr: string | null): number {
  if (!expiresAtStr) return 0;
  const ms = new Date(expiresAtStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}
```

### Document Domain Switch (prototype extracted from Documents Preview v2)

```typescript
function documentAnswerLine(
  category: DocumentCategory,
  status: DocumentStatus,
  doc: {
    expiry_date?: string | null;
    subject_user_name?: string | null;
    vendor_name?: string | null;
    type?: string;
    request?: { at?: string; stage?: string; viewed_at?: string } | null;
  }
): AnswerLineResult | null {

  if (category === 'kitchen') {
    if (status === 'current')
      return { text: doc.expiry_date ? `Expires ${doc.expiry_date}` : 'No expiration on file', actionVerb: null, actionHandler: '' };
    if (status === 'expiring')
      return { text: `Expires in ${daysUntil(doc.expiry_date)} days`, actionVerb: 'Renew', actionHandler: 'onUploadReplacement' };
    if (status === 'expired')
      return { text: `Expired ${daysAgo(doc.expiry_date)} days ago`, actionVerb: 'Upload', actionHandler: 'onUploadReplacement' };
    return null;
  }

  if (category === 'employee') {
    const user = doc.subject_user_name || '';
    if (status === 'current')
      return { text: doc.expiry_date ? `Expires ${doc.expiry_date} · ${user}` : user, actionVerb: null, actionHandler: '' };
    if (status === 'expiring')
      return { text: `Expires in ${daysUntil(doc.expiry_date)} days · ${user}`, actionVerb: 'Renew', actionHandler: 'onUploadReplacement' };
    if (status === 'expired')
      return { text: `Expired ${daysAgo(doc.expiry_date)} days ago · ${user}`, actionVerb: 'Upload', actionHandler: 'onUploadReplacement' };
    return null;
  }

  if (category === 'service') {
    const v = doc.vendor_name || 'No vendor assigned';
    if (status === 'current')
      return { text: `Next: ${doc.type} · ${doc.expiry_date} · ${v}`, actionVerb: null, actionHandler: '' };
    if (status === 'expiring')
      return { text: `${doc.type} due in ${daysUntil(doc.expiry_date)} days · ${doc.vendor_name ? doc.vendor_name + ' scheduled' : 'No vendor assigned'}`,
        actionVerb: doc.vendor_name ? 'Schedule' : 'Assign vendor', actionHandler: doc.vendor_name ? 'onSchedule' : 'onAssignVendor' };
    if (status === 'expired')
      return { text: `${doc.type} ${daysAgo(doc.expiry_date)} days overdue · ${v}`,
        actionVerb: doc.vendor_name ? 'Follow up' : 'Assign vendor', actionHandler: doc.vendor_name ? 'onFollowUp' : 'onAssignVendor' };
    if (status === 'pending_review')
      return { text: `Uploaded ${doc.request?.at} by ${doc.vendor_name} · Review now`, actionVerb: 'Review now', actionHandler: 'onReviewNow' };
    if (status === 'requested')
      return { text: `Requested ${doc.request?.at} · Token expires in ${tokenDaysRemaining(doc.request?.at)} days · Resend`,
        actionVerb: 'Resend', actionHandler: 'onResend' };
    if (status === 'overdue')
      return { text: 'Token expired · Resend now', actionVerb: 'Resend now', actionHandler: 'onResend' };
    return null;
  }

  if (category === 'business') {
    if (status === 'current')
      return { text: doc.expiry_date ? `Expires ${doc.expiry_date}` : 'No expiration on file', actionVerb: null, actionHandler: '' };
    if (status === 'expiring')
      return { text: `Expires in ${daysUntil(doc.expiry_date)} days · ${doc.vendor_name} to renew`,
        actionVerb: 'Renew', actionHandler: 'onRequestRenewal' };
    if (status === 'expired')
      return { text: `Expired ${daysAgo(doc.expiry_date)} days ago · ${doc.vendor_name}`,
        actionVerb: 'Follow up', actionHandler: 'onRequestRenewal' };
    if (status === 'pending_review')
      return { text: `Uploaded ${doc.request?.at} by ${doc.vendor_name} · Review now`, actionVerb: 'Review now', actionHandler: 'onReviewNow' };
    if (status === 'requested')
      return { text: `Requested ${doc.request?.at} · Awaiting vendor`, actionVerb: 'Resend', actionHandler: 'onResend' };
    return null;
  }

  return null;
}
```

### Fallback Rules

| Scenario | Fallback |
|---|---|
| `expiry_date IS NULL` | Display "No expiration on file" (kitchen/business current), or omit expiry portion |
| `vendor_id IS NULL` | Display "No vendor assigned" + surface `Assign vendor` as action verb |
| `subject_user_id IS NULL` on employee doc | Should not occur (CHECK constraint enforces NOT NULL). If data error, omit subject name |
| `request IS NULL` on requested/pending_review doc | Display "Request details unavailable" — indicates data integrity issue |
| `completed_count = 0` on service | "First service" variant instead of "Last: ..." |
| Date field is unparseable | Return `"—"` from date helpers; answer line renders with "—" in place of number |

---

## SECTION 4 — Forbidden Patterns

### 4.1 Generic Status Prose

**NEVER** use these patterns in an answer line. They restate the pill and add zero information:

| Forbidden | Why |
|---|---|
| "Valid and on file" | The `Current` pill already says this |
| "Request sent — awaiting upload" | The `Requested` pill already says this |
| "Certification valid and on file" | Same information as `Current` pill |
| "Service report on file" | Same information as `Current` pill |
| "Vendor credential on file" | Same information as `Current` pill |
| "Expires soon — schedule renewal" | Which date? Which vendor? How many days? |
| "Expired — upload renewal" | When did it expire? Who needs to act? |
| "Request overdue — follow up with vendor" | Which vendor? When was it sent? What token state? |

### 4.2 Multi-Button Action Rows

When one action is obviously the next step, do not present multiple equal-weight buttons. The answer line surfaces ONE action verb — the highest-priority next step. Additional actions live in the overflow menu (⋯), not competing for attention.

### 4.3 Status Pills Without Answer Lines

Every status pill MUST have a paired answer line that returns a non-null string, EXCEPT for states that legitimately cannot occur in a given category (e.g. kitchen × pending_review). Those must return `null` explicitly in the code with a comment explaining why.

### 4.4 Answer Lines Referencing Unloaded Fields

Every field referenced in an answer line formula MUST be included in the query that fetched the row. If a formula needs `vendor.name` but the query only fetched `vendor_id`, the answer line would force a re-fetch — this is forbidden. The query spec must include all fields the answer line needs.

**Implication for query design:** Document queries must JOIN or embed:
- `user_profiles.full_name` for `subject_user_id` (employee docs)
- `vendors.name` for `vendor_id` (service/business docs)
- Latest `compliance_document_requests` row for request stage/timing
- Active `compliance_document_send_records` row for share state

### 4.5 Workflow + Expiration Displayed at Equal Weight

When a document is both `expiring` (30 days to expiry) AND has an active `pending_review` workflow, do NOT show both answer lines or blend them. Show the workflow answer line (higher priority per Principle 3). The expiration state is communicated by the pill color; the answer line handles the actionable workflow.

---

## SECTION 5 — Surface Compliance Checklist

For each surface in EvidLY, run this 4-question audit:

| # | Question | Pass Criteria |
|---|---|---|
| 1 | Does every status pill have an answer line? | Every pill on the surface pairs with a non-null answer line (or explicitly returns null with documented reason) |
| 2 | Does the answer line pull real data, not generic prose? | Zero generic strings per Section 4.1 forbidden list |
| 3 | Does the answer line end with an action verb when an action is available? | Every actionable state has a verb from the glossary (Section 7) |
| 4 | Can the user complete the suggested action in 2 clicks? | Click-1 = answer line action verb. Click-2 = confirm/complete. No intermediate navigation |

### Surfaces to Audit (next ticket — no results yet)

| # | Surface | Expected Pill Count | Notes |
|---|---|---|---|
| 1 | Documents page — Kitchen & Employee tab | 3 statuses (current, expiring, expired) × N docs | + employee category badge |
| 2 | Documents page — Vendor Service Records tab | 6 statuses × N docs | + request stage sub-pill |
| 3 | Documents page — Vendor Business Records tab | 5 statuses × N docs | + request stage sub-pill |
| 4 | Vendor Services — Heat map tiles | 5 tile states per location | Location-level aggregate |
| 5 | Vendor Services — Service cards (list view) | 5 service statuses × N services | + vendor docs compact pill |
| 6 | Vendor Services — All Services view | 5 statuses × N services (flat list) | Compact + normal density |
| 7 | Vendor Services — Vendor Docs Panel | 5 vendor doc health states | Stacked on service cards |
| 8 | Tasks page | 6 task statuses × N instances | Per-shift grouping |
| 9 | Calendar page | 5 event states × N events | Derived status (schema gap) |
| 10 | Compliance Overview cards | Aggregate status per compliance category | Dashboard-level rollup |
| 11 | Dashboard widgets — Due Soon | Service/task items due within 7 days | Cross-domain (services + tasks + docs) |
| 12 | Dashboard widgets — Intelligence cards | Jurisdiction-sourced alerts | No answer line (external data) |
| 13 | Dashboard widgets — K2C | Kitchen-to-compliance funnel | Aggregate metrics, not per-row pills |
| 14 | Dashboard widgets — Alerts | Cross-domain alert items | Each alert needs pill + answer line |
| 15 | Quick Actions bar items | N actions per role | Context subtitle per Section 2.6 |
| 16 | Vendor Network — list rows | Vendor health state per vendor | Aggregate from vendor business docs |
| 17 | Vendor Network — Vendor detail tabs | Per-doc pills on vendor detail | Same as Documents business tab |
| 18 | Equipment cards | Equipment status pills | Equipment-specific lifecycle |
| 19 | Notifications | Notification items with status context | Answer line = notification body |

---

## SECTION 6 — Stacked Lifecycle Rendering

When a document or service has multiple active workflows simultaneously:

### Rendering Rules

1. **Primary pill stays.** The document's own status pill (current/expiring/expired/pending_review/requested/overdue) always renders in its standard position.

2. **Answer line picks the higher-urgency workflow.** Per the priority table in Principle 3, the answer line shows the single most actionable workflow. Example: a document that is `current` + has an active share → answer line shows the share state, not "Expires Dec 31".

3. **Secondary indicator for the other lifecycle.** A small icon + tooltip appears on the pill row (NOT a second answer line). Examples:
   - Share active on a current doc: small `Send` icon with tooltip "Shared with EHD · 8 days left"
   - Pending review on an expiring doc: answer line shows "Uploaded May 5 by CPP · Review now"; expiration shows as amber pill color only

4. **Never render two answer lines.** One pill, one answer line, one action verb. The secondary lifecycle is always collapsed to an icon.

### Priority Resolution Example

| Primary Status | Active Workflow | Pill Shows | Answer Line Shows | Secondary Icon |
|---|---|---|---|---|
| `current` | Share (sent, not opened) | Current (green) | Share answer line | — |
| `expiring` | Share (opened) | Expiring (amber) | Share answer line | — |
| `current` | pending_review | Pending Review (blue) | Review answer line | — |
| `expiring` | pending_review | Pending Review (blue) | Review answer line | Amber clock tooltip: "Also expiring in N days" |
| `expired` | requested | Requested (amber) | Request answer line | Red alert tooltip: "Doc also expired" |

---

## SECTION 7 — Glossary of Action Verbs

Each verb maps to exactly one click-1 destination. Verbs are standardized across all surfaces.

| Verb | Click-1 Destination | Domain(s) | Notes |
|---|---|---|---|
| `Resend` | Resend token confirmation modal | Document (requested) | Re-sends the upload request email |
| `Resend now` | Resend token confirmation modal (pre-confirmed urgency) | Document (overdue) | Same as Resend but copy emphasizes urgency |
| `Review now` | Accept/Reject modal (two buttons + optional reason field) | Document (pending_review) | Opens inline review — not a separate page |
| `Schedule` | Schedule next service modal (date picker + vendor confirm) | Service (current, upcoming, overdue) | Pre-fills vendor and frequency |
| `Assign vendor` | Vendor picker modal (list of org's vendors for this service type) | Service (no vendor), Document (no vendor) | Replaces "Vendor Network (soon)" placeholder |
| `Acknowledge` | Acknowledge confirmation modal (suppress at-risk until next due) | Service (at-risk) | Sets `acknowledged_at` on schedule |
| `Defer` | Defer modal (reason text field + resume date picker) | Service (any active) | Sets `deferred_until` + `deferred_reason` |
| `Resume` | Un-defer confirmation modal | Service (deferred) | Clears `deferred_until` |
| `Upload` | File upload modal (drag-drop + metadata) | Document (expired kitchen/employee) | Org self-uploads replacement doc |
| `Renew` | File upload modal (pre-filled as renewal) | Document (expiring) | Same upload flow, labeled as renewal |
| `Reshare` | Send to Third Party wizard (pre-filled with previous recipient/docs) | Share (expired) | Re-creates share with same config |
| `Open share` | Share detail modal (recipient, open/download tracking, revoke button) | Share (sent, opened, downloaded) | Read-only detail with revoke option |
| `Download` | Direct file download (no modal — browser download) | Document (any with file) | Single click — no confirmation needed |
| `Follow up` | Note/call log modal (text field + optional tag) | Document (expired business), Service (overdue with vendor) | Logs follow-up action |
| `Start` | Mark task as in_progress (inline — no modal if simple) | Task (pending, overdue, escalated) | Single-click state change |
| `Complete` | Task completion modal (optional note + optional photo) | Task (in_progress) | Saves completion record |
| `Reschedule` | Date picker modal | Calendar (missed, scheduled) | Updates event date |
| `View` | Event detail modal/panel | Calendar (today) | Read-only detail |

---

## SECTION 8 — Schema Gaps Summary

The following schema or code gaps must be closed before the answer-line pattern can fully render on all surfaces. Each gap is a follow-up ticket.

| # | Gap | Table | Missing Column(s) | Blocks Surface |
|---|---|---|---|---|
| 1 | Service acknowledgment tracking | `location_service_schedules` | `acknowledged_at` (timestamptz, nullable) | Vendor Services — at-risk answer line |
| 2 | Service deferral tracking | `location_service_schedules` | `deferred_until` (date, nullable), `deferred_reason` (text, nullable) | Vendor Services — deferred answer line |
| 3 | Service completed_count | `location_service_schedules` or client aggregate | `completed_count` (integer) or client COUNT query | Vendor Services — current/first-service variant |
| 4 | Calendar event status | `calendar_events` | `status` (text), `completed_at` (timestamptz), `completed_by` (uuid), `rescheduled_from` (date) | Calendar page |
| 5 | Quick Action context queries | Client-side aggregation | No schema change — requires query implementation | Quick Actions bar |
| 6 | Share state derivation | Client-side | No schema change — requires client logic to derive share state from `compliance_document_send_records` columns | Documents — stacked share lifecycle |
| 7 | Document query JOIN enrichment | Client-side query | Must JOIN `vendors.name`, `user_profiles.full_name`, latest `compliance_document_requests` row | All document answer lines |

---

*End of ANSWER-LINE-PATTERN.md. This document is the spec. Every subsequent ticket touching a UI surface must reference this doc.*
