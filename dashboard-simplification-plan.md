# Dashboard Simplification Plan

**Design Principle:** *A kitchen manager glances at this between rushes. They need to know: Am I good? What's urgent? That's it.*

---

## 1. Current Widget Inventory

Everything the Dashboard currently renders, in order of appearance:

### Global Banners (always visible)
| # | Widget | Description | Component / Code |
|---|--------|-------------|------------------|
| 1 | **Demo Mode Banner** | Blue bar: "You're viewing demo data" | Inline `<div>` |
| 2 | **Trial Status Banner** | Green gradient: "Free Trial -- 18 days remaining" with "View Billing" CTA | Inline `<div>` |
| 3 | **WelcomeModal** | First-login modal overlay (dismissible) | `<WelcomeModal>` |
| 4 | **WelcomeBack Greeting** | "Good morning, Arthur!" with today's priorities list (up to 5 items) | `<WelcomeBack>` |
| 5 | **Onboarding Progress Widget** | Progress bar for required document uploads ("3 required documents still needed") | `<OnboardingProgressWidget>` |
| 6 | **Inspector Mode Panel** | Red emergency panel when inspector visit is active (score, QR passport, instant report, notification status) | Inline conditional block |

### Location Header (single-location view only)
| # | Widget | Description |
|---|--------|-------------|
| 7 | **Back to All Locations** link | Arrow + text |
| 8 | **Location Name + Address** | H1 heading with state label |

### Compliance Score Section (executive/management roles only)
| # | Widget | Description | Component / Code |
|---|--------|-------------|------------------|
| 9 | **Section heading** | "Compliance Overview" | Inline `<h2>` |
| 10 | **Action buttons row** | Inspector On-Site, Generate Report, Share Report | Inline buttons |
| 11 | **Animated Compliance Score** | Large circular SVG gauge, animated count-up to overall score, confetti on 90+. Dual-layer display (EvidLY Score + Inspector Grade) when viewing a single location. | `<AnimatedComplianceScore>`, `<JurisdictionScoreDisplay>` |
| 12 | **3 Pillar Score Cards** | Food Safety, Fire Safety, Vendor Compliance -- each with animated bar, score, trend, clickable to expand | `<AnimatedPillarBar>` x3 |
| 13 | **Expanded Pillar Detail** | When a pillar card is clicked (single-location view): shows line items with status icons, impact labels, action links | Inline conditional rendering |

### Below Score Section (executive/management roles only)
| # | Widget | Description | Component / Code |
|---|--------|-------------|------------------|
| 14 | **Dashboard Upgrade CTA** | Dark promotional card: "Like what you see? $99/month" -- shown after 2+ demo page visits | `<DashboardUpgradeCard>` |
| 15 | **Kitchen to Community (K2C) Widget** | Donation impact summary with referral CTA (demo mode only) | `<K2CWidget>` |

### Tab Navigation Bar
| # | Widget | Description |
|---|--------|-------------|
| 16 | **7-tab strip** | Overview, Today's Progress, Action Center, Score History, Vendor Services, Key Metrics, QR Passport |
| 17 | **Location filter dropdown** | Dropdown to switch between All Locations / specific location |

### Tab Content (one visible at a time)

#### Overview Tab -- All Locations View
| # | Widget | Description | Component / Code |
|---|--------|-------------|------------------|
| 18 | **Onboarding Checklist** | 5-step getting-started checklist (add location, invite team, set up equipment, add vendors, complete first log) | `<OnboardingChecklist>` |
| 19 | **Enterprise KPI Cards** | 4 cards in a grid: Avg Score, Locations count, Open Incidents, Overdue Services | Inline grid |
| 20 | **Compliance Heatmap Table** | Color-coded table: each location x each pillar, with scores | Inline `<table>` |
| 21 | **Copilot Alerts** | 3 hardcoded cross-location AI alerts (Critical/Warning severity) with navigation links | Inline list |
| 22 | **Location Detail Table** | Full table with: Location, Compliance Score, Food Safety, Fire Safety, Vendor Compliance, Trend, Status badge | Inline `<table>` |
| 23 | **Live Activity Feed** | Animated feed of 7 recent activities (temp logs, checklists, uploads, alerts) with "Live" badge | `<LiveActivityFeed>` |

#### Overview Tab -- Single Location View
| # | Widget | Description |
|---|--------|-------------|
| 24 | **Recent Activity list** | Activity items with initials, description, timestamps, "View All Activity" link | Inline list from `resolvedActivity` |

#### Today's Progress Tab
| # | Widget | Description |
|---|--------|-------------|
| 25 | **Temperature progress bar** | "Temperatures: X/Y" with colored progress bar | Inline |
| 26 | **Checklist progress bar** | "Checklists: X/Y" with colored progress bar | Inline |

#### Action Center Tab
| # | Widget | Description |
|---|--------|-------------|
| 27 | **Pillar filter chips** | All / Food Safety / Fire Safety / Vendor Compliance with counts | Inline buttons |
| 28 | **Action items list** | Priority-ordered list with severity dots, descriptions, pillar/priority badges | Inline list |

#### Score History Tab
| # | Widget | Description |
|---|--------|-------------|
| 29 | **Line chart** | 12-week Recharts line chart. All-locations view: 4 lines (Average + 3 locations). Single-location view: 1 line. Reference lines at 90/75/60. | Recharts `<LineChart>` |

#### Vendor Services Tab
| # | Widget | Description |
|---|--------|-------------|
| 30 | **Vendor table** | Full table: Vendor, Service, Location (if all), Last Service, Next Due, Status badge | Inline `<table>` |

#### Key Metrics Tab
| # | Widget | Description | Component / Code |
|---|--------|-------------|------------------|
| 31 | **Time Saved Counter** | 4 animated counter cards: Hours Saved, Money Saved, Logs This Month, Documents Stored | `<TimeSavedCounter>` |

#### QR Passport Tab
| # | Widget | Description |
|---|--------|-------------|
| 32 | **QR Code cards** | One card per location: name, address, QR code SVG, score badge, Print/View buttons | Inline with `<QRCodeSVG>` |

### Bottom Widgets (below tabs, always visible for executive/management)
| # | Widget | Description | Component / Code |
|---|--------|-------------|------------------|
| 33 | **AI Insights** | 3 predictive alerts (Critical/Warning) with severity badges, navigation links. Feature-gated. | Inline list inside `<FeatureGate>` |
| 34 | **Compliance Copilot Card** | Top 3 AI insights sorted by severity, with action buttons (create incident, draft vendor email, etc.) | `<CopilotCard>` |
| 35 | **Industry Benchmark Widget** | Percentile rank, score comparison bar vs industry avg, lead/lag chips, badge, quarterly trend. Feature-gated. | `<BenchmarkWidget>` |
| 36 | **Insurance Risk Score Widget** | Circular risk score, category breakdowns (Food Safety, Fire, Vendor, Operational), action count. Feature-gated. | `<InsuranceReadinessWidget>` |
| 37 | **Equipment Health Widget** | Equipment summary (total/OK/repair/down), warranty status, alerts list, YTD maintenance spend, next service date | `<EquipmentHealthWidget>` |
| 38 | **Live Sensor Monitor Widget** | Sensor list with online/violation/warning counts, sparkline charts, live temperature readings | `<SensorMonitorWidget>` |

### Modals
| # | Widget | Description |
|---|--------|-------------|
| 39 | **Share Modal** | Email/link sharing dialog for compliance reports | `<ShareModal>` |

**Total: 39 distinct widgets/sections** (not all visible simultaneously due to tabs and conditionals)

---

## 2. Proposed "Above the Fold" View

The new default view when a kitchen manager lands on the dashboard. Everything here should be visible without scrolling on a standard laptop screen (roughly 900px viewport height).

### Row 1: Greeting + Status (condensed)
- **Welcome line** -- "Good morning, Arthur!" (one line, no priority list here)
- **Trial banner** -- keep but make slimmer (single-line)

### Row 2: The WOW -- Compliance Score (center stage)
- **AnimatedComplianceScore** -- big, animated, center-aligned
  - Circular SVG gauge with count-up animation
  - Confetti on 90+ (keep this -- it is delightful)
  - When single-location: dual-layer with Inspector Grade alongside
  - Grade badge below (Excellent / Good / Needs Attention / Critical)
  - 30-day trend arrow

### Row 3: Three KPI Pillar Cards (max 3)
- **Food Safety %** -- score, trend arrow, color-coded
- **Fire Safety %** -- score, trend arrow, color-coded
- **Vendor Compliance %** -- score, trend arrow, color-coded
- Each card is clickable (navigates to Action Center filtered by that pillar)
- These already exist as `<AnimatedPillarBar>` -- keep them, they are good

### Row 4: AI Copilot Insight (single card)
- **One top-priority insight from Copilot** -- the single most important action item today
  - Severity badge (Critical/Warning)
  - Title + one-line description
  - Single action button
  - "View all insights" link to /copilot
- This replaces the current pattern of 3 hardcoded alerts + 3 Copilot insights + 3 AI insights (total 9 alert items currently shown)

### Row 5: Today's Checklist Status (simple progress bar)
- **Combined progress indicator** -- not the full checklist, just:
  - "Today: 6 of 8 tasks complete" with a single progress bar
  - Merge temp logs + checklists into one combined bar
  - Clickable to navigate to the Progress tab or /checklists

**That's it above the fold.** Five rows. Score, pillars, one insight, one progress bar. Everything a kitchen manager needs in a 3-second glance.

---

## 3. Below the Fold (scroll to see)

These widgets remain on the dashboard but require scrolling. They serve managers who have time to investigate.

| Widget | Current Location | Notes |
|--------|-----------------|-------|
| **Score History Chart** | History tab | Move inline below the fold as a collapsible section. Show 12-week trend line. Keep it compact. |
| **Live Activity Feed** | Overview tab (all locations) | Keep but cap at 5 items max. Link to /alerts for full feed. |
| **Compliance Heatmap** | Overview tab (all locations) | Keep for multi-location enterprise view only. Good quick reference. |
| **Enterprise KPI Cards** (Avg Score, Locations, Incidents, Overdue) | Overview tab | Keep for multi-location view. These are useful for executives scanning multiple sites. |
| **Equipment Health Summary** | Bottom widget | Keep as a compact card. Remove the verbose alert list -- just show "2 alerts" with a link. |
| **Live Sensor Monitor** | Bottom widget | Keep a compact version: summary bar (X online, Y violations) + link to /sensors. No full sensor table. |
| **Onboarding Progress** | Pre-tab area | Keep during onboarding phase. It naturally disappears when complete. |

---

## 4. REMOVE from Dashboard (move to dedicated pages)

These widgets duplicate functionality that already exists on dedicated pages. Removing them reduces clutter and load time.

| Widget | Move To | Reasoning |
|--------|---------|-----------|
| **Location Detail Table** (#22) | Already exists on /locations or as part of the Heatmap | Full 7-column table with all scores per location is redundant with the Compliance Heatmap (#20). The heatmap is more scannable. |
| **Vendor Services Table** (#30, entire Vendors tab) | /vendors page | This is a full vendor management table. The dashboard should show "2 vendors overdue" -- not the whole table. Remove the Vendors tab entirely. |
| **QR Passport Tab** (#32) | /passport page | QR codes are a reference/print feature, not a daily glance item. Does not belong on the main dashboard. Remove the Passport tab. |
| **Key Metrics Tab** (#31) | /reports page | Hours saved, money saved, documents stored are vanity metrics. Interesting monthly, not daily. Remove the Metrics tab. |
| **AI Insights widget** (#33) | Already shown via CopilotCard (#34) | Currently there are TWO separate AI insight sections: "AI Insights" (hardcoded 3 alerts) and "Compliance Copilot Card" (dynamic 3 insights). These should be a single "Copilot" summary. Remove the hardcoded one. |
| **Industry Benchmark Widget** (#35) | /benchmarks page | Percentile ranking is valuable but not a daily check. Move to dedicated page; optionally add a one-line "Top 15% of peers" badge near the compliance score. |
| **Insurance Risk Score Widget** (#36) | /insurance-risk page | Insurance readiness is a quarterly concern. Does not need daily dashboard real estate. |
| **Dashboard Upgrade CTA** (#14) | Move to sidebar or settings | Promotional content competes with operational data for attention. A kitchen manager does not need to see pricing while checking compliance. |
| **Kitchen to Community Widget** (#15) | /referrals page | Community donations are wonderful but not operational. A sidebar badge or notification is more appropriate. |
| **Expanded Pillar Detail** (#13) | /scoring-breakdown page | The inline item-by-item breakdown of each pillar clutters the score section. The "View Full Breakdown" link already goes to the right page. |
| **Copilot Alerts** (#21, hardcoded cross-location alerts) | Merge into single Copilot insight | Redundant with CopilotCard. Currently 3 hardcoded alerts that never change. |

---

## 5. Tab Simplification

### Current tabs (7):
Overview | Today's Progress | Action Center | Score History | Vendor Services | Key Metrics | QR Passport

### Proposed tabs (3):
**Overview** | **Action Center** | **Trends**

| New Tab | Contains | Replaces |
|---------|----------|----------|
| **Overview** | Heatmap (multi-location), Activity Feed (capped), Enterprise KPIs | Current Overview tab (stripped down) |
| **Action Center** | Priority action items with pillar filters, consolidated from current Action tab | Action Center tab (unchanged) |
| **Trends** | Score History chart + simple before/after comparison | Score History tab |

Removed tabs:
- **Today's Progress** -- merged into above-the-fold progress bar
- **Vendor Services** -- moved to /vendors
- **Key Metrics** -- moved to /reports
- **QR Passport** -- moved to /passport

---

## 6. Implementation Priority

### Phase 1: Above-the-fold redesign
1. Collapse WelcomeBack to a single greeting line (remove priority list -- it duplicates Copilot)
2. Keep AnimatedComplianceScore + 3 AnimatedPillarBars as-is (they are already good)
3. Create a new `<CopilotTopInsight>` component showing only the #1 priority insight
4. Create a new `<TodayProgressBar>` combining temp + checklist into one compact bar
5. Remove or collapse everything below these into a scrollable section

### Phase 2: Remove tab clutter
1. Remove Vendors, Metrics, and Passport tabs
2. Rename "Score History" to "Trends"
3. Remove "Today's Progress" tab (replaced by above-the-fold bar)

### Phase 3: Widget cleanup
1. Remove DashboardUpgradeCard from dashboard (move to sidebar)
2. Remove K2CWidget from dashboard (move to /referrals)
3. Merge AI Insights + Copilot Alerts + CopilotCard into a single Copilot summary
4. Remove InsuranceReadinessWidget and BenchmarkWidget from dashboard
5. Compact EquipmentHealthWidget and SensorMonitorWidget

---

## 7. Expected Outcome

### Before (current state)
- **39 widgets/sections** rendered on the dashboard
- **7 tabs** to navigate
- **3 separate AI alert sections** showing 9 total alert items
- **2 full data tables** (Locations + Vendors) duplicating dedicated pages
- A kitchen manager must scroll 4-5 screen heights and click through tabs to understand their status

### After (proposed state)
- **~12 widgets** total (5 above fold + ~7 below fold)
- **3 tabs** for deeper investigation
- **1 Copilot insight** above the fold (link to full copilot page for more)
- **0 full data tables** on dashboard (heatmap stays, tables move to dedicated pages)
- A kitchen manager sees their status in 3 seconds without scrolling

### The 3-second test
A kitchen manager glances at the dashboard between rushes:
1. **Score gauge** -- "92, green, trending up" -- I'm good
2. **Three pillars** -- "Food 95, Fire 91, Vendor 88" -- all stable
3. **Copilot card** -- "Hood cleaning due in 5 days at Airport" -- I'll handle it after lunch
4. **Progress bar** -- "6/8 done today" -- almost there

That's it. Done. Back to the kitchen.
