# EvidLY — Client UI Audit, Round 2

**Scope:** the client-facing screens that graded weak or fail in `client-ui-audit.md`, plus the accessibility flags. The five worst moments from round 1 are fixed and deliberately not re-reported.
**Build audited:** `f1ec2370` — served from a local production build (`vite preview`), signed in as the demo client.
**Viewports:** 390×844 and 1280×900.
**Date:** 2026-08-26

**Already fixed, excluded from this pass:** welcome modal, records-on-file block, mobile nav (three bars → one), dashboard performance (splash, `vendor-pdf`, leaflet, reserved heights).

---

## 1. Unlabeled form controls — the fix list

Lighthouse flagged **18 on `/settings/branding`** because that is the only screen it audited. Sweeping every client screen found **58 unlabeled controls across 15 screens**.

"Unlabeled" here means no `aria-label`, no `aria-labelledby`, no `label[for=…]`, no wrapping `<label>`, and no `title` — i.e. a screen reader announces the control with no name.

### `/settings/branding` — 20 of 20 (`src/pages/BrandingSettings.tsx`)

Every field already has a visible `<label>`; none is programmatically associated. The fix is an `id` + `htmlFor` pair on each — no visual change.

| Line | Control | Needs |
|---|---|---|
| 183 → 184 | Brand Name | `htmlFor="brand-name"` / `id="brand-name"` |
| 192 → 193 | Tagline | `htmlFor="brand-tagline"` / `id` |
| 201 → 202 | Login Welcome Text | `htmlFor="brand-login-welcome"` / `id` |
| 210 → 211 | Support Email | `htmlFor="brand-support-email"` / `id` |
| 246 → 248 | Colour swatch ×6 (`colorFields.map`) | `id={`color-${f.key}`}` + `aria-label={`${f.label} colour swatch`}` |
| 246 → 254 | Colour hex ×6 (same map) | `id={`color-${f.key}-hex`}` + `aria-label={`${f.label} hex value`}` |
| 288 → 289 | SSO Provider `<select>` | `htmlFor="sso-provider"` / `id` — this is the `select-name` failure |
| 300 → 301 | Entity ID / Issuer | `htmlFor="sso-entity-id"` / `id` |
| 309 → 310 | SSO Login URL | `htmlFor="sso-login-url"` / `id` |
| 344 → 345 | Custom Domain | `htmlFor="custom-domain"` / `id` |

The colour rows need per-input names because one `<label>` currently sits above **two** inputs (swatch + hex), so a single `htmlFor` cannot serve both.

Also on this screen: **line 354 is an orphan `<label>` ("SSL Status") with no control under it** — it labels a `<span>`. It should be a `<p>`/`<dt>`, not a `<label>`.

### Every other screen

| Screen | Unlabeled | File:line | Needs |
|---|---|---|---|
| `/settings/notifications` | 13 of 19 | `src/pages/settings/NotificationsPage.tsx:317` (matrix checkboxes), `:373` | Each checkbox is a cell in a category × channel grid with no name. Needs `aria-label={`${cat.label} via ${ch.label}`}` |
| `/equipment` | 4 of 4 | `src/pages/Equipment.tsx:846, 854, 912` (filters) | Type filter, status filter, search box → `aria-label` |
| `/documents` | 3 of 3 | `src/components/documents/DocumentsToolbar.tsx:44, 53, 65, 77` | Search + 3 filter selects → `aria-label` ("Search documents", "Filter by status/location/vendor") |
| `/policy-lens/upload` | 3 of 3 | `src/pages/PolicyLensUpload.tsx:127, 134, 158` | File input, policy-type select, carrier text → `htmlFor`/`id` (visible labels already present) |
| `/vendor-network` | 3 of 3 | `src/pages/VendorMarketplace.tsx:353, 438, 448` | Vendor search, tier select, county select → `aria-label` |
| `/calendar` | 2 of 2 | `src/pages/Calendar.tsx:1112, 1125` | Two filter selects → `aria-label` |
| `/team` | 2 of 2 | `src/pages/Team.tsx:528, 536, 547` | Member search + role filter → `aria-label` |
| `/alerts` | 2 of 2 | `src/pages/Alerts.tsx:121, 129` | Severity + pillar filters → `aria-label` |
| `/fire-safety/kec` | 1 | location selector | `aria-label="Location"` |
| `/fire-safety/protection` | 1 | location selector | `aria-label="Location"` |
| `/shift-handoff` | 1 | note/textarea | `htmlFor`/`id` |
| `/settings/roles-permissions` | 1 | search | `aria-label="Search people"` |
| `/integrations` | 1 | search | `aria-label="Search integrations"` |
| `/help` | 1 | search | `aria-label="Search help"` |

### Icon-only buttons with no accessible name

`src/pages/BrandingSettings.tsx:225` and `:397` — **6 toggle switches** rendered as a bare `<button className="flex-shrink-0">` wrapping a `ToggleLeft`/`ToggleRight` icon. A screen reader announces "button" with no name and no state.

Needs, on each: `aria-label={toggle.label}`, `role="switch"`, `aria-checked={value}`.

The sweep also found unnamed buttons elsewhere — `/settings/notifications` (9), `/calendar` (3), `/equipment` (3), and one each on `/documents`, `/reports`, `/temp-logs`, `/checklists`, `/haccp`, `/vendors`, `/vendors/threads`, `/incidents`, `/self-inspection`, `/team`. Same pattern: icon-only controls.

---

## 2. Re-walk — what still reads weak or fail

### Loading states — **WEAK** (inconsistent, not absent)

Sampling `main` every 180ms through the load window shows three different conventions in use:

| Screen | Skeleton | Spinner | Behaviour |
|---|---|---|---|
| `/equipment` | ✅ | — | correct |
| `/incidents` | ✅ | ✅ | **both at once** |
| `/vendor-network` | — | ✅ | spinner only |
| `/calendar` | — | ✅ | spinner only |
| `/reports` | — | — | nothing; appears in one step |
| `/documents` | — | — | nothing, and content **oscillates**: 732 → 582 → 805 → 893 chars across four frames |

`/documents` is the one to fix first: no loading affordance at all, and the body shrinks before it grows, so the list visibly swaps under the reader.

### Empty states — **WEAK**, split by kind

Dead ends — state a fact, offer no action:

- `/temp-logs` — "Temperature exposure scoring is not yet available. When enabled, this card will…"
- `/corrective-actions` — "Action-level exposure scoring is not yet available…"
- `/fire-safety/protection` — "Forecast unavailable — protection services vary by system type and service cycle"
- `/haccp` — "No reading in last 24 hr"
- `/current-shift` — "No overdue items this shift."
- `/shift-handoff` — "No prior handoff on file"
- `/integrations` — "Coming Soon"
- `/settings/notifications` — "SMS Notifications (coming soon)"

Good counter-examples already doing the right thing: `/deficiencies` ("Add first deficiency"), `/policies` ("Adopt a Policy"), `/vendors/threads` ("No service threads yet" + action), `/policy-lens` ("Upload your policy").

Note: three "not yet available / coming soon" messages describe **unbuilt backend**, not an empty tenant. Those are a product decision, not a copy fix — see §4.

### Error surfaces — **PASS on this build**

The console errors Lighthouse reports (5 per screen) are a **localhost artifact**, not a product defect: a CORS block on `intelligence-bridge-proxy` because the edge function does not allow `http://localhost:4173`, plus the resulting `ERR_FAILED`. On `app.getevidly.com` that origin is allowed. The remaining 400/404 are the same pre-existing `alerts` and `location_jurisdiction_profiles` calls noted in round 1.

I found no new console-only failure on this pass. The round-1 finding — `/document-checklist` throwing into the error boundary — was not re-tested here and is not in this scope.

### Touch targets <44px at 390 — **FAIL**, and this is now the largest single category

14 screens have **every** interactive target under 44px:

| Screen | <44px | Worst examples |
|---|---|---|
| `/vendor-network` | 33/33 (100%) | search `@37`, sort `@36`, county `@32`, chips `@32` |
| `/settings/notifications` | 31/31 (100%) | tabs `@38`, matrix checkboxes `@24` |
| `/reports` | 20/20 (100%) | every "Generate" `@28` |
| `/fire-safety/protection` | 13/13 (100%) | "Request schedule" `@24`, location `@18` |
| `/temp-logs` | 10/10 (100%) | "Scan QR Code" `@41`, tabs `@39` |
| `/fire-safety/kec` | 9/9 (100%) | location `@18`, "Schedule" `@26` |
| `/equipment` | 9/9 (100%) | "Add Equipment" `@36`, filters `@38` |
| `/portfolio` | 7/7 (100%) | "Export portfolio" `@30` |
| `/vendors/threads` | 6/6 (100%) | filter chips `@28` |
| `/alerts` | 6/6 (100%) | filter tabs `@38` |
| `/policy-lens/upload` | 5/5 (100%) | file input `@26`, "+ Add another policy" `@20` |
| `/corrective-actions` | 3/3 (100%) | "Export PDF" `@38` |
| `/deficiencies` | 2/2 (100%) | "Add Deficiency" `@36` |
| `/policy-lens`, `/haccp` | 1/1 (100%) | primary CTA `@36` |
| `/integrations` | 36/38 (95%) | "Connect" `@24` |

Clean: `/incidents`, `/current-shift`, `/shift-handoff`, `/import`, `/insights`, `/upgrade`.

The heights cluster at **18, 24, 28, 36, 38, 40–41** — this is a handful of shared button/chip/select classes, not 200 individual mistakes. Raising the shared styles fixes most of the table at once.

### Horizontal clipping at 390 — still present

Elements pushed past the viewport edge: `/settings/notifications` (34), `/temp-logs` (29), `/vendor-network` (29), `/integrations` (25), `/team` (9), `/portfolio` (9), `/documents` (7), `/vendors` (5), `/help` (4), `/checklists` (2), `/vendors/threads` (1).

---

## 3. Lighthouse a11y — three heaviest client screens

Heaviest by DOM node count on this build: `/integrations` (1,256), `/settings/branding` (1,063), `/reports` (1,037). (`/dashboard` at 1,114 is excluded — already covered.)

| Screen | A11y | Best Practices |
|---|---|---|
| `/integrations` | **96** | 96 |
| `/settings/branding` | **81** | 96 |
| `/reports` | **96** | 96 |

Every failing audit, with the element:

**`/settings/branding` — 81**
- `label` (18) — `<input type="text" class="w-full px-3 py-2 text-sm border border-[#1E2D4D]/10 rounded-xl …">` ×18. Fix list in §1.
- `select-name` (1) — `<select class="w-full px-3 py-2 text-sm … bg-[#FAF7F0]">` (SSO Provider)
- `button-name` (6) — `<button class="flex-shrink-0">` ×6, the icon-only toggles
- `color-contrast` (8) — `.last-action-ago`; three breadcrumb `<a class="… text-[#1E2D4D]/50">`; two `<p class="text-sm text-[#1E2D4D]/50">`; two `<span class="text-xs text-[#1E2D4D]/50">`
- `agent-accessibility-tree` (1) — tree not well-formed, downstream of the unnamed controls
- `cumulative-layout-shift`, `errors-in-console` (5, localhost CORS), `is-crawlable`, `llms-txt`

**`/integrations` — 96**
- `color-contrast` (4) — `.last-action-ago`; breadcrumb `<a>` at `/50` to `/dashboard`, `/admin`, `/settings`
- `cumulative-layout-shift`, `errors-in-console` (5), `is-crawlable`, `llms-txt`

**`/reports` — 96**
- `color-contrast` (6) — `.last-action-ago`; breadcrumb links; `<p class="text-[#1E2D4D]/50 text-xs italic mb-3">`
- `cumulative-layout-shift`, `errors-in-console` (5), `is-crawlable`, `llms-txt`

**The contrast failures are one root cause, not 18.** Every node is either `text-[#1E2D4D]/50` (navy at 50% opacity on cream) or `.last-action-ago` (`opacity: 0.7` at 10.5px, `src/index.css:146-151`). Fixing the two tokens clears the audit on all three screens. `is-crawlable` and `llms-txt` are expected for an authenticated app and are not defects.

---

## 4. Fix queue

### Mechanical — do now

No design input needed. Each is a mechanical edit with a verifiable outcome.

1. **58 unlabeled controls across 15 screens** — `id`/`htmlFor` where a visible label exists (branding, policy-lens/upload, shift-handoff); `aria-label` where the control is a bare filter or search (the rest). Table in §1.
2. **6 icon-only toggles on `/settings/branding`** (`BrandingSettings.tsx:225, :397`) — `aria-label` + `role="switch"` + `aria-checked`.
3. **~25 further icon-only buttons** across `/settings/notifications`, `/calendar`, `/equipment` and 10 other screens — `aria-label` each.
4. **Colour-contrast tokens** — raise `text-[#1E2D4D]/50` (used app-wide for secondary text and breadcrumbs) and `.last-action-ago` `opacity: 0.7` at 10.5px. Clears every `color-contrast` failure on all three audited screens.
5. **Touch targets** — raise the shared button/chip/select classes to `min-height: 44px`. Heights cluster at 18/24/28/36/38/40, so a small number of shared classes covers 14 screens.
6. **`/documents` loading state** — add the skeleton it lacks and stop the list oscillating (732 → 582 → 805 chars).
7. **`/incidents`** — renders a skeleton *and* a spinner simultaneously; drop one.
8. **Orphan `<label>`** at `BrandingSettings.tsx:354` ("SSL Status") — it labels a `<span>`; make it a `<p>`.
9. **Horizontal clipping at 390** on 11 screens — content pushed past the viewport edge, worst on `/settings/notifications` (34 elements), `/temp-logs` (29), `/vendor-network` (29), `/integrations` (25).

### Needs a design decision

These need copy, a flow, or a product call — not a patch.

1. **"Not yet available" empty states** — `/temp-logs` (exposure scoring), `/corrective-actions` (action-level exposure), `/fire-safety/protection` (forecast), `/integrations` ("Coming Soon"), `/settings/notifications` (SMS "coming soon"). These advertise unbuilt backend inside the paying product. The decision is per surface: build it, hide the card until it exists, or write copy that says plainly what the customer should do in the meantime.
2. **Genuine-empty states that dead-end** — `/haccp` ("No reading in last 24 hr"), `/current-shift` ("No overdue items this shift."), `/shift-handoff` ("No prior handoff on file"). Each is a true state with no next step. Two of the three are arguably *good* news and might want a different tone rather than a CTA — that is a copy call.
3. **Loading convention** — the app currently uses skeletons, spinners, both, and nothing, on different screens. Picking one convention is a design decision; applying it afterwards is mechanical.
4. **`/settings/notifications` checkbox matrix** — 31 targets, all under 44px, in a category × channel grid, with 34 elements clipped at 390. Raising target sizes alone will not make the grid work on a phone; the layout needs rethinking for narrow screens.

---

## Corrections to my own earlier reporting

- I initially flagged `/policy-lens` as blank. It is not — 732 characters and a working CTA. My probe sampled before `main` mounted.
- I initially concluded "no skeletons anywhere". Wrong: `/equipment` and `/incidents` do render skeletons. The real finding is inconsistency, above.
- The `errors-in-console` Lighthouse failures on this run are a localhost CORS artifact, not a product defect.

## Appendix — raw data

- `round2-1280.json` — per-screen control labelling, loading affordances, empty/error phrases (36 screens)
- `round2-390.json` — per-screen touch-target and overflow measurements (35 screens)
- `lh2/integrations/`, `lh2/branding/`, `lh2/reports/` — Lighthouse reports
