# CLAUDE.md — EvidLY Codebase Rules
## Claude Code reads this file automatically before every session.
## These rules are absolute and override any instruction in any prompt.

---

## WHAT THIS REPO IS

EvidLY is a B2B SaaS compliance platform for commercial kitchens.
Production: https://app.getevidly.com
Stack: React 18.3 + TypeScript + Vite + Tailwind + Supabase + Vercel
Owner: Arthur Haggerty, Haggerty Holdings

---

## SCOPE — THIS REPO IS EVIDLY ONLY

Never create anything for any other product. This includes:
- HoodOps PRO (surveys, referrals, mobile inspection, service reports, job management, vendor employees)
- CPP or Filta operational systems
- Any standalone app, sub-app, or package

Never create:
- apps/ directory or any subdirectory inside it
- packages/ directory
- mobile/ directory
- web-vendor/ directory
- Any new Vite app, React Native app, or Electron app

If a task seems to require a new app or a non-EvidLY feature — STOP. Ask Arthur before proceeding.

---

## ZERO FAKE DATA — ABSOLUTE

Never seed, hardcode, or create fake/demo/sample/placeholder data in any component.
No hardcoded arrays of signals, locations, temperatures, alerts, inspections, or records.
If real data does not exist → show an empty state. That is all.

Approved exceptions (guided tour ONLY — never in production render path):
- SB 1383 module
- K-12 module
- Leaderboard
- Re-Score Alerts

---

## NO UNAUTHORIZED MIGRATIONS

Never create a Supabase migration unless the table or column was explicitly requested in the current prompt.
Before writing any CREATE TABLE or ALTER TABLE — ask: "Was this explicitly requested?"
If uncertain — STOP and ask Arthur. Do not create it.

Tables that must NEVER be created in this repo:
- customer_surveys, survey_settings (HoodOps PRO)
- referrals (HoodOps PRO)
- mobile_inspections (HoodOps PRO)
- service_reports (HoodOps PRO)
- vendor_employees (HoodOps PRO)
- jobs (HoodOps PRO)
- Any table referencing vendor_id as a foreign key to a jobs or vendor system

### EvidLY ↔ HoodOps shared tables (intended integration — not violations)

These tables are EvidLY-owned. HoodOps writes to them exclusively via the
`hoodops-webhook` edge function (shared-secret auth, idempotent, audit-logged).
This is the intended inbound integration, not a scope leak.

- `service_requests` — EvidLY vendor-cadence management (migration 20260820000000).
  Used by useServiceRequests.ts, route-service-request edge fn. HoodOps never touches it.
- `vendor_service_records` — HoodOps writes service completions; EvidLY reads for PSE reconciliation.
- `location_service_schedules` — HoodOps updates next_due_date after service; EvidLY reads and manages cadence.
- `service_reschedule_requests` — EvidLY creates requests; HoodOps confirms/declines via webhook.
- `service_type_definitions` — Canonical taxonomy (7 codes). EvidLY owns; both systems read.

---

## NO UNAUTHORIZED EDGE FUNCTIONS

Never create a Supabase edge function unless explicitly requested in the current prompt.
Before writing any new function — ask: "Was this explicitly requested?"
If uncertain — STOP and ask Arthur.

Edge functions that must NEVER exist in this repo:
- schedule-survey, send-surveys, send-survey-reminders, survey-alert (HoodOps PRO)
- send-fire-courtesy-report (CPP operational)
- Any function related to job completion, vendor scheduling, or customer review prompting

---

## NO COMPLIANCE SCORES

Never generate, calculate, blend, or aggregate a compliance score.
Food Safety and Facility Safety results are displayed EXACTLY as the jurisdiction produces them.
Never convert, blend, or generate a number. Jurisdiction is the only authority.

PSE language: always "On Track" or "Potential Gap" — never "Compliant" or "Non-Compliant".

---

## NO ADMIN NAV BLEED

Admin-only nav items must NEVER render for any role except platform_admin.
Admin-only items: Sales Pipeline, GTM Dashboard, Leads, Campaigns, Demo Generator, Demo Launcher, Demo Pipeline, Kitchen Checkup.
Always gate with: if (userRole !== 'platform_admin') return null

---

## NAVIGATION RULES

All navigation must use react-router (Link, useNavigate).
Never use window.open(), target="_blank", or window.location for internal navigation.
New page files use .jsx not .tsx.

---

## DEPLOYMENT

Every prompt ends with:
git add -A
git commit -m "..."
npx vercel --prod

Arthur validates in live production. No preview step needed.

---

## BEFORE STARTING ANY TASK

1. Read this file
2. Confirm the task is EvidLY-scoped
3. If the task mentions surveys, referrals, mobile app, vendor management, or job tracking — STOP and ask
4. Never create files outside the authorized scope listed above

---

# 12-Step Rhythm — Enforcement Rules

ABSOLUTE RULE: Execute ONLY the numbered steps in the current prompt.
Do not chain. Do not anticipate. Do not auto-execute next steps.

## Step naming convention

- "Step 4 review gate" — show draft, STOP. Do not write files.
- "Step 5 apply ONLY" — write file, run Step 6 verify, STOP.
- "Step 7 stage + Step 8 diff" — stage and paste literal diff, STOP.
- "Step 9 commit ONLY" — commit, output SHA, STOP. Do not push.
- "Step 11 push" — push and verify origin SHA, STOP.

## Anti-patterns — refuse these

1. Writing a file when prompt only shows Step 4 review draft
2. Applying migration to PROD without explicit PROD apply prompt
3. Running git add/commit/push without explicit step prompt
4. Running unsolicited verification queries
5. Re-pasting prior output as current step output
6. Summarizing a diff when literal text is requested
7. Interpreting "Hold or redirect" as authorization

## When uncertain

If unsure whether next prompt has been received, output:

  "Step N draft received. Waiting for explicit Step N+1 prompt.
   No further actions taken."

Then stop. Do not guess.

## Migration apply rule

Migrations apply to PROD via Supabase MCP only when the prompt
explicitly contains the apply command. Standing rule "migrations
apply after Step 6" means the apply happens IN A LATER PROMPT,
not as a chained action in the same prompt as the file write.

## Diff paste rule

When asked for a literal diff, output every line of `git diff`.
Never use phrases like "shown above" or "X insertions" as a
substitute. The reviewer needs the actual text to verify the
staged change matches the approved draft.

## File creation rule

When writing files via the Write tool, if the file is larger than
20 lines, use heredoc-style cat instead. Write tool truncation
has occurred on this codebase before. Heredoc:

  cat > path/to/file.tsx <<'EOF_NESTED'
  ... full file content ...
  EOF_NESTED

Verify line count immediately after with wc -l path/to/file.
