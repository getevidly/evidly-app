# EvidLY — Client UI Audit

**Scope:** the client-facing (paying-kitchen) app at `app.getevidly.com`. Excludes `/admin/*`, `/platform/*`, vendor portal, and auth-internal callbacks.
**Build audited:** `dc4a5cf9` — *refactor(brand): wordmark stands alone — drop the shield from all lockups*
**Method:** Chrome DevTools MCP, signed in as the demo client (Demo Kitchen Group, `owner_operator`, no staff role). Viewports 390×844 (mobile emulation) and 1280×900.
**Date:** 2026-08-25

---

## 0. Deploy verification

Production was confirmed to be serving `dc4a5cf9` before auditing.

`/forgot-password` is a reliable probe: it carried a shield+wordmark lockup before this commit and lost the shield in it. Production renders exactly two SVGs there — `m22 7-8.97 5.7…` (Mail) and `m12 19-7-7 7-7` (ArrowLeft). **Zero shield paths**, wordmark standing alone above "Reset Your Password". Deploy confirmed landed.

---

## 1. Client-facing route inventory

115 static routes resolve under the authenticated client layout. Reachability was probed empirically as the demo client rather than read off the router, because several routes silently redirect.

### Reachable — primary navigation

| Route | Purpose |
|---|---|
| `/dashboard` | Post-login landing; today's tasks, risk posture, quick actions |
| `/portfolio` | Cross-location roll-up |
| `/calendar` | Scheduled compliance events |
| `/documents` | Document library, expiry tracking |
| `/policies` | Written policies and procedures |
| `/policy-lens` | Policy Lens hub |
| `/policy-lens/upload` | In-app policy upload for review |
| `/reports` | Report catalogue and generation |
| `/kitchen-to-community` | No Kid Hungry giving programme |
| `/temp-logs` | Temperature readings (`/food-safety` redirects here) |
| `/checklists` | Daily operational checklists |
| `/haccp` | HACCP plan status |
| `/fire-safety/kec` | Kitchen Exhaust Cleaning (`/fire-safety` redirects here) |
| `/fire-safety/kec/fpm` | Fan Performance Management |
| `/fire-safety/kec/rgc` | Rooftop Grease Containment |
| `/fire-safety/kec/gfx` | Filter Exchange |
| `/fire-safety/protection` | Fire Protection — PSE-tracked systems |
| `/fire-safety/analysis`, `/fire-safety/trajectory` | Fire posture analysis and trend |
| `/food-safety/analysis`, `/food-safety/trajectory` | Food posture analysis and trend |
| `/vendors` | Vendor Services (`/services` redirects here) |
| `/vendors/threads` | Service message threads |
| `/vendor-network` | Vendor directory and discovery |
| `/incidents` | Incident log |
| `/corrective-actions` | Corrective action queue |
| `/self-inspection` | Self-inspection checklist (`/inspections`, `/self-audit` redirect here) |
| `/deficiencies`, `/deficiencies/upload` | Deficiency list; extract from report |
| `/current-shift`, `/shift-handoff` | Shift intelligence |
| `/org-hierarchy` | Locations (`/locations` redirects here) |
| `/team` | Team management |
| `/settings/roles-permissions` | Role permissions |
| `/equipment` | Equipment register |
| `/import` | Bulk data import |
| `/integrations` | Platform ecosystem and integrations |
| `/settings/notifications`, `/settings/billing`, `/settings/branding` | Settings |
| `/alerts` | Alert inbox |
| `/insights` plus nine `/insights/*` | Insight hub and sub-reports |
| `/jurisdiction`, `/jurisdiction-intelligence` | Know Your Inspector; jurisdiction intel |
| `/regulatory-alerts` | Regulatory change alerts |
| `/help` | Help and support |
| `/upgrade` | Plan upgrade |
| `/onboarding` | Responsibility setup |
| `/audit-report`, `/health-dept-report`, `/weekly-digest` | Generated report views |
| `/compliance-trends`, `/compliance-index`, `/scoring-breakdown` | Posture reporting |
| `/schedule`, `/tools`, `/referrals`, `/migrate`, `/workforce-risk`, `/cic-pse` | Secondary destinations |
| `/sb1383`, `/k12`, `/food-recovery`, `/usda/production-records` | Programme modules |
| `/inspection-package/send` | Send inspection package |

### Silently redirect to `/dashboard` (admin-gated, but reachable-looking)

`/audit-trail`, `/training`, `/training/certificates`, `/dashboard/training`, `/dashboard/training-catalog`, `/intelligence`, `/regulatory-updates`, `/self-diagnosis`, `/inspector-view`, `/inspector-mode`, `/mock-inspection`, `/photo-evidence`, `/playbooks`, `/incident-playbook`, `/developers`, `/certifications`, `/daily-operations`, `/copilot`, `/internal/pmr`, `/settings/api-keys`, `/settings/webhooks` — 21 routes. They render nothing and give no explanation.

### Broken

| Route | Result |
|---|---|
| `/records/for/insurance-broker` | **404** |
| `/records/for/property-manager` | **404** |
| `/records/for/fire-marshal` | **404** |
| `/records/for/health-inspector` | **404** |
| `/records/for/compliance-officer` | **404** |
| `/settings/integrations` | **404** |
| `/document-checklist` | **Error boundary crash** |

All five `/records/for/*` links are rendered on the dashboard itself (`DashboardView.tsx:617`).

---

## 2. Screenshot coverage

Screenshots are in `docs/audits/shots/`, named `<viewport>-<screen>.png`.

**Captured at both widths (6):** `dashboard`, `temp-logs`, `policy-lens-upload`, `fire-protection`, `integrations`, `document-checklist-crash`.
**Captured at 390 only (8):** `documents`, `reports`, `vendor-network`, `404-records-for`, `auth-modal`, `lock-screen`, `onboarding`, `welcome-modal`.
**Captured at 1280 only (1):** `kitchen-to-community-wordmark`.

The 1500ms dashboard splash is not screenshotted — it clears before a capture can fire. That finding is evidenced by the source line and the performance traces instead.

**Coverage limitation, stated plainly:** this is a prioritised set of 15 screens across 21 captures, not all 115 routes at both widths. Screens were chosen to cover every primary nav destination group, the specifically requested screens, and every defect ranked in section 5. The grading in section 3 is backed by **programmatic measurement across 37 screens at both viewports** (`metrics-1280.json`, `metrics-390.json` in this folder) — font sizes, border radii, button weights, touch-target heights and overflow were measured on all 37, not eyeballed. Parameterised detail routes (`/vendors/:id`, `/equipment/:id`, and similar) were not visitable with the demo tenant's minimal data and are excluded.

---

## 3. Grading

### First-glance orientation — **FAIL**

Eight screens render **no `<h1>` at all**: `/dashboard`, `/checklists`, `/fire-safety/kec`, `/fire-safety/protection`, `/self-inspection`, `/alerts`, `/onboarding`, `/document-checklist`.

Worse, the dashboard contradicts itself. The hero reads **"2 kitchens · on track."** while the dials immediately to its right read **"0% — NOT READY"** for both Fire and Food. Two opposite verdicts, same fold. (`1280-dashboard.png`)

### One primary action that visually wins — **FAIL**

Count of solid/filled buttons per screen: `/integrations` **36**, `/reports` **20**, `/settings/notifications` **11**, `/fire-safety/protection` **9**, `/jurisdiction` **8**, `/calendar` **7**, `/self-inspection` **6**. On Fire Protection every system row carries an equally weighted filled "Request schedule" — nothing tells you where to start.

The dashboard runs **two competing action rows** with overlapping but renamed items: card row "Upload a record / Log a temperature / Request from a vendor / Download evidence pack" against bottom bar "Log temp / Checklist / Upload doc / Report issue".

### Type scale discipline — **FAIL**

**17 distinct font sizes** across the client app: 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 30, 32 px.

Orphans used on exactly one screen: **17px** (`/vendors/threads`), **30px** (`/alerts`), **32px** (`/checklists`, `/dashboard`). Per-screen spread reaches **10 distinct sizes on `/checklists`** (8, 9, 10, 11, 12, 14, 18, 20, 22, 32) and 9 on `/calendar`.

Mono usage is mostly correct (labels, CalCode citations, domains) with one violation: **`/org-hierarchy` sets city names in mono** — "San Pedro, CA", "Long Beach, CA" at 11px. Those are prose, not data. `/checklists` also sets a "Primary-source verified" badge in mono at **9px**, below any reasonable floor.

### Spacing rhythm and card consistency — **FAIL. Every deviation listed:**

Five distinct card radii are in production simultaneously:

| Radius | Elements | Screens |
|---|---|---|
| **12px** | 167 | settings/*, equipment, import, integrations, insights, jurisdiction, upgrade, org-hierarchy, team, policies |
| **8px** | 148 | documents, calendar, reports, haccp, temp-logs, fire-safety/*, incidents, shift-handoff, current-shift |
| **6px** | 21 | policy-lens, policy-lens/upload, vendors, vendor-network, checklists |
| **10px** | 19 | portfolio, help |
| **4px** | 5 | settings/billing, settings/branding, fire-safety/protection |

Screens mixing radii internally: `/checklists` (6+8+10+12 — four systems on one screen), `/settings/billing` (12+8+4), `/settings/branding` (12+4+8), `/integrations` (12+8), `/shift-handoff` (8+12), `/current-shift` (8+12), `/fire-safety/protection` (8+4), `/team` (12+8), `/jurisdiction` (12+8), `/help` (10+12), `/vendors` (6+8), `/vendor-network` (8+6), `/policy-lens` (6+8), `/documents` (8+6), `/calendar` (8+6), `/reports` (8+12), `/incidents` (8+12), `/corrective-actions` (8+12), `/settings/notifications` (12+8), `/self-inspection` (12+8), `/onboarding` (8+12), `/temp-logs` (8+12).

Two screens render cards with **no radius at all**: `/vendors/threads`, `/dashboard`.

### Touch targets at least 44px — **FAIL**

Measured at 390px. Share of interactive targets under 44px tall:

| Screen | Under 44px |
|---|---|
| `/onboarding` | **95 / 95 (100%)** |
| `/vendor-network` | 33 / 33 (100%) |
| `/settings/notifications` | 31 / 31 (100%) |
| `/reports` | 20 / 20 (100%) |
| `/fire-safety/protection` | 13 / 13 (100%) |
| `/integrations` | 36 / 38 (95%) |
| `/vendors` | 11 / 12 (92%) |
| `/settings/billing` | 7 / 8 (88%) |
| `/jurisdiction` | 7 / 8 (88%) |
| `/settings/branding` | 26 / 31 (84%) |

Twenty screens sit at or above 84%. The welcome modal's only dismiss control is **28×28px**.

Lists and tables at 390 are genuinely rebuilt, not shrunk — the mobile shell is a separate layout with its own bottom tab bar, and only 3 `<table>` elements exist in the whole client app, all inside horizontal scrollers. That part is **PASS**. What fails is content clipped at the viewport edge: elements overflow the 390px boundary on `/settings/notifications` (34), `/temp-logs` (29), `/vendor-network` (29), `/integrations` (25), `/portfolio` (9), `/team` (9), `/documents` (7), `/vendors` (5), `/help` (4). The page never scrolls sideways — the content is simply cut off.

### Loading states — **WEAK**

`Dashboard.tsx:20-23` renders `DashboardSplash` behind a **hard-coded 1500ms `setTimeout`**, unconditional and unrelated to whether data has arrived. Every dashboard visit pays it.

Measured on Slow 4G with 4× CPU throttling, LCP is dominated by render delay, not network:

| Screen | LCP | TTFB | Render delay |
|---|---|---|---|
| `/dashboard` | **11,234 ms** | 27 ms | 11,207 ms |
| `/integrations` | **14,552 ms** | 23 ms | 14,529 ms |
| `/settings/branding` | **11,053 ms** | 28 ms | 11,025 ms |

TTFB is under 30ms everywhere — hosting is fine. The 11 to 14 second wait is all client-side.

### Empty states — **WEAK / FAIL**

Dead ends with no next step: `/temp-logs` "No active risk signals." and "Exposure pending — Temperature exposure scoring is not yet available."; `/compliance-index` "No Compliance Index Data"; `/scoring-breakdown` "No food safety data yet"; `/insights/intelligence` "No active intelligence signals". None offers an action.

`/vendor-network` is worse: the demo tenant has a linked vendor, yet the screen renders only filter chips with no results region and no "no matches" message. (`390-vendor-network.png`)

Good counter-example: `/fire-safety/protection` pairs "0 of 4 systems have current records" with a per-row "Request schedule" — **PASS**.

### Error surfaces — **FAIL**

- `/document-checklist` throws on mount. Root cause is precise: `DocumentChecklist.tsx:447` renders `Not Applicable: {naModal.docName}` inside `<Modal isOpen={!!naModal}>`. `isOpen` only gates *visibility* — the children are constructed unconditionally, so with `naModal === null` the dereference throws `TypeError: Cannot read properties of null (reading 'docName')`. The error boundary catches it, so the user gets "Something went wrong" on a nav destination that can never work. (`390-document-checklist-crash.png`)
- The auth modal surfaces validation through the **browser's native "Please fill out this field." bubble**, which renders over the Password label. (`390-auth-modal.png`)
- Lighthouse logged **18 console errors** on the dashboard (400s, 404s, a failing realtime WebSocket) — none surfaced in the UI.
- The 404 page offers **"Sign In"** to an already authenticated user.

### Brand — **FAIL**

**The wordmark is broken on `/kitchen-to-community`**, a client sidebar destination. The middle segment `vid` computes to `rgb(255,255,255)` on a `rgba(255,255,255,0.95)` header — **contrast 1:1, invisible**. The lockup reads "E &nbsp; &nbsp; LY" with a 56px hole. The light-background variant is not being applied here. (`1280-kitchen-to-community-wordmark.png`)

**Three different brand marks now ship simultaneously:**

1. `EvidlyLogo` — the correct wordmark (auth modal, lock screen, sidebar)
2. A **navy rounded tile with six orange dots**, 42×42, in the `Navigation` header
3. A **navy 80×80 `rounded-2xl` tile containing a bare `<span>E</span>`** on the 404 — `NotFound.jsx:10-11`, hand-built, never converted to `EvidlyLogo` (the same line also carries `tracking-tight` twice)

**Mobile drops the wordmark entirely** — the 390px header is icons only, no brand at all. (`390-dashboard.png`)

Where the uniform 24px wordmark *is* used, it reads correctly proportioned — not starved, not oversized (auth modal, lock screen). The concern that prompted this audit is unfounded; the real problem is the slots that were never converted.

Other brand drift:

- Sidebar icons are multicoloured (blue, green, orange, gold, red) against a navy/cream/gold system
- The mobile quick-action strip uses saturated blue/green/orange/red icons
- **Emoji as primary iconography** on the mobile dashboard — chart, pin and bell emoji for Scores, Locations and Alerts — mixed with line icons in the same header
- 12 colour-contrast failures on the dashboard, mostly `#1E2D4D` at 50% opacity and `rgb(107,118,137)`
- A serif display face appears on the dashboard hero and `/kitchen-to-community` and nowhere else

### Layout shift and jank — **FAIL**

Lighthouse mobile CLS on `/dashboard` is **0.302** — "poor" (threshold 0.25). `/integrations` and `/settings/branding` both 0.105.

The bottom action bar is `position: fixed` and renders **on desktop at 1280**, overlapping page content — the last card on `/dashboard` and `/fire-safety/protection` is cut by it.

At 390 the bottom of the viewport carries **three stacked fixed layers**: a 48px quick-action strip (740→788), a 56px tab bar (788→844), and an off-screen "More Options" sheet (844→1435). Plus a `fixed bottom-[136px] left-1/2 z-50` Voice FAB, 56×76px, **horizontally centred over body content**. On `/temp-logs` it covers the "Exposure pending" heading; on `/vendor-network` it covers two filter chips. Together, **212 of 844px — 25% of the mobile viewport — is permanent chrome.**

The bottom tab bar also **changes identity between screens**: "Tasks / Scores / Sites / More" on `/dashboard` versus "Dashboard / Checklists / Calendar / Temps / More" on `/temp-logs`.

Cosmetic but visible everywhere: the account chip renders **"Demo Client (ui Audit)"** — a title-case transform lowercasing an acronym.

---

## 4. Lighthouse (mobile)

Run in navigation mode with mobile emulation. The DevTools Lighthouse integration excludes the performance category by design, so performance is reported from real traces (Slow 4G, 4× CPU) rather than a synthetic score.

| Screen | Accessibility | Best Practices | LCP | CLS |
|---|---|---|---|---|
| `/dashboard` | **89** | 96 | 11,234 ms | 0.302 |
| `/integrations` | **90** | 96 | 14,552 ms | 0.105 |
| `/settings/branding` | **81** | 96 | 11,053 ms | 0.105 |

Reports: `docs/audits/lighthouse/`.

**`/dashboard` — top 3**

1. `cumulative-layout-shift` 0.302 — poor
2. `errors-in-console` — 18 errors (400, 404, realtime WebSocket failure)
3. `color-contrast` — 12 nodes, chiefly `#1E2D4D/50` and `rgb(107,118,137)`

**`/integrations` — top 3**

1. `color-contrast` — 8 nodes
2. `errors-in-console` — 12 errors
3. `button-name` — icon button with no accessible name (`p-2 … rounded-full min-h-[44px]`)

**`/settings/branding` — top 3**

1. `label` — **18 form inputs with no associated label** (including the text input holding "EvidLY")
2. `color-contrast` — 13 nodes
3. `button-name` — 7 unnamed buttons, plus `select-name` on 1 select

---

## 5. The five worst moments

### 1. The first thing a new client sees is a 175-word founder letter with no reachable action

`shots/390-welcome-modal.png` — The welcome modal opens over the dashboard with 175 words of prose. Its only CTA sits at **y=1187px in an 844px viewport** — 343px below the fold, behind 467px of inner scroll. The only visible control is a **28×28px** close ×. Nothing tells you what to do; the "HERE'S HOW TO GET STARTED" list is itself below the fold.

### 2. Five cards on the dashboard lead to 404s

`shots/390-404-records-for.png` — "Who can ask" renders Insurance Broker, Property Manager, Fire Marshal, Health Inspector and Compliance Officer as clickable cards (`DashboardView.tsx:617`). **All five 404.** No `/records/*` route exists. The 404 sits outside the app shell and offers a signed-in user a "Sign In" button, on a brand mark — a navy tile with a bare "E" — that exists nowhere else in the product.

### 3. The wordmark is invisible on a page in the client sidebar

`shots/1280-kitchen-to-community-wordmark.png` — "Kitchen to Community" is in the primary nav. It renders `vid` in `rgb(255,255,255)` on a `rgba(255,255,255,0.95)` header: **1:1 contrast**, so the logo reads "E&nbsp;&nbsp;&nbsp;&nbsp;LY". The page also drops the client shell entirely and shows marketing chrome — "Try Demo / Sign In / Get Started" — to a logged-in paying customer.

### 4. A floating button sits on top of the content you are trying to read

`shots/390-temp-logs.png`, `shots/390-vendor-network.png` — The Voice FAB is `fixed bottom-[136px] left-1/2`, centred over the content column. On Temperature Readings it covers the "Exposure pending" value and the paragraph under it; on Vendor Network it covers two filter chips. Beneath it, two stacked bars consume another 104px. **25% of the mobile viewport is permanently occupied**, and the tab bar relabels itself between screens.

### 5. Eleven seconds of blank screen, 1.5 of them deliberate

Evidence: `Dashboard.tsx:20-23` and `lighthouse/branding-trace.json` — the dashboard holds a splash for a hard-coded 1500ms regardless of data readiness. Real LCP on the dashboard is **11.2s** (TTFB 27ms — all render delay), and `/integrations` is **14.6s**. Dashboard CLS is **0.302**. The server is fast; the client spends eleven seconds assembling, and the first 1.5 are on purpose.

---

## Appendix — raw data

- `metrics-1280.json` — per-screen h1, font sizes, radii, button weights, mono samples (37 screens)
- `metrics-390.json` — per-screen overflow, scrollers, touch-target measurements (37 screens)
- `lighthouse/dashboard.report.{json,html}`, `lighthouse/integrations/`, `lighthouse/branding/`
- `lighthouse/branding-trace.json` — raw performance trace

## Notes for follow-up (observed, not graded)

- `InactivityContext.tsx:24` initialises `isLocked` to `false`. `useIdleTimeout` reads the persisted `evidly_locked` flag into `lockedRef`, but nothing restores the `LockScreen` from it, so a locked session appears to return unlocked after a reload. The lock screen itself renders correctly once triggered (`shots/390-lock-screen.png`).
- The dashboard presents "COMPLIANCE STATUS" as an aggregated percentage (0%, 0/10 Fire and 0/26 Food). CLAUDE.md forbids generating or aggregating a compliance score. Worth confirming whether a requirements-met percentage is intended to fall inside or outside that rule.
