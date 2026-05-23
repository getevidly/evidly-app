# UI-USER-AUDIT-REPORT

**Auditor:** Claude Opus 4.6
**Date:** 2026-05-09
**Mode:** Read-only — no mutations
**Repo:** `C:\Users\newpa\OneDrive\Desktop\evidly-app`

---

## 1. Executive Summary

| Status | Count | Items |
|--------|-------|-------|
| ✅ OK | 17 | dashboard, complianceOverview, tasks, documents, kitchenToCommunity, fs-overview, fs-temp, fs-checklists, fs-haccp, fr-overview, ju-regulatory, ju-signals, ve-network, ad-locations, ad-team, ad-roles, ad-import, ad-settings |
| 🟡 Caveat | 5 | calendar, fs-corrective, fr-calendar, ad-equipment, ad-iot |
| 🔴 Broken | 9 | fs-incidents, fs-self, fr-incidents, fr-corrective, fr-deficiencies, ju-intel, ve-services, ad-integrations |
| ❓ Unknown | 0 | — |

### LAUNCH BLOCKERS

1. **🔴 RequireAdmin gates 3 LIVE routes** — `/integrations`, `/services`, `/self-inspection` are inside `<RequireAdmin>` (App.tsx:705–812). Non-admin users see sidebar links but get bounced to `/dashboard`. Affects: `ad-integrations`, `ve-services`, `fs-self`.

2. **🔴 Pillar param ignored on 5 shared pages** — IncidentLog, CorrectiveActions, Deficiencies, SelfAudit, Calendar do not read `?pillar=`. Fire Safety sidebar links pass `?pillar=fire` but pages show unfiltered cross-pillar data. Affects: `fs-incidents`, `fr-incidents`, `fr-corrective`, `fr-deficiencies`.

3. **🔴 LOCKED sections (Programs, Insights, Tools) are NOT feature-flag-gated** — All three render in sidebar for every role that has them in `ROLE_SECTIONS`. No flag check exists. Normal customers see LOCKED items.

4. **🔴 ju-intel page file untracked** — `src/pages/JurisdictionIntelligence.tsx` exists locally but is `??` (untracked) in git. It won't deploy to PROD. Route loads will crash with a missing module.

---

## 2. LIVE Per-Item Table (31 rows)

Legend: **1** Route registered · **2** File exists · **3** Route→file match · **4** Export correct · **5** Pillar consumed · **6** Hook returns data

### Top-Level (6)

| ID | Label | 1 | 2 | 3 | 4 | 5 | 6 | Notes |
|---|---|---|---|---|---|---|---|---|
| dashboard | Dashboard | ✅ L625 | ✅ `Dashboard.tsx` | ✅ | ✅ Named | N/A | ✅ `useSignalNotifications`, `useActiveBanner`, `useDashboardPreferences` | |
| complianceOverview | Compliance Overview | ✅ L698 | ✅ `ComplianceOverview.tsx` | ✅ | ✅ Named | N/A | ✅ Direct supabase queries (`inspection_reports`, `corrective_actions`) | |
| tasks | Tasks | ✅ L823 | ✅ `TaskManager.jsx` | ✅ | ✅ Default | N/A | ✅ `useTaskInstances`, `useTaskDefinitions`, `useOrgMembers` | |
| calendar | Calendar | ✅ L669 | ✅ `Calendar.tsx` | ✅ | ✅ Named | N/A | 🟡 Has hardcoded `LOCATIONS` demo array; `useOperatingHours` for real data | |
| documents | Documents | ✅ L637 | ✅ `Documents.tsx` | ✅ | ✅ Named | N/A | ✅ Direct supabase queries | |
| kitchenToCommunity | Kitchen to Community | ✅ L566 | ✅ `KitchenToCommunity.tsx` | ✅ | ✅ Default | N/A | ✅ Static content page — no data hooks needed | |

### Food Safety (7)

| ID | Label | 1 | 2 | 3 | 4 | 5 | 6 | Notes |
|---|---|---|---|---|---|---|---|---|
| fs-overview | Overview | ✅ L627 | ✅ `foodSafety/Overview.jsx` | ✅ | ✅ Default | N/A | ✅ Supabase queries, demo-mode aware | |
| fs-temp | Temperatures | ✅ L633 | ✅ `TempLogs.tsx` | ✅ | ✅ Named | N/A | ✅ Supabase + IoT demo data | |
| fs-checklists | Checklists | ✅ L635 | ✅ `Checklists.tsx` | ✅ | ✅ Named | N/A | ✅ Supabase queries (templates, instances) | |
| fs-haccp | HACCP | ✅ L646 | ✅ `HACCP.tsx` | ✅ | ✅ Named | N/A | ✅ Supabase queries | |
| fs-incidents | Incidents | ✅ L648 | ✅ `IncidentLog.tsx` | ✅ | ✅ Named | 🔴 No `useSearchParams`; ignores `?pillar=food` | ✅ Supabase queries | Sidebar passes `?pillar=food` but page shows ALL incidents |
| fs-corrective | Corrective Actions | ✅ L825 | ✅ `CorrectiveActions.tsx` | ✅ | ✅ Named | 🔴 Reads `location` + `from` params; ignores `?pillar=food` | 🟡 `CA_SYSTEM_TEMPLATES`, `DEMO_TEAM_MEMBERS` — demo data dominant | |
| fs-self | Self-Inspection | ✅ L736 | ✅ `SelfAudit.tsx` | ✅ | ✅ Named | 🔴 Reads `location` param; ignores `?pillar=food` | 🟡 `useJurisdiction` + demo jurisdictions | **🔴 Inside `<RequireAdmin>` — non-admin users bounced to /dashboard** |

### Fire Safety (5)

| ID | Label | 1 | 2 | 3 | 4 | 5 | 6 | Notes |
|---|---|---|---|---|---|---|---|---|
| fr-overview | Overview | ✅ L676 | ✅ `fireSafety/Overview.jsx` | ✅ | ✅ Default | N/A | ✅ Supabase queries, demo-mode aware | |
| fr-calendar | Calendar | ✅ L669 | ✅ `Calendar.tsx` (shared) | ✅ | ✅ Named | 🟡 Sidebar path `/calendar` has NO `?pillar=fire` param — intentional per locked decision? | 🟡 Demo LOCATIONS array | Calendar shows all-pillar events regardless |
| fr-incidents | Incidents | ✅ L648 | ✅ `IncidentLog.tsx` (shared) | ✅ | ✅ Named | 🔴 No `useSearchParams`; ignores `?pillar=fire` | ✅ Supabase queries | Sidebar passes `?pillar=fire` → page ignores it |
| fr-corrective | Corrective Actions | ✅ L825 | ✅ `CorrectiveActions.tsx` (shared) | ✅ | ✅ Named | 🔴 Ignores `?pillar=fire` | 🟡 Demo data dominant | |
| fr-deficiencies | Deficiencies | ✅ L828 | ✅ `Deficiencies.tsx` | ✅ | ✅ Named | 🔴 Reads `status/severity/q/sort`; ignores `?pillar=fire` | 🟡 `DEMO_DEFICIENCIES` — static demo data | |

### Jurisdiction (3)

| ID | Label | 1 | 2 | 3 | 4 | 5 | 6 | Notes |
|---|---|---|---|---|---|---|---|---|
| ju-intel | Jurisdiction Intelligence | ✅ L691 | 🔴 File UNTRACKED (`?? src/pages/JurisdictionIntelligence.tsx`) | ✅ (locally) | ✅ Named `JurisdictionIntelligence` | N/A | ✅ Org-scoped: `organization_id → locations → counties → jurisdiction_intel_updates WHERE published=true` | **🔴 LAUNCH BLOCKER: file not committed. Will crash in PROD (module not found).** Content verified org-scoped — no cross-org leak IF deployed. |
| ju-regulatory | Regulatory Updates | ✅ L689 | ✅ `RegulatoryAlerts.tsx` | ✅ | ✅ Named | N/A | ✅ `useRegulatoryChanges` — reads `regulatory_changes WHERE published=true`, org-scoped via `organization_regulatory_changes` join. DEMO_ALERTS fallback. | |
| ju-signals | Jurisdiction Signals | ✅ L819 | ✅ `insights/JurisdictionSignals.jsx` | ✅ | ✅ Named | N/A | ✅ Org-scoped: `organization_id → locations → counties → intelligence_signals WHERE is_published=true`. No cross-org leak. | |

### Vendors (2)

| ID | Label | 1 | 2 | 3 | 4 | 5 | 6 | Notes |
|---|---|---|---|---|---|---|---|---|
| ve-network | Vendor Network | ✅ L639 | ✅ `Vendors.tsx` | ✅ | ✅ Named | N/A | ✅ Supabase + `buildConsolidatedVendors()` demo fallback | |
| ve-services | Vendor Services | 🟡 Route is `/services` (L733), NOT `/vendor-services` as mockup claims. No `/vendor-services` route exists. | 🟡 File is `ServicesPage.tsx`, NOT `VendorServices.tsx` as mockup claims. | ✅ `/services` → `ServicesPage` | ✅ Default | N/A | 🔴 `DEMO_SERVICE_RECORDS` only — no Supabase query. Real data path not wired. | **🔴 Inside `<RequireAdmin>` — non-admin users bounced.** Path + filename drift from mockup. |

### Administration (8)

| ID | Label | 1 | 2 | 3 | 4 | 5 | 6 | Notes |
|---|---|---|---|---|---|---|---|---|
| ad-equipment | Equipment | ✅ L686 | ✅ `equipment/EquipmentPage.tsx` | ✅ | ✅ Named | N/A | 🟡 `useEquipment` hook — stubbed with empty data (plan handles) | |
| ad-locations | Locations | ✅ L696 | ✅ `OrgHierarchy.tsx` | ✅ | ✅ Named | N/A | ✅ Supabase + `INITIAL_ORG_TREE` demo fallback | |
| ad-team | Team | ✅ L654 | ✅ `Team.tsx` | ✅ | ✅ Named | N/A | ✅ Supabase queries for members + invitations | |
| ad-roles | Role Permissions | ✅ L667 | ✅ `RolesPermissions.tsx` | ✅ | ✅ Named | N/A | ✅ `useRolePermissions` — functional | |
| ad-iot | IoT Sensors | ✅ L666 | ✅ `IoTSensorHub.tsx` | ✅ | ✅ Named | N/A | 🟡 Pure demo data (`iotSensors`, `iotSensorReadings`, etc.) — no Supabase queries | Acceptable for launch — IoT is config-only until hardware ships |
| ad-integrations | Integrations | ✅ L712 | ✅ `IntegrationHub.tsx` | ✅ | ✅ Named | N/A | 🟡 Static `INTEGRATIONS` array — catalog page, functional as-is | **🔴 Inside `<RequireAdmin>` — non-admin users bounced to /dashboard** |
| ad-import | Import Data | ✅ L668 | ✅ `ImportData.tsx` | ✅ | ✅ Named | N/A | ✅ `validateImportData`, `getAllImportSchemas` — file processing, not data-fetch | |
| ad-settings | Settings | ✅ L657 | ✅ `settings/SettingsPage.tsx` | ✅ | ✅ Named | N/A | ✅ Container/router — child pages handle data | |

---

## 3. LOCKED Hidden Check (13 items)

### Programs (3)

| ID | Path | In Sidebar Config? | Flag-Gated? | Status |
|---|---|---|---|---|
| pg-sb1383 | `/sb1383` | ✅ In `SECTION_DEFS.programs.itemIds` | 🔴 NO FLAG. Filtered by `PROGRAMS_ORG_FILTER` (org_type only). Visible to restaurant, healthcare, senior_living, k12_school, higher_education org types. | 🔴 Not flag-hidden |
| pg-k12 | `/k12` | ✅ In config | 🟡 Org-gated to `k12_school` only — effectively hidden for most orgs | 🟡 Org-gated only |
| pg-usda | `/usda/production-records` | ✅ In config | 🟡 Org-gated to `k12_school` only | 🟡 Org-gated only |

### Insights (8)

| ID | Path | In Sidebar Config? | Flag-Gated? | Status |
|---|---|---|---|---|
| in-ai | `/ai-advisor` | ✅ `SECTION_DEFS.insights` | 🔴 NO FLAG | 🔴 Visible |
| in-forecast | `/insights/inspection-forecast` | ✅ | 🔴 NO FLAG | 🔴 Visible |
| in-trends | `/compliance-trends` | ✅ | 🔴 NO FLAG | 🔴 Visible |
| in-bench | `/benchmarks` | ✅ | 🔴 NO FLAG | 🔴 Visible |
| in-leader | `/insights/leaderboard` | ✅ | 🔴 NO FLAG | 🔴 Visible |
| in-reports | `/reports` | ✅ | 🔴 NO FLAG | 🔴 Visible |
| in-audit | `/audit-trail` | ✅ | 🔴 NO FLAG | 🔴 Visible |
| in-iot | `/iot-monitoring` | ✅ | 🔴 NO FLAG | 🔴 Visible |

### Tools (2)

| ID | Path | In Sidebar Config? | Flag-Gated? | Status |
|---|---|---|---|---|
| to-inspector | `/inspector-view` | ✅ `SECTION_DEFS.tools` | 🔴 NO FLAG | 🔴 Visible |
| to-diagnosis | `/self-diagnosis` | ✅ | 🔴 NO FLAG | 🔴 Visible |

**Verdict: 🔴 LAUNCH BLOCKER — 12 of 13 LOCKED items are visible to customers with no feature flag.** Only pg-k12 and pg-usda are de-facto hidden (k12_school org filter). pg-sb1383 is visible to all restaurant orgs.

---

## 4. Cross-Cutting Findings

### A. Sidebar Config Matches Mockup

**Verdict: 🟡 Two path/file drifts**

| Check | Mockup | Actual (sidebarConfig.ts) | Match? |
|---|---|---|---|
| ve-services path | `/vendor-services` | `/services` (line 167) | 🔴 Drift |
| ve-services file | `VendorServices.tsx` | `ServicesPage.tsx` | 🔴 Drift |
| fr-calendar pillar | Expected `?pillar=fire` | `/calendar` (no param, line 114) | 🟡 Intentional per locked decision? |
| fs-incidents | `/incidents?pillar=food` | `/incidents?pillar=food` (line 95) | ✅ |
| fs-corrective | `/corrective-actions?pillar=food` | `/corrective-actions?pillar=food` (line 99) | ✅ |
| fs-self | `/self-inspection?pillar=food` | `/self-inspection?pillar=food` (line 103) | ✅ |
| All other items | — | — | ✅ Match |

**Evidence:** `sidebarConfig.ts:167` — `'ve-services': { ... path: '/services' ...}`

### B. ROLE_SECTIONS Enforcement

**Verdict: ✅ Enforced**

`ROLE_SECTIONS` (sidebarConfig.ts:343–352) defines per-role section visibility. `getRoleConfig()` (line 436) reads this map and filters sections. The Sidebar component calls `getRoleConfig(userRole, kitchenType)` at line 454 and renders only returned sections.

Key enforcement points:
- `facilities_manager`: No `foodSafety`, no `programs`, no `kitchenToCommunity` — ✅
- `kitchen_staff`: Only `dashboard`, `tasks`, `foodSafety`, `tools` — ✅
- `chef`: No `admin`, no `vendors`, no `jurisdiction` — ✅

### C. ROLE_ITEM_HIDES Enforcement

**Verdict: ✅ Enforced**

`ROLE_ITEM_HIDES` (sidebarConfig.ts:359–363) defines per-item hiding within visible sections. `getRoleConfig()` applies the filter at line 471–472: `itemIds.filter(id => !hiddenIds.includes(id))`.

- `kitchen_staff` hides: `fs-deficiencies`, `fs-self`, `fs-mock`, `fs-analysis`, `fs-trajectory`, `fs-haccp` — ✅
- `chef` hides: `fs-mock`, `fs-trajectory` — ✅
- `kitchen_manager` hides: `ad-roles` — ✅

### D. Org-Type Gating

**Verdict: ✅ Enforced (but Programs is NOT flag-hidden — see Section 3)**

`PROGRAMS_ORG_FILTER` (sidebarConfig.ts:370–374):
- `pg-sb1383`: `['restaurant', 'healthcare_facility', 'senior_living', 'k12_school', 'higher_education']`
- `pg-k12`: `['k12_school']`
- `pg-usda`: `['k12_school']`

`getRoleConfig()` checks `kitchenType` at line 462–468. If `kitchenType` is falsy, Programs section is skipped entirely. If present, items are filtered by org type.

**However:** This is org-type gating, not a feature flag. Any restaurant org will see `pg-sb1383` in the sidebar.

### E. LOCKED Items Hidden

**Verdict: 🔴 NOT HIDDEN — LAUNCH BLOCKER**

Programs, Insights, and Tools are present in `ROLE_SECTIONS` for all major roles:

```
platform_admin:     [..., 'programs', ..., 'insights', 'tools', ...]
owner_operator:     [..., 'programs', ..., 'insights', 'tools', ...]
executive:          [..., 'programs', ..., 'insights', 'tools', ...]
compliance_manager: [..., 'programs', ..., 'insights', 'tools', ...]
kitchen_manager:    [..., 'programs', ..., 'insights', 'tools', ...]
chef:               [...,                  'insights', 'tools']
kitchen_staff:      [...,                             'tools']
```

(sidebarConfig.ts:344–351)

No feature flag, no `LOCKED` check, no `__FEATURE_FLAG__` constant. The `getRoleConfig()` function renders all sections in `ROLE_SECTIONS` without any flag gate. The Sidebar renders whatever `getRoleConfig()` returns.

To fix: Add a `LOCKED_SECTIONS` set and filter them out of `ROLE_SECTIONS` unless a feature flag (e.g., `admin/feature-flags` table or env var) is enabled.

### F. Killed Items Absent

**Verdict: ✅ All 5 checked items absent from sidebar**

| Killed Item | In sidebarConfig.ts? | In App.tsx routes? | Status |
|---|---|---|---|
| `Compliance` top-level section | ❌ Not in sidebar | ✅ Route exists: `/compliance` → `ComplianceHub` (L628) | ✅ Absent from nav |
| `Document Review` separate nav | ❌ Not in sidebar | ✅ Route exists: `/vendors/review` → `VendorDocumentReview` (L824) | ✅ Absent from nav |
| `Vendor Marketplace` / `Vendor Connect` / `Directory` / `Performance` | ❌ Not in sidebar | ✅ Routes exist: `/marketplace`, `/vendor-connect` (L641–642) | ✅ Absent from nav |
| `Voice Command` | ❌ Not in sidebar | ✅ Route exists: `/voice-help` → `VoiceHelp` (L827) | ✅ Absent from nav |
| `Connect Sensors` | ❌ Not in sidebar | Merged into `ad-iot` (IoT Sensors at `/settings/sensors`) | ✅ Absent from nav |

Note: Routes still exist for killed items — they're just not linked from the sidebar. Consider whether these dead routes should 404 or redirect.

### G. Broken-Routes-Fixed Claims

**Verdict: ✅ All 5 verified correct**

| Route | Expected Fix | Actual (App.tsx) | Status |
|---|---|---|---|
| `/analytics` | Alias only, not sidebar item | `<Navigate to="/food-safety/analysis" replace />` (L834) | ✅ Redirect, not nav item |
| `/insights/trajectory` | Killed, should 404 | No route registered → falls through to `<Route path="*">` → NotFound | ✅ 404s cleanly |
| `/jurisdiction-intelligence` | Real intel page, NOT Settings | `JurisdictionIntelligenceUser` → `./pages/JurisdictionIntelligence` (L691, L145) | ✅ Correct page (but file untracked — see ju-intel) |
| `/import` | `ImportData.tsx`, NOT `VendorMigration` | `<ImportData />` (L668) | ✅ Correct file |
| `/admin/intelligence` | Not in user nav | Inside `<RequireAdmin>` (L801) → `EvidLYIntelligence` — admin only | ✅ Not in user nav |

---

## 5. Open Questions

These items require Arthur's yes/no decision. No assumptions made.

1. **`ve-services` path: Is `/services` correct, or should it be `/vendor-services`?** The mockup says `/vendor-services` → `VendorServices.tsx`; the live code uses `/services` → `ServicesPage.tsx`. Which is canonical?

2. **`fr-calendar` pillar param: Is the absence of `?pillar=fire` on the Calendar sidebar link intentional?** The mockup note says "shared, no pillar param per locked decision" — does this mean Calendar should never filter by pillar, even when accessed from Fire Safety nav?

3. **`ju-intel` untracked file: Was `src/pages/JurisdictionIntelligence.tsx` intentionally excluded from git, or is it a missed commit?** The file exists locally with correct org-scoped data filtering. If not committed before PROD deploy, the route will crash.

4. **RequireAdmin scope: Should `/integrations`, `/services`, and `/self-inspection` be accessible to non-admin roles?** Currently all three are inside `<RequireAdmin>` (App.tsx:705–812). The sidebar config shows them to `owner_operator`, `compliance_manager`, etc., but the route guard bounces those users.

5. **LOCKED sections flag mechanism: What flag system should gate Programs, Insights, Tools?** Options: (a) `feature_flags` table checked at runtime, (b) env var `VITE_LOCKED_SECTIONS`, (c) hardcoded `LOCKED_SECTIONS` constant removed on launch day. Which approach does Arthur prefer?

6. **`ve-services` data path: ServicesPage.tsx uses `DEMO_SERVICE_RECORDS` exclusively. Is there a plan to wire it to the `vendor_service_records` table before 6/2, or is demo-data-only acceptable for launch?**

7. **Killed routes still registered: `/marketplace`, `/vendor-connect`, `/voice-help`, `/vendors/review` have routes but no sidebar links. Should these routes be removed, or kept as deep-link/bookmark support?**

---

*Report generated 2026-05-09. Read-only audit — no files modified.*
