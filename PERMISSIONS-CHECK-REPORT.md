# PERMISSIONS-CHECK-REPORT

**Auditor:** Claude Opus 4.6
**Date:** 2026-05-09
**Mode:** Read-only — no mutations

---

## A. What RolesPermissions Controls Today

The RolesPermissions page (`src/pages/RolesPermissions.tsx`) controls **both nav visibility and functional capabilities** through a single granular permission key system. Permission keys use a prefix convention: `sidebar.*` controls nav item visibility, `dashboard.*` controls dashboard widget visibility, `bottom.*` controls mobile bottom-bar buttons, `page.*` controls direct page access, and `action.*` / `permission.*` / `billing.*` / `org.*` control functional capabilities. There are 90+ individual permission keys across 15 categories (Dashboard, Food Safety, Fire Safety, Vendor Management, Team, Locations, Reports, Compliance Intelligence, Equipment & IoT, Incidents & Compliance, Food Recovery, USDA K-12, Training, Tools, Settings, Administration). The UI lets an admin select a role, toggle individual permissions on/off for that role (stored as org-level overrides in `role_permissions` table), and add per-user exceptions via `user_permission_overrides`. An audit log tracks every change.

---

## B. Scope: Org-Admin vs Platform-Admin

**Customer-tailoring only.** The permissions system is scoped entirely to `organization_id`. Each table (`role_permissions`, `user_permission_overrides`, `permission_audit_log`) has an `organization_id` foreign key with a unique constraint of `(organization_id, role, permission_key)`. When an owner_operator toggles `sidebar.ai-insights` OFF for the `chef` role, it only affects chefs in *that* org.

Access to the RolesPermissions page is gated to `ADMIN_ONLY_ROLES`: `platform_admin`, `owner_operator`, `executive` (`permissionCategories.ts:56–60`). An owner can customize their own org's permissions. Arthur (platform_admin) can customize permissions for whichever org he's logged into, but **there is no "set defaults across all customer orgs" mechanism** in this system.

A separate `evidly_role_permissions` table exists for internal admin staff roles (super_admin, admin, support, sales) — this is platform-scoped but controls admin console access, not customer features.

---

## C. Tables and Columns

### Permissions Tables (org-scoped)

- **`role_permissions`** — `supabase/migrations/20260317000001_permissions_tables.sql`
  - `organization_id` uuid FK → organizations
  - `role` varchar(50)
  - `permission_key` varchar(255)
  - `granted` boolean
  - `modified_by` uuid FK → auth.users
  - UNIQUE: `(organization_id, role, permission_key)`
  - RLS: org members read; owner/exec manage

- **`user_permission_overrides`** — same migration
  - `organization_id` uuid FK → organizations
  - `user_id` uuid FK → auth.users
  - `permission_key` varchar(255)
  - `granted` boolean
  - `reason` text
  - `granted_by` uuid FK → auth.users
  - UNIQUE: `(organization_id, user_id, permission_key)`

- **`permission_audit_log`** — same migration
  - `organization_id`, `changed_by`, `change_type`, `target_role`, `target_user_id`, `permission_key`, `old_value`, `new_value`, `reason`, `created_at`

### Feature Flags Tables (platform-scoped)

- **`feature_flags`** — `supabase/migrations/20260518000000_feature_flags.sql`
  - `key` text UNIQUE — flag identifier
  - `name` text — display name
  - `description` text
  - **`route` text** — associated route path
  - **`section` text** — associated sidebar section
  - **`is_enabled` boolean DEFAULT false** — master switch
  - **`trigger_type` text** — `always_on` | `fixed_date` | `relative_date` | `rolling_window` | `event_delay` | `time_window` | `fiscal_renewal` | `criteria`
  - **`date_config` jsonb** — `{ go_live, go_live_time, early_access, days, unit, scope, start, end, after_end, delay_days, unlock_on }`
  - `criteria` jsonb — criteria rules array
  - `criteria_logic` text — `all` | `any`
  - **`visible_to` text** — `all` | `admin_only` | `role_filtered`
  - **`allowed_roles` text[]** — role whitelist when `visible_to = 'role_filtered'`
  - `plan_tiers` text[] — tier restriction
  - `disabled_message` text — shown when feature is locked
  - `disabled_message_title` text
  - `sort_order` integer

- **`feature_flag_unlocks`** — same migration
  - `flag_key` text FK → feature_flags(key)
  - `user_id` uuid FK → auth.users
  - `org_id` uuid
  - `unlocked_at` timestamptz
  - `unlock_reason` text

- **`feature_flag_audit`** — same migration
  - `flag_key`, `changed_by`, `change_type`, `old_value` jsonb, `new_value` jsonb, `changed_at`

- **`feature_flag_notifications`** — `20260519000000_feature_flag_notifications.sql`
  - `flag_key`, `user_id`, `created_at`, `notified_at`

- **`feature_overrides`** — `20260313000000_create_feature_overrides.sql`
  - `org_id` uuid FK → organizations
  - `feature_id` text
  - `enabled` boolean
  - UNIQUE: `(org_id, feature_id)`
  - Purpose: Per-account kill-switch / override

---

## D. Does the Sidebar Read It Today?

**No.** Neither the permissions system nor the feature flags system is consumed by the sidebar.

- `Sidebar.tsx` — zero imports of `useRolePermissions`, `isPermissionGranted`, `DEFAULT_PERMISSIONS`, `useFeatureFlag`, or `FeatureGate`. Confirmed by grep: no matches.
- `sidebarConfig.ts` — zero imports of any permissions or feature flag module. Confirmed by grep: no matches.

The sidebar renders sections based **solely** on the hardcoded `ROLE_SECTIONS` map in `sidebarConfig.ts` (line 343–352), filtered by `ROLE_ITEM_HIDES` (line 359–363) and `PROGRAMS_ORG_FILTER` (line 370–374). These are static TypeScript objects — not read from any database table.

**Consequence:** The `sidebar.*` permission keys (e.g., `sidebar.ai-insights`, `sidebar.jurisdiction-intelligence`) exist in `DEFAULT_PERMISSIONS` and can be toggled in the RolesPermissions UI, but toggling them has **zero effect** on what the sidebar actually renders. The customer sees the toggles and thinks they're controlling nav visibility, but the sidebar ignores them entirely.

---

## E. Scheduled-Enable Support

**Yes — comprehensive.** The `feature_flags` table supports 8 trigger types for delayed activation:

| Trigger Type | Pattern | Use Case |
|---|---|---|
| `always_on` | Master `is_enabled` toggle | Simple on/off — Arthur flips it when ready |
| `fixed_date` | `date_config.go_live` ISO timestamp | "Go live June 15 at 9 AM PT" |
| `relative_date` | `date_config.days` + `unit` + `scope` | "Available 30 days after org creation" |
| `time_window` | `date_config.start` / `end` + `after_end` | "Available only during Q3 2026" |
| `event_delay` | `date_config.delay_days` + `unlock_on` event | "Available 14 days after first checklist" |
| `rolling_window` | Stub — awaiting activity tracking | Future use |
| `fiscal_renewal` | `date_config.unlock_on` (next_renewal, upgrade) | Tied to billing cycle |
| `criteria` | `criteria` jsonb array + `criteria_logic` | "Must have 3+ locations and 5+ team members" |

The `useFeatureFlag` hook (`src/hooks/useFeatureFlag.ts`) evaluates all trigger types at runtime with a 60-second cache. The `FeatureGate` component (`src/components/feature-flags/FeatureGate.tsx`) renders 6 gate variants: ScheduledGate (countdown timer + "Notify me"), PendingGate (progress bar), CriteriaGate (unlock progress), RoleRestrictedGate, PlanRestrictedGate, DisabledGate.

The admin UI at `src/pages/admin/FeatureFlags.tsx` provides full CRUD for all flag configurations.

---

## F. Verdict for Arthur's Two Needs

### 1. Can the existing system hide LOCKED sections (Programs, Insights, Tools) at platform level for 6/2 launch?

**YES — but wiring is required.** The `feature_flags` table has `is_enabled`, `section`, and `route` columns. The `useFeatureFlag` hook evaluates flags. The admin UI controls them. However, the sidebar does not consume any of this today. To use it: insert feature flag rows for each LOCKED section with `is_enabled = false`, then wire `Sidebar.tsx` to check `useFeatureFlag` before rendering sections. No new tables or hooks needed — only sidebar integration code.

### 2. Can the existing system support "OFF by default, flip ON per-feature when data accuracy is confirmed" for the intel features?

**YES — this is exactly what the system was built for.** Insert one `feature_flags` row per intel feature (AI Insights, Inspection Forecast, Compliance Trends, Benchmarks, Team Leaderboard, Reporting, IoT Dashboard, Jurisdiction Intelligence, Jurisdiction Signals, Regulatory Updates) with `trigger_type = 'always_on'` and `is_enabled = false`. When Arthur validates data accuracy for a specific feature, he flips `is_enabled` to `true` in the admin FeatureFlags panel. The `useFeatureFlag` hook picks it up within 60 seconds. No deployment required.

---

## G. Recommendation

**Wire the sidebar to the existing `feature_flags` system — do not use the permissions system for this.** The permissions system is org-scoped (customer-tailoring), has no platform-level defaults, and the sidebar already ignores it. The feature flags system is platform-scoped, already has an admin UI, supports scheduled activation, and has the exact columns needed (`section`, `route`, `is_enabled`). The implementation path:

1. **Insert ~15 feature flag rows** — one per LOCKED section (`programs`, `insights`, `tools`) and one per intel feature (`ai-insights`, `inspection-forecast`, `compliance-trends`, `benchmarks`, `team-leaderboard`, `reporting`, `iot-dashboard`, `jurisdiction-intelligence`, `jurisdiction-signals`, `regulatory-updates`), all with `is_enabled = false`.

2. **Add one `useFeatureFlag` check in Sidebar.tsx** — before rendering each section, check if the section has a feature flag and if it's enabled. Filter out disabled sections/items. This is ~20 lines of code in one file.

3. **Arthur's workflow** — when data accuracy is confirmed for a feature, go to Admin → Feature Flags → find the flag → flip `is_enabled` to `true`. No code deploy, no migration, instant activation.

4. **Separately, fix the sidebar ↔ permissions disconnect** — the `sidebar.*` permission keys exist and customers can toggle them, but the sidebar ignores the toggles. This is a separate bug that should be addressed after launch, but it is not blocking for 6/2 because customers haven't been exposed to the RolesPermissions UI in production yet.

---

*Report generated 2026-05-09. Read-only audit — no files modified.*
