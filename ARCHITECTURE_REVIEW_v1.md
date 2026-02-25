# EvidLY v1.0 Canonical Architecture Review

**Date:** 2026-02-25
**Scope:** Full schema, edge functions, frontend scoring, intelligence pipeline
**Methodology:** Automated codebase audit across 109+ tables, 96 edge functions, 6 frontend scoring engines

---

## CURRENT STATE SUMMARY

EvidLY currently operates **6 independent scoring systems** with **no shared authority**:

| # | System | Location | Algorithm | Writes To |
|---|--------|----------|-----------|-----------|
| 1 | calculate-compliance-score | Edge function | CalCode deduction (7 scoring types, 8 grading types) | `score_calculations` |
| 2 | complianceScoring.ts | Frontend lib | 2-pillar graduated penalty (Food 50% / Fire 50%) | None (client-side only) |
| 3 | insurance-risk-calculate | Edge function | 4-category weighted (Fire 40% / Food 30% / Docs 20% / Ops 10%) | `insurance_risk_scores`, `insurance_risk_factors`, `insurance_score_history` |
| 4 | benchmark-snapshot | Edge function | Simple ratio (temps/checklists/docs) | `location_benchmark_ranks` |
| 5 | jurisdictionScoring.ts | Frontend lib | County deduction profiles (8 counties) | None (client-side only) |
| 6 | enterprise-rollup-calculate | Edge function | Weighted avg of child scores | `enterprise_rollup_scores` |

**Two separate intelligence stores** exist across two Supabase projects. **No correlation bridge** connects intelligence events to compliance scores. **No immutable score snapshots** are referenced by derived systems.

---

## STEP 1 — DATABASE AUDIT

### Scoring & Compliance Tables

| Table | Purpose | Canonical? | Writes Compliance State? | Duplicate Risk? | Recommendation |
|-------|---------|-----------|-------------------------|-----------------|----------------|
| `compliance_score_snapshots` | Daily location scores (overall, food, fire, vendor) | **YES** | YES — overall_score, pillar scores, operational metrics | LOW | Promote to sole canonical snapshot. Add model_version column. |
| `score_calculations` | Audit trail from calculate-compliance-score edge fn | Partial | YES — raw_score, normalized_score, jurisdiction_grade | **HIGH** — parallel to compliance_score_snapshots | Merge into compliance_score_snapshots or deprecate |
| `location_jurisdiction_scores` | Dual-layer scores (EvidLY + jurisdiction grade) | Derived | YES — evidly_score, jurisdiction_score, jurisdiction_grade | MEDIUM — recalculates evidly_score independently | Must reference compliance_score_snapshots.id |
| `insurance_risk_scores` | Insurance underwriting (4-tier 0-100) | Separate Canonical | YES — overall_score, tier, 4 category scores | **HIGH** — uses different weights than compliance | Must derive FROM score snapshot, not recalculate |
| `insurance_risk_factors` | Per-factor breakdown (30 factors) | Derived | YES — individual factor scores | LOW | Keep, but link to score_snapshot_id |
| `insurance_score_history` | Monthly insurance snapshots | Derived | YES — monthly point-in-time | LOW | Keep, add score_snapshot_id FK |
| `benchmark_aggregates` | Peer comparison percentiles | Derived | NO — read-only aggregates | LOW | Keep as derived view |
| `location_benchmark_ranks` | Per-location percentile rank | Derived | YES — overall_percentile, pillar percentiles | MEDIUM — recalculates its own overall_score | Must use compliance_score_snapshots.overall_score as input |
| `benchmark_snapshots` | Legacy benchmarking | **DEPRECATED** | YES | **HIGH** — superseded by benchmark_aggregates | Remove |
| `benchmark_badges` | Achievement tiers | Derived | YES — badge_tier, qualifying period | LOW | Keep, derive from score snapshot history |

### Intelligence Tables (Main App)

| Table | Purpose | Canonical? | Writes State? | Duplicate Risk? | Recommendation |
|-------|---------|-----------|--------------|-----------------|----------------|
| `intelligence_insights` | External intelligence (published) | **YES** | YES — insights from pipeline | MEDIUM — also exists in Intelligence project DB | Canonical for main app consumption |
| `ai_insights` | AI-generated proactive alerts | **YES** | YES — patterns, predictions, digests | **HIGH** — overlaps with intelligence_insights | Consolidate: ai_insights should be a `source_type` within intelligence_insights |
| `executive_snapshots` | Executive briefings | **YES** | YES — JSONB content | LOW | Keep |
| `intelligence_subscriptions` | Delivery preferences | Config | NO | LOW | Keep |
| `regulatory_changes` | Detected code changes | **YES** | YES — published changes | MEDIUM — overlaps with intelligence_insights category='regulatory_updates' | Consolidate into intelligence_insights with category='regulatory_change' |
| `regulatory_sources` | Monitored regulation sources | Config | NO | MEDIUM — overlaps with Intelligence project's intelligence_sources | Keep both (different scope) |

### Intelligence Tables (Intelligence Project — Separate Supabase)

| Table | Purpose | Canonical? | Recommendation |
|-------|---------|-----------|----------------|
| `intelligence_events` | Raw crawled data | YES | Keep — canonical raw events |
| `intelligence_insights` | Analyzed insights | YES | Keep — canonical for Intelligence project |
| `recall_alerts` | FDA/USDA recalls | YES | Keep |
| `outbreak_alerts` | CDC/CDPH outbreaks | YES | Keep |
| `inspector_patterns` | Inspector behavior | YES | Keep |
| `legislative_items` | Pending legislation | YES | Keep |
| `weather_risk_events` | Operational weather | YES | Keep |
| `competitor_events` | Public compliance data | YES | Keep |
| `intelligence_correlations` | Cross-source analysis | YES | Keep — promote to main app |
| `source_health_log` | Source monitoring | Operational | Keep |

### Jurisdiction Tables

| Table | Purpose | Canonical? | Recommendation |
|-------|---------|-----------|----------------|
| `jurisdiction_scoring_profiles` | County-specific scoring config | **YES** | Keep — canonical jurisdiction rules |
| `violation_code_mappings` | EvidLY item → jurisdiction code | **YES** | Keep |
| `location_jurisdiction_profiles` | Per-location auto-detected jurisdiction | **YES** | Keep |
| `location_jurisdiction_scores` | Calculated jurisdiction grades | Derived | Add FK to compliance_score_snapshots |
| `jurisdiction_change_log` | Audit trail | Operational | Keep |

### Organization Weights (STALE)

| Column | Current Value | Actual Usage | Recommendation |
|--------|--------------|-------------|----------------|
| `organizations.operational_weight` | 45 | NOT USED — frontend uses 50/50 Food/Fire | Remove or update to match 2-pillar model |
| `organizations.equipment_weight` | 30 | NOT USED | Remove or repurpose |
| `organizations.documentation_weight` | 25 | NOT USED | Remove or repurpose |

---

## STEP 2 — CANONICAL ENTITY IDENTIFICATION

### Confirmed Entities

| Entity | Exists? | Table | Status |
|--------|---------|-------|--------|
| **Organization** | YES | `organizations` | Canonical. PK: uuid. Stale weight columns. |
| **Location** | YES | `locations` | Canonical. PK: uuid. FK: organization_id. |
| **Jurisdiction** | YES | `jurisdiction_scoring_profiles` + `location_jurisdiction_profiles` | Canonical. County-level + per-location auto-detection. |
| **Score Snapshot** | PARTIAL | `compliance_score_snapshots` | Has daily scores but: no model_version, no immutability guarantee, no FK from derived tables. |
| **Risk Assessment** | FRAGMENTED | `insurance_risk_scores` (insurance) + none (operational) | Insurance risk exists as parallel system. No unified risk table. |
| **Intelligence Event** | YES (2 stores) | Main app: `intelligence_insights`. Intel project: `intelligence_events` → `intelligence_insights` | Two separate databases. Bridge connects them via webhook. |
| **Intelligence Insight** | DUPLICATED | Main app: `intelligence_insights` + `ai_insights` + `regulatory_changes` | Three tables serve overlapping purposes in main app. |

### Required Schema Changes

**Score Snapshot — Add columns:**
```sql
ALTER TABLE compliance_score_snapshots
  ADD COLUMN model_version TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN scoring_engine TEXT NOT NULL DEFAULT 'calculate-compliance-score',
  ADD COLUMN is_immutable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN inputs_hash TEXT;  -- SHA-256 of input data for reproducibility
```

**Risk Assessment — New canonical table:**
```sql
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  score_snapshot_id UUID REFERENCES compliance_score_snapshots(id) NOT NULL,
  revenue_risk NUMERIC(10,2),
  cost_risk NUMERIC(10,2),
  liability_risk NUMERIC(10,2),
  operational_risk NUMERIC(10,2),
  insurance_tier TEXT CHECK (insurance_tier IN ('preferred','standard','elevated','high')),
  drivers_json JSONB NOT NULL DEFAULT '[]',
  intelligence_refs UUID[] DEFAULT '{}',  -- intelligence_insights IDs that influenced this
  model_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_assessments_location ON risk_assessments(location_id, created_at DESC);
CREATE INDEX idx_risk_assessments_snapshot ON risk_assessments(score_snapshot_id);
```

---

## STEP 3 — CANONICAL SCORING PATH REVIEW

### Current Scoring Paths (VIOLATION: 4 Independent Engines)

```
PATH A: calculate-compliance-score (Edge Function)
  Input: temperature_logs, checklist_completions, documents, equipment, haccp_plans, training_records
  Algorithm: CalCode deduction model (7 scoring types per jurisdiction)
  Output: score_calculations table (raw_score, normalized_score, jurisdiction_grade)
  Model versioning: NONE
  Immutability: NONE

PATH B: complianceScoring.ts (Frontend)
  Input: scoreImpactData items (static demo data or derived)
  Algorithm: 2-pillar graduated penalty (Food 50% / Fire 50%)
  Output: Client-side only (not persisted)
  Model versioning: NONE
  Immutability: N/A (ephemeral)

PATH C: insurance-risk-calculate (Edge Function)
  Input: vendors, insurance_risk_scores (previous), organizations, locations
  Algorithm: 4-category weighted (Fire 40% / Food 30% / Docs 20% / Ops 10%)
  Output: insurance_risk_scores, insurance_risk_factors, insurance_score_history
  Model versioning: NONE
  Immutability: Monthly snapshots only

PATH D: benchmark-snapshot (Edge Function)
  Input: temperature_logs, checklists, documents, benchmark_snapshots
  Algorithm: Simple ratio (in_range/total for temps, completed/total for checklists, count for docs)
  Output: location_benchmark_ranks (recalculated overall_score + percentiles)
  Model versioning: NONE
  Immutability: NONE
```

### VIOLATIONS FOUND

| # | Violation | Severity | Detail |
|---|-----------|----------|--------|
| V1 | **Four independent scoring engines** | CRITICAL | Each calculates scores using different algorithms, weights, and inputs |
| V2 | **No model versioning** on any scoring path | HIGH | Score changes cannot be attributed to algorithm vs data changes |
| V3 | **No immutable snapshots** | HIGH | compliance_score_snapshots has UNIQUE(location_id, score_date) but can be UPSERTed |
| V4 | **Frontend scoring diverges from backend** | HIGH | complianceScoring.ts (50/50 Food/Fire) vs calculate-compliance-score (CalCode deductions) produce different numbers |
| V5 | **Insurance risk recalculates from raw data** | MEDIUM | Does not reference compliance_score_snapshots — calculates its own food_safety_score |
| V6 | **Benchmark snapshot calculates its own overall_score** | MEDIUM | Does not use compliance_score_snapshots.overall_score |
| V7 | **organizations table weights are stale** | LOW | operational_weight=45, equipment_weight=30, documentation_weight=25 — not used by any active code |

### CONSOLIDATION PLAN

**Single Canonical Scoring Authority: `calculate-compliance-score` edge function**

```
CANONICAL PATH (v1.0):
  1. calculate-compliance-score runs (daily cron or on-demand)
  2. Reads: temperature data, checklists, documents, equipment, training
  3. Applies: jurisdiction-specific CalCode model
  4. Writes: compliance_score_snapshots (IMMUTABLE, with model_version)
  5. All derived systems read FROM compliance_score_snapshots

DERIVED SYSTEMS (read-only from snapshot):
  - insurance-risk-calculate → reads snapshot → writes insurance_risk_scores
  - benchmark-snapshot → reads snapshot → writes location_benchmark_ranks
  - location_jurisdiction_scores → reads snapshot → writes jurisdiction grade
  - enterprise-rollup-calculate → reads snapshots → writes rollup scores
  - complianceScoring.ts → DEPRECATED for scoring; kept for color/status helpers only
```

### DEPRECATION PLAN

| System | Action | Timeline |
|--------|--------|----------|
| `complianceScoring.ts` scoring functions | Deprecate `calculateFireSafetyScore()`, `buildTempComplianceItems()`. Keep `getScoreColor()`, `getScoreStatus()`, `getScoreTier()` as display helpers. | Day 1-2 |
| `score_calculations` table | Merge audit data into compliance_score_snapshots metadata column | Day 3 |
| `benchmark_snapshots` table | Drop (replaced by benchmark_aggregates) | Day 4 |
| `organizations.operational_weight/equipment_weight/documentation_weight` | Drop columns or repurpose as org-level pillar weight overrides | Day 5 |

---

## STEP 4 — RISK TRANSLATION LAYER AUDIT

### Current State: FRAGMENTED

```
Insurance Risk (insurance-risk-calculate):
  Fire Risk: 40% → 9 factors (hood, suppression, extinguisher, visual checks, etc.)
  Food Safety: 30% → 9 factors (temp compliance, cooling, checklists, HACCP, etc.)
  Documentation: 20% → 7 factors (COIs, certs, permits, licenses, etc.)
  Operational: 10% → 5 factors (consistency, vendor regularity, equipment, corrective actions, training)

  OUTPUT: insurance_risk_scores (overall_score 0-100, tier, 4 category scores)

  PROBLEM: Calculates its own food_safety_score, fire_risk_score from raw vendor/equipment data.
           Does NOT read from compliance_score_snapshots.
           Different weights than compliance scoring (40/30/20/10 vs 50/50).

Compliance Risk (DOES NOT EXIST):
  No operational risk table.
  No revenue_risk, cost_risk, liability_risk computation.
  No intelligence-correlated risk.

Financial Impact (frontend only):
  src/data/intelligenceData.ts has financial projections (penalties, insurance, incidents, revenue, ROI)
  BUT: These are static demo data, not computed from live scores.
```

### Proposed Canonical Risk Table

```sql
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  score_snapshot_id UUID NOT NULL REFERENCES compliance_score_snapshots(id),

  -- Risk dimensions (all 0-100, higher = more risk)
  revenue_risk REAL NOT NULL DEFAULT 0,
  cost_risk REAL NOT NULL DEFAULT 0,
  liability_risk REAL NOT NULL DEFAULT 0,
  operational_risk REAL NOT NULL DEFAULT 0,

  -- Insurance translation
  insurance_overall REAL,
  insurance_tier TEXT CHECK (insurance_tier IN ('preferred','standard','elevated','high')),

  -- Driver attribution
  drivers_json JSONB NOT NULL DEFAULT '[]',
  -- e.g. [{"driver":"hood_overdue","risk_type":"liability","delta":+12,"source":"compliance"},
  --       {"driver":"outbreak_fresno","risk_type":"liability","delta":+8,"source":"intelligence_insight","ref":"uuid"}]

  -- Intelligence correlation
  intelligence_refs UUID[] DEFAULT '{}',

  -- Reproducibility
  model_version TEXT NOT NULL DEFAULT '1.0',
  inputs_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Risk Derivation Rules

```
revenue_risk = f(score_snapshot.overall_score, intelligence.severity, location.revenue_range)
cost_risk = f(score_snapshot.fire_safety_score, equipment.condition, vendor.overdue_count)
liability_risk = f(score_snapshot.food_safety_score, intelligence.outbreak_proximity, incidents.open_count)
operational_risk = f(staffing.turnover_pct, checklist.completion_rate, training.cert_currency)

insurance_overall = fire_risk * 0.40 + food_safety * 0.30 + docs * 0.20 + ops * 0.10
  WHERE fire_risk, food_safety, docs, ops are derived from score_snapshot pillar scores
  NOT recalculated from raw data
```

---

## STEP 5 — INTELLIGENCE ENGINE AUDIT

### Current State: THREE OVERLAPPING STORES

```
STORE 1: intelligence_insights (Main App)
  - External intelligence from pipeline
  - Status: pending_review → published
  - Categories: recall_alert, outbreak_alert, enforcement_surge, regulatory_change, etc.
  - Fed by: intelligence-collect edge function + intelligence-webhook

STORE 2: ai_insights (Main App)
  - AI-generated proactive alerts
  - Types: pattern, prediction, auto_draft, seasonal, digest
  - Fed by: ai-pattern-analysis, ai-weekly-digest, ai-predictive-alerts, intelligence-webhook

STORE 3: regulatory_changes (Main App)
  - Detected regulatory code changes
  - Types: amendment, new_edition, guidance, enforcement_change
  - Fed by: monitor-regulations edge function

OVERLAP: intelligence-webhook writes to ai_insights for "new_insight" events.
         intelligence_insights has category='regulatory_updates'.
         regulatory_changes tracks the same kind of data.
```

### VIOLATIONS FOUND

| # | Violation | Severity | Detail |
|---|-----------|----------|--------|
| V8 | **Three stores for similar data** | HIGH | intelligence_insights, ai_insights, and regulatory_changes all store "alerts about compliance-relevant events" |
| V9 | **intelligence-webhook writes to ai_insights** | MEDIUM | External intelligence lands in the AI table instead of intelligence_insights |
| V10 | **No deduplication between stores** | MEDIUM | Same regulatory change could exist in both regulatory_changes AND intelligence_insights |
| V11 | **Demo mode queries only intelligence_insights** | LOW | ai_insights and regulatory_changes not surfaced in Intelligence Hub |

### CONSOLIDATION PLAN

**Single normalized intake: `intelligence_insights`**

All intelligence — whether from external crawlers, AI pattern detection, regulatory monitoring, or webhook delivery — enters through `intelligence_insights` with a `source_type` discriminator:

```
source_type VALUES:
  'external_crawl'       -- from intelligence-collect
  'ai_pattern'           -- from ai-pattern-analysis (replaces ai_insights type='pattern')
  'ai_prediction'        -- from ai-predictive-alerts (replaces ai_insights type='prediction')
  'ai_digest'            -- from ai-weekly-digest (replaces ai_insights type='digest')
  'ai_draft'             -- from ai-corrective-action-draft (replaces ai_insights type='auto_draft')
  'regulatory_monitor'   -- from monitor-regulations (replaces regulatory_changes)
  'webhook_inbound'      -- from intelligence-webhook
  'manual'               -- from intelligence-approve create action
```

**Migration path:**
1. Add `source_type` column to `intelligence_insights` (default 'external_crawl')
2. intelligence-webhook: write to `intelligence_insights` instead of `ai_insights`
3. ai-pattern-analysis: write to `intelligence_insights` with source_type='ai_pattern'
4. monitor-regulations: write to `intelligence_insights` with source_type='regulatory_monitor'
5. Deprecate direct writes to `ai_insights` and `regulatory_changes`
6. Create views for backward compatibility if needed

### Existing Correct Behaviors

- Deduplication on `source_url` in intelligence-collect: CORRECT
- Approval workflow (pending_review → published): CORRECT
- Demo mode queries DB first, falls back to static: CORRECT
- RLS: published-only for non-service-role: CORRECT

---

## STEP 6 — CORRELATION ENGINE VALIDATION

### Current State: NO DETERMINISTIC CORRELATION

```
Intelligence Project has:
  - intelligence_correlations table (6 types: outbreak_recall, weather_violation, seasonal_pattern, etc.)
  - Correlation types defined in schema
  - BUT: No evidence of automated correlation rules running

Main App has:
  - StaffingCorrelation component (frontend-only, demo data)
  - AnomalyDetector component (frontend-only, demo data)
  - risk-prediction edge function (ML inference)
  - staffing-correlations edge function (daily cron)
  - anomaly-scan edge function (hourly cron)
  - BUT: None of these write back to compliance_score_snapshots or risk_assessments

MISSING:
  - No rule: outbreak_alert.affected_counties INTERSECT location.county → raise liability_risk
  - No rule: weather_risk.affected_counties INTERSECT location.county → raise operational_risk
  - No rule: regulatory_change.affected_pillars → flag affected score_snapshot metrics
  - No rule: inspector_pattern.focus_areas → weight compliance_score components
```

### Proposed Deterministic Correlation Rules

```
RULE 1: OUTBREAK → LIABILITY
  WHEN outbreak_alert.status = 'active'
    AND outbreak_alert.affected_states CONTAINS location.state
    AND (outbreak_alert.affected_counties IS NULL
         OR outbreak_alert.affected_counties INTERSECT location_jurisdiction_profiles.county)
  THEN risk_assessments.liability_risk += severity_weight(outbreak_alert.severity)
    AND risk_assessments.drivers_json APPEND {driver: 'active_outbreak', ref: outbreak_alert.id}

RULE 2: RECALL → FOOD SAFETY
  WHEN recall_alert.status = 'ongoing'
    AND recall_alert.classification = 'Class I'
    AND recall_alert.affected_states CONTAINS location.state
  THEN risk_assessments.cost_risk += 15
    AND notify location managers

RULE 3: WEATHER → OPERATIONAL
  WHEN weather_risk_event.status = 'active'
    AND weather_risk_event.affected_counties INTERSECT location.county
    AND weather_risk_event.weather_type IN ('heat_wave', 'power_outage')
  THEN risk_assessments.operational_risk += severity_weight(weather_risk_event.severity)

RULE 4: ENFORCEMENT SURGE → INSPECTION PREP
  WHEN intelligence_insight.category = 'enforcement_surge'
    AND intelligence_insight.affected_counties INTERSECT location.county
  THEN flag location for inspection prep
    AND risk_assessments.liability_risk += 10

RULE 5: INSPECTOR PATTERN → CHECKLIST WEIGHT
  WHEN inspector_pattern.jurisdiction = location.county
    AND inspector_pattern.pattern_type = 'focus_area'
  THEN highlight matching checklist items
    AND add to risk_assessments.drivers_json

RULE 6: REGULATORY CHANGE → COMPLIANCE GAP
  WHEN regulatory_change.status IN ('signed', 'chaptered')
    AND regulatory_change.effective_date <= NOW() + INTERVAL '90 days'
    AND regulatory_change.affected_pillars INTERSECT location compliance pillars
  THEN create compliance_gap entry
    AND risk_assessments.operational_risk += compliance_impact_weight(regulatory_change.compliance_impact)
```

### Implementation

New edge function: `correlation-engine` (daily, after intelligence-collect)

```
1. Fetch all active intelligence events (outbreaks, recalls, weather, enforcement surges)
2. For each active location:
   a. Match geographic overlap (county, state)
   b. Apply deterministic rules above
   c. Compute risk deltas
   d. Write to risk_assessments with intelligence_refs
3. Expire stale correlations (resolved outbreaks, terminated recalls)
```

---

## STEP 7 — MODULE GOVERNANCE

### Audit Results: NO VIOLATIONS

| Module | Separate Scoring Engine? | Uses Core Compliance? | Creates New Tables? | Status |
|--------|------------------------|----------------------|--------------------|----|
| **K-12 / Education** | NO | YES (template only) | NO | CLEAN |
| **USDA** | NO | YES (recall monitoring only) | NO | CLEAN |
| **Healthcare** | NO | YES (template only) | NO | CLEAN |
| **SB1383** | NO | YES (jurisdiction rule) | NO | CLEAN |
| **CMS** | NOT IMPLEMENTED | N/A | N/A | N/A |
| **Joint Commission** | NOT IMPLEMENTED | N/A | N/A | N/A |
| **NFPA Fire Safety** | NO — integrated into 2-pillar model | YES | Uses `equipment` table | CLEAN |

**Key finding:** All modules operate through configuration (industry templates, jurisdiction engine, regulatory monitor) rather than code. No module creates a parallel scoring path. This is the correct architecture.

**Governance rule for future modules:**
```
EVERY new module MUST:
  1. Define its requirements in industryTemplates.ts or jurisdictionEngine.ts
  2. Map its violations to violation_code_mappings
  3. Feed data through existing compliance capture (checklists, temp logs, documents)
  4. Use calculate-compliance-score for scoring
  5. Add correlation rules to correlation-engine (NOT new scoring)
  6. NEVER create a new *_scores table
```

---

## STEP 8 — DERIVED VS CANONICAL ENFORCEMENT

| Table | Classification | References Canonical Snapshot? | Action Required |
|-------|---------------|-------------------------------|-----------------|
| `compliance_score_snapshots` | **CANONICAL** | Self (is the snapshot) | Add model_version, inputs_hash |
| `score_calculations` | **TO-BE-MERGED** | NO | Merge into compliance_score_snapshots |
| `insurance_risk_scores` | **DERIVED** (currently Canonical) | **NO — VIOLATION** | Must add score_snapshot_id FK, derive from snapshot |
| `insurance_risk_factors` | **DERIVED** | NO (references insurance_risk_scores) | Add score_snapshot_id FK |
| `insurance_score_history` | **DERIVED** | NO | Add score_snapshot_id FK |
| `location_jurisdiction_scores` | **DERIVED** | NO — recalculates evidly_score | Must reference compliance_score_snapshots.id |
| `benchmark_aggregates` | **DERIVED** | Indirectly (aggregates from snapshots) | OK as-is |
| `location_benchmark_ranks` | **DERIVED** | **NO — recalculates overall_score** | Must use snapshot.overall_score, add score_snapshot_id FK |
| `benchmark_snapshots` | **DEPRECATED** | NO | Drop table |
| `benchmark_badges` | **DERIVED** | Indirectly (from rank history) | OK as-is |
| `enterprise_rollup_scores` | **DERIVED** | Reads child snapshots | OK as-is, verify FK chain |
| `ai_insights` | **TO-BE-MERGED** | N/A | Migrate to intelligence_insights with source_type |
| `regulatory_changes` | **TO-BE-MERGED** | N/A | Migrate to intelligence_insights with source_type |

---

## STEP 9 — FINAL v1.0 ARCHITECTURE

### Canonical Data Model

```
                    ┌──────────────────┐
                    │  organizations   │
                    │  (weights, tier) │
                    └────────┬─────────┘
                             │ 1:N
                    ┌────────▼─────────┐
                    │    locations     │
                    │ (address, state) │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼────┐  ┌─────▼──────┐  ┌───▼───────────────┐
    │ jurisdiction  │  │ CANONICAL  │  │ intelligence      │
    │ _profiles     │  │ score      │  │ _insights         │
    │ (auto-detect) │  │ _snapshots │  │ (all sources,     │
    └───────────────┘  │            │  │  single store)    │
                       │ model_ver  │  └─────────┬─────────┘
                       │ inputs_hash│            │
                       │ immutable  │            │
                       └─────┬──────┘            │
                             │                   │
              ┌──────────────┼──────────────┐    │
              │              │              │    │
    ┌─────────▼────┐  ┌─────▼──────┐  ┌───▼───▼───────────┐
    │ jurisdiction  │  │ insurance  │  │ risk_assessments   │
    │ _scores       │  │ _risk      │  │ (unified risk,     │
    │ (DERIVED)     │  │ _scores    │  │  intelligence refs,│
    │ FK→snapshot   │  │ (DERIVED)  │  │  model_version)    │
    └───────────────┘  │ FK→snapshot│  └───────────────────┘
                       └────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼────┐  ┌─────▼──────┐  ┌───▼───────────────┐
    │ benchmark     │  │ benchmark  │  │ enterprise        │
    │ _ranks        │  │ _aggregates│  │ _rollup_scores    │
    │ (DERIVED)     │  │ (DERIVED)  │  │ (DERIVED)         │
    │ FK→snapshot   │  └────────────┘  └───────────────────┘
    └───────────────┘
```

### Authoritative Write Paths

| Writer | Target | Frequency | Authority |
|--------|--------|-----------|-----------|
| `calculate-compliance-score` | `compliance_score_snapshots` | Daily + on-demand | **SOLE scoring authority** |
| `insurance-risk-calculate` | `insurance_risk_scores` | Daily | Derives FROM snapshot |
| `benchmark-snapshot` | `location_benchmark_ranks` | Daily | Derives FROM snapshot |
| `correlation-engine` (NEW) | `risk_assessments` | Daily | Derives FROM snapshot + intelligence |
| `intelligence-collect` | `intelligence_insights` | Daily | Canonical intelligence intake |
| `intelligence-approve` | `intelligence_insights` (status) | On-demand | Admin approval |
| `ai-pattern-analysis` | `intelligence_insights` | Daily | source_type='ai_pattern' |
| `monitor-regulations` | `intelligence_insights` | Daily | source_type='regulatory_monitor' |
| `enterprise-rollup-calculate` | `enterprise_rollup_scores` | Daily | Derives FROM snapshots |

### Derived View Model

```
Frontend reads:
  - compliance_score_snapshots → pillar scores, overall score, operational metrics
  - risk_assessments → unified risk with drivers and intelligence refs
  - intelligence_insights → all alerts (external, AI, regulatory) in one feed
  - location_benchmark_ranks → percentile positioning
  - executive_snapshots → board-ready briefings

Frontend NEVER calculates:
  - Overall scores (reads from snapshot)
  - Risk tiers (reads from risk_assessments)
  - Jurisdiction grades (reads from location_jurisdiction_scores)
```

### Deprecation List

| Item | Type | Action | Risk |
|------|------|--------|------|
| `benchmark_snapshots` table | Table | DROP | None — superseded by benchmark_aggregates |
| `score_calculations` table | Table | Merge into compliance_score_snapshots | Low — audit data moves |
| `ai_insights` direct writes | Write path | Redirect to intelligence_insights | Medium — 6 edge functions affected |
| `regulatory_changes` direct writes | Write path | Redirect to intelligence_insights | Low — 1 edge function affected |
| `complianceScoring.ts` scoring functions | Frontend | Deprecate calculation functions, keep display helpers | Medium — demo mode uses these |
| `organizations.operational_weight` | Column | Drop or repurpose | Low — not referenced |
| `organizations.equipment_weight` | Column | Drop or repurpose | Low — not referenced |
| `organizations.documentation_weight` | Column | Drop or repurpose | Low — not referenced |

### Migration Plan

**Phase 1: Score Snapshot Hardening (Day 1-2)**
```sql
ALTER TABLE compliance_score_snapshots
  ADD COLUMN model_version TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN scoring_engine TEXT NOT NULL DEFAULT 'calculate-compliance-score',
  ADD COLUMN inputs_hash TEXT;
```

**Phase 2: FK Chain (Day 2-3)**
```sql
ALTER TABLE insurance_risk_scores
  ADD COLUMN score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

ALTER TABLE location_jurisdiction_scores
  ADD COLUMN score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

ALTER TABLE location_benchmark_ranks
  ADD COLUMN score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);
```

**Phase 3: Intelligence Consolidation (Day 3-4)**
```sql
ALTER TABLE intelligence_insights
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'external_crawl'
  CHECK (source_type IN ('external_crawl','ai_pattern','ai_prediction','ai_digest','ai_draft','regulatory_monitor','webhook_inbound','manual'));
```
Update edge functions: intelligence-webhook, ai-pattern-analysis, ai-predictive-alerts, ai-weekly-digest, ai-corrective-action-draft, monitor-regulations.

**Phase 4: Risk Assessment Table (Day 4-5)**
Create `risk_assessments` table. Create `correlation-engine` edge function.

**Phase 5: Derived System Updates (Day 5-6)**
- `insurance-risk-calculate`: read from compliance_score_snapshots, write score_snapshot_id
- `benchmark-snapshot`: use compliance_score_snapshots.overall_score, write score_snapshot_id
- `location_jurisdiction_scores`: reference compliance_score_snapshots.id

**Phase 6: Cleanup (Day 7)**
- Drop `benchmark_snapshots` table
- Merge `score_calculations` data into compliance_score_snapshots
- Drop stale organization weight columns
- Deprecate frontend scoring calculation functions

### Risk of Regression

| Change | Regression Risk | Mitigation |
|--------|----------------|------------|
| Score snapshot schema change | LOW | Additive columns only, defaults provided |
| FK additions to derived tables | LOW | Nullable FKs, backfill via migration |
| Intelligence consolidation | MEDIUM | Create compatibility views for ai_insights reads |
| Risk assessment table | LOW | New table, no existing code affected |
| Frontend scoring deprecation | MEDIUM | Keep display helpers, only deprecate calculation |
| Edge function write path changes | MEDIUM | Deploy one function at a time, monitor for errors |

### 7-Day Implementation Plan

| Day | Tasks | Risk | Verification |
|-----|-------|------|-------------|
| **1** | Add model_version + inputs_hash to compliance_score_snapshots. Add source_type to intelligence_insights. | LOW | Run calculate-compliance-score, verify new columns populated |
| **2** | Add score_snapshot_id FK to insurance_risk_scores, location_jurisdiction_scores, location_benchmark_ranks (nullable). | LOW | Verify existing queries still work with nullable FK |
| **3** | Update intelligence-webhook to write to intelligence_insights instead of ai_insights. Update ai-pattern-analysis to write source_type='ai_pattern'. | MEDIUM | Verify Intelligence Hub displays all sources |
| **4** | Create risk_assessments table + correlation-engine edge function (deterministic rules). | LOW | Run correlation-engine on test data |
| **5** | Update insurance-risk-calculate to read from compliance_score_snapshots. Update benchmark-snapshot to use snapshot.overall_score. | MEDIUM | Compare old vs new scores for drift |
| **6** | Create compatibility views. Update frontend to read from intelligence_insights unified feed. | MEDIUM | Full UI regression test |
| **7** | Drop benchmark_snapshots. Merge score_calculations. Drop stale org columns. Deploy. | LOW | Full deployment + smoke test |

---

## DEPLOYMENT ORDER

```
1. Migration: compliance_score_snapshots schema (additive)
2. Migration: intelligence_insights source_type column (additive)
3. Migration: FK columns on derived tables (nullable, additive)
4. Deploy: intelligence-webhook (updated write target)
5. Deploy: ai-pattern-analysis (updated write target)
6. Migration: risk_assessments table (new)
7. Deploy: correlation-engine (new function)
8. Deploy: insurance-risk-calculate (reads snapshot)
9. Deploy: benchmark-snapshot (reads snapshot)
10. Migration: Drop benchmark_snapshots
11. Migration: Merge score_calculations
12. Migration: Drop stale org weight columns
```

All migrations are additive or dropping unused objects. No destructive changes to live data paths until step 10+.

---

## CANONICAL VIOLATIONS SUMMARY

| # | Violation | Category | Status |
|---|-----------|----------|--------|
| V1 | Four independent scoring engines | Scoring | FIX: Consolidate to calculate-compliance-score as sole authority |
| V2 | No model versioning | Scoring | FIX: Add model_version to compliance_score_snapshots |
| V3 | No immutable snapshots | Scoring | FIX: Add is_immutable flag, prevent UPSERT overwrites |
| V4 | Frontend scoring diverges from backend | Scoring | FIX: Deprecate frontend calculation, keep display helpers |
| V5 | Insurance risk recalculates from raw data | Risk | FIX: Derive from compliance_score_snapshots |
| V6 | Benchmark recalculates overall_score | Benchmark | FIX: Use compliance_score_snapshots.overall_score |
| V7 | Stale organization weight columns | Schema | FIX: Drop or repurpose |
| V8 | Three intelligence stores | Intelligence | FIX: Consolidate into intelligence_insights with source_type |
| V9 | Webhook writes to wrong table | Intelligence | FIX: Write to intelligence_insights |
| V10 | No deduplication between stores | Intelligence | FIX: Single store eliminates cross-store duplication |
| V11 | No correlation bridge | Correlation | FIX: New correlation-engine with deterministic rules |
| V12 | Derived tables lack FK to canonical snapshot | Schema | FIX: Add score_snapshot_id to all derived scoring tables |
