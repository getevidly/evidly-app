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
- referrals, service_requests (HoodOps PRO)
- mobile_inspections (HoodOps PRO)
- service_reports (HoodOps PRO)
- vendor_employees (HoodOps PRO)
- jobs (HoodOps PRO)
- Any table referencing vendor_id as a foreign key to a jobs or vendor system

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
