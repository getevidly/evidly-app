# Outreach / Series Layer — READ-ONLY Recon

## 1. outreach_steps table (migration 20261028000000)

### Full columns

| Column | Type | Constraints / Default |
|--------|------|-----------------------|
| id | UUID | PK, gen_random_uuid() |
| step_number | INTEGER | NOT NULL, UNIQUE |
| label | TEXT | NOT NULL |
| delay_days | INTEGER | NOT NULL DEFAULT 0 |
| trigger_type | TEXT | NOT NULL DEFAULT 'manual', CHECK ('manual','auto') |
| variant_scope | TEXT | NOT NULL DEFAULT 'both', CHECK ('cold','warm','both') |
| subject_template | TEXT | NOT NULL DEFAULT '' |
| body_template | TEXT | NOT NULL DEFAULT '' |
| content_hash | TEXT | NOT NULL DEFAULT '' |
| signed_off_by | UUID | FK auth.users(id) ON DELETE SET NULL |
| signed_off_at | TIMESTAMPTZ | nullable |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### Seeded rows

None. All steps are user-created via the admin UI (Panel 3).

A pseudo-step with `step_number = 0` and label `'__master_pause'` is upserted by
the master-pause toggle in OutreachTab. When `is_active = false`, pg_cron refuses
to send anything.

### Multi-step sequence concept

YES — fully implemented at schema + edge-function level:

- **Step ordering:** `step_number` (UNIQUE) defines sequence; steps fetched ORDER BY step_number.
- **Delay between steps:** `delay_days` — each step delays N days from recipient's `created_at`.
- **Per-step template:** Each step has its own `subject_template` and `body_template`. Tokens `{{COUNTY}}` and `{{FIRST_NAME}}` are substituted at send time.
- **Variant routing:** `variant_scope` controls whether a step fires for cold, warm, or both.
- **Trigger control:** `trigger_type` ('manual' or 'auto') determines manual send vs. pg_cron daily processing.
- **Content lock:** `content_hash` captures an immutable signature of subject_template, body_template, variant_scope, delay_days, trigger_type. Editing any field clears `signed_off_at`.

---

## 2. county_briefing_recipients — full columns

| Column | Type | Source migration |
|--------|------|------------------|
| id | UUID PK | 20261027 |
| email | TEXT NOT NULL | 20261027 |
| first_name | TEXT | 20261027 |
| last_name | TEXT | 20261029 (contact_spine) |
| org_name | TEXT | 20261027 |
| phone | TEXT | 20261029 (contact_spine) |
| county | TEXT NOT NULL | 20261027 |
| state_code | TEXT NOT NULL DEFAULT 'CA' | 20261027 |
| variant | TEXT NOT NULL DEFAULT 'cold' CHECK ('cold','warm') | 20261027 |
| approval_id | UUID FK county_briefing_approvals(id) | 20261027 |
| sent_at | TIMESTAMPTZ | 20261027 |
| resend_id | TEXT | 20261027 |
| unsub_token | TEXT UNIQUE | 20261031 (email_suppressions) |
| status | TEXT NOT NULL DEFAULT 'queued' CHECK ('queued','sent','failed','held') | 20261027 |
| hold_reason | TEXT | 20261027 |
| step_number | INTEGER NOT NULL DEFAULT 1 | 20261028 (outreach_steps) |
| organization_id | UUID FK organizations(id) | 20261029 (contact_spine) |
| user_id | UUID FK auth.users(id) | 20261029 (contact_spine) |
| created_at | TIMESTAMPTZ DEFAULT now() | 20261027 |

### Relationship to outreach_steps

`step_number` on recipients is a logical FK (not enforced by CONSTRAINT) to
`outreach_steps.step_number`. At send time (manual or cron), the edge function
fetches the step row matching the recipient's `step_number`, applies its
templates, delay, and variant_scope filter.

All existing recipients default to `step_number = 1`.

### How variant gets set

Set at **insert time** — never changes after insertion.

- **Single entry form** (Panel 2): Admin selects "Cold" or "Warm" from dropdown.
- **Paste mode** (Panel 2): Column 5 in the tab-separated paste is variant; defaults to 'cold' if omitted.

No automatic derivation from CPP client status or organization membership.

---

## 3. Admin tab surfacing county briefing / outreach

**Component:** `src/pages/admin/marketing/OutreachTab.tsx` (1,285 lines)

Six-panel outreach console:

| Panel | Name | What admin can do |
|-------|------|-------------------|
| 1 | How to run this | Read-only instructional guide |
| 2 | Add a recipient | Single entry form OR paste tab-separated rows. Sets email, first_name, org_name, county, variant. Inserts with status='queued', step_number=1. |
| 3 | Schedule + sign-off | View all steps ordered by step_number. Add new step (auto-increments). Edit label, trigger_type, delay_days, variant_scope, subject_template, body_template. Sign off (freezes step). Content hash enforced. |
| 4 | County review | Two-column: email preview (load HTML) + jurisdiction editor (grading_type, agency_name, tiers, verified status). Recipients sub-table per county. Approve button (creates county_briefing_approvals row). Send Now button (only if approved and not paused). Schedule button (disabled — "not wired yet"). |
| 5 | Cold handoff | Export queued cold recipients as CSV for HubSpot. Cold never sends from EvidLY. |
| 6 | Queue | Global recipient list (up to 100). Filter tabs: All / Queued / Held / Sent / Failed. Columns: email, county, variant badge, step, status, hold_reason, created_at. |

**Master pause toggle** above all panels: upserts step_number=0 `__master_pause` row.
Red when paused, green when active ("cron runs weekdays at 14:00 UTC").

---

## 4. Existing UI for multi-email series

**Panel 3 (Schedule + sign-off) is FULLY BUILT** for step ordering, delay
configuration, per-step template editing, variant routing, and sign-off gating.

No new UI is needed for defining or ordering a multi-email series.

**The only missing piece is recipient advancement between steps.** Today all
recipients stay at `step_number = 1` forever. The infrastructure exists (column,
step templates, delay logic), but there is no button or edge-function action to:

- Mark "Step 1 sent → advance to Step 2"
- Reset `status = 'queued'` for the next step's delay period

This would require:
- A UI button ("Advance to next step") in Panel 4 or Panel 6
- An edge function action (`advance-recipients-step`) that increments
  `step_number` and resets `status = 'queued'` for all sent recipients

---

## 5. How warm CPP leads enter county_briefing_recipients

**MANUAL ADMIN ENTRY ONLY.**

No CSV import. No bulk sync from CPP database. No automatic variant assignment.

Workflow:

1. Admin opens OutreachTab Panel 2 ("Add a recipient").
2. Single entry: types email, first_name, org_name, selects county, selects variant = "Warm".
3. OR paste rows: tab-separated block where column 5 = `warm`.
4. Edge function action `add-recipients` inserts rows with variant from admin input, status='queued', unsub_token=crypto.randomUUID().

At send time, the edge function checks `evidly_client_invites` for an invite
token at the recipient's email. If no invite found, holds with reason
"No invite on file for this email". If found, looks up `organization_id` →
`organizations.access_via` ('cpp_client' or 'signed_on_directly').
