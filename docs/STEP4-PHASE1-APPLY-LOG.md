# STEP 4 — Phase 1 Apply Log (Onboarding Data Layer)

## Schema Applied

| Step | Description | Result |
|------|-------------|--------|
| S1 | `organizations.onboarding_skipped_items` JSONB DEFAULT '[]' | PASS |
| S2 | `organizations.onboarding_team_invited` JSONB DEFAULT '[]' | PASS |
| S3 | CREATE TABLE `onboarding_pillar_requirements` (11 cols, 3 CHECKs, RLS, UNIQUE) | PASS |
| S4 | `user_profiles` role CHECK (8 values incl. platform_admin) | PASS |

## Seed Data

12 CA rows inserted (6 food_safety + 6 fire_safety).

### Citation Corrections (editorial rule)

2 of 6 food safety citations corrected during primary-source verification:

| Requirement | Prompt Citation | Corrected Citation | Reason |
|-------------|----------------|-------------------|--------|
| health_permit | CalCode 113700 | CalCode 114381 | §113700 is the naming section ("California Retail Food Code"); §114381 is the permit requirement |
| pest_control | CalCode 114259.5 | CalCode 114259.1 | §114259.5 is live animals in food facilities; §114259.1 is vermin prevention |

### Verified Citations (4 of 6)

| Requirement | Citation | Verified Against |
|-------------|----------|-----------------|
| food_manager_cert | CalCode 113947.1 | HSC §113947.1 — certified food safety manager |
| food_handler_cards | CalCode 113948 | HSC §113948 — ANSI-accredited food handler training |
| haccp_plan | CalCode 114419 | HSC §114419 — HACCP plan requirements |
| temperature_logs | CalCode 114000 | HSC §114000 — time/temperature control |

## Data Hooks

4 hooks created in `src/hooks/onboarding/`:

| Hook | Purpose |
|------|---------|
| `usePillarRequirements` | Fetches state-scoped requirements via location.state |
| `useOnboardingState` | Master state: completion detection per action_type |
| `useTeamRoles` | Members + invites, filled/missing roles |
| `useDelegationSuggestion` | 3+ items sharing missing role → invite banner |

### Hook Test Results (3 trial orgs)

| Org | Location State | Requirements Returned | Behavior |
|-----|---------------|----------------------|----------|
| Test Food | null | 0 | Empty state (correct) |
| __SYSTEM_TEMPLATES__ | no location | 0 | Empty state (correct) |
| EvidLY | no location | 0 | Empty state (correct) |
| *Simulated CA* | CA | 12 (6+6) | Full requirements loaded |

### Completion Detection Queries Validated

- `compliance_documents` filtered by `organization_id` + `category` (upload actions)
- `temperature_logs` filtered via `locations.id` → `facility_id` (route_out)
- `user_invitations` filtered by `organization_id` + `role` (invite actions)
- `organizations.onboarding_skipped_items` (confirm actions)

## Role Naming Decision

- DB enum value: `compliance_manager` (unchanged across codebase)
- Customer-facing display label: "Compliance Officer"
- S3 typical_role CHECK uses `compliance_manager`
- S4 user_profiles CHECK uses `compliance_manager`
- Display label sweep: 4 files updated (sidebarConfig, i18n, EmulationPanel, RolePreview)

## TypeScript Verification

`npx tsc --noEmit` — zero errors in `src/hooks/onboarding/` files.

## Migration File

`supabase/migrations/20260810000021_onboarding_phase1_schema.sql`
