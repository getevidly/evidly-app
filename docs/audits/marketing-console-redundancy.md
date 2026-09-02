# Marketing Console — Redundancy Audit

Read-only audit. Repo: evidly-app (`getevidly/evidly-app`). Commit at audit time: `339c44e6`.
Nothing in this audit changed code, schema, or deployments. DB figures are live queries
against project `irxgmhxhmxtzfwuieblc`, not inferences from the migration trail.

---

## 1. Tab inventory

21 tabs are registered in `MARKETING_TABS`. **All 21 are fully reachable** — every one has a
route in `App.tsx`, a `defaultTab` wrapper, and a render branch in `MarketingConsole.tsx`.
There are no half-registered tabs.

| # | Label | Route (`/admin/marketing/…`) | Component | Data path | Kind |
|---|---|---|---|---|---|
| 1 | Weekly Cadence | `weekly-cadence` | `WeeklyCadenceTab` → `ChannelCadences` | per-week channel targets | LIVE |
| 2 | Follow-ups | `follow-ups` | `FollowUpsTab` | reads `sales_pipeline`, `pipeline_touches`, `marketing_planner_config`; writes `pipeline_touches`, updates `sales_pipeline` | LIVE |
| 3 | Overview | `overview` | `OverviewTab` | roll-up: `sales_pipeline` (props), `market_research_responses`, founder RPC | LIVE (derived) |
| 4 | Planner | `planner` | `PlannerTab` | reads/writes `marketing_planner_config`, reads `sales_pipeline` | LIVE |
| 5 | Content Schedule | `content-schedule` | `ContentScheduleTab` | `useContentScheduleData`, `useChannelsData`, `ai-content-draft` fn | LIVE |
| 6 | Policy Lens | `policy-lens` | `PolicyLensTab` | `usePolicyLensSend` → `pl_send_events` | LIVE |
| 7 | Outreach | `email-sequence` | `OutreachTab` (+`FlowOverview`) | `county-briefing` fn (11 actions); reads `organizations`, `locations`, `jurisdictions` | LIVE |
| 8 | Outbound Calls | `outbound-calls` | `OutboundCallsTab` | reads/inserts `sales_pipeline` (`source:'cold_call'`) | LIVE |
| 9 | In Person | `in-person` | `InPersonTab` | reads/inserts `sales_pipeline` (`source:'in_person'`) | LIVE |
| 10 | Shows | `shows` | `ShowsTab` | `marketing_shows` + inserts `sales_pipeline` (`source:'show'`) | LIVE |
| 11 | Survey | `survey` | `SurveyTab` | `useSurveyData` → `market_research_responses`/answers/contacts | LIVE |
| 12 | Funnel | `funnel` | `FunnelTab` | derived from `sales_pipeline` (props) | LIVE (derived) |
| 13 | Accounts | `accounts` | `AccountsTab` (rendered inline) | `useMarketingData` | LIVE |
| 14 | Segments | `segments` | `SegmentsTab` | derived from `sales_pipeline` (props) | LIVE (derived) |
| 15 | Partners | `partners` | `PartnersTab` | `partner-admin` fn (`list`, `set_published`) | LIVE |
| 16 | Channels | `channels` | `ChannelsTab` | `useChannelsData` (actuals upsert), founder RPC | LIVE |
| 17 | Founder Window | `founder-window` | `FounderWindowTab` | `get_founder_count` RPC | LIVE (derived) |
| 18 | SEO | `seo` | `SEOTab` | none | **SCAFFOLD** |
| 19 | SERP | `serp` | `SERPTab` | none | **SCAFFOLD** |
| 20 | Google Ads | `google-ads` | `GoogleAdsTab` | none | **SCAFFOLD** |
| 21 | Forecast vs Actual | `forecast` | `ForecastTab` | `useForecastData` (period × channel upsert) | LIVE |

### Not in the tab bar

- **`network`** — present in the `MarketingTabId` union and routed (`/admin/marketing/network`,
  `MarketingNetwork.tsx`), rendered inline in the console, but deliberately absent from
  `MARKETING_TABS`. URL-only. The config header documents this.
- **`methods`** — `MarketingMethods.tsx` is routed at `/admin/marketing/methods` but has **no
  tab id at all** and no tab-bar entry. URL-only, undocumented.
- **`MarketingPRPAttribution.tsx`** — referenced by **nothing**. Fully orphaned file. The
  `prp-attribution` route redirects to Overview. (Same shape as the deleted CountyBriefings.)

---

## 2. Redundancy findings

### A. Overlapping tabs

**A1. Three views of `sales_pipeline` — Funnel, Segments, Overview.**
`FunnelTab` (stage counts) and `SegmentsTab` (segment grouping + ICP band) are both pure
derivations of the same `accounts` prop. `OverviewTab` rolls up *both* — pipeline by stage,
by segment, and by ICP band — so it is a superset of the other two.
**Canonical: Overview.** Funnel and Segments are drill-downs, not independent sources.
They cannot disagree (all derived, nothing typed), so this is presentation redundancy, not
data risk.

**A2. Three channel tabs writing identical pipeline rows — Outbound Calls, In Person, Shows.**
All three insert into `sales_pipeline` with `stage: 'prospect'`, differing **only** in the
`source` field (`cold_call` / `in_person` / `show`). Each carries its own single-add form
*and* its own bulk chunk-insert. That is one feature implemented three times.
**Canonical: none today** — they are peers. A single "log a touch" surface parameterised by
channel would collapse roughly 2,250 lines into one.
`ShowsTab` additionally owns `marketing_shows`, which is genuinely its own.

**A3. Target/cadence split across three tabs — Weekly Cadence, Planner, Channels.**
`WeeklyCadenceTab`/`ChannelCadences` sets per-week channel targets; `PlannerTab` reads and
writes `marketing_planner_config`; `ChannelsTab` holds channel actuals. `FollowUpsTab` also
reads `marketing_planner_config`. Four surfaces touch the cadence/target concept.
**Canonical: Planner** owns the config table; Weekly Cadence is the per-week editor on top of it.

**A4. Forecast vs Channels — same channel × period grain.**
`ChannelsTab` upserts *actual* demos/spend per channel per month; `ForecastTab` upserts
*forecast* demos/spend per channel per period and renders the comparison.
Two tabs, one grain. **Canonical: Forecast** for the comparison view; Channels for entry.

### B. Duplicate controls across tabs

**Cross-tab duplication of briefing actions is now zero.** After the removal of the
CountyBriefings page and the onboarding auto-enroll, every briefing action has exactly one
call site:

| Action | Call sites | Location |
|---|---|---|
| `add-recipients` | 4 | all in `OutreachTab` |
| `send` | 1 | `OutreachTab:559` |
| `sign-off-step` | 1 | `OutreachTab:485` |
| `approve` | 1 | `OutreachTab:542` |
| `upsert-step` | 2 | `OutreachTab` (pause toggle + step save) |
| `set_published` | 1 | `PartnersTab` |

**B1. Two paste-importers inside Outreach.** `handlePaste` (Panel 2, tab-separated, positional
columns, defaults `variant:'cold'`) and `parseBulk`/`submitBulk` (header-driven, CSV *or* tab,
with a preview/dedupe step) are both rendered — the bulk box at ~line 784 and the paste box at
~line 847. Two UIs for the same job, with different parsing rules and different defaults.
**Canonical: the bulk importer** (it validates, previews, and reports skipped/invalid).

**B2. Bulk lead import implemented three times** — the chunk-insert in Outbound Calls, In
Person, and Shows (see A2).

### C. Dead / scaffolding — flagged, not removed

- **`MarketingPRPAttribution.tsx`** — orphaned file, zero references. Highest-confidence
  deletion candidate; same profile as CountyBriefings before it was removed.
- **`MarketingMethods.tsx`** — routed but unreachable from the UI; no tab id.
- **SEO / SERP / Google Ads** — scaffolding, but *honest* scaffolding: `ConnectBanner` +
  dimmed `PreviewGate`, every figure an em-dash, "No data yet". **No fabricated data** — these
  do not violate the zero-fake-data rule. They are waiting on Search Console / a rank provider
  / Google Ads OAuth.

### D. Stale headers and copy

| File | Line | Says | Reality |
|---|---|---|---|
| `marketingTabConfig.ts` | 2 | "**15-tab** definition for the Marketing console" | **21** tabs |
| `MarketingConsole.tsx` | 2 | "**15-tab** marketing dashboard shell" | **21** tabs |
| `MarketingConsole.tsx` | 251 | "Placeholder tabs — shell only, data wiring in later phases" | Sits above 21 render lines, **18 of which are live**. Only SEO/SERP/Ads are still shells. |
| `marketingTabConfig.ts` | 51-54 | union has **22** ids | `MARKETING_TABS` has **21** (`network` is union-only — intentional, but the two lists drift silently) |

---

## 3. Cold-outreach: what already exists

### Where cold recipients live

Same table, `county_briefing_recipients`, discriminated by `variant`.

```
CHECK (variant = ANY (ARRAY['cold','warm']))
CHECK (status  = ANY (ARRAY['queued','sent','failed','held']))
```

**Live counts: 0 cold rows. 1 warm row (status `sent`). 1 row total.**
The cold path has never been exercised against real data.

### How cold is handled on the send paths — THE TWO PATHS DISAGREE

**`cron-process` skips cold** (`county-briefing/index.ts:1411-1413`):

```ts
if (r.variant === 'cold') {
  trackSkip('Cold variant — export to HubSpot');
  continue; // Leave as queued — cold exported manually
}
```

**The manual `send` action does NOT skip cold.** Its recipient query (index.ts:962-967)
filters on `county`, `state_code`, `status='queued'` and optionally `step_number` — there is
**no variant filter anywhere in the handler**. The only `variant` reference in the send path
is line 1002, which branches on `warm` to fetch an invite token; cold simply falls through to
the briefing template and is emailed.

> **Consequence:** a cold row sitting `queued` in an approved county will be sent by the
> Outreach "Send" button, contradicting the "cold never sends from EvidLY" rule that the cron
> path, the UI copy (`OutreachTab:1398`) and the function's own header comment all assert.
> Today this is latent — there are 0 cold rows — but it becomes live the moment cold rows are
> imported. **Any cold-upload work should close this first.**

### Existing cold-channel surfaces

**Export exists. Import does not.**

- **`exportCold` (`OutreachTab:686`, Panel 5 "Cold handoff")** — builds a CSV client-side from
  cold *queued* recipients and downloads it (`cold-outreach-YYYY-MM-DD.csv`). Button at line
  1395, "Export for HubSpot". This is the intended cold hand-off: EvidLY holds the list,
  HubSpot does the sending.
- **Bulk import (`parseBulk`/`submitBulk`) already accepts a `variant` column**, and
  `handlePaste` **defaults to `variant:'cold'`**. So *loading* cold recipients is already
  supported today.
- **Nothing marks a recipient sent externally.** There is **no** UI path anywhere that writes
  `status` — a grep for status writes in `OutreachTab` returns zero. Status is set only by the
  edge function (`add-recipients` → `queued`; `send`/`cron-process` → `sent`/`held`/`failed`).
- **No `sent_externally` status, no import-of-results path, no HubSpot read-back.** The
  round-trip is open-ended: rows go out as CSV and nothing comes back, so exported cold rows
  stay `queued` forever — which is exactly what makes them eligible for the manual send above.

### Does `status='sent'` + `variant='cold'` coexist cleanly?

**Yes at the database level.** The two CHECK constraints are independent; there is no
composite constraint, trigger, or partial index coupling `status` to `variant`. A cold row
can hold any of the four statuses today.

**But `'sent'` would be ambiguous.** It currently means "EvidLY's mailer delivered this",
written only by the send paths and used by the send-path dedupe (index.ts:981-987, which
holds a row if a `sent` row already exists for that email+county). Reusing it for
"HubSpot sent this" overloads one value with two meanings and silently changes that dedupe's
behaviour.

**Recommendation:** the same-table approach fits, but add a distinct marker rather than
reusing `'sent'` — either a new status (`sent_external`) or, better, keep `status` alone and
add `sent_channel` / `sent_at_external`, so existing dedupe and counting logic keep working
unchanged. Adding a status value requires altering the CHECK constraint; adding a column does
not touch it. Either way it is a schema change and needs an explicit migration request.

---

## 4. Recommended order of work

1. **Close the cold send-path gap** — add the `variant === 'cold'` guard to the manual `send`
   action so it matches `cron-process`. This is a correctness fix and should land before any
   cold rows exist.
2. **Decide the cold-sent marker** (new status vs new column) before building the upload.
3. Collapse the two Outreach paste-importers into one (B1).
4. Fix the stale `15-tab` headers and the "Placeholder tabs" comment (D).
5. Consider deleting `MarketingPRPAttribution.tsx` (C) — orphaned, zero references.
6. Longer-term: unify the three channel tabs' add/import into one parameterised surface (A2).
