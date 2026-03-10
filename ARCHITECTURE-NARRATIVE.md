# EvidLY Architecture Narrative

**Capture Date:** 2026-03-04
**Purpose:** IP Disclosure Package v3 — Architecture Audit
**Scope:** Complete platform architecture, patent-relevant innovations, and data flow documentation

---

## 1. Platform Overview

EvidLY is an AI-powered food safety and facility compliance management platform built on React 18.3.1 with TypeScript, Tailwind CSS, and Vite for the frontend, backed by Supabase (PostgreSQL, Auth, Edge Functions, Storage, Realtime) and deployed on Vercel.

### Scale at a Glance

| Category | Count |
|----------|-------|
| Pages | 175 |
| Components | 260 |
| Library modules | 73 |
| Data files | 46 |
| Config files | 10 |
| Custom hooks | 31 |
| Edge functions | 126 |
| Database migrations | 201 |
| React contexts | 10 |
| Jurisdictions configured | 57 |
| RLS policies | 769 |
| Tables created | ~300 |

---

## 2. Routing & Layout Architecture

The application uses a **shared layout at the route level** via React Router v7's `<Outlet>` pattern. A `ProtectedLayout` component in `App.tsx` wraps all authenticated routes, mounting the Sidebar, TopBar, and MobileTabBar once. Only the content area swaps during navigation — the shell never unmounts.

**Route categories:**
- **Public routes** (30+): Landing pages, auth flows, SEO pages, vendor portals, public verification
- **Protected layout routes** (100+): Dashboard, compliance, admin, settings — all wrapped in `ProtectedLayout`
- **Standalone protected routes** (5): Onboarding, VendorDashboard, EnterpriseDashboard — use `<ProtectedRoute>` individually
- **Redirect routes** (15+): Legacy path redirects for renamed features

The mobile experience uses a 5-tab bottom navigation bar (Dashboard, Checklists, Calendar, Temps, More) configured in `navConfig.ts`. Kitchen staff get a dedicated 5-tab layout (Today, Checklists, Temps, Diagnosis, Report).

---

## 3. Database Schema

### 3.1 Core Tables

The foundation consists of three tables that enforce multi-tenancy:

- **organizations** — tenant container with industry_type and plan_tier
- **locations** — physical sites under organizations, each assigned to a jurisdiction
- **user_location_access** — RBAC junction table linking users to locations with roles

All tenant data tables reference organizations/locations and are protected by Row Level Security (769 policies total) that scopes all queries to the authenticated user's organization.

### 3.2 Three-Phase Canonical Engine

The most architecturally significant database design is the three-phase canonical scoring engine:

**Phase 1 — Canonical Scoring Stabilization** (`20260318000000`):
- Adds `model_version`, `scoring_engine`, and `inputs_hash` columns to `compliance_score_snapshots`
- Creates `score_model_versions` table — a version registry for scoring algorithms
- Seeds v1.0: CalCode deduction model, 2-pillar (Food Safety + Facility Safety)
- **Patent relevance:** Reproducible, versioned compliance scoring with deterministic replay capability

**Phase 2 — Risk Translation Layer** (`20260319000000`):
- Creates `risk_assessments` table with four risk dimensions:
  - `revenue_risk` — lost revenue from closures/downgrades
  - `cost_risk` — remediation and equipment costs
  - `liability_risk` — legal exposure from violations
  - `operational_risk` — disruption to daily operations
- Maps compliance scores to insurance tiers (preferred/standard/elevated/high)
- Stores explainable drivers as JSONB and links to intelligence references
- **Patent relevance:** Automated compliance→risk→insurance translation with explainability

**Phase 3 — Intelligence Normalization** (`20260320000000`):
- Unifies 5+ intelligence data stores into a single `intelligence_insights` table
- Uses `source_type` discriminator: ai_pattern, ai_prediction, ai_digest, ai_corrective, webhook_inbound, regulatory_monitor
- Creates backward-compatible views (`ai_insights_v`, `regulatory_changes_v`) for legacy code
- **Patent relevance:** Single-store intelligence architecture with source-type partitioning

### 3.3 Jurisdiction Configurations

57 jurisdiction-specific migrations configure county/city inspection rules, covering:
- Scoring methodology (7 system types)
- Grading schemes
- Fire AHJ (Authority Having Jurisdiction)
- Hood cleaning frequencies (NFPA 96)
- Special exceptions (independent health departments)

All weight columns are intentionally NULL — no default weights are assumed until verified from official sources. LA County serves as the reference implementation (confidence 100/100).

---

## 4. Edge Function Architecture

126 Supabase Edge Functions (Deno runtime) organized into 15+ categories:

### 4.1 AI Functions (7)
All use the Anthropic Claude API for natural language processing:
- `ai-chat` — conversational AI assistant
- `ai-document-analysis` — document classification and extraction
- `ai-corrective-action-draft` — automated corrective action writing
- `ai-text-assist` — general text assistance
- `ai-weekly-digest` — automated compliance digest generation
- `ai-pattern-analysis` — trend pattern detection
- `ai-predictive-alerts` — predictive compliance alerts

### 4.2 Intelligence Pipeline (6)
Full lifecycle from collection to delivery:
- `intelligence-collect` — classifies raw signals using Claude AI
- `intelligence-auto-publish` — auto-publishes high-confidence signals
- `intelligence-approve` — manual approval queue processing
- `intelligence-feed` — client-facing intelligence feed
- `intelligence-deliver` — push delivery to subscribers
- `intelligence-webhook` — inbound webhook receiver

### 4.3 External API Integrations
- **Anthropic Claude** — 13 edge functions use ANTHROPIC_API_KEY for AI capabilities
- **Stripe** — 3 functions for payment processing
- **Firecrawl** — 1 function for web scraping intelligence sources
- **Resend** — 3 functions for email delivery
- **Twilio** — 1 function for SMS notifications

### 4.4 Shared Utilities
`supabase/functions/_shared/` contains:
- `email.ts` — email sending abstraction
- `sms.ts` — SMS sending abstraction
- `logger.ts` — structured logging
- `invocation-logger.ts` — function invocation tracking
- `posUtils.ts` — POS integration utilities

---

## 5. Scoring Engines

### 5.1 Compliance Scoring (`complianceScoring.ts`)

Two independent pillars:
- **Food Safety** — CalCode-based deduction scoring
- **Facility Safety** — equipment, fire suppression, hood cleaning compliance

Key functions: `calculateFacilitySafetyScore()`, `buildFacilitySafetyItems()`, `getGraduatedPenalty()`, `getScoreTier()`

The graduated penalty system applies increasing deductions as items approach or pass due dates, preventing cliff-edge score drops.

### 5.2 Jurisdiction Scoring / CRS Normalization (`jurisdictionScoring.ts`)

**This is the most patent-relevant scoring engine.**

The CRS (Compliance Risk Score) normalization algorithm maps 7 incompatible inspection scoring systems to a unified 0-100 scale:

1. `calcode_deduction` — 100-point start, deduct per violation (California standard)
2. `percentage` — raw percentage score
3. `violation_count` — count-based systems
4. `pass_fail` — binary pass/fail jurisdictions
5. `weighted_deduction` — category-weighted deduction (LA County FOIR)
6. `letter_grade` — letter grade systems (A-F)
7. `numerical_score` — raw numerical scores

Key functions: `calculateJurisdictionScore()`, `getCountyProfile()`, `getAvailableCounties()`

This enables cross-jurisdiction compliance comparison — a restaurant scoring 92 in LA County (weighted deduction) can be meaningfully compared to one scoring "A" in San Francisco (letter grade) or 3 violations in a rural county (violation count).

### 5.3 Kitchen Checkup Scoring (`checkupScoring.ts`)

Self-assessment scoring engine with:
- Config-driven question bank with skip logic
- Two-layer scoring (question-level + impact area aggregation)
- Grade scale: A(<25), B(25-45), C(46-65), D(66-80), F(>80)
- Dollar-impact estimation using revenue-based multipliers

### 5.4 Insurance Risk Scoring (`insuranceRiskScore.ts`, `insuranceRiskScoreV2.ts`)

Four-category risk assessment:
1. Fire Risk — hood cleaning, suppression, equipment
2. Food Safety — inspection readiness, violation history
3. Document Compliance — permit/license currency
4. Operational Risk — staffing, training, procedures

V2 adds trend adjustment (improving/declining trajectory affects score) and separates calculation from data access for testability.

### 5.5 Benchmark Normalization (`benchmarkNormalization.ts`)

Peer group comparison engine with:
- `computePercentileRank()` — where a location stands among peers
- `computePeerGroupComparison()` — same-industry, same-size comparisons
- `computeJurisdictionDifficulty()` — adjusts for inspection rigor
- `computeLeadLag()` — leading vs lagging indicator analysis
- `computePillarBenchmarks()` — per-pillar peer comparison

**Patent relevance:** Jurisdiction difficulty normalization ensures fair comparison — a 90 in a strict jurisdiction counts more than a 90 in a lenient one.

### 5.6 Correlation Engine (`correlationEngine.ts`)

Signal-to-organization relevance scoring:
- `correlateSignal()` — multi-factor targeting (industry, jurisdiction, scope, cuisine)
- `calculateConfidence()` — targeting confidence score
- `buildRelevanceReason()` — human-readable explanation of why a signal matters

---

## 6. Intelligence Pipeline

### 6.1 Data Flow

```
Crawl Sources (21 feeds)
    ↓ trigger-crawl (Firecrawl API)
    ↓
intelligence_sources (crawl status tracking)
    ↓ intelligence-collect (Claude AI classification)
    ↓
intelligence_signals (approval queue)
    ↓ intelligence-approve / intelligence-auto-publish
    ↓
intelligence_insights (unified store)
    ↓ intelligence-deliver (push)
    ↓ intelligence-feed (pull)
    ↓
Client Intelligence Feed (UI)
```

### 6.2 AI Classification

Each signal receives:
- **Risk dimensions** — Revenue Impact, Cost Exposure, Liability Risk, Operational Disruption
- **Source verification** — URL provenance and verification status
- **Confidence scoring** — multi-factor targeting confidence
- **Routing tier** — auto (publish immediately), notify (alert admin), hold (require review)

### 6.3 Signal Approval Queue

Admin features in `IntelligenceAdmin.tsx`:
- Active and Dismissed tabs
- Dismiss with reason modal
- Restore dismissed signals with undo toast
- Category filter (matching DB category values)
- Date range filter
- AI risk dimension display

### 6.4 Command Center

`CommandCenter.tsx` monitors crawl health:
- Reads from `intelligence_sources` table
- Status logic: Not Configured → Critical → Degraded → Healthy
- "Run Now" button triggers `trigger-crawl` edge function
- Displays per-source status with timeAgo timestamps

---

## 7. Jurisdiction Intelligence Engine (JIE)

### 7.1 Scale

57 jurisdictions configured across California:
- 51 counties (all 58 CA counties minus a few consolidated)
- 4 independent cities (Long Beach, Pasadena, Vernon, Berkeley)
- San Francisco (city-county)
- Various sub-jurisdictions tracked

### 7.2 Configuration Model

Each jurisdiction migration sets:
- `scoring_method` — one of 7 inspection system types
- `grading_scheme` — how grades are assigned
- `fire_ahj` — fire Authority Having Jurisdiction
- `hood_cleaning_frequency` — NFPA 96 compliance intervals
- `special_exceptions` — independent health departments, local overrides
- `confidence_score` — data quality confidence rating
- `data_sources` — official URLs for verification

### 7.3 Public-Facing Pages

SEO-optimized public pages for jurisdiction information:
- `/compliance/california` — state-level landing
- `/compliance/california/:countySlug` — per-county details
- `/scoretable/:slug` — jurisdiction scoring profile
- `/city/:citySlug` — city-level compliance info

### 7.4 Patent Relevance

JIE is a novel capability in food safety software. No existing platform:
1. Maps 57+ heterogeneous county inspection frameworks onto a single canonical model
2. Normalizes scores across incompatible systems for cross-jurisdiction comparison
3. Tracks jurisdiction-specific regulatory changes with AI classification
4. Adjusts benchmarks for jurisdiction inspection difficulty

---

## 8. Role & Permission System

### 8.1 Eight User Roles

| Role | Description |
|------|-------------|
| platform_admin | Full system access, all admin features |
| owner_operator | Business owner, sees all locations and financials |
| executive | Multi-location oversight, reports and analytics |
| compliance_manager | Compliance-focused, inspection readiness |
| chef | Kitchen operations, food safety focus |
| facilities_manager | Equipment, fire safety, maintenance |
| kitchen_manager | Day-to-day kitchen oversight |
| kitchen_staff | Task execution only (dedicated mobile layout) |

### 8.2 Two-Layer Permission Model

1. **Role defaults** — each role has a baseline permission set
2. **Per-user exceptions** — individual users can have permissions added or removed

Protected permissions that cannot be delegated:
- `permission.manage_roles`
- `billing.manage`
- `org.delete`
- `org.transfer_ownership`
- `team.manage_roles`

### 8.3 Feature Gating

Four plan tiers: trial → founder → professional → enterprise

Additional gating by `org_type` (industry_type) — certain features only available to specific industries (e.g., K-12 compliance only for schools, SB 1383 only for California orgs).

### 8.4 Sidebar Navigation

`sidebarConfig.ts` maintains a NavItem registry (`I` object) containing all possible navigation items. Each role gets a different section configuration via `getRoleConfig()`, determining which nav items appear in the sidebar.

---

## 9. Guided Tour System

### 9.1 Module Registry

`tourModules.ts` defines ALL_MODULES — a comprehensive registry of 50 platform features organized into 8 groups:

1. **Daily Tasks** (5) — temp logging, checklists, corrective actions, issue reporting, quick actions
2. **Food Safety** (7) — receiving, HACCP, allergens, food handler certs, date labeling, pest control, water testing
3. **Facility Safety** (8) — fire safety, hood cleaning, suppression, extinguishers, equipment, calibration, cleaning, emergency
4. **Compliance** (7) — self-inspections, JIE, ScoreTable, regulatory updates, documents, CA tracking, violation history
5. **Insights & Benchmarking** (8) — dashboard, benchmarking, leaderboard, risk analysis, trends, BI, score engine, insurance
6. **Reporting** (4) — compliance reports, data export, audit trail, K2C reporting
7. **Vendors & Operations** (5) — vendor management, certifications, ecosystem, calendar, QR codes
8. **Administration** (6) — user management, org profile, locations, integrations, billing, notifications

This registry serves as the single source of truth for guided tour templates and onboarding setup form module toggles.

---

## 10. Anti-Aggregation & Security Architecture

### 10.1 Demo Write Guard

`supabaseGuard.ts` implements a Proxy wrapper around the Supabase client that intercepts all write operations (insert, update, delete, upsert) in demo mode. Three modes:
- `live` — normal operation, all writes pass through
- `anonymous_demo` — all writes blocked
- `authenticated_demo` — all writes blocked

150 pages use the `useDemoGuard` hook for UI-level protection. The Supabase proxy is the safety net.

### 10.2 Row Level Security

769 RLS policies enforce organization-scoped data access. The pattern:
- All tenant tables have `organization_id` column
- RLS policies check `auth.uid()` → `user_location_access` → `organization_id`
- Users can only read/write data within their organization
- Vendor-specific tables have additional vendor-scoped policies

### 10.3 Multi-Layer Defense

1. **RLS** (database layer) — organization-scoped queries
2. **Supabase Guard** (client layer) — demo write interception
3. **Route Guards** (routing layer) — role-based page access
4. **Feature Gating** (feature layer) — tier and org-type access control
5. **Permission System** (granular layer) — per-feature, per-action permissions

---

## 11. External Integrations

| Service | Purpose | Functions Using |
|---------|---------|----------------|
| Anthropic Claude | AI classification, document analysis, chat, content generation | 13 edge functions |
| Stripe | Payment processing, subscription management | 3 edge functions |
| Firecrawl | Web scraping for intelligence source crawling | 1 edge function |
| Resend | Transactional email delivery | 3 edge functions |
| Twilio | SMS notifications and invitations | 1 edge function |
| Sanity CMS | Blog content management | `src/lib/sanityClient.ts` |
| Sentry | Error monitoring | `src/lib/sentry.ts` |

---

## Patent-Relevant Innovations Summary

### Innovation 1: CRS Normalization
**Files:** `jurisdictionScoring.ts`
Converts 7+ incompatible jurisdiction inspection scoring systems to a unified 0-100 scale, enabling the first cross-jurisdiction compliance comparison in food safety software.

### Innovation 2: Three-Phase Canonical Engine
**Files:** Three migration files (Phase 1, 2, 3)
Reproducible, versioned compliance scoring → automated risk translation → unified intelligence store. Each phase builds on the previous with full backward compatibility.

### Innovation 3: Intelligence Correlation & Routing
**Files:** `correlationEngine.ts`, `intelligenceRouter.ts`, `intelligencePersonalizer.ts`
Multi-factor signal-to-organization relevance scoring with automated severity-based routing (auto/notify/hold). Novel regulatory intelligence targeting for food service operators.

### Innovation 4: Jurisdiction Difficulty Normalization
**Files:** `benchmarkNormalization.ts`
Fairness-adjusted benchmarking that accounts for varying inspection rigor across jurisdictions — a compliance score in a strict jurisdiction is weighted more heavily than the same score in a lenient one.

### Innovation 5: Anti-Aggregation Architecture
**Files:** `supabaseGuard.ts`, `routeGuards.ts`, `featureGating.ts`
Five-layer defense-in-depth data isolation (RLS, write proxy, route guards, feature gating, permission system) with demo-mode write interception at the Supabase client level.

---

*NO CODE WAS MODIFIED. NO GIT COMMIT WAS MADE. NO DEPLOY WAS EXECUTED.*
