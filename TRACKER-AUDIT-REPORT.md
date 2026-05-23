# TRACKER ACCURACY AUDIT REPORT

**Date**: 2026-05-10
**Branch**: main (HEAD = 56c083b)
**Auditor**: Claude Opus 4.6 (automated)

---

## Audit Results

| # | Tracker Task | Tracker Status | Verification Check | Codebase Result | Verdict |
|---|---|---|---|---|---|
| 1 | Seed 14 feature flags (LOCKED sections) | done (816d74c) | `ls supabase/migrations/*seed_locked*` | `20260811000000_seed_locked_section_flags.sql` exists; commit 816d74c on main, touches 1 migration file | **MATCH** |
| 2 | Sidebar wired to feature_flags | done (1c55cdf) | `grep feature_flags Sidebar.tsx` | Line 453: queries `feature_flags` table for disabled keys; commit 1c55cdf on main, touches Sidebar.tsx | **MATCH** |
| 3 | RequireAdmin unwrap 3 user routes + delete 2 dead routes | done (3b1783b) | Routes at lines 705-708 outside `<RequireAdmin>`; `/compliance` and `/vendor-connect` zero matches in App.tsx | Routes confirmed unwrapped. Dead routes deleted. Commit 3b1783b matches. | **MATCH** |
| 4 | Redirect /marketplace + /vendors/review, remove /voice-help | done (3d49813) | `grep '/marketplace\|/voice-help' App.tsx` → zero matches | No standalone routes exist (only redirects if any); `navigate('/marketplace')` zero matches; "Back to Marketplace" zero matches | **MATCH** |
| 5 | JurisdictionIntelligence.tsx committed | done (8cdbf85) | `ls src/pages/JurisdictionIntelligence.tsx` | File exists; commit 8cdbf85 creates it (316 insertions) | **MATCH** |
| 6 | Drop trial-email-sender + trial_email_log | done (b129cf1) | `ls supabase/functions/trial-email-sender/` → NOT_FOUND; `grep trial_email_log resend-webhook/index.ts` → zero | Function deleted. Resend-webhook cleaned. Drop migration 20260810000000 exists. | **MATCH** |
| 7 | GA4 G-VE2QFDN5Z0 wired | done (d6d93d7) | `grep G-VE2QFDN5Z0 index.html` | Lines 66+72: gtag config present. `YOUR_GA4_ID` zero matches. | **MATCH** |
| 8 | DEMO_TEAM_MEMBERS removal | done (513c070) | `grep DEMO_TEAM_MEMBERS src/constants/` | Zero matches. Commit 513c070 removes from correctiveActionStatus.ts. | **MATCH** |
| 9 | CorrectiveActions category rename (food_safety/fire_safety/facility_services) | done (4dbd0d0) | `grep facility_safety CorrectiveActions.tsx` → zero; `grep facility_services correctiveActionsDemoData.ts` → present | Old value gone, new values present. Commit 4dbd0d0 touches both files. | **MATCH** |
| 10 | Operations sidebar section + Self-Audit → Self-Inspection | done (45064af) | `ls SelfInspection.tsx` → exists; `ls SelfAudit.tsx` → NOT_FOUND; `grep "id: 'operations'" sidebarConfig.ts` → line 288; `/self-audit` in App.tsx → redirect only | All conditions met. Commit 45064af matches. | **MATCH** |
| 11 | Breadcrumb fix (Operations parent, NO_LINK_ROUTES) | done (c306042) | `grep NO_LINK_ROUTES AutoBreadcrumb.tsx` → line 173; `/operations` parent mappings present | NO_LINK_ROUTES includes `/operations`. Sub-pages reference parent `/operations`. | **MATCH** |
| 12 | IncidentLog: rename pillar → category column | done (4936993) | `Incident` interface has `category: IncidentCategory` (line 60); `IncidentCategory` type defined | Main Incident interface uses `category`. Type renamed to `IncidentCategory`. | **MATCH** |
| 13 | Deficiencies: add category column (demo-only) | done (4edbf62) | `grep DefCategory deficienciesDemoData.ts` → present; AddDeficiencyModal has category required field | DefCategory type exists, all demo rows classified, modal requires category. | **MATCH** |
| 14 | Equipment: 5-commit series (tables + queries + mutations + location dropdown + stub cleanup) | done (7672cab → 56c083b) | Migration 20260814000000 exists; `mapEquipmentRow` present; `Not implemented` zero matches; useLocations.ts exists; `<select` in EquipmentFormModal | All 5 commits on main. Real Supabase queries. No stubs remain. | **MATCH** |
| 15 | Trial language sweep (remove "free trial" etc. from src/) | claimed done | `grep -ri "free trial\|trial period\|trial expires" src/` | **28 matches** across: AuthModal.tsx, DashboardUpgradeCard.tsx, BillingPanel.tsx (7), DemoCTABar.tsx, DemoBanner.tsx, DemoRestrictions.tsx, KitchenToCommunity.tsx (2), MobileStickyBar.tsx, LeaderboardPreview.tsx, ReferralRedirect.tsx (2), TermsOfService.tsx, i18n.ts, Pricing.tsx (4), CountyCompliance.tsx, CaliforniaCompliance.tsx, SidebarUpgradeBadge.tsx, DemoUpgradePrompt.tsx (2), ambassadorDemoData.ts (2) | **DRIFT** |

---

## Staging References Check

| Location | Count | Details |
|---|---|---|
| `src/` | 8 matches | admin/PartnerDemos.jsx, admin/DemoTours.jsx (3), demoIntelligenceData.ts, correctiveActionsDemoData.ts, lib/__tests__/partnerDemoSystem.test.ts (2) |
| `supabase/` | 14 matches | Edge functions (3: get-jurisdictions, generate-partner-demo, pos-sync-employees, generate-demo-template), Migrations (11: corrective_actions_templates, pos_employee_mappings, partner_demo_system, staging_demo_tours (3), cleanup_tribal (2), backfill_ca_city_slugs, apply_checklists_module_columns) |

**Assessment**: Staging references exist in demo/partner infrastructure (admin-only pages, demo generation functions, migration comments). These are NOT user-facing production paths — they're internal tooling for demo org provisioning. Not a production leak, but noted for completeness.

---

## Incident Template `pillar` field — clarification

The `IncidentTemplate` interface retains `pillar: IncidentCategory` at line 20. This reflects the actual DB column name on the `incident_templates` table (which was NOT renamed — only the `incidents` table column was renamed from `pillar` to `category`). The type annotation uses `IncidentCategory` correctly. **Not drift.**

---

## Summary

| Metric | Count |
|---|---|
| **Total tasks audited** | 15 |
| **MATCH** | 14 |
| **DRIFT** | 1 |
| **MISSING** | 0 |

### DRIFT Items

1. **Trial language sweep** — 28 occurrences of "free trial" / "trial period" / "days left in trial" remain across 18 files in `src/`. These are in:
   - Marketing/CTA components (AuthModal, Pricing, DemoBanner, DemoCTABar, SidebarUpgradeBadge, DemoUpgradePrompt, DashboardUpgradeCard, MobileStickyBar)
   - Public pages (KitchenToCommunity, LeaderboardPreview, ReferralRedirect, CountyCompliance, CaliforniaCompliance)
   - Billing panel (BillingPanel.tsx — simulates trial state)
   - Legal page (TermsOfService.tsx — defines trial terms)
   - i18n strings (lib/i18n.ts)
   - Demo data (ambassadorDemoData.ts referral templates)

   **Possible explanation**: The "trial cleanup" commit (b129cf1) focused on backend infrastructure (edge function + DB table), not frontend marketing language. The frontend trial language may be intentional (pricing/conversion copy) vs. leftover dead code.

### Unexpected Discoveries

- **Duplicate JurisdictionIntelligence file**: Exists at both `src/pages/JurisdictionIntelligence.tsx` AND `src/pages/admin/JurisdictionIntelligence.tsx`. No tracker task accounts for two copies. The admin version may be the original; user version committed in 8cdbf85.
- **Old equipment migrations**: `20260222000000_fire_safety_equipment_tables.sql` and `20260222100000_equipment_lifecycle.sql` still exist in migrations/ alongside the replacement `20260814000000_equipment_tables.sql`. These are recorded as applied in supabase_migrations but tables were manually dropped. They're harmless (idempotent migration history) but may cause confusion.
- **`trial_email_log` still in old migrations**: The table is referenced in `20260313000002_trial_email_admin.sql` and `20260530000000_trial_email_system.sql` (CREATE TABLE). The drop migration `20260810000000_drop_trial_deadcode.sql` handles cleanup. This is expected — old migrations are historical records.

---

**END OF REPORT. No remediation applied.**
