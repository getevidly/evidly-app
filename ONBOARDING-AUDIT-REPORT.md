# ONBOARDING AUDIT REPORT

Generated: 2026-05-10 | Author: Claude Code (read-only audit)

---

## A. Wizard Config Files

**TWO SEPARATE ONBOARDING SYSTEMS EXIST:**

| System | File | Steps | Storage | Purpose |
|--------|------|-------|---------|---------|
| **Checklist Card (v4)** | `src/config/onboardingChecklistConfig.ts` + `src/hooks/useOnboardingChecklist.ts` | 15 role-filtered | localStorage (per-org key) + auto-detection from Supabase tables | Dashboard widget, post-signup guidance |
| **Legacy Wizard** | `src/pages/Onboarding.tsx` | 10 fixed | `organizations.onboarding_step` + `organizations.onboarding_completed` + `organizations.onboarding_completed_at` | Full-page wizard, runs once at first login |

The Checklist Card is the **active production system** (dashboard widget). The Legacy Wizard at `/onboarding` is the **first-login flow** that sets `onboarding_completed = true` on organizations.

---

## B. Per-Step Inventory — Checklist Card (15 Steps)

| # | ID | Title | Section | Route | Auto-Complete | Time Hint | Dependencies | Roles |
|---|----|----|---------|-------|---------------|-----------|-------------|-------|
| 1 | `profile` | Complete Your Profile | Getting Started | /settings | `profiles.full_name` IS NOT NULL | "Takes about 2 minutes" | None | ALL |
| 2 | `setup_locations` | Set Up Locations | Getting Started | /settings | None (manual) | "Multi-location orgs can add all sites here" | None | owner_operator, executive, platform_admin |
| 3 | `add_team` | Add Team Members | Team & Vendors | /team | `profiles` count >= 2 | "You can add as many team members as needed" | None | owner_operator, executive, kitchen_manager, platform_admin |
| 4 | `invite_team` | Invite Your Team | Team & Vendors | /team | None (manual) | "They'll get an email with a secure login link" | `add_team` | owner_operator, executive, platform_admin |
| 5 | `vendors_setup` | Add Your Vendors | Team & Vendors | /vendors | `vendors` count >= 1 | "Track licenses, COI status, and assignments" | None | owner_operator, executive, compliance_manager, facilities_manager, platform_admin |
| 6 | `add_vendor_services` | Add Vendor Services | Team & Vendors | /vendors | None (manual) | "Enables automated compliance tracking per service" | `vendors_setup` | owner_operator, executive, compliance_manager, facilities_manager, platform_admin |
| 7 | `register_equipment` | Register Equipment | Safety & Compliance | /equipment | `equipment` count >= 1 | "Enables automated temp logging and service alerts" | None | owner_operator, executive, facilities_manager, kitchen_manager, platform_admin |
| 8 | `upload_documents` | Upload Key Documents | Safety & Compliance | /documents | `documents` count >= 1 | "Keeps everything in one place for inspections" | None | ALL |
| 9 | `ai_document_routing` | AI Document Routing | Safety & Compliance | /documents | None (manual) | "Works with permits, certificates, insurance docs" | None | owner_operator, executive, compliance_manager, platform_admin |
| 10 | `request_documents` | Request Missing Documents | Safety & Compliance | /documents | None (manual) | "Vendors receive a secure link to upload directly" | `vendors_setup` + `upload_documents` | owner_operator, executive, compliance_manager, platform_admin |
| 11 | `sb1383_setup` | Set up SB 1383 Tracking | Safety & Compliance | /food-recovery | None (manual) | "Required for California commercial food generators" | None | owner_operator, executive, compliance_manager, platform_admin |
| 12 | `k12_setup` | Configure K-12 Food Safety | Safety & Compliance | /usda/production-records | None (manual) | "NSLP and USDA meal pattern tracking" | None | owner_operator, executive, compliance_manager, platform_admin |
| 13 | `iot_readiness` | Sensor-Ready Setup | Safety & Compliance | /equipment | `temperature_equipment` count >= 1 | "Enables automated temp logging when you add sensors" | None | owner_operator, executive, facilities_manager, kitchen_manager, platform_admin |
| 14 | `take_tour` | Take a Platform Tour | Platform Tour | /dashboard | Auto-complete on tour launch | "Takes about 2 minutes" | None | ALL |
| 15 | `k2c_referral` | Share Kitchen to Community | Grow & Connect | (modal) | None (manual) | "Both you and your referral get a free month" | None | owner_operator, executive, platform_admin |
| 16 | `schedule_consultation` | Schedule Your Consultation | Grow & Connect | (external Calendly) | None (manual) | "Get personalized guidance for your locations" | None | owner_operator, executive, platform_admin |
| 17 | `setup_complete` | Setup Complete! | Grow & Connect | /dashboard | celebration type (excluded from progress) | "Welcome to streamlined compliance management" | None | ALL |

**Note:** Step count is 17 total defined, but filtered by role/industry/enrollment. A typical owner_operator without SB1383 or K-12 sees ~14 actionable steps. The `setup_complete` celebration step is excluded from progress calculations.

### Conditional Visibility:
- `sb1383_setup` → only visible if `organizations.is_sb1383_enrolled = true`
- `k12_setup` → only visible if `organizations.is_k12 = true` AND `industry_type = 'k12_school'`

---

## C. Dependency Graph

```
profile ─────────────────────────┐ (no deps — always unlocked)
setup_locations ─────────────────┤
add_team ────────┬───────────────┤
                 └──→ invite_team │
vendors_setup ───┬───────────────┤
                 ├──→ add_vendor_services
                 └──→ request_documents (also requires upload_documents)
upload_documents ┘
register_equipment ──────────────┤
ai_document_routing ─────────────┤
iot_readiness ───────────────────┤
take_tour ───────────────────────┤
k2c_referral ────────────────────┤
schedule_consultation ───────────┤
setup_complete ──────────────────┘
```

**3 dependency chains:**
1. `add_team` → `invite_team`
2. `vendors_setup` → `add_vendor_services`
3. `vendors_setup` + `upload_documents` → `request_documents`

All other steps are independently unlocked (no blocking).

---

## D. State-Tracking Schema

### Primary Production Storage: localStorage

| Key Pattern | Content |
|-------------|---------|
| `evidly_onboarding_checklist_{orgId}` | JSON array of completed step IDs |
| `evidly_onboarding_skipped_{orgId}` | JSON array of skipped step IDs |
| `evidly_onboarding_dismissed_{orgId}` | `'true'` if wizard dismissed |

### Database Columns (organizations table):

| Column | Type | Purpose |
|--------|------|---------|
| `onboarding_completed` | boolean | Set `true` by legacy wizard completion OR WelcomeModal dismiss |
| `onboarding_completed_at` | timestamptz | Set by legacy wizard on final step |
| `onboarding_step` | integer | Legacy wizard's current step (1-10) |
| `industry_type` | text | Used for step visibility filtering |
| `planned_location_count` | integer | Used for tier-based step filtering |
| `is_sb1383_enrolled` | boolean | Controls SB 1383 step visibility |
| `is_k12` | boolean | Controls K-12 step visibility |

### Database Columns (user_profiles table):

| Column | Type | Purpose |
|--------|------|---------|
| `onboarding_progress` | integer (0-100) | Unused by Checklist Card |
| `onboarding_completed_at` | timestamptz | Set by legacy migration, not read by Checklist Card |
| `last_onboarding_reminder_sent` | timestamptz | For email nudges |

### Auto-Detection (real-time from Supabase):

The Checklist Card queries these tables on mount + visibility change:

| Step | Table Queried | Condition |
|------|---------------|-----------|
| `profile` | `profiles` | `full_name IS NOT NULL` for user |
| `add_team` | `profiles` | count >= 2 where organization_id = org |
| `vendors_setup` | `vendors` | count >= 1 where organization_id = org |
| `register_equipment` | `equipment` | count >= 1 where organization_id = org |
| `upload_documents` | `documents` | count >= 1 where organization_id = org |
| `iot_readiness` | `temperature_equipment` | count >= 1 where organization_id = org |

---

## E. Completion Gate

### Checklist Card: `isAllComplete`
```typescript
const actionableSteps = visibleSteps.filter(s => s.stepType !== 'celebration');
const actionableCompleted = actionableSteps.filter(s => completedIds.has(s.id)).length;
const isAllComplete = actionableSteps.length > 0 && actionableCompleted === actionableSteps.length;
```

- Computed client-side from localStorage `completedIds` set
- Excludes the `setup_complete` celebration step
- **Does NOT write to any database column when all steps are complete**
- The Checklist Card simply stops showing (`shouldShow = false` when dismissed or all complete)

### Legacy Wizard: `onboarding_completed`
```typescript
// Onboarding.tsx line 92
await supabase.from('organizations').update({
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
}).eq('id', orgId);
```

- Written when user reaches step 10 of legacy wizard
- Also written by WelcomeModal dismiss (`onboarding_completed: true` only, no timestamp)
- Read by Checklist Card to auto-dismiss: if `onboarding_completed = true`, card doesn't show

### Where "complete" is checked in the app:
1. `useOnboardingChecklist.ts:161` — if `onboarding_completed` is true on org, dismiss checklist card
2. `Onboarding.tsx:60` — if `onboarding_completed` is true, redirect to `/dashboard`
3. `AuthContext.tsx:17` — exposed on profile type (available to all components)

---

## F. Risk Flags

### 1. "Mark Done" Creates False-Completion Risk — HIGH

**Location:** `OnboardingChecklistCard.tsx` line 487

Every step has a "Mark Done" button that writes to localStorage `completedIds` without verifying the user actually did anything. Steps with auto-detection (`completionTable`) will be genuinely verified, but 8 steps rely entirely on manual "Mark Done":

| Step | Risk |
|------|------|
| `setup_locations` | User marks done without adding any location |
| `invite_team` | User marks done without sending invitations |
| `add_vendor_services` | User marks done without linking services |
| `ai_document_routing` | User marks done without trying AI router |
| `request_documents` | User marks done without requesting documents |
| `sb1383_setup` | User marks done without SB 1383 entry |
| `k12_setup` | User marks done without K-12 config |
| `take_tour` | Auto-completes on tour launch (OK) |

**Impact on B2b:** If eligibility tracking relies on onboarding completion, "Mark Done" shortcuts could create false-positive eligibility.

### 2. "I'll Do This Later" = Skip (NOT Complete) — LOW RISK

The skip button adds to `skippedIds`, which is tracked separately from `completedIds`. Skipped steps:
- Do NOT count toward `isAllComplete`
- Do NOT satisfy `dependsOn` requirements for downstream steps
- Are visually distinct (dimmed/strikethrough)
- Can be "un-skipped" via `unskipStep()`

### 3. localStorage Is Not Authoritative — MEDIUM

Completion state lives in localStorage, not the database. This means:
- Clearing browser data resets progress (auto-detection will re-detect some steps)
- Switching browsers/devices loses progress
- No server-side query possible for "which steps has this org completed?"
- Support cannot verify onboarding state without asking the user

### 4. Two Separate Systems = Confusion Risk — MEDIUM

The legacy wizard (`/onboarding`) and the Checklist Card are not synchronized:
- Legacy wizard sets `organizations.onboarding_completed = true` which DISMISSES the Checklist Card
- If user completes legacy wizard, they never see the Checklist Card's 15 steps
- The Checklist Card has more steps (15 vs 10) and more nuanced tracking

### 5. WelcomeModal Dismissal = onboarding_completed — HIGH

`WelcomeModal.tsx:35` sets `onboarding_completed = true` when the user clicks the welcome CTA button. This means any user who simply dismisses the welcome modal is marked as "onboarding complete" in the database — even if they've done nothing else.

### 6. No Database Timestamp for Checklist Card Completion

Unlike the legacy wizard which writes `onboarding_completed_at`, the Checklist Card never writes a completion timestamp to the database. There is no reliable server-side way to determine "when did this user finish all onboarding steps."

---

## G. Recommendations for B2b

### The cleanest field for "account setup complete" in Risk-Free Guarantee eligibility:

**DO NOT USE `organizations.onboarding_completed`** — it's set by WelcomeModal dismiss and legacy wizard, neither of which guarantees real setup activity.

**DO NOT USE localStorage-based Checklist Card completion** — not queryable server-side.

**RECOMMENDED: The B2b eligibility criteria Arthur defined ARE the authoritative fields:**

| Criterion | Authoritative Source | Why |
|-----------|---------------------|-----|
| Team member setup | `user_profiles` count per org + `user_invitations` with status='accepted' | Real data — profiles exist because people signed up |
| Food safety activity (12/15 days) | `temp_logs.created_at` + `temperature_logs.created_at` + `checklist_completions.completed_at` | Real data — logs exist because someone entered temps/checklists |
| 15-day window | `organizations.created_at` | Authoritative signup timestamp |

**The onboarding wizard is irrelevant to B2b eligibility.** The guarantee criteria measure real operational usage, not wizard step completion. A user could complete all 15 onboarding steps via "Mark Done" in 2 minutes without actually setting up anything.

**The B2b `risk_free_eligibility` table proposed in the pre-flight report is the correct approach** — it queries real activity tables directly and ignores onboarding wizard state entirely.

---

## H. Additional Findings

### Legacy Wizard Steps (for reference — `/onboarding` route):

| Step | Name | What it does |
|------|------|-------------|
| 1 | Welcome | Intro screen |
| 2 | Org Details | Updates org name, industry |
| 3 | Add Location | Creates first location |
| 4 | Shifts | Configures operating shifts |
| 5 | Equipment | Adds equipment |
| 6 | Checklists | Enables checklist templates |
| 7 | Documents | Document type selection |
| 8 | Team | Team member invites |
| 9 | QR Codes | QR code generation |
| 10 | Done | Sets `onboarding_completed = true` + timestamp |

### Onboarding Document Progress Table:
- `onboarding_document_progress` (migration 20260220)
- Tracks per-document upload status during onboarding
- Status: `'pending'`, `'uploaded'`, `'not_applicable'`
- Referenced by document upload steps

---

*End of audit. No edits made.*
