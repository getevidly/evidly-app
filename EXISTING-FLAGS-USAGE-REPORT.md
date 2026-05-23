# EXISTING-FLAGS-USAGE-REPORT

**Auditor:** Claude Opus 4.6
**Date:** 2026-05-09
**Mode:** Read-only — no mutations

---

## A. Per-Key Findings (15 rows)

| Key | Scope | Wired to useFeatureFlag/FeatureGate? | File paths |
|---|---|---|---|
| `dashboard` | UNUSED | NO | Zero feature-flag-context matches in `src/` |
| `facility_safety` | UNUSED | NO | Bare strings in data files as category/pillar enums — not flag refs |
| `documents` | UNUSED | NO | Zero feature-flag-context matches in `src/` |
| `temperature_logs` | UNUSED | NO | Bare strings in `canonicalQueries/temperature-state.ts`, `importTemplates.ts` — DB table refs, not flag refs |
| `checklists` | UNUSED | NO | Zero feature-flag-context matches in `src/` |
| `alerts` | UNUSED | NO | Zero feature-flag-context matches in `src/` |
| `intelligence_feed` | UNUSED | NO | Bare string in `src/config/dashboardPresets.ts:21,35` as dashboard widget config ID — not a flag call |
| `jurisdiction_intel` | UNUSED | NO | Zero matches anywhere in `src/` |
| `score_table` | UNUSED | NO | Bare string in `src/config/tourModules.ts:52` as guided tour module ID — not a flag call |
| `irr` | UNUSED | NO | Bare string in `src/pages/public/LandingPage.jsx:890` as HTML section `id` — not a flag call |
| `insurance_risk` | UNUSED | NO | Zero matches anywhere in `src/` |
| `predictive_alerts` | UNUSED | NO | Bare strings in `src/lib/standingQueries.ts:255,468` as DB table name — not a flag call |
| `leaderboard` | **USER** | **YES** | `src/pages/Leaderboard.tsx:132,142,174` — `<FeatureGate flagKey="leaderboard">` wraps page error state, empty state, and main content (3 instances) |
| `k2c` | UNUSED | NO | Bare strings in `dashboardPresets.ts:26`, `ReferralDashboard.tsx:35,55`, `admin/EventLog.tsx:20`, `admin/EmailSequenceManager.tsx:93,100` — tab IDs, referral types, widget configs — not flag calls |
| `violation_outreach` | **ADMIN** | **YES** | `src/pages/admin/ViolationOutreach.tsx:219,561` — `<FeatureGate flagKey="violation_outreach">` wraps entire admin page |

**Summary:** Only 2 of 15 existing keys are actively wired to `FeatureGate`:
- `leaderboard` — USER scope (controls page content rendering)
- `violation_outreach` — ADMIN scope (controls admin page rendering)

The other 13 keys sit in the `feature_flags` table but are not consumed anywhere in `src/`.

---

## B. Overlap Collision Summary (4 pairs)

| Existing | New | Existing Scope | Verdict |
|---|---|---|---|
| `jurisdiction_intel` | `ju-intel` | UNUSED | **NO COLLISION.** Existing key has zero matches in `src/`. Not wired to any component. Safe to add `ju-intel` alongside. |
| `leaderboard` | `in-leader` | **USER** | **DUAL-FLAG — see below.** |
| `predictive_alerts` | `in-forecast` | UNUSED | **NO COLLISION.** Existing key only appears as DB table name `predictive_alerts` in `standingQueries.ts`. Not wired to any flag system. Safe to add `in-forecast` alongside. |
| `intelligence_feed` | `in-ai` | UNUSED | **NO COLLISION.** Existing key only appears as dashboard widget config ID in `dashboardPresets.ts`. Not wired to any flag system. Safe to add `in-ai` alongside. |

### `leaderboard` / `in-leader` — Dual-Flag Detail

The existing `leaderboard` flag is wired via `<FeatureGate flagKey="leaderboard">` in `src/pages/Leaderboard.tsx` at lines 132, 142, and 174. It gates the **page content** — when `leaderboard` is disabled, the page renders a "Coming soon" gate instead of the leaderboard UI.

The new `in-leader` flag will gate the **sidebar nav item** — when `in-leader` is disabled, the "Team Leaderboard" link won't appear in the sidebar.

These are **two independent layers** controlling the same feature:

| `leaderboard` (page) | `in-leader` (sidebar) | User experience |
|---|---|---|
| OFF | OFF | Nav hidden + page gated if accessed by URL — **correct** |
| OFF | ON | Nav visible, user clicks through, sees "Coming soon" gate — **acceptable** |
| ON | OFF | Nav hidden but page works via direct URL — **acceptable** |
| ON | ON | Fully functional — **correct** |

**Verdict: NO COLLISION — dual-layer gating is coherent.** The existing `leaderboard` flag and new `in-leader` flag serve different architectural concerns (page rendering vs sidebar visibility). Both being OFF at launch is the correct state. When Arthur validates the leaderboard data accuracy, he flips both ON. Proceed with AUDIT-1 as-is.

---

## C. Other Wired Existing Keys (not in the 4 overlaps)

```
ADMIN-only (safe, no concern):
  violation_outreach     — FeatureGate in admin/ViolationOutreach.tsx

USER-side (worth knowing about):
  (none beyond leaderboard, covered in §B)

SHARED:
  (none)

UNUSED (sitting in feature_flags table but not consumed by any code):
  dashboard
  facility_safety
  documents
  temperature_logs
  checklists
  alerts
  intelligence_feed
  jurisdiction_intel
  score_table
  irr
  insurance_risk
  predictive_alerts
  k2c
```

13 of the 15 existing keys are completely inert — they exist in the DB table but are not referenced by any `useFeatureFlag()` or `FeatureGate` call anywhere in `src/`.

---

## D. Summary Verdict for AUDIT-1

### **1. SAFE — proceed with AUDIT-1 as-is.**

None of the 4 overlap-pair existing keys are wired on the user sidebar. The one wired key (`leaderboard`) controls page content rendering, which is architecturally distinct from the new `in-leader` flag that controls sidebar visibility. The two layers are complementary, not conflicting.

All other existing keys are UNUSED (not wired to any code). The 14 new keys will not collide with any existing behavior.

---

## E. Rename Mapping

**Not applicable.** No USER-scope collisions requiring rename. AUDIT-1 proceeds with the original 14 keys unchanged.

---

*Note: An additional FeatureGate usage was found for `industry-benchmarks` in `src/pages/Benchmarks.tsx:392,413` — this key is NOT in the 15 existing keys from the seed migration. It appears to be defined elsewhere (likely in `featureGating.ts` compile-time config). This is informational only and does not affect AUDIT-1.*

---

*Report generated 2026-05-09. Read-only audit — no files modified.*
