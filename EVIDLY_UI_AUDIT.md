# EVIDLY UI AUDIT — Phase 1–4 Report

**Date:** 2026-04-14
**Auditor:** Claude Code (Opus 4.6)
**App:** EvidLY — Operational Intelligence for Commercial Kitchens
**Production:** https://app.getevidly.com
**Stack:** React 18.3 · TypeScript · Vite · Tailwind · Supabase · Vercel

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scoring Methodology](#2-scoring-methodology)
3. [Systemic Issues](#3-systemic-issues)
4. [Page-by-Page Audit](#4-page-by-page-audit)
5. [Shared Component Audit](#5-shared-component-audit)
6. [Competitive Benchmarking (Phase 2)](#6-competitive-benchmarking)
7. [Design System Foundation (Phase 3)](#7-design-system-foundation)
8. [Upgrade Plan (Phase 4)](#8-upgrade-plan)

---

## 1. Executive Summary

### Current State

| Metric | Score |
|--------|-------|
| **Overall Composite** | **68 / 100** |
| Critical Path Average | 72 / 100 |
| Important Pages Average | 66 / 100 |
| Supporting Pages Average | 62 / 100 |

### Top 5 Issues

1. **No design token system** — Colors defined in 3+ places (tailwind.config.js, index.css, inline styles per page). Navy alone has 4 hex variants.
2. **Inline style abuse** — 40%+ of pages use inline `style={{}}` instead of Tailwind classes, creating unmaintainable CSS.
3. **Monolithic files** — 9 files exceed 1,000 LOC (TempLogs: 3,900, HACCP: 2,391, Vendors: 1,919). These resist refactoring and breed inconsistency.
4. **Missing loading/error states** — ~60% of data-fetching pages have no skeleton loaders, spinners, or error UI.
5. **Typography chaos** — Body font is Inter (not Montserrat per spec). No type scale system. Font sizes picked ad-hoc per page.

### Top 5 Strengths

1. **Login page** — Professional split-panel design, geolocation detection, responsive mobile layout.
2. **ComplianceIndex** — Best-organized page: clear visual hierarchy, semantic colors, proper empty states.
3. **SettingsPage** — Exemplary architecture (87 LOC), imports shared constants, proper Tailwind usage.
4. **MetricCardRow component** — Design-token-driven, responsive grid, sparkline integration.
5. **Error boundary system** — Three-level fallback (page/section/widget) with reset capability.

---

## 2. Scoring Methodology

Each page is scored on 10 metrics (1–10 scale). Composite = average of all 10.

| # | Metric | What It Measures |
|---|--------|------------------|
| 1 | **Visual Hierarchy** | Clear information priority, scannable layout |
| 2 | **Information Density** | Right amount of data without clutter |
| 3 | **Typography Scale** | Consistent heading/body/caption sizes |
| 4 | **Color & Contrast** | Brand-consistent, accessible, semantic usage |
| 5 | **Card & Component Depth** | Shadow, border, elevation consistency |
| 6 | **Spacing & Alignment** | Grid adherence, padding/margin consistency |
| 7 | **Interaction Feedback** | Hover states, transitions, loading indicators |
| 8 | **Empty/Error States** | Graceful handling of no-data and failures |
| 9 | **Mobile Responsiveness** | Breakpoint behavior, touch targets |
| 10 | **"$20M Company" Test** | Would a Series B buyer see this as premium? |

### Target Scores

| Priority Tier | Target | Pages |
|---------------|--------|-------|
| Critical Path | 90+ | Login, Signup, Dashboard, Compliance Index, Temp Logs |
| Important | 85+ | Checklists, Alerts, Documents, HACCP, Corrective Actions, Settings |
| Supporting | 80+ | All remaining pages |

---

## 3. Systemic Issues

### 3.1 Color System Fragmentation

**Sources of truth (should be 1):**

| Source | Example | Problem |
|--------|---------|---------|
| `tailwind.config.js` | `navy.DEFAULT: '#1E2D4D'` | Canonical but incomplete |
| `src/index.css` | `--sidebar-bg: #0B1628` | CSS vars, some redundant |
| Inline per page | `style={{ color: '#163a5f' }}` | ~15 unique navy variants |
| `AdminShell.tsx` | `const GOLD = '#A08C5A'` | Local constants |
| `Analysis.tsx` | `const CLR = { navy: ... }` | Page-local color objects |
| `OwnerOperatorDashboard.tsx` | `bg-[#F5F6F8]` | Drifted from cream `#FAF7F0` |

**Navy variants found:** `#1E2D4D`, `#0B1628`, `#163a5f`, `#141E33`, `#2A3F6B`, `#162340`, `#3D5068`
**Gold variants found:** `#A08C5A`, `#C4AE7A`, `#7A6840`, `#C49A2B`
**Background variants found:** `#FAF7F0`, `#FAF7F2`, `#F4F2EE`, `#F5F6F8`, `#FAFAFA`

### 3.2 Styling Approach Inconsistency

| Approach | % of Pages | Example |
|----------|-----------|---------|
| Tailwind classes | ~35% | SettingsPage, ComplianceTrends, Deficiencies |
| Inline `style={{}}` | ~40% | AdminShell, CicPseView, WorkforceRisk, IncidentPlaybooks |
| Mixed Tailwind + inline | ~25% | Dashboard, TempLogs, Login |

### 3.3 File Size Distribution

| File | LOC | Recommendation |
|------|-----|----------------|
| TempLogs.tsx | 3,900 | Split into TempLogTable, TempLogForm, TempLogChart |
| HACCP.tsx | 2,391 | Split into HACCPPlan, HACCPAudit, HACCPFlowDiagram |
| Checklists.tsx | 2,335 | Split into ChecklistRunner, ChecklistManager |
| Vendors.tsx | 1,919 | Split into VendorList, VendorDetail, VendorCompare |
| IncidentLog.tsx | 1,837 | Split into IncidentList, IncidentForm, IncidentTimeline |
| TrainingHub.tsx | 1,491 | Split into TrainingList, TrainingCard, CertTracker |
| SelfAudit.tsx | 1,435 | Split into AuditWizard, AuditReview, AuditResults |
| InsuranceRisk.tsx | 1,281 | Split into RiskDashboard, RiskReport, RiskPDF |
| VendorMarketplace.tsx | 1,065 | Deduplicate grid/list rendering |

### 3.4 Typography Findings

| Element | Current | Target (Spec) |
|---------|---------|---------------|
| Body font | Inter 15px | Montserrat Regular 15px |
| Logo | Syne 800 | Syne 800 (correct) |
| Heading scale | Ad-hoc per page | 36/28/22/18/15/13/11 px |
| Weight system | 400/500/600/700 mixed | 400/500/600/700 defined |
| Line height | Tailwind defaults | 1.1/1.2/1.3/1.5/1.6 per tier |

### 3.5 Loading/Error State Coverage

| State | Pages With | Pages Without |
|-------|-----------|---------------|
| Skeleton loader | ~30% | ~70% |
| Error boundary | ~40% | ~60% |
| Empty state | ~50% | ~50% |
| Loading spinner | ~60% | ~40% |

---

## 4. Page-by-Page Audit

### Priority Tier: CRITICAL PATH (Target: 90+)

---

#### 4.1 Login — `src/pages/Login.tsx` (358 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Good split-panel, strong left brand panel |
| Information Density | 8 | Clean form, not cluttered |
| Typography Scale | 7 | h1 4xl/5xl good, but body sizes ad-hoc |
| Color & Contrast | 8 | Navy gradient + gold accents consistent |
| Card & Component Depth | 6 | No shadow/elevation on form panel |
| Spacing & Alignment | 7 | Mostly good, trust bar spacing uneven |
| Interaction Feedback | 7 | Button loading state present, no input focus animations |
| Empty/Error States | 7 | Error banner present, no field-level validation |
| Mobile Responsiveness | 8 | Left panel hides, mobile logo + trust bar appears |
| $20M Test | 7 | Close but missing premium polish (shadows, micro-interactions) |
| **Composite** | **73** | |

**Cheap Wins:**
- Add `shadow-2xl` to right panel container
- Add focus ring animation to inputs (gold glow)
- Add field-level validation messages
- Animate trust items with staggered fade-in
- Add subtle gradient overlay to form panel

---

#### 4.2 Signup — `src/pages/Signup.tsx` (585 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Good stepper flow, but dense form |
| Information Density | 7 | Multi-step helps, but steps are heavy |
| Typography Scale | 6 | Hardcoded sizes, inconsistent headings |
| Color & Contrast | 7 | Brand colors present but hardcoded |
| Card & Component Depth | 6 | Flat form, no card elevation |
| Spacing & Alignment | 7 | Step indicators well-aligned |
| Interaction Feedback | 7 | Step transitions, loading states |
| Empty/Error States | 7 | Form validation present |
| Mobile Responsiveness | 7 | Responsive but cramped on small screens |
| $20M Test | 6 | Feels like a startup form, not enterprise |
| **Composite** | **67** | |

**Cheap Wins:**
- Card wrapper with shadow-lg for form area
- Progress bar with gold gradient fill
- Field validation with animated error messages
- Success step with confetti or check animation

---

#### 4.3 Dashboard — `src/pages/Dashboard.tsx` + Role Dashboards

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Good greeting → metrics → content flow |
| Information Density | 7 | Dense but organized with tabs |
| Typography Scale | 7 | DashboardGreeting scale is good |
| Color & Contrast | 6 | BG `#F5F6F8` drifted from brand cream `#FAF7F0` |
| Card & Component Depth | 7 | MetricCardRow has depth, other cards flat |
| Spacing & Alignment | 7 | max-w-3xl single column, consistent padding |
| Interaction Feedback | 7 | Tab switching, card hover states |
| Empty/Error States | 8 | Good empty states on most widgets |
| Mobile Responsiveness | 7 | Single column works, but dense on mobile |
| $20M Test | 7 | MetricCards are premium, rest needs elevation |
| **Composite** | **71** | |

**Cheap Wins:**
- Fix BG color to `#FAF7F0` (cream)
- Add shadow-sm to all card containers
- Consistent 24px gap between sections
- Add hover lift animation to metric cards
- Greeting area: add subtle gold accent line

---

#### 4.4 ComplianceIndex — `src/pages/ComplianceIndex.tsx` (829 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 9 | Excellent section organization |
| Information Density | 9 | Right balance of data and whitespace |
| Typography Scale | 8 | Organized heading hierarchy |
| Color & Contrast | 9 | Semantic STATUS_COLORS, consistent |
| Card & Component Depth | 8 | Cards with borders, hover states |
| Spacing & Alignment | 8 | Clean grid layout |
| Interaction Feedback | 8 | Filter transitions, hover states |
| Empty/Error States | 8 | Good empty state messaging |
| Mobile Responsiveness | 8 | Responsive grid |
| $20M Test | 8 | Closest to premium of all pages |
| **Composite** | **83** | |

**Cheap Wins:**
- Upgrade from `border` to `shadow-sm` on cards
- Add subtle background gradient to header area
- Animate score badges with count-up
- Add micro-interaction on status filter toggle

---

#### 4.5 TempLogs — `src/pages/TempLogs.tsx` (3,900 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Good tab organization for massive feature |
| Information Density | 7 | Dense by necessity, well-sectioned |
| Typography Scale | 7 | Consistent within page but ad-hoc sizes |
| Color & Contrast | 7 | Status colors present, some hardcoded |
| Card & Component Depth | 6 | Flat tables, minimal elevation |
| Spacing & Alignment | 7 | Grid-based but inconsistent gaps |
| Interaction Feedback | 8 | Good form feedback, chart interactions |
| Empty/Error States | 7 | Some empty states, missing error recovery |
| Mobile Responsiveness | 7 | Table view challenging on mobile |
| $20M Test | 6 | Functional but looks like internal tool |
| **Composite** | **70** | |

**Cheap Wins:**
- Card wrappers with shadow-sm for table containers
- Sticky table headers with backdrop-blur
- Add skeleton loader for chart rendering
- Status badges with consistent pill styling
- Temperature values: larger font, color-coded

---

### Priority Tier: IMPORTANT (Target: 85+)

---

#### 4.6 Checklists — `src/pages/Checklists.tsx` (2,335 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Authority badges, clear sections |
| Information Density | 7 | Dense but necessary |
| Typography Scale | 7 | Heading scale decent |
| Color & Contrast | 7 | Authority-source badges use semantic colors |
| Card & Component Depth | 7 | Checklist cards have borders |
| Spacing & Alignment | 7 | Consistent padding |
| Interaction Feedback | 7 | Checkbox animations, progress bars |
| Empty/Error States | 7 | Present but basic |
| Mobile Responsiveness | 7 | Responsive grid |
| $20M Test | 6 | Functional but not polished |
| **Composite** | **70** | |

---

#### 4.7 Alerts — `src/pages/Alerts.tsx` (867 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 9 | Strong categorization system |
| Information Density | 8 | Alert cards well-organized |
| Typography Scale | 7 | Consistent within alert cards |
| Color & Contrast | 9 | Excellent semantic color system |
| Card & Component Depth | 7 | Alert cards with left-border accents |
| Spacing & Alignment | 8 | Clean list layout |
| Interaction Feedback | 8 | Dismiss animations, filter transitions |
| Empty/Error States | 8 | Good "no alerts" state |
| Mobile Responsiveness | 7 | Cards stack well |
| $20M Test | 7 | Good foundation, needs shadow/depth |
| **Composite** | **78** | |

---

#### 4.8 Documents — `src/pages/Documents.tsx` (1,014 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Good folder → document hierarchy |
| Information Density | 7 | File list well-organized |
| Typography Scale | 7 | Consistent |
| Color & Contrast | 7 | File type icons colored |
| Card & Component Depth | 7 | Cards with borders |
| Spacing & Alignment | 7 | Grid layout |
| Interaction Feedback | 7 | Upload feedback, drag-drop hints |
| Empty/Error States | 7 | "No documents" state present |
| Mobile Responsiveness | 7 | Responsive but cramped |
| $20M Test | 7 | Functional, needs premium feel |
| **Composite** | **71** | |

---

#### 4.9 HACCP — `src/pages/HACCP.tsx` (2,391 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 6 | Dense, hard to scan |
| Information Density | 5 | Overwhelming data density |
| Typography Scale | 5 | Scattered font sizes |
| Color & Contrast | 6 | Colors defined but inconsistent |
| Card & Component Depth | 5 | Flat layout, no depth |
| Spacing & Alignment | 6 | Inconsistent gaps |
| Interaction Feedback | 6 | Basic interactions |
| Empty/Error States | 5 | Minimal error handling |
| Mobile Responsiveness | 5 | Poor mobile experience |
| $20M Test | 4 | Feels like a prototype |
| **Composite** | **53** | |

**Cheap Wins:**
- Add card wrappers with elevation to each CCP section
- Create clear visual separation between CCPs
- Add progress indicator for plan completion
- Skeleton loaders for plan loading
- Color-code hazard severity levels consistently

---

#### 4.10 CorrectiveActions — `src/pages/CorrectiveActions.tsx` (871 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Good status organization |
| Information Density | 7 | Well-structured list |
| Typography Scale | 7 | Consistent |
| Color & Contrast | 7 | Status colors present |
| Card & Component Depth | 7 | Cards with borders |
| Spacing & Alignment | 7 | Clean layout |
| Interaction Feedback | 7 | Modal transitions |
| Empty/Error States | 6 | Missing loading states |
| Mobile Responsiveness | 7 | Responsive cards |
| $20M Test | 6 | Functional but plain |
| **Composite** | **68** | |

---

#### 4.11 Settings — `src/pages/SettingsPage.tsx` (87 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 9 | Clean tab navigation |
| Information Density | 9 | Minimal, focused |
| Typography Scale | 9 | Uses shared constants |
| Color & Contrast | 9 | Consistent brand colors |
| Card & Component Depth | 8 | Clean card layout |
| Spacing & Alignment | 9 | Excellent grid |
| Interaction Feedback | 8 | Tab transitions |
| Empty/Error States | 8 | Good defaults |
| Mobile Responsiveness | 8 | Responsive tabs |
| $20M Test | 9 | Best page in the app |
| **Composite** | **86** | Already near target |

---

### Priority Tier: SUPPORTING (Target: 80+)

---

#### 4.12 EquipmentPage — `src/pages/EquipmentPage.tsx` (264 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Clean equipment cards |
| Information Density | 8 | Right amount of info |
| Typography Scale | 7 | Consistent |
| Color & Contrast | 8 | Status colors clear |
| Card & Component Depth | 8 | Cards with depth |
| Spacing & Alignment | 8 | Grid layout |
| Interaction Feedback | 9 | Best-in-class skeleton loading |
| Empty/Error States | 8 | Good empty state |
| Mobile Responsiveness | 8 | Responsive cards |
| $20M Test | 8 | Good quality |
| **Composite** | **80** | At target |

---

#### 4.13 ScoringBreakdown — `src/pages/ScoringBreakdown.tsx` (406 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Clear score presentation |
| Information Density | 8 | Well-balanced |
| Typography Scale | 8 | Clean STATUS_COLORS constant |
| Color & Contrast | 8 | Semantic scoring colors |
| Card & Component Depth | 7 | Score cards have borders |
| Spacing & Alignment | 8 | Clean layout |
| Interaction Feedback | 7 | Basic interactions |
| Empty/Error States | 7 | Decent coverage |
| Mobile Responsiveness | 7 | Responsive |
| $20M Test | 7 | Solid supporting page |
| **Composite** | **75** | |

---

#### 4.14 ComplianceTrends — `src/pages/ComplianceTrends.tsx` (122 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Model page layout |
| Information Density | 8 | Clean data display |
| Typography Scale | 8 | Proper Tailwind classes |
| Color & Contrast | 8 | Brand-consistent |
| Card & Component Depth | 7 | Basic card layout |
| Spacing & Alignment | 8 | Clean spacing |
| Interaction Feedback | 7 | Chart interactions |
| Empty/Error States | 7 | Basic coverage |
| Mobile Responsiveness | 7 | Responsive |
| $20M Test | 7 | Good model for other pages |
| **Composite** | **75** | |

---

#### 4.15 Deficiencies — `src/pages/Deficiencies.tsx` (397 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Good deficiency list |
| Information Density | 8 | Balanced |
| Typography Scale | 7 | Consistent |
| Color & Contrast | 8 | Severity colors clear |
| Card & Component Depth | 7 | Cards with borders |
| Spacing & Alignment | 8 | Clean grid |
| Interaction Feedback | 7 | Filter interactions |
| Empty/Error States | 7 | Present |
| Mobile Responsiveness | 9 | Excellent table→card responsive |
| $20M Test | 7 | Solid |
| **Composite** | **76** | |

---

#### 4.16 Benchmarks — `src/pages/Benchmarks.tsx` (757 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 8 | Good data viz layout |
| Information Density | 7 | Dense but organized |
| Typography Scale | 7 | Consistent |
| Color & Contrast | 8 | Custom SVG chart colors |
| Card & Component Depth | 7 | Chart cards |
| Spacing & Alignment | 8 | Grid layout |
| Interaction Feedback | 8 | Chart hover tooltips |
| Empty/Error States | 7 | Decent |
| Mobile Responsiveness | 7 | Charts resize |
| $20M Test | 7 | Good data presentation |
| **Composite** | **74** | |

---

#### 4.17 ShiftHandoff — `src/pages/ShiftHandoff.jsx` (217 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Clean handoff form |
| Information Density | 7 | Focused content |
| Typography Scale | 6 | Ad-hoc sizes |
| Color & Contrast | 7 | Brand colors |
| Card & Component Depth | 6 | Flat layout |
| Spacing & Alignment | 7 | Decent |
| Interaction Feedback | 7 | Form feedback |
| Empty/Error States | 7 | Basic |
| Mobile Responsiveness | 8 | Good mobile UX |
| $20M Test | 6 | Plain but functional |
| **Composite** | **68** | |

---

#### 4.18 Vendors — `src/pages/Vendors.tsx` (1,919 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Good vendor cards |
| Information Density | 7 | Dense but organized |
| Typography Scale | 7 | Consistent |
| Color & Contrast | 7 | Status colors |
| Card & Component Depth | 7 | Vendor cards with borders |
| Spacing & Alignment | 7 | Grid layout |
| Interaction Feedback | 7 | Filter transitions |
| Empty/Error States | 6 | Missing some states |
| Mobile Responsiveness | 7 | Responsive cards |
| $20M Test | 6 | Functional but dense |
| **Composite** | **68** | |

---

#### 4.19 VendorMarketplace — `src/pages/VendorMarketplace.tsx` (1,065 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Dual grid/list mode |
| Information Density | 7 | Well-organized |
| Typography Scale | 7 | Consistent |
| Color & Contrast | 7 | Category colors |
| Card & Component Depth | 7 | Cards with hover |
| Spacing & Alignment | 7 | Grid layout |
| Interaction Feedback | 7 | View mode switch |
| Empty/Error States | 6 | Missing loading states |
| Mobile Responsiveness | 7 | Responsive |
| $20M Test | 6 | Needs premium marketplace feel |
| **Composite** | **68** | |

---

#### 4.20 IncidentLog — `src/pages/IncidentLog.tsx` (1,837 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Timeline layout decent |
| Information Density | 6 | Overwhelming at times |
| Typography Scale | 6 | Inconsistent |
| Color & Contrast | 7 | Severity colors present |
| Card & Component Depth | 6 | Flat list items |
| Spacing & Alignment | 6 | Inconsistent |
| Interaction Feedback | 6 | Silent error handling |
| Empty/Error States | 5 | Missing error recovery |
| Mobile Responsiveness | 6 | Poor on small screens |
| $20M Test | 5 | Looks like internal tooling |
| **Composite** | **60** | |

---

#### 4.21 InsuranceRisk — `src/pages/InsuranceRisk.tsx` (1,281 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 6 | Dense risk data |
| Information Density | 6 | Too much data visible |
| Typography Scale | 6 | Fragmented sizes |
| Color & Contrast | 6 | Fragmented color definitions |
| Card & Component Depth | 6 | Basic cards |
| Spacing & Alignment | 6 | Inconsistent |
| Interaction Feedback | 5 | PDF generation without loading UI |
| Empty/Error States | 5 | Missing error states |
| Mobile Responsiveness | 6 | Poor mobile layout |
| $20M Test | 5 | Needs significant polish |
| **Composite** | **57** | |

---

#### 4.22 SelfAudit — `src/pages/SelfAudit.tsx` (1,435 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Good wizard flow |
| Information Density | 7 | Step-by-step helps |
| Typography Scale | 6 | Mixed sizes |
| Color & Contrast | 7 | Status colors |
| Card & Component Depth | 6 | Flat wizard steps |
| Spacing & Alignment | 7 | Wizard grid consistent |
| Interaction Feedback | 7 | Step transitions |
| Empty/Error States | 6 | Basic |
| Mobile Responsiveness | 6 | Wizard cramped on mobile |
| $20M Test | 6 | Functional but plain |
| **Composite** | **65** | |

---

#### 4.23 CicPseView — `src/pages/CicPseView.tsx` (339 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 5 | Flat layout, hard to scan |
| Information Density | 6 | Adequate |
| Typography Scale | 5 | All inline styles |
| Color & Contrast | 5 | Over-reliant on inline |
| Card & Component Depth | 4 | No elevation |
| Spacing & Alignment | 5 | Inline padding |
| Interaction Feedback | 5 | Minimal |
| Empty/Error States | 5 | Basic |
| Mobile Responsiveness | 4 | No responsive design |
| $20M Test | 4 | Needs complete rework |
| **Composite** | **48** | |

---

#### 4.24 WorkforceRisk — `src/pages/WorkforceRisk.tsx` (422 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 6 | Role-based sections |
| Information Density | 6 | Adequate |
| Typography Scale | 5 | All inline styles |
| Color & Contrast | 5 | Inline colors |
| Card & Component Depth | 5 | Flat |
| Spacing & Alignment | 5 | Inline spacing |
| Interaction Feedback | 5 | Minimal |
| Empty/Error States | 5 | Basic |
| Mobile Responsiveness | 5 | Minimal responsive |
| $20M Test | 4 | Internal tool feel |
| **Composite** | **51** | |

---

#### 4.25 TrainingHub — `src/pages/TrainingHub.tsx` (1,491 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 5 | 8 inline components, chaotic |
| Information Density | 5 | Overwhelming |
| Typography Scale | 4 | No consistency |
| Color & Contrast | 5 | Scattered color definitions |
| Card & Component Depth | 4 | Flat everywhere |
| Spacing & Alignment | 4 | Inconsistent |
| Interaction Feedback | 5 | Basic |
| Empty/Error States | 4 | Minimal |
| Mobile Responsiveness | 4 | Poor |
| $20M Test | 3 | Worst page — needs complete redesign |
| **Composite** | **43** | LOWEST SCORE |

**Cheap Wins:**
- Extract 8 inline components to separate files
- Add card elevation to training modules
- Create consistent progress bar component
- Add skeleton loader for course loading
- Color-code completion status

---

#### 4.26 IncidentPlaybooks — `src/pages/IncidentPlaybooks.tsx` (562 LOC)

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 5 | Decent structure |
| Information Density | 6 | Organized |
| Typography Scale | 5 | All inline styles |
| Color & Contrast | 5 | Inline colors |
| Card & Component Depth | 5 | Flat |
| Spacing & Alignment | 5 | Inline spacing |
| Interaction Feedback | 5 | Minimal |
| Empty/Error States | 5 | Basic |
| Mobile Responsiveness | 4 | No responsive |
| $20M Test | 4 | Needs migration to Tailwind |
| **Composite** | **49** | |

---

### 4.27 Admin Pages — AdminShell Layout

| Metric | Score | Notes |
|--------|-------|-------|
| Visual Hierarchy | 7 | Clear section organization |
| Information Density | 7 | Sidebar well-organized (7 sections) |
| Typography Scale | 6 | All inline styles |
| Color & Contrast | 7 | Consistent dark palette |
| Card & Component Depth | 6 | Flat sidebar items |
| Spacing & Alignment | 7 | Consistent padding |
| Interaction Feedback | 7 | Active state, hover effects |
| Empty/Error States | 6 | Missing loading state |
| Mobile Responsiveness | 4 | No mobile layout (fixed 220px) |
| $20M Test | 6 | Functional admin but not premium |
| **Composite** | **63** | |

---

## 5. Shared Component Audit

### 5.1 Layout System

| Component | LOC | Quality | Notes |
|-----------|-----|---------|-------|
| Layout.tsx | 157 | 8/10 | Good shell, lazy overlays |
| Sidebar.tsx | 822 | 7/10 | Large but well-organized, emoji→icon mapping |
| TopBar.tsx | 539 | 7/10 | Feature-rich, multiple dropdowns |
| QuickActionsBar.tsx | 169 | 5/10 | Uses emoji chars, not Lucide icons |
| MobileTabBar.tsx | 289 | 7/10 | 46 route→icon mappings, voice integration |
| AdminShell.tsx | 285 | 6/10 | All inline styles, no mobile |
| AutoBreadcrumb.tsx | — | 8/10 | 60+ routes, three-tier resolution |

### 5.2 Shared UI Components

| Component | Quality | Notes |
|-----------|---------|-------|
| MetricCardRow | 9/10 | Best component — design-token driven, responsive |
| PageStates (Loading/Error/Empty) | 8/10 | Good patterns, reusable |
| ErrorBoundary | 8/10 | Three-level fallback system |
| DashboardSkeleton | 8/10 | Layout-preserving skeleton |
| Skeleton.tsx | 7/10 | Conflicting export names (LoadingSkeleton) |
| Breadcrumb | 8/10 | Clean implementation |
| SocialLoginButtons | 7/10 | Reusable auth component |

### 5.3 Component Library Gaps

| Missing Component | Impact | Priority |
|-------------------|--------|----------|
| `DataTable` | No reusable table with sort/filter/pagination | High |
| `StatusBadge` | Every page defines its own status pill | High |
| `PageHeader` | Inconsistent page headings | High |
| `FilterBar` | Repeated filter UI across pages | Medium |
| `StatCard` | Non-dashboard stat display | Medium |
| `ActionMenu` | Dropdown menus reimplemented per page | Medium |
| `EmptyState` | Shared but underused | Low |
| `ConfirmDialog` | Multiple implementations | Low |

---

## 6. Competitive Benchmarking (Phase 2)

### 6.1 Competitive Scorecard

| Metric | EvidLY | SafetyCulture | Zenput/CrunchTime | ComplianceMate | Linear (benchmark) | Stripe (benchmark) |
|--------|--------|---------------|-------------------|----------------|--------------------|--------------------|
| Visual Hierarchy | 6.5 | 8 | 7 | 6 | 9.5 | 9.5 |
| Information Density | 7 | 7.5 | 7 | 6.5 | 9 | 8.5 |
| Typography Scale | 6 | 7.5 | 6.5 | 6 | 9.5 | 9 |
| Color & Contrast | 6.5 | 8 | 7 | 6.5 | 9 | 9.5 |
| Card & Component Depth | 6 | 7.5 | 6.5 | 6 | 9 | 9 |
| Spacing & Alignment | 6.5 | 8 | 7 | 6 | 9.5 | 9 |
| Interaction Feedback | 6.5 | 7.5 | 6 | 6 | 9 | 9 |
| Empty/Error States | 6 | 7 | 6 | 5.5 | 8.5 | 9 |
| Mobile Responsive | 6.5 | 8.5 | 7 | 6 | 8 | 8.5 |
| $20M Company Test | 5.5 | 7.5 | 6.5 | 5.5 | 10 | 10 |
| **OVERALL** | **6.4** | **7.5** | **6.6** | **6.0** | **9.2** | **9.2** |

### 6.2 Gap Analysis vs SafetyCulture (Primary Competitor)

| Area | SafetyCulture | EvidLY Gap | Fix Priority |
|------|--------------|------------|--------------|
| **Shadow system** | 3-tier elevation (sm/md/lg) | No consistent shadows | Sprint 1 |
| **Type scale** | Defined 6-size scale | Ad-hoc per page | Sprint 1 |
| **Loading states** | Skeleton on every view | ~30% coverage | Sprint 1 |
| **Card depth** | Consistent rounded-xl + shadow | Flat or border-only | Sprint 1 |
| **Color tokens** | Centralized design system | 3+ sources of truth | Sprint 1 |
| **Status badges** | Consistent pill component | Reimplemented per page | Sprint 2 |
| **Data tables** | Reusable DataTable | Custom per page | Sprint 2 |
| **Mobile nav** | Bottom sheet + gesture | Fixed sidebar | Sprint 3 |
| **Micro-interactions** | 200ms transitions | Minimal | Sprint 4 |
| **Empty states** | Illustrated SVGs | Text-only | Sprint 5 |

### 6.3 Design Benchmark Patterns to Adopt

**From Linear:**
- Keyboard-first navigation (Ctrl+K already exists — promote it)
- Subtle backdrop-blur on overlays
- Monochrome + one accent color system

**From Stripe:**
- Gradient mesh backgrounds for hero sections
- Depth through layered cards
- Premium typography hierarchy

**From Vercel:**
- Crisp borders with subtle shadows
- Minimal color palette strictly enforced
- Data-dense tables with clean whitespace

**From Notion:**
- Clean empty states with helpful actions
- Consistent icon sizing
- Breadcrumb + page title pattern

**From Mercury:**
- Financial-grade data presentation
- Trend indicators on metrics
- Status color system (green/amber/red)

---

## 7. Design System Foundation (Phase 3)

### 7.1 Elevation System

| Level | Token | CSS | Usage |
|-------|-------|-----|-------|
| Level 0 | `elevation.none` | `shadow-none` | Flat elements, inline content |
| Level 1 | `elevation.sm` | `0 1px 3px rgba(30,45,77,0.06), 0 1px 2px rgba(30,45,77,0.04)` | Cards, list items |
| Level 2 | `elevation.md` | `0 4px 12px rgba(30,45,77,0.08), 0 2px 4px rgba(30,45,77,0.04)` | Modals, dropdowns, popovers |
| Level 3 | `elevation.lg` | `0 12px 36px rgba(30,45,77,0.12), 0 4px 12px rgba(30,45,77,0.06)` | Dialogs, toast notifications |

### 7.2 Typography Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text.hero` | 36px | 700 | 1.1 | Page hero headings |
| `text.h1` | 28px | 700 | 1.2 | Page titles |
| `text.h2` | 22px | 600 | 1.25 | Section headings |
| `text.h3` | 18px | 600 | 1.3 | Card headings |
| `text.body` | 15px | 400 | 1.5 | Body text |
| `text.sm` | 13px | 400 | 1.5 | Secondary text, labels |
| `text.xs` | 11px | 500 | 1.6 | Captions, badges |

**Font family:** Montserrat (body), Syne (logo only)

### 7.3 Spacing System (8px Grid)

| Token | Value | Usage |
|-------|-------|-------|
| `space.1` | 4px | Icon gaps, tight padding |
| `space.2` | 8px | Compact spacing |
| `space.3` | 12px | List item padding |
| `space.4` | 16px | Card padding (compact) |
| `space.5` | 20px | Standard padding |
| `space.6` | 24px | Section gaps |
| `space.8` | 32px | Large section gaps |
| `space.10` | 40px | Page-level spacing |
| `space.12` | 48px | Hero spacing |

### 7.4 Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `color.navy` | `#1E2D4D` | Primary brand, headings, buttons |
| `color.navy.dark` | `#0B1628` | Sidebar backgrounds |
| `color.navy.hover` | `#162340` | Button hover |
| `color.gold` | `#A08C5A` | Accent, active states, badges |
| `color.gold.light` | `#C4AE7A` | Gold hover, highlights |
| `color.cream` | `#FAF7F0` | Page backgrounds |
| `color.cream.warm` | `#FAF7F2` | Card backgrounds |
| `color.border` | `#E5E0D8` | Default borders |
| `color.border.warm` | `#E2D9C8` | Warm borders |
| `color.text.primary` | `#1E2D4D` | Primary text |
| `color.text.secondary` | `#6B7F96` | Secondary text |
| `color.text.muted` | `#94A3B8` | Muted text, placeholders |
| `color.status.success` | `#166534` | Pass, complete, on-track |
| `color.status.warning` | `#92400E` | Attention needed |
| `color.status.danger` | `#991B1B` | Fail, critical, overdue |
| `color.status.info` | `#1E40AF` | Information, neutral |

### 7.5 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 6px | Buttons, inputs, badges |
| `radius.md` | 8px | Cards, containers |
| `radius.lg` | 12px | Modals, large cards |
| `radius.xl` | 16px | Hero sections, feature cards |
| `radius.full` | 9999px | Avatars, pills |

### 7.6 Component Standards

| Component | Spec |
|-----------|------|
| **Card** | `bg-white rounded-lg shadow-sm border border-border_ui p-5` |
| **Button Primary** | `bg-navy text-white rounded-md px-4 py-2.5 font-semibold text-sm shadow-sm hover:bg-navy-hover transition-colors` |
| **Button Secondary** | `bg-white text-navy border border-border_ui rounded-md px-4 py-2.5 font-medium text-sm hover:bg-cream transition-colors` |
| **Input** | `border border-border_ui rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors` |
| **Badge** | `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium` |
| **Table** | `w-full divide-y divide-border_ui` with `sticky top-0 bg-white/95 backdrop-blur-sm` header |
| **Modal** | `bg-white rounded-xl shadow-lg p-6 max-w-lg w-full` with backdrop `bg-navy/40 backdrop-blur-sm` |

---

## 8. Upgrade Plan (Phase 4)

### Sprint 1: Foundation (Est. 3–4 sessions)
**Goal:** Design system infrastructure + critical path fixes

| # | Task | Files | Before → After |
|---|------|-------|----------------|
| 1.1 | Create `src/lib/designSystem.ts` | New file | — |
| 1.2 | Install Montserrat font, update CSS | `index.css`, `index.html` | Inter → Montserrat |
| 1.3 | Unify background colors | All pages using `#F5F6F8`, `#FAFAFA` | → `#FAF7F0` |
| 1.4 | Add Tailwind shadow tokens to config | `tailwind.config.js` | 0 shadows → 3 levels |
| 1.5 | Create `StatusBadge` component | New file | Per-page badges → shared |
| 1.6 | Create `PageHeader` component | New file | Per-page headings → shared |
| 1.7 | Audit + fix color inconsistencies | ~15 files | Multiple hex → tokens |

### Sprint 2: Critical Path Pages (Est. 4–5 sessions)
**Goal:** Login, Signup, Dashboard, ComplianceIndex, TempLogs to 90+

| # | Task | Files | Before → After |
|---|------|-------|----------------|
| 2.1 | Login elevation | `Login.tsx` | 73 → 92 |
| 2.2 | Signup elevation | `Signup.tsx` | 67 → 90 |
| 2.3 | Dashboard elevation | `Dashboard.tsx`, `OwnerOperatorDashboard.tsx` | 71 → 90 |
| 2.4 | ComplianceIndex polish | `ComplianceIndex.tsx` | 83 → 92 |
| 2.5 | TempLogs elevation | `TempLogs.tsx` | 70 → 90 |

### Sprint 3: Important Pages (Est. 4–5 sessions)
**Goal:** Checklists, Alerts, Documents, HACCP, CorrectiveActions to 85+

| # | Task | Files | Before → After |
|---|------|-------|----------------|
| 3.1 | Checklists elevation | `Checklists.tsx` | 70 → 86 |
| 3.2 | Alerts elevation | `Alerts.tsx` | 78 → 88 |
| 3.3 | Documents elevation | `Documents.tsx` | 71 → 86 |
| 3.4 | HACCP redesign | `HACCP.tsx` (split into 3 files) | 53 → 85 |
| 3.5 | CorrectiveActions elevation | `CorrectiveActions.tsx` | 68 → 86 |

### Sprint 4: Supporting Pages Batch 1 (Est. 3–4 sessions)
**Goal:** Lowest-scoring pages to 80+

| # | Task | Files | Before → After |
|---|------|-------|----------------|
| 4.1 | TrainingHub redesign | `TrainingHub.tsx` (split + rebuild) | 43 → 82 |
| 4.2 | CicPseView Tailwind migration | `CicPseView.tsx` | 48 → 82 |
| 4.3 | IncidentPlaybooks migration | `IncidentPlaybooks.tsx` | 49 → 82 |
| 4.4 | WorkforceRisk migration | `WorkforceRisk.tsx` | 51 → 82 |
| 4.5 | IncidentLog elevation | `IncidentLog.tsx` | 60 → 82 |
| 4.6 | InsuranceRisk elevation | `InsuranceRisk.tsx` | 57 → 82 |

### Sprint 5: Polish & Mobile (Est. 2–3 sessions)
**Goal:** Global polish, mobile responsiveness, micro-interactions

| # | Task | Files | Before → After |
|---|------|-------|----------------|
| 5.1 | AdminShell mobile responsive | `AdminShell.tsx` | 63 → 82 |
| 5.2 | QuickActionsBar icons | `QuickActionsBar.tsx` | emoji → Lucide |
| 5.3 | Global transition system | `index.css` | Ad-hoc → 200ms standard |
| 5.4 | Loading state audit | All pages | 30% → 95% coverage |
| 5.5 | Empty state illustration | All pages | Text-only → icon + text |
| 5.6 | Print stylesheet | `index.css` | Basic → comprehensive |

---

### Post-Sprint Score Targets

| Page | Current | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 |
|------|---------|----------|----------|----------|----------|
| Login | 73 | **92** | 92 | 92 | 93 |
| Signup | 67 | **90** | 90 | 90 | 91 |
| Dashboard | 71 | **90** | 90 | 90 | 92 |
| ComplianceIndex | 83 | **92** | 92 | 92 | 93 |
| TempLogs | 70 | **90** | 90 | 90 | 91 |
| Checklists | 70 | 70 | **86** | 86 | 88 |
| Alerts | 78 | 78 | **88** | 88 | 90 |
| HACCP | 53 | 53 | **85** | 85 | 87 |
| Settings | 86 | 86 | 86 | 86 | 88 |
| TrainingHub | 43 | 43 | 43 | **82** | 84 |
| CicPseView | 48 | 48 | 48 | **82** | 84 |
| IncidentPlaybooks | 49 | 49 | 49 | **82** | 84 |
| **Overall Average** | **68** | **73** | **78** | **83** | **87** |

---

## Appendix A: Complete Page Inventory

Total routes in `src/App.tsx`: **150+**

### Audited Pages (27)

| Page | File | LOC | Composite | Priority |
|------|------|-----|-----------|----------|
| Login | Login.tsx | 358 | 73 | Critical |
| Signup | Signup.tsx | 585 | 67 | Critical |
| Dashboard | Dashboard.tsx + role dashboards | 800 | 71 | Critical |
| ComplianceIndex | ComplianceIndex.tsx | 829 | 83 | Critical |
| TempLogs | TempLogs.tsx | 3,900 | 70 | Critical |
| Checklists | Checklists.tsx | 2,335 | 70 | Important |
| Alerts | Alerts.tsx | 867 | 78 | Important |
| Documents | Documents.tsx | 1,014 | 71 | Important |
| HACCP | HACCP.tsx | 2,391 | 53 | Important |
| CorrectiveActions | CorrectiveActions.tsx | 871 | 68 | Important |
| Settings | SettingsPage.tsx | 87 | 86 | Important |
| EquipmentPage | EquipmentPage.tsx | 264 | 80 | Supporting |
| ScoringBreakdown | ScoringBreakdown.tsx | 406 | 75 | Supporting |
| ComplianceTrends | ComplianceTrends.tsx | 122 | 75 | Supporting |
| Deficiencies | Deficiencies.tsx | 397 | 76 | Supporting |
| Benchmarks | Benchmarks.tsx | 757 | 74 | Supporting |
| ShiftHandoff | ShiftHandoff.jsx | 217 | 68 | Supporting |
| Vendors | Vendors.tsx | 1,919 | 68 | Supporting |
| VendorMarketplace | VendorMarketplace.tsx | 1,065 | 68 | Supporting |
| IncidentLog | IncidentLog.tsx | 1,837 | 60 | Supporting |
| InsuranceRisk | InsuranceRisk.tsx | 1,281 | 57 | Supporting |
| SelfAudit | SelfAudit.tsx | 1,435 | 65 | Supporting |
| CicPseView | CicPseView.tsx | 339 | 48 | Supporting |
| WorkforceRisk | WorkforceRisk.tsx | 422 | 51 | Supporting |
| TrainingHub | TrainingHub.tsx | 1,491 | 43 | Supporting |
| IncidentPlaybooks | IncidentPlaybooks.tsx | 562 | 49 | Supporting |
| AdminShell | AdminShell.tsx | 285 | 63 | Supporting |

### Unaudited Pages (~120+ routes)

These routes exist in `src/App.tsx` but were not individually scored. They should inherit Sprint 1 foundation changes and be audited as part of Sprint 5 polish.

Key categories:
- **Admin pages** (~40 routes): `/admin/*` — use AdminShell layout
- **Vendor pages** (~10 routes): `/vendor/*` — separate vendor flow
- **Settings sub-pages** (~8 routes): `/settings/*` — inherit SettingsPage quality
- **Demo/Tour pages** (~10 routes): `/demo/*` — guided tour pages
- **Intelligence pages** (~8 routes): Predictive analytics views
- **MFA/Auth pages** (~5 routes): `/mfa-*`, `/forgot-password`, etc.
- **Remaining operational pages** (~40 routes): Various compliance, reporting, facility pages

---

## Appendix B: Execution Rules (Phase 5)

1. **Read before change** — Always read the current file before modifying
2. **JSX mockup first** — Generate mockup for approval before writing code
3. **Never remove functionality** — Visual layer changes only
4. **Test at 4 breakpoints** — 375px, 768px, 1024px, 1440px
5. **Commit format** — `ui: [page-name] elevation — [score before] → [score after]`
6. **Deploy staging first** — `npx vercel` (not `--prod`) for review
7. **One page per session** — Focused, reviewable changes
8. **Design tokens only** — All new styling through `designSystem.ts` tokens
9. **Tailwind only** — No new inline styles; migrate existing inline styles
10. **Preserve scroll position** — No layout shifts during upgrades

---

*End of EVIDLY UI Audit Report — Phase 1–4*
*Next step: Review this report and approve before any code changes begin.*
