# SIGNUP-FLOW-BUGS.md — End-to-End Signup + Onboarding Audit

**Date:** 2026-05-10
**Scope:** Landing CTAs → Signup → Email Confirm → Location Select → Onboarding → First Dashboard
**Method:** Static code analysis of all files in the flow

---

## A. Entry Points

| # | Source File | Line | CTA Text | Target Route | Route Exists? | Notes |
|---|-------------|------|----------|-------------|---------------|-------|
| 1 | Pricing.tsx | 213 | Lock in Founder Pricing (Single) | `/signup` | YES | |
| 2 | Pricing.tsx | 256 | Lock in Founder Pricing (Multi) | `/signup` | YES | |
| 3 | Pricing.tsx | 291 | Schedule a Call (Enterprise) | Calendly external | YES | External link |
| 4 | MobileStickyBar.tsx | 29 | [Sticky bar CTA] | `/signup` | YES | Shows after 600px scroll |
| 5 | SidebarUpgradeBadge.tsx | 22 | Get Founder Pricing | `/signup` | YES | Demo mode, after 60s |
| 6 | DemoBanner.tsx | 22 | Get Founder Pricing | `/signup` | YES | Anon demo mode |
| 7 | DemoBanner.tsx | 49 | Upgrade to Full Account | `/pricing` | YES | Auth demo mode |
| 8 | DashboardUpgradeCard.tsx | 32 | Lock in Founder Pricing | `/signup` | YES | After 2+ demo pages |
| 9 | AIChatWidget.tsx | 200 | Sign up for full access | `/signup` | YES | After 10-msg limit |
| 10 | AIChatWidget.tsx | 271 | Sign up (inline link) | `/signup` | YES | Chat limit message |
| 11 | KitchenToCommunity.tsx | 151 | Lock in Founder pricing | `/signup` | YES | Impact page CTA |
| 12 | LeaderboardPreview.tsx | 66 | Get Founder Pricing | `/signup` | YES | `<a href>` not navigate |
| 13 | DemoUpgradePrompt.tsx | 63 | Get Founder Pricing | `/signup` | YES | `<a href>` not navigate |

**Route map (App.tsx):**
- `/signup` → `<PublicRoute>` → `<Signup />` (line 574)
- `/signup/locations` → `<ProtectedRoute>` → `<SignupLocations />` (line 575)
- `/email-confirmed` → `<Suspense>` → `<EmailConfirmed />` (no route guard — public)

**Entry point bugs: NONE.** All 13 CTAs target valid routes. No 404s, no broken redirects, no stale URLs.

---

## B. Per-Screen Bugs

### B1. Signup Form (`src/pages/Signup.tsx`)

No blocking bugs found. Form submission, validation, error display, and double-submit prevention all function correctly.

| Check | Result |
|-------|--------|
| Valid submit → email sent? | YES — calls supabase.auth.signUp(), shows "Check Your Email" screen |
| Invalid email → error renders? | YES — regex validation, error clears on fix |
| Existing email → correct message? | YES — Supabase returns error, displayed in banner |
| Loading state prevents double-submit? | YES — button disabled + text changes to "Creating account..." |
| Form state persists across refresh? | NO — useState only, no localStorage. Acceptable. |

---

### B2. Email Confirmed (`src/pages/EmailConfirmed.tsx`)

#### BUG B2-1: BLOCKER — Trigger creates wrong org, EmailConfirmed skips provisioning

**The `handle_new_user` trigger** (migration `20260315000000_auto_profile_on_signup.sql`) fires on EVERY `auth.users` INSERT. It:
1. Creates an org named after the email domain (e.g., `"gmail.com"`)
2. Creates a `user_profiles` row pointing to that domain org
3. Creates a `user_location_access` row for that domain org

**Then** when the user confirms their email, `EmailConfirmed.tsx` line 126-136:
1. Checks if profile exists → **FINDS the trigger-created profile**
2. Skips `provisionNewUser()` entirely
3. Redirects to `/signup/locations`

**Result:** User's org is named `"gmail.com"` (or whatever their email domain is) instead of the business name they typed in the signup form. The form data (`org_name`, `state`, `phone`, `terms_accepted_at`) stored in `user_metadata` is **never used**. The metadata cleanup at line 86-93 never runs either, so stale metadata persists in auth.

**Severity:** BLOCKER — every new signup via email gets wrong org name.

**Verification needed:** Confirm `handle_new_user` trigger is still active in PROD. The trigger is created in migration `20260315000000` and never dropped in any subsequent migration.

#### BUG B2-2: HIGH — No intermediate feedback during 15-second timeout

If session exchange is slow, user sees only a spinner for up to 15 seconds (line 167-175). No "Still working..." message. No retry prompt until timeout fires.

#### BUG B2-3: LOW — Metadata cleanup failure is silent

Line 86-93: `supabase.auth.updateUser()` can fail without breaking the flow. The stale metadata (`org_name`, `state`, `phone`) remains in `auth.users.raw_user_meta_data` forever. No user impact but leaves dirty data.

---

### B3. Signup Locations (`src/pages/SignupLocations.tsx`)

#### BUG B3-1: BLOCKER — Enterprise "Schedule a Demo" button has no onClick handler

Line 216-218:
```jsx
<button className="w-full py-4 bg-[#1E2D4D] text-white rounded-lg ...">
  Schedule a Demo
</button>
```

No `onClick`. No `href`. No `navigate`. Button renders but does nothing. Enterprise-path users hit a dead end.

#### BUG B3-2: HIGH — handleContinue silently skips DB write if organization_id is null

Line 66: `if (profile?.organization_id)` — if profile hasn't loaded yet or organization_id is null (which AuthContext warns about at line 94-95), the Supabase update is silently skipped. User navigates to `/onboarding` without `planned_location_count` being set.

**Race condition window:** Profile fetch is async in AuthContext. If user clicks Continue before fetch completes, organization_id is null.

#### BUG B3-3: HIGH — Supabase update failure is console-only

Lines 71-73: If the `.update()` call fails, error is logged to console. No user-facing error. User proceeds to onboarding without knowing their location count wasn't saved. This is the field the Risk-Free Guarantee criterion (a) depends on.

#### BUG B3-4: LOW — No loading/disabled state on Continue button during async write

The `handleContinue` function is async but the Continue button has no loading indicator or disabled state. User could double-click during slow network, triggering multiple updates and navigations.

#### BUG B3-5: LOW — No back button

User cannot go back to change their selection. Must complete entire onboarding to re-edit.

---

### B4. Onboarding Wizard

#### BUG B4-1: HIGH — Two competing onboarding systems with no clear canonical path

**System A:** Legacy page-based wizard at `/onboarding` (10 steps) — `src/pages/Onboarding.tsx`
**System B:** Checklist card embedded in Dashboard (15 steps) — `src/hooks/useOnboardingChecklist.ts` + `OnboardingChecklistCard.tsx`

Both exist. Both try to track progress independently. System A uses Supabase columns. System B uses localStorage + Supabase auto-detection. A new user is routed to System A (`/onboarding`) from SignupLocations.

#### BUG B4-2: HIGH — System A reads nonexistent DB columns

`Onboarding.tsx` line 56 queries:
```
.select('onboarding_step, onboarding_completed, industry_type, industry_subtype')
```

The columns `onboarding_step` and `onboarding_completed` on the `organizations` table are **never created in any migration**. Only `onboarding_completed_at` exists on `user_profiles` (migration `20260220000000`).

**Result:** Supabase returns null for these fields. Step resume (`line 62-63: setCurrentStep(data.onboarding_step)`) gets null → step stays at default 1. Completion check (`line 60: data.onboarding_completed`) is always falsy → never redirects to dashboard on page load.

**Impact:** Step persistence across page reloads is broken. User always restarts from step 1. Completion flag never saves.

#### BUG B4-3: HIGH — Team invite edge function error silently swallowed

`Onboarding.tsx` line 195-210: Invokes `send-team-invite` edge function. Line 207 catch block silently ignores errors. User sees success toast even if invite was never sent.

#### BUG B4-4: LOW — QR Code step is a placeholder

Step 9 (QR Codes) shows a toast "QR codes generated after setup is complete" (line 558) and advances. No actual QR code generation occurs during or after onboarding.

---

### B5. First Dashboard View

#### BUG B5-1: LOW — Checklists metric shows "0/0" in edge case

Line 274: `{ label: 'Checklists', value: \`${checklistsDone}/${checklistTasks.length}\` }`

If `todaysTasks` contains items but none are checklist tasks, displays "0/0". For a true new user with zero tasks, the empty state card renders instead (line 245-271), so this is only an edge case.

#### BUG B5-2: LOW — RiskFreeWidget doesn't catch RLS/query errors

`useRiskFreeEligibility.ts` line 36: `if (eligError) throw new Error(...)` — thrown error propagates to `useApiQuery` which sets error state. The widget itself (line 16) returns null when `!eligibility`, but the thrown error may cause a brief flash or console error. No ErrorBoundary wraps the widget.

**For brand-new signups:** If `risk_free_eligibility` row doesn't exist yet (backfill hasn't run), hook returns null → widget returns null. Safe.

---

### B6. Auth / RLS

#### BUG B6-1: (Verified Safe) — New user role defaults to owner_operator

`RoleContext.tsx` line 96: `return MAP[dbRole || ''] || 'owner_operator'`. Null/undefined role gracefully falls back. No admin bleed.

#### BUG B6-2: (Verified Safe) — Admin routes properly gated

`RequireAdmin` component checks `isAdmin` from AuthContext. Non-admin users redirected to `/dashboard`. Admin nav items gated by `RoleGuard`. No path for new user to access admin pages.

#### BUG B6-3: (Conditional) — If trigger creates ULA row, RLS works for new users

The `handle_new_user` trigger creates a `user_location_access` row, which is required by nearly all RLS policies. If the trigger is active, new users can read their own data. If the trigger were removed without replacement, new users would be locked out of their own profiles/orgs/locations.

---

## C. Cross-Flow Bugs

#### BUG C1: BLOCKER — Full flow produces wrong org name

Complete path: Landing → Signup form (types "Joe's Pizza") → Email sent → Click link → EmailConfirmed → Profile exists (trigger) → Redirect to /signup/locations → User selects locations → /onboarding → Dashboard.

**User's org is "gmail.com" throughout.** The name "Joe's Pizza" typed in the form is never used. Stored in `user_metadata` but never read after the trigger-created profile is found.

#### BUG C2: HIGH — /onboarding loads but can't persist progress

Navigate to `/onboarding` → complete step 3 (add location) → refresh page → lands on step 1 again. The `onboarding_step` column doesn't exist, so progress can't save or restore.

#### BUG C3: (Verified Safe) — Direct navigation to /onboarding without prior steps

`/onboarding` is wrapped in `<ProtectedRoute>`. Unauthenticated users redirect to `/login`. Authenticated users can access it directly (no prerequisite gate on location selection), which is acceptable.

#### BUG C4: (Verified Safe) — Logout mid-onboarding then login

Auth state is in Supabase. Login restores session. Onboarding page loads fresh (step 1) due to B4-2, but doesn't crash.

---

## D. Console/Sentry Errors Observed

| Source | Error | When |
|--------|-------|------|
| AuthContext:95 | `console.warn: organization_id is null` | If ULA row missing or profile fetch race |
| SignupLocations:72 | `console.error: Failed to persist planned_location_count` | If Supabase update fails |
| Onboarding.tsx:207 | Silent catch on `send-team-invite` invoke | If edge function fails |

No Sentry integration detected in codebase (no `@sentry/react` imports found).

---

## E. Bugs by Severity

### BLOCKER (2)

| ID | Bug | File | Impact |
|----|-----|------|--------|
| B2-1 | Trigger creates domain org, EmailConfirmed skips provisioning — user gets wrong org name | EmailConfirmed.tsx + migration 20260315 | Every new email signup affected |
| B3-1 | Enterprise "Schedule a Demo" button has no onClick | SignupLocations.tsx:216 | Enterprise path is a dead end |

### HIGH (5)

| ID | Bug | File | Impact |
|----|-----|------|--------|
| B3-2 | handleContinue silently skips write if org_id null (race) | SignupLocations.tsx:66 | planned_location_count not set → Risk-Free criterion (a) broken |
| B3-3 | Supabase update failure logged to console only | SignupLocations.tsx:71 | Same as above, different trigger |
| B4-1 | Two competing onboarding systems, no clear canonical | Onboarding.tsx + useOnboardingChecklist.ts | Confusing UX, conflicting progress tracking |
| B4-2 | Onboarding reads nonexistent DB columns (onboarding_step, onboarding_completed) | Onboarding.tsx:56 | Progress doesn't persist across reloads |
| B4-3 | Team invite edge function error silently swallowed | Onboarding.tsx:207 | User thinks invite sent when it wasn't |

### LOW (6)

| ID | Bug | File | Impact |
|----|-----|------|--------|
| B2-2 | 15-second timeout with no intermediate feedback | EmailConfirmed.tsx:167 | User anxiety on slow connections |
| B2-3 | Metadata cleanup failure is silent | EmailConfirmed.tsx:86 | Stale data in auth, no user impact |
| B3-4 | No loading/disabled state on Continue button | SignupLocations.tsx:handleContinue | Potential double navigation |
| B3-5 | No back button on location selection | SignupLocations.tsx | Can't change selection without completing flow |
| B4-4 | QR Code step is a non-functional placeholder | Onboarding.tsx:558 | User advances past empty step |
| B5-2 | RiskFreeWidget lacks ErrorBoundary | RiskFreeWidget.tsx:12 | Query error could propagate |

---

## F. Total Counts

| Severity | Count |
|----------|-------|
| BLOCKER | 2 |
| HIGH | 5 |
| LOW | 6 |
| **Total** | **13** |

---

## G. Recommended Fix Order

1. **B2-1** (BLOCKER) — Decide: drop the `handle_new_user` trigger OR rewrite EmailConfirmed to UPDATE the trigger-created org/profile with the form data instead of skipping. The trigger is useful (creates ULA row needed for RLS), so the recommended fix is: keep the trigger, but have EmailConfirmed UPDATE the existing org name/state and profile phone/terms from metadata instead of checking-and-skipping.

2. **B3-1** (BLOCKER) — Add `onClick` to Enterprise "Schedule a Demo" button. Either `window.open(calendlyUrl)` or `navigate('/contact')`.

3. **B3-2 + B3-3** (HIGH, same fix) — Add loading state, error toast, and null-guard to `handleContinue`. Block navigation if update fails.

4. **B4-2** (HIGH) — Either create the missing `onboarding_step`/`onboarding_completed` columns on organizations table, or migrate Onboarding.tsx to use the System B (checklist card) localStorage pattern.

5. **B4-1** (HIGH) — Decide canonical onboarding: kill System A or System B. Until then, both exist in parallel.

6. **B4-3** (HIGH) — Add error handling + user toast for team invite failures.

7. **LOW bugs** — Bundle into a single cleanup commit after BLOCKER/HIGH fixes land.
