# STEP 5 — Phase 2 Apply Log (Onboarding UI)

## Checkpoint 1: Tab Shell + Responsibilities Tab

### Pre-flight Results

| Check | Result |
|-------|--------|
| "Compliance Manager" label sweep | PASS — 3 remaining are code comments only |
| Test org created (EvidLY_Phase2_Test) | PASS — org + CA location (Fresno) |
| usePillarRequirements('CA') | PASS — 6 food_safety + 6 fire_safety |
| useTeamRoles (test org, no members) | PASS — empty members, all KEY_ROLES missing |
| useDelegationSuggestion | PASS — facilities_manager (6 items), compliance_manager (3 items) |

### Schema Applied

| Migration | Description | Status |
|-----------|-------------|--------|
| M22 | organizations.metadata JSONB DEFAULT '{}' | PASS |

### Feature Flag

- Column: `organizations.metadata->>'new_onboarding_enabled'`
- Test org enabled: `UPDATE organizations SET metadata = '{"new_onboarding_enabled": true}' WHERE id = 'aaaaaaaa-...'`
- Dashboard renders OnboardingCard when flag=true AND onboarding_completed=false
- Legacy OnboardingChecklistCard renders otherwise (untouched)

### Components Built

| File | Purpose |
|------|---------|
| `src/components/onboarding/OnboardingCard.tsx` | Root container, tab orchestration |
| `src/components/onboarding/OnboardingHeader.tsx` | Navy header with wordmark + progress |
| `src/components/onboarding/OnboardingTabs.tsx` | Tab switcher (Work locked until responsibilities committed) |
| `src/components/onboarding/shared/EvidLYWordmark.tsx` | Montserrat 800, E gold, vid cream, LY gold |
| `src/components/onboarding/shared/PillarHeader.tsx` | Pillar icon + title + counter |
| `src/components/onboarding/shared/EmptyStateMessage.tsx` | Non-CA empty state |
| `src/components/onboarding/shared/StatusIcon.tsx` | 4-state icon component |
| `src/components/onboarding/responsibilities/ResponsibilitiesTab.tsx` | Tab body orchestrating chip commits |
| `src/components/onboarding/responsibilities/PillarSection.tsx` | Food/Fire pillar group |
| `src/components/onboarding/responsibilities/RequirementChipRow.tsx` | [Me] [Invite X] [Skip] chips + chat icon |
| `src/components/onboarding/responsibilities/BulkApplyBanner.tsx` | Delegation suggestion banner |
| `src/components/onboarding/responsibilities/LockResponsibilitiesCTA.tsx` | Bottom bar with lock action |
| `src/components/onboarding/responsibilities/SkipReasonModal.tsx` | Reason capture on skip |
| `src/lib/onboarding/featureFlag.ts` | useNewOnboarding() hook |
| `src/lib/onboarding/responsibilityCommit.ts` | Chip commit + lock logic |

### Chat Icon (Phase 4 Deferred)

- Icon: `ti-message-circle` (lucide MessageCircle) on each RequirementChipRow
- Click: Opens popover with "Chat coming soon for this item" placeholder
- Backend (onboarding_item_comments table + realtime): deferred to Phase 4
- Documented here for PR transparency

### TypeScript Verification

`npx tsc --noEmit` — zero errors across all new files.

### Dashboard Wiring

- `DashboardToday.tsx` imports `OnboardingCard` + `useNewOnboarding`
- Conditional render: `{useNewOnb ? <OnboardingCard /> : <OnboardingChecklistCard />}`
- Legacy card untouched

### Seed Reconciliation (post-Checkpoint 1)

4 typical_role updates applied to PROD:

| requirement_code | Before | After |
|-----------------|--------|-------|
| health_permit | owner_operator | compliance_manager |
| food_manager_cert | compliance_manager | kitchen_manager |
| haccp_plan | compliance_manager | chef |
| temperature_logs | chef | kitchen_manager |

Updated role distribution:

| typical_role | Count | Banner (>=3) |
|-------------|-------|--------------|
| facilities_manager | 6 | YES |
| kitchen_manager | 3 | YES |
| compliance_manager | 2 | no |
| chef | 1 | no |

### Behavior Rule (locked)

typical_role is a hint only. When the role does not exist on the team:
- [Me (Owner)] chip shows fallback label indicating owner/operator handles it
- [Invite X] chip still surfaces for one-click invite of the missing role
- RequirementChipRow receives `roleMissing` prop from PillarSection
- useDelegationSuggestion now exports `missingRoles` and `filledRoles`

Migration file `20260810000021_onboarding_phase1_schema.sql` updated to reflect reconciled seed values.

---

## PROD Deploy — Checkpoint 1

**Deployed:** 2026-05-11
**PROD URL:** https://app.getevidly.com
**Vercel deployment:** evidly-os9umw536-evidly.vercel.app

### Pre-flight Regression Results

| Check | Result |
|-------|--------|
| Legacy OnboardingChecklistCard wired as fallback | PASS — imported line 16, rendered line 109 as else-branch |
| useNewOnboarding() returns false when flag absent | PASS — useState(false), undefined !== true |
| TypeScript (npx tsc --noEmit) | PASS — zero errors |
| Vite build (npx vite build) | PASS — built in 55s |

### Post-deploy Verification

| Org | metadata.new_onboarding_enabled | Expected Render | Verified |
|-----|-------------------------------|-----------------|----------|
| Test Food (18309b08-...) | absent (empty {}) | Legacy OnboardingChecklistCard | PASS |
| __SYSTEM_TEMPLATES__ (00000000-...) | absent (empty {}) | Legacy OnboardingChecklistCard | PASS |
| EvidLY (3df66b3b-...) | absent (empty {}) | Legacy OnboardingChecklistCard | PASS |
| EvidLY_Phase2_Test (aaaaaaaa-...) | true | New OnboardingCard | PASS |

App loads at https://app.getevidly.com — landing page, schema.org markup, pricing intact.

### Safety Net

- Feature flag is the ONLY gate between legacy and new onboarding
- Flag requires explicit `metadata.new_onboarding_enabled = true` on the org row
- All existing trial orgs have `metadata = {}` (no flag)
- Rollback command: `npx vercel rollback`

### TODO: Staging Instance (separate ticket)

- Spin up new staging instance (separate Vercel project or branch deploy)
- Configure DNS for evidly-staging.vercel.app or alternative alias
- Update deploy script to auto-alias future staging deploys
- Blocked: not required for Checkpoint 2 development
