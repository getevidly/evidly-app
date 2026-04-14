# EvidLY — Final Test & Code Freeze Plan

**Prepared:** April 13, 2026
**Owner:** Arthur Haggerty, Haggerty Holdings
**App:** EvidLY (https://app.getevidly.com)
**Repo:** github.com/getevidly/evidly-app (main branch)
**Stack:** React 18.3 + TypeScript + Vite + Tailwind + Supabase + Vercel

---

## Current State (as of April 13, 2026)

- Production is live and stable at https://app.getevidly.com
- GitHub (origin/main) is synced with production at commit `6140d9f`
- All 271 unit tests pass
- Last known working staging snapshot: https://evidly-8rrnjunfp-evidly.vercel.app/login
- The codebase has been through 19 days of automated testing (DAY1–DAY19), UI polish phases, accessibility audits, and bug fixes
- The white screen bug (missing Trophy import) and PWA infinite reload loop have been resolved

---

## Phase 1: Pre-Test Prep (This Week — April 14–18)

- [ ] Confirm production is stable with no user-reported issues
- [ ] Confirm GitHub and Vercel production are on the same commit
- [ ] Document any known issues or edge cases to verify during final test
- [ ] Prepare a test checklist covering all critical user flows (see Phase 2)

---

## Phase 2: Final Full Test (Next Week — April 21–25)

### Automated Testing
- [ ] Run full unit test suite: `npx vitest run` — all tests must pass
- [ ] Run TypeScript type check: `npx tsc --noEmit` — zero errors
- [ ] Run build: `npx vite build` — clean build with no warnings

### Manual Testing — Auth & Roles
- [ ] Login flow (email/password)
- [ ] Demo mode (anonymous + authenticated)
- [ ] Verify all 8 roles see correct sidebar items:
  - platform_admin, owner_operator, executive, compliance_manager, chef, kitchen_manager, facilities_manager, kitchen_staff
- [ ] Confirm admin-only items (Sales Pipeline, GTM Dashboard, Leads, Campaigns, Demo Generator, Demo Launcher, Demo Pipeline, Kitchen Checkup) are hidden from non-admin roles
- [ ] Logout flow

### Manual Testing — Core Features
- [ ] Dashboard loads with real data (no fake/hardcoded data)
- [ ] ScoreTable pages (California counties, Washington counties)
- [ ] Compliance pages (food safety, facility safety)
- [ ] Temperature logging
- [ ] Self-inspection flows
- [ ] Document generation
- [ ] Notification bell
- [ ] Settings / profile page

### Manual Testing — Public Pages
- [ ] Landing page (/)
- [ ] Pricing page
- [ ] Kitchen Checkup pages
- [ ] ScoreTable SEO pages

### Manual Testing — Admin Features (platform_admin only)
- [ ] Sales Pipeline
- [ ] GTM Dashboard
- [ ] Demo Generator / Demo Launcher
- [ ] Leads and Campaigns

### Cross-Browser / Device
- [ ] Chrome desktop
- [ ] Safari desktop
- [ ] Mobile responsive (Chrome on iOS/Android)

### Edge Cases
- [ ] Empty states render correctly (no fake data)
- [ ] Error states display properly
- [ ] Network interruption handling
- [ ] Session expiry / token refresh

---

## Phase 3: Bug Fixes (If Needed — April 25–27)

- [ ] Fix any issues found during final test
- [ ] Each fix gets its own commit with clear message
- [ ] Re-run automated tests after each fix
- [ ] Deploy to production: `npx vercel --prod`
- [ ] Verify fix in production

---

## Phase 4: Code Freeze (After Final Test Passes)

### Freeze Actions
1. **Tag the release:**
   ```
   git tag -a v1.0.0 -m "EvidLY v1.0.0 — production freeze"
   git push origin v1.0.0
   ```

2. **Create a frozen branch:**
   ```
   git checkout -b production-frozen
   git push origin production-frozen
   ```

3. **Update CLAUDE.md** — Add freeze section:
   ```
   ## CODE FREEZE — ACTIVE
   No code changes are permitted without explicit approval from Arthur.
   This freeze was activated on [DATE] at tag v1.0.0.
   If a change is requested, Arthur must confirm: "Freeze is lifted for [specific task]."
   ```

4. **Vercel configuration:**
   - Consider disabling auto-deploy from GitHub during freeze
   - Or restrict deployments to manual `npx vercel --prod` only

### Freeze Rules
- No commits to `main` without Arthur's explicit written approval
- No new features, no refactoring, no "improvements"
- No dependency updates unless critical security patch
- No database migrations
- No new edge functions
- Emergency hotfixes require: Arthur's approval → fix on a hotfix branch → test → merge → deploy → re-tag

---

## Phase 5: Post-Freeze Monitoring

- [ ] Monitor production for 72 hours after freeze
- [ ] Check Vercel deployment logs for errors
- [ ] Check Supabase logs for failed queries or auth issues
- [ ] Confirm no user-reported bugs
- [ ] Document the frozen state as the production baseline

---

## Key Contacts

| Role | Person | Responsibility |
|------|--------|---------------|
| Owner | Arthur Haggerty | Final approval on all changes, freeze/unfreeze authority |
| AI Dev | Claude Code | Code changes only when freeze is lifted and task is approved |

---

## Success Criteria

The code freeze is considered successful when:
1. All automated tests pass
2. All manual test checklist items are verified
3. Production has been stable for 72+ hours post-freeze
4. The v1.0.0 tag and production-frozen branch are created
5. CLAUDE.md freeze section is active
6. No open critical or high-priority bugs remain
