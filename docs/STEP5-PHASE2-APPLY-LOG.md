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
