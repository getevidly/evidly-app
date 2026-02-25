# EvidLY v1.0 — Consolidated Architecture Implementation Plan

**Date:** 2026-02-25
**Extends:** ARCHITECTURE_REVIEW_v1.md (12 violations identified)
**Scope:** Full codebase audit (96 edge functions, 37+ DB tables, 6+ frontend scoring libs, JIE pipeline, reporting, SEO)

---

## 1. GAP ANALYSIS — What the Initial Audit Missed

### Gap G1: compliance_score_snapshots Is a Dead Table

**CRITICAL.** The initial audit assumed `compliance_score_snapshots` was the canonical scoring table. In reality, **no edge function writes to it**. The sole scoring authority `calculate-compliance-score` writes to `score_calculations` only. The snapshots table exists in the schema but has no writer — it is structurally dead.

- `calculate-compliance-score` → writes `score_calculations`
- `compliance_score_snapshots` → no writer exists
- All references to "score snapshot" in the initial audit must be redirected to either:
  - (a) Make `calculate-compliance-score` write to `compliance_score_snapshots`, or
  - (b) Promote `score_calculations` to the canonical snapshot role

**Recommendation:** Option (a). Add a write to `compliance_score_snapshots` at the end of `calculate-compliance-score`. The `score_calculations` table becomes the audit trail; `compliance_score_snapshots` becomes the canonical daily snapshot.

### Gap G2: Fifth Scoring Engine — sensor-compliance-aggregate

The initial audit identified 4 independent scoring engines. There is a **5th**:

| # | Engine | Output Table |
|---|--------|-------------|
| 5 | `sensor-compliance-aggregate` | `location_compliance_scores` |

This edge function (runs every 15 min) calculates `temp_compliance_rate` and `data_completeness_score` per location from IoT sensor readings + manual temp logs. It writes to `location_compliance_scores` via UPSERT on `location_id`. No FK to any canonical scoring table.

### Gap G3: Additional Intelligence Stores (5, Not 3)

The initial audit found 3 overlapping intelligence stores. The full count is **5**:

| # | Table | Purpose | Writer(s) |
|---|-------|---------|-----------|
| 1 | `intelligence_insights` | External intelligence pipeline | intelligence-collect, intelligence-approve |
| 2 | `ai_insights` | AI-generated proactive alerts | ai-pattern-analysis, intelligence-webhook |
| 3 | `regulatory_changes` | Detected regulatory code changes | monitor-regulations |
| 4 | `ai_corrective_actions` | AI-drafted corrective actions | ai-corrective-action-draft |
| 5 | `ai_weekly_digests` | Weekly digest summaries | ai-weekly-digest |

Tables 4 and 5 are derivative (generated from analysis of other data) but still store intelligence-adjacent content that could live as source_types within `intelligence_insights`.

### Gap G4: Report Generators Compute Scores Independently

**5 report generators** exist, each computing or sourcing scores independently:

| Report Generator | Location | Score Source | Canonical? |
|-----------------|----------|-------------|-----------|
| `reportGenerator.ts` | Frontend lib | `locationScores` from demoData + `calculateJurisdictionScore()` | NO — demo data |
| `generate-compliance-package` | Edge function | Document status counts (no scores) | N/A |
| `playbook-report-generator` | Edge function | Reads from incident data, generates 4 report types | NO — independent |
| `benchmark-quarterly-report` | Edge function | Industry-wide aggregates via Claude AI | NO — AI-generated |
| `enterprise-report-generate` | Edge function | Reads enterprise_rollup_scores | Partially — reads derived table |

**Key violation:** `reportGenerator.ts` uses `locationScores` from static demo data and `calculateJurisdictionScore()` from frontend jurisdiction lib — it does NOT read from any canonical DB table.

### Gap G5: Enterprise Rollup Uses Stale Column Names

`enterprise-rollup-calculate` reads/writes `equipment_score` and `documentation_score` columns in `enterprise_rollup_scores`. These map to the old 3-pillar model (operational/equipment/documentation). The current 2-pillar model is Food Safety + Fire Safety. No FK to `compliance_score_snapshots`.

### Gap G6: Compliance Package Has No PDF Export

`generate-compliance-package` returns a JSON manifest with document status summaries and a share token. The comment says "PDF generation would use a library like pdf-lib" — TODO. No actual compliance pack artifact is generated.

### Gap G7: No Public SEO Jurisdiction Pages

All routes are authentication-gated. No public `/county/:slug` or `/jurisdiction/:id` pages exist. The JIE has 52 validated county JSON files (out of 58 CA counties + 4 independent cities + 1 federal), but this data is not exposed through any public-facing routes. `JurisdictionSettings.tsx` is admin-only.

### Gap G8: Jurisdiction Data Flow Is Incomplete

JIE data pipeline:
```
scripts/jie/ → crawl_all_states.py → jurisdiction_crawl.py → JSON files
  → push_to_supabase.mjs → REST PATCH to jurisdictions table
```

52 of 63 CA jurisdictions crawled and validated. 10 with ERROR status (Berkeley, Long Beach, Pasadena, Vernon, NPS, Santa Barbara, Tuolumne, Ventura, Yolo, Yuba). The data is structured (grading_system, inspection_details, fire_safety_authority, regulatory_framework) but the loading script patches the `jurisdictions` table — no versioning, no change tracking on jurisdiction data updates.

---

## 2. UPDATED VIOLATION LIST

### Original Violations (V1-V12) — Status Updated

| # | Violation | Initial Severity | Updated Status |
|---|-----------|-----------------|----------------|
| V1 | Four independent scoring engines | CRITICAL | **UPGRADED: FIVE engines** (sensor-compliance-aggregate is 5th) |
| V2 | No model versioning | HIGH | Confirmed — no engine uses model_version |
| V3 | No immutable snapshots | HIGH | **UPGRADED: compliance_score_snapshots has no writer** |
| V4 | Frontend scoring diverges from backend | HIGH | Confirmed — 50/50 Food/Fire vs CalCode deduction |
| V5 | Insurance risk recalculates from raw data | MEDIUM | Confirmed — no FK to score_calculations or snapshots |
| V6 | Benchmark recalculates overall_score | MEDIUM | Confirmed |
| V7 | Stale organization weight columns | LOW | Confirmed — operational_weight=45, equipment_weight=30, documentation_weight=25 |
| V8 | Three intelligence stores | HIGH | **UPGRADED: FIVE stores** (ai_corrective_actions, ai_weekly_digests) |
| V9 | Webhook writes to wrong table | MEDIUM | Confirmed — writes ai_insights instead of intelligence_insights |
| V10 | No deduplication between stores | MEDIUM | Confirmed |
| V11 | No correlation bridge | HIGH | Confirmed |
| V12 | Derived tables lack FK to canonical snapshot | HIGH | **UPGRADED: Canonical snapshot table has no writer** |

### New Violations (V13-V20)

| # | Violation | Severity | Detail |
|---|-----------|----------|--------|
| V13 | **Fifth scoring engine: sensor-compliance-aggregate** | HIGH | Writes temp_compliance_rate to location_compliance_scores independently |
| V14 | **compliance_score_snapshots is dead** | CRITICAL | No edge function writes to this table — the "canonical" table has no data |
| V15 | **Report generators compute scores independently** | MEDIUM | reportGenerator.ts uses demo data; playbook-report-generator, benchmark-quarterly-report each source scores differently |
| V16 | **Enterprise rollup uses stale 3-pillar column names** | MEDIUM | equipment_score, documentation_score — does not match current 2-pillar model |
| V17 | **ai_corrective_actions and ai_weekly_digests are additional intelligence stores** | LOW | Generated content that could be source_types in intelligence_insights |
| V18 | **No compliance pack export** | MEDIUM | generate-compliance-package returns JSON stub only, no PDF |
| V19 | **No jurisdiction data versioning** | LOW | JIE PATCH updates overwrite without history |
| V20 | **No public SEO jurisdiction pages** | MEDIUM | 52 validated jurisdiction datasets with no public exposure |

### Total: 20 Violations (12 original + 8 new)

---

## 3. CANONICAL DATA MODEL

### Entity List

| Entity | Canonical Table | Status | Required Changes |
|--------|---------------|--------|-----------------|
| **Organization** | `organizations` | EXISTS | Drop stale weight columns (V7) |
| **Location** | `locations` | EXISTS | None |
| **Jurisdiction** | `jurisdictions` + `location_jurisdictions` | EXISTS | Add version tracking (V19) |
| **Score Snapshot** | `compliance_score_snapshots` | DEAD (V14) | Wire `calculate-compliance-score` to write here |
| **Score Audit** | `score_calculations` | EXISTS | Demote to audit trail only |
| **Risk Assessment** | `risk_assessments` | DOES NOT EXIST | Create table |
| **Intelligence Event** | `intelligence_insights` | EXISTS | Add source_type discriminator |
| **Executive Snapshot** | `executive_snapshots` | EXISTS | None |
| **Subscription** | `intelligence_subscriptions` | EXISTS | None |

### Relationships (Text Diagram)

```
                    ┌──────────────────┐
                    │  organizations   │
                    └────────┬─────────┘
                             │ 1:N
                    ┌────────▼─────────┐
                    │    locations     │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────────┐
              │              │                  │
    ┌─────────▼────┐  ┌─────▼──────────┐  ┌───▼───────────────┐
    │ location_    │  │ compliance_    │  │ intelligence     │
    │ jurisdictions│  │ score_         │  │ _insights        │
    │ (multi-layer)│  │ snapshots      │  │ (single store,   │
    └──────────────┘  │ *** CANONICAL  │  │  all source_types│
                      │ model_version  │  │  pending→publish)│
                      │ scoring_engine │  └────────┬─────────┘
                      │ inputs_hash    │           │
                      │ IMMUTABLE      │           │
                      └───────┬────────┘           │
                              │                    │
           ┌──────────────────┼─────────────┐      │
           │                  │             │      │
  ┌────────▼──────┐  ┌───────▼────┐  ┌─────▼──────▼──────┐
  │ location_     │  │ insurance_ │  │ risk_assessments  │
  │ jurisdiction_ │  │ risk_      │  │ (unified risk,    │
  │ scores        │  │ scores     │  │  intelligence     │
  │ FK→snapshot   │  │ FK→snapshot│  │  refs, drivers)   │
  └───────────────┘  └────────────┘  └───────────────────┘
                              │
           ┌──────────────────┼─────────────┐
           │                  │             │
  ┌────────▼──────┐  ┌───────▼────┐  ┌─────▼─────────────┐
  │ location_     │  │ benchmark_ │  │ enterprise_       │
  │ benchmark_    │  │ aggregates │  │ rollup_scores     │
  │ ranks         │  │ (DERIVED)  │  │ FK→snapshot       │
  │ FK→snapshot   │  └────────────┘  └───────────────────┘
  └───────────────┘

  ┌───────────────────────────────────────┐
  │ score_calculations (AUDIT TRAIL)     │
  │ Detailed per-item scoring breakdown  │
  │ FK→snapshot                          │
  └───────────────────────────────────────┘
```

---

## 4. AUTHORITATIVE WRITE PATHS

| Writer | Target Table | Frequency | Authority | Changes Needed |
|--------|-------------|-----------|-----------|---------------|
| `calculate-compliance-score` | `compliance_score_snapshots` | Daily + on-demand | **SOLE scoring authority** | **ADD write to snapshots** (V14 fix) |
| `calculate-compliance-score` | `score_calculations` | Daily + on-demand | Audit trail | Add FK to snapshot |
| `insurance-risk-calculate` | `insurance_risk_scores` | Daily 4am UTC | Derived FROM snapshot | **Change: read from snapshot, not raw data** (V5 fix) |
| `benchmark-snapshot` | `location_benchmark_ranks` | Daily | Derived FROM snapshot | **Change: use snapshot.overall_score** (V6 fix) |
| `sensor-compliance-aggregate` | `location_compliance_scores` | Every 15 min | **DEMOTE to operational metric** | Add FK to snapshot; do not use for scoring (V13 fix) |
| `enterprise-rollup-calculate` | `enterprise_rollup_scores` | On-demand | Derived FROM snapshots | **Change: read snapshots, update column names** (V16 fix) |
| `correlation-engine` (NEW) | `risk_assessments` | Daily | Derived FROM snapshot + intelligence | Create new function (V11 fix) |
| `intelligence-collect` | `intelligence_insights` | Daily 6am PT | Canonical intelligence intake | Add source_type='external_crawl' |
| `intelligence-approve` | `intelligence_insights` (status) | On-demand | Admin approval | None |
| `intelligence-webhook` | `intelligence_insights` | On event | Webhook intake | **Change: write to intelligence_insights** (V9 fix) |
| `ai-pattern-analysis` | `intelligence_insights` | Daily | source_type='ai_pattern' | **Change: write target** |
| `ai-weekly-digest` | `intelligence_insights` | Weekly | source_type='ai_digest' | **Change: write target** |
| `ai-corrective-action-draft` | `intelligence_insights` | On-demand | source_type='ai_draft' | **Change: write target** |
| `monitor-regulations` | `intelligence_insights` | Daily | source_type='regulatory_monitor' | **Change: write target** |
| `generate-executive-snapshot` | `executive_snapshots` | On-demand | Executive briefing | None |

---

## 5. DERIVED VIEW MODEL

### How Derived Systems Read Canonical Data

```
FRONTEND READS:
  Dashboard
    → compliance_score_snapshots (pillar scores, overall, trend)
    → risk_assessments (unified risk with drivers)
    → intelligence_insights (all alerts, single feed)

  Insurance Module
    → insurance_risk_scores (derived FROM snapshot)
    → insurance_risk_factors (per-factor detail)

  Benchmarks
    → location_benchmark_ranks (percentile FROM snapshot)
    → benchmark_aggregates (peer comparison)

  Enterprise
    → enterprise_rollup_scores (weighted avg FROM child snapshots)

  Reports
    → compliance_score_snapshots (canonical source for ALL reports)
    → score_calculations (audit detail if needed)

  Intelligence Hub
    → intelligence_insights (unified: external, AI, regulatory)
    → executive_snapshots (board-ready briefings)

FRONTEND NEVER CALCULATES:
  - Overall scores (reads from snapshot)
  - Risk tiers (reads from risk_assessments)
  - Jurisdiction grades (reads from location_jurisdiction_scores)
  - Insurance tier classification (reads from insurance_risk_scores.tier)
```

### Display Helpers Kept (Not Deprecated)

These frontend functions are retained as display-only utilities:
- `getScoreColor(score)` — color for score badge
- `getScoreStatus(score)` — text label (Excellent/Good/Needs Attention/Critical)
- `getScoreTier(score)` — tier classification
- `getInsuranceTier(score)` — tier label + color
- `extractCountySlug(county)` — URL slug helper
- `getCountyProfile(slug)` — display profile for county

---

## 6. DEPRECATION LIST

### Tables

| Table | Action | Reason | Risk |
|-------|--------|--------|------|
| `benchmark_snapshots` | DROP | Superseded by `benchmark_aggregates` | None — unused |
| `ai_insights` | DEPRECATE (create view) | Consolidated into `intelligence_insights` with source_type | Medium — 6 edge functions + frontend reads |
| `regulatory_changes` | DEPRECATE (create view) | Consolidated into `intelligence_insights` with source_type='regulatory_monitor' | Low — 1 edge function |
| `ai_corrective_actions` | DEPRECATE (create view) | Consolidated into `intelligence_insights` with source_type='ai_draft' | Low |
| `ai_weekly_digests` | DEPRECATE (create view) | Consolidated into `intelligence_insights` with source_type='ai_digest' | Low |

### Columns

| Table.Column | Action | Reason |
|-------------|--------|--------|
| `organizations.operational_weight` | DROP | Not used by any active code |
| `organizations.equipment_weight` | DROP | Not used by any active code |
| `organizations.documentation_weight` | DROP | Not used by any active code |
| `enterprise_rollup_scores.equipment_score` | RENAME → `fire_safety_score` | Stale 3-pillar name |
| `enterprise_rollup_scores.documentation_score` | RENAME → `food_safety_score` | Stale 3-pillar name |

### Frontend Code

| File | Function(s) | Action | Reason |
|------|-----------|--------|--------|
| `src/lib/complianceScoring.ts` | `calculateFireSafetyScore()`, `buildTempComplianceItems()`, `computeComplianceScore()` | DEPRECATE | Frontend must read from DB, not calculate |
| `src/lib/complianceScoring.ts` | `getScoreColor()`, `getScoreStatus()`, `getScoreTier()` | KEEP | Display helpers only |
| `src/lib/insuranceRiskScore.ts` | `calculateInsuranceRisk()`, all factor functions | DEPRECATE | Frontend must read from `insurance_risk_scores` |
| `src/lib/insuranceRiskScore.ts` | `getInsuranceTier()`, tier display helpers | KEEP | Display helpers only |
| `src/lib/benchmarkEngine.ts` | All calculation functions | DEPRECATE | Frontend must read from `location_benchmark_ranks` |
| `src/lib/benchmarkBadges.ts` | All calculation functions | DEPRECATE | Frontend must read from DB |
| `src/lib/reportGenerator.ts` | Score generation from demo data | REWRITE | Must read from `compliance_score_snapshots` |

### Edge Functions

| Function | Action | Reason |
|----------|--------|--------|
| `sensor-compliance-aggregate` | DEMOTE | Operational metric only; must not be treated as scoring |
| None to remove | — | All 96 functions serve distinct purposes |

---

## 7. SCHEMA CHANGES REQUIRED

### Phase 1 — Score Snapshot Activation (V14 fix)

```sql
-- Make compliance_score_snapshots the canonical scoring table
-- Add columns for model versioning and immutability
ALTER TABLE compliance_score_snapshots
  ADD COLUMN IF NOT EXISTS model_version TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS scoring_engine TEXT NOT NULL DEFAULT 'calculate-compliance-score',
  ADD COLUMN IF NOT EXISTS inputs_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN NOT NULL DEFAULT true;

-- Add FK from score_calculations to snapshot
ALTER TABLE score_calculations
  ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES compliance_score_snapshots(id);

-- Create index for fast snapshot lookups
CREATE INDEX IF NOT EXISTS idx_score_snapshots_location_date
  ON compliance_score_snapshots(location_id, score_date DESC);
```

### Phase 2 — FK Chain for Derived Tables (V12 fix)

```sql
ALTER TABLE insurance_risk_scores
  ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

ALTER TABLE location_jurisdiction_scores
  ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

ALTER TABLE location_benchmark_ranks
  ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

ALTER TABLE location_compliance_scores
  ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

ALTER TABLE enterprise_rollup_scores
  ADD COLUMN IF NOT EXISTS score_snapshot_id UUID REFERENCES compliance_score_snapshots(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_risk_snapshot ON insurance_risk_scores(score_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_scores_snapshot ON location_jurisdiction_scores(score_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_ranks_snapshot ON location_benchmark_ranks(score_snapshot_id);
```

### Phase 3 — Intelligence Consolidation (V8 fix)

```sql
ALTER TABLE intelligence_insights
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'external_crawl'
  CHECK (source_type IN (
    'external_crawl',
    'ai_pattern',
    'ai_prediction',
    'ai_digest',
    'ai_draft',
    'ai_corrective',
    'regulatory_monitor',
    'webhook_inbound',
    'manual'
  ));

-- Index for source_type filtering
CREATE INDEX IF NOT EXISTS idx_intel_insights_source_type ON intelligence_insights(source_type);

-- Backward-compatible view for ai_insights reads
CREATE OR REPLACE VIEW ai_insights_v AS
  SELECT * FROM intelligence_insights
  WHERE source_type IN ('ai_pattern', 'ai_prediction', 'ai_digest', 'ai_draft', 'ai_corrective');

-- Backward-compatible view for regulatory_changes reads
CREATE OR REPLACE VIEW regulatory_changes_v AS
  SELECT * FROM intelligence_insights
  WHERE source_type = 'regulatory_monitor';
```

### Phase 4 — Risk Assessments Table (V11 fix)

```sql
CREATE TABLE IF NOT EXISTS risk_assessments (
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

  -- Explainable drivers
  drivers_json JSONB NOT NULL DEFAULT '[]',

  -- Intelligence correlation
  intelligence_refs UUID[] DEFAULT '{}',

  -- Reproducibility
  model_version TEXT NOT NULL DEFAULT '1.0',
  inputs_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_assessments_location ON risk_assessments(location_id, created_at DESC);
CREATE INDEX idx_risk_assessments_snapshot ON risk_assessments(score_snapshot_id);

-- RLS
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org risk assessments"
  ON risk_assessments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  ));
```

### Phase 5 — Score Model Versions

```sql
CREATE TABLE IF NOT EXISTS score_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  engine TEXT NOT NULL DEFAULT 'calculate-compliance-score',
  description TEXT,
  pillar_weights JSONB NOT NULL DEFAULT '{"food_safety": 0.5, "fire_safety": 0.5}',
  scoring_algorithm TEXT NOT NULL DEFAULT 'calcode_deduction',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deprecated_at TIMESTAMPTZ,
  created_by TEXT
);

-- Seed v1.0
INSERT INTO score_model_versions (version, description, pillar_weights) VALUES
  ('1.0', 'CalCode deduction model, 2-pillar (Food Safety 50%, Fire Safety 50%)',
   '{"food_safety": 0.5, "fire_safety": 0.5}');
```

### Phase 6 — Enterprise Rollup Column Rename (V16 fix)

```sql
ALTER TABLE enterprise_rollup_scores
  RENAME COLUMN equipment_score TO fire_safety_score;
ALTER TABLE enterprise_rollup_scores
  RENAME COLUMN documentation_score TO food_safety_score;
```

### Phase 7 — Jurisdiction Versioning (V19 fix)

```sql
ALTER TABLE jurisdictions
  ADD COLUMN IF NOT EXISTS data_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crawl_confidence TEXT CHECK (crawl_confidence IN ('high', 'medium', 'low'));
```

---

## 8. EDGE FUNCTION CHANGES

### Modified Functions

| Function | Change | Violation Fixed |
|----------|--------|----------------|
| **calculate-compliance-score** | After writing score_calculations, also write/upsert compliance_score_snapshots with model_version, inputs_hash, is_immutable=true | V14, V2, V3 |
| **insurance-risk-calculate** | Read pillar scores from compliance_score_snapshots instead of recalculating from raw data. Write score_snapshot_id FK. | V5, V12 |
| **benchmark-snapshot** | Use compliance_score_snapshots.overall_score instead of recalculating. Write score_snapshot_id FK. | V6, V12 |
| **enterprise-rollup-calculate** | Read from compliance_score_snapshots for leaf nodes. Use renamed columns (fire_safety_score, food_safety_score). Write score_snapshot_id FK. | V16, V12 |
| **sensor-compliance-aggregate** | Write score_snapshot_id FK from most recent snapshot. Document that this is an operational metric, not a scoring engine. | V13 |
| **intelligence-webhook** | Write to `intelligence_insights` with source_type='webhook_inbound' instead of `ai_insights`. | V9 |
| **ai-pattern-analysis** | Write to `intelligence_insights` with source_type='ai_pattern' instead of `ai_insights`. | V8 |
| **ai-predictive-alerts** | Write to `intelligence_insights` with source_type='ai_prediction' instead of `ai_insights`. | V8 |
| **ai-weekly-digest** | Write to `intelligence_insights` with source_type='ai_digest' instead of `ai_weekly_digests`. | V8, V17 |
| **ai-corrective-action-draft** | Write to `intelligence_insights` with source_type='ai_corrective' instead of `ai_corrective_actions`. | V8, V17 |
| **monitor-regulations** | Write to `intelligence_insights` with source_type='regulatory_monitor' instead of `regulatory_changes`. | V8 |
| **intelligence-collect** | Add source_type='external_crawl' to inserts (already writes correct table). | V8 |
| **generate-compliance-package** | Read from compliance_score_snapshots for score data. Implement PDF generation. | V15, V18 |

### New Functions

| Function | Purpose | Trigger | Reads | Writes |
|----------|---------|---------|-------|--------|
| **correlation-engine** | Deterministic intelligence→risk correlation | Daily (after intelligence-collect) | compliance_score_snapshots, intelligence_insights, locations, location_jurisdictions | risk_assessments |

### Correlation Rules (v1.0)

```
RULE 1: OUTBREAK → LIABILITY
  WHEN intelligence_insights.category = 'outbreak_alert'
    AND intelligence_insights.status = 'published'
    AND intelligence_insights.affected_counties INTERSECT location.county
  THEN risk_assessments.liability_risk += severity_weight(severity)
    AND drivers_json APPEND {driver: 'active_outbreak', ref: insight.id}

RULE 2: RECALL → COST
  WHEN intelligence_insights.category = 'recall_alert'
    AND intelligence_insights.status = 'published'
    AND intelligence_insights.severity IN ('critical', 'high')
    AND intelligence_insights.affected_states CONTAINS location.state
  THEN risk_assessments.cost_risk += 15
    AND drivers_json APPEND {driver: 'active_recall', ref: insight.id}

RULE 3: WEATHER → OPERATIONAL
  WHEN intelligence_insights.category = 'weather_risk'
    AND intelligence_insights.status = 'published'
    AND intelligence_insights.affected_counties INTERSECT location.county
  THEN risk_assessments.operational_risk += severity_weight(severity)

RULE 4: ENFORCEMENT SURGE → LIABILITY
  WHEN intelligence_insights.category = 'enforcement_surge'
    AND intelligence_insights.affected_counties INTERSECT location.county
  THEN risk_assessments.liability_risk += 10
    AND drivers_json APPEND {driver: 'enforcement_surge', ref: insight.id}

RULE 5: INSPECTOR PATTERN → OPERATIONAL
  WHEN intelligence_insights.category = 'inspector_pattern'
    AND intelligence_insights.affected_counties INTERSECT location.county
  THEN risk_assessments.operational_risk += 5
    AND drivers_json APPEND {driver: 'inspector_focus', ref: insight.id}

RULE 6: REGULATORY CHANGE → OPERATIONAL
  WHEN intelligence_insights.source_type = 'regulatory_monitor'
    AND intelligence_insights.status = 'published'
    AND intelligence_insights.severity IN ('critical', 'high')
    AND effective_date <= NOW() + INTERVAL '90 days'
  THEN risk_assessments.operational_risk += compliance_impact_weight(severity)
    AND drivers_json APPEND {driver: 'regulatory_change', ref: insight.id}

RULE 7: MISSED TEMP LOGS → REVENUE
  WHEN location_compliance_scores.temp_compliance_rate < 80
    AND intelligence_insights.severity = 'high' (any active alert for location county)
  THEN risk_assessments.revenue_risk += 20
    AND drivers_json APPEND {driver: 'missed_logs_plus_alert'}

RULE 8: JURISDICTION GRADE CHANGE → SCORE REVIEW
  WHEN location_jurisdiction_scores.jurisdiction_grade changed since last assessment
  THEN trigger calculate-compliance-score recalculation for location
    AND risk_assessments.liability_risk += grade_delta_weight(old, new)
```

---

## 9. JURISDICTION SEO DISTRIBUTION ARCHITECTURE (Part C)

### Current State

- 52 validated county JSON files in `scripts/jie/jurisdictions/results/validated/`
- 63 total jurisdictions in `ca_jurisdictions.json` (58 counties + 4 cities + 1 federal)
- 10 jurisdictions with crawl errors
- Data includes: department_name, department_url, grading_system, inspection_details, fire_safety_authority, regulatory_framework, data_sources, confidence_level
- **No public pages exist** — all behind auth

### Proposed Dynamic Routing

```
PUBLIC ROUTES (no auth required):
  /compliance/:state                    → State overview (CA first)
  /compliance/:state/:county            → County detail page
  /compliance/:state/:county/grading    → Grading system detail
  /compliance/:state/:county/fire       → Fire safety authority detail

EXAMPLES:
  /compliance/california                → CA overview (58 counties, state laws)
  /compliance/california/los-angeles    → LA County detail
  /compliance/california/fresno         → Fresno County detail
```

### Data Model Per County Page

Each county page pulls from canonical jurisdiction data:

```typescript
interface CountyPage {
  // From jurisdictions table
  jurisdiction_name: string;
  state: string;
  department_name: string;
  department_url: string;

  // Grading system
  grading_type: string;           // letter_grade, pass_fail, color_placard, etc.
  grading_config: GradingConfig;  // thresholds, passing score
  score_range: { min: number; max: number };

  // Inspection
  inspection_frequency: string;
  reinspection_trigger: string;
  public_disclosure: string;
  risk_categories: string[];

  // Fire safety
  fire_authority: string;
  hood_inspection_required: boolean;
  ansul_requirements: string;
  fire_inspection_frequency: string;

  // Regulatory
  food_code_basis: string;        // Always CalCode for CA
  local_ordinances: string;
  permit_types: string[];

  // Meta
  confidence_level: 'high' | 'medium' | 'low';
  last_crawled_at: string;
  data_version: number;
}
```

### 50-State Expansion Readiness

The schema is already state-agnostic:
- `jurisdictions` table has `state` column
- `ca_jurisdictions.json` has `state: "CA"` on every entry
- `jurisdiction_crawl.py` accepts state parameter
- `crawl_all_states.py` iterates over state list

**Required for expansion:**
1. Add state jurisdiction lists (e.g., `tx_jurisdictions.json`, `ny_jurisdictions.json`)
2. Run crawl pipeline per state
3. Load via `push_to_supabase.mjs` (already state-aware)
4. Frontend routing already parameterized by `:state/:county`
5. **No schema changes required**

### ScoreTable Companion Platform

No references to "ScoreTable" found in the codebase. If this is a separate platform, it would consume jurisdiction data via the same `jurisdictions` table or a read-only API. The architecture supports this via:
- `risk-score-api` (existing carrier-facing API, could be extended)
- Direct Supabase read with RLS for published jurisdiction data

---

## 10. 15-DAY IMPLEMENTATION PLAN

### Phase 1 — Canonical Scoring Stabilization (Days 1-3)

| Day | Task | Files Changed | Risk | Verification |
|-----|------|--------------|------|-------------|
| **1** | Add model_version, scoring_engine, inputs_hash, is_immutable to compliance_score_snapshots. Create score_model_versions table. Seed v1.0. | Migration SQL | LOW | Run migration, verify columns exist |
| **1** | Modify calculate-compliance-score to write compliance_score_snapshots after score_calculations. Include model_version='1.0', scoring_engine, inputs_hash (SHA-256 of input data). | `supabase/functions/calculate-compliance-score/index.ts` | MEDIUM | Invoke function, verify snapshot row created |
| **2** | Add score_snapshot_id FK (nullable) to: insurance_risk_scores, location_jurisdiction_scores, location_benchmark_ranks, location_compliance_scores, enterprise_rollup_scores. Add indexes. | Migration SQL | LOW | Verify nullable FKs, existing queries unaffected |
| **2** | Add snapshot_id FK to score_calculations. Backfill existing rows where possible (match on location_id + score_date). | Migration SQL + backfill script | LOW | Spot-check FK linkage |
| **3** | Deprecate frontend scoring calculations. Replace calls to `computeComplianceScore()` with reads from compliance_score_snapshots (live mode) or keep as demo-only fallback. | `src/lib/complianceScoring.ts`, dashboard components | MEDIUM | Verify dashboard still renders in demo mode |

### Phase 2 — Risk Translation Layer (Days 4-5)

| Day | Task | Files Changed | Risk | Verification |
|-----|------|--------------|------|-------------|
| **4** | Create risk_assessments table with RLS. | Migration SQL | LOW | Verify table, RLS policies |
| **4** | Create correlation-engine edge function. Implement Rules 1-8. Wire to daily cron (after intelligence-collect at 7am PT). | `supabase/functions/correlation-engine/index.ts` | MEDIUM | Run on test data, verify risk rows created |
| **5** | Update insurance-risk-calculate to read pillar scores from compliance_score_snapshots. Write score_snapshot_id FK. Stop recalculating from raw vendor data. | `supabase/functions/insurance-risk-calculate/index.ts` | MEDIUM | Compare old vs new scores for drift (should be within 5%) |
| **5** | Update benchmark-snapshot to use compliance_score_snapshots.overall_score. Write score_snapshot_id FK. | `supabase/functions/benchmark-snapshot/index.ts` | MEDIUM | Compare old vs new percentiles |

### Phase 3 — Intelligence Normalization & Correlation (Days 6-8)

| Day | Task | Files Changed | Risk | Verification |
|-----|------|--------------|------|-------------|
| **6** | Add source_type column to intelligence_insights. Create backward-compatible views (ai_insights_v, regulatory_changes_v). | Migration SQL | LOW | Verify existing queries still work |
| **6** | Update intelligence-collect to set source_type='external_crawl'. | `supabase/functions/intelligence-collect/index.ts` | LOW | Verify inserts include source_type |
| **7** | Update intelligence-webhook to write intelligence_insights (not ai_insights). Set source_type='webhook_inbound'. | `supabase/functions/intelligence-webhook/index.ts` | MEDIUM | Send test webhook, verify correct table |
| **7** | Update ai-pattern-analysis, ai-predictive-alerts to write intelligence_insights with source_type='ai_pattern'/'ai_prediction'. | 2 edge functions | MEDIUM | Run functions, verify inserts |
| **8** | Update ai-weekly-digest → source_type='ai_digest'. Update ai-corrective-action-draft → source_type='ai_corrective'. Update monitor-regulations → source_type='regulatory_monitor'. | 3 edge functions | MEDIUM | Run each, verify correct table/source_type |
| **8** | Update frontend Intelligence Hub to read all source_types from intelligence_insights (remove separate ai_insights/regulatory_changes queries). | `src/hooks/useIntelligenceHub.ts`, `src/pages/IntelligenceHub.tsx` | MEDIUM | Full UI test of Intelligence Hub |

### Phase 4 — Reporting & Compliance Pack (Days 9-10)

| Day | Task | Files Changed | Risk | Verification |
|-----|------|--------------|------|-------------|
| **9** | Rewrite reportGenerator.ts to read from compliance_score_snapshots (live) with demo data fallback. Remove hardcoded score generation. | `src/lib/reportGenerator.ts`, `src/pages/HealthDeptReport.tsx` | MEDIUM | Generate report, verify scores match snapshot |
| **9** | Wire HealthDeptReport county template to jurisdiction data from DB (not hardcoded COUNTY_TEMPLATES). | `src/lib/reportGenerator.ts` | MEDIUM | Test all 6 county templates |
| **10** | Implement PDF generation in generate-compliance-package (add pdf-lib dependency). Include score from compliance_score_snapshots. | `supabase/functions/generate-compliance-package/index.ts` | MEDIUM | Generate package, verify PDF output |
| **10** | Verify audit defensibility chain: score_calculations → compliance_score_snapshots → risk_assessments → reports. Each link has FK. | All scoring tables | LOW | Trace full chain for one location |

### Phase 5 — Jurisdiction SEO Distribution (Days 11-13)

| Day | Task | Files Changed | Risk | Verification |
|-----|------|--------------|------|-------------|
| **11** | Create public route structure: /compliance/:state/:county. Create CountyPage component pulling from jurisdictions table. | `src/App.tsx`, new `src/pages/public/CountyCompliancePage.tsx` | LOW | Load 3 county pages |
| **11** | Add Supabase RLS policy: anon users can read jurisdictions where data_version >= 1. | Migration SQL | LOW | Verify anon read access |
| **12** | Build state overview page (/compliance/california). Pull all CA jurisdictions, group by phase_1/phase_2. | New `src/pages/public/StateCompliancePage.tsx` | LOW | Verify 58 counties render |
| **12** | Add sitemap generation for crawled jurisdictions. Add meta tags (title, description, OG) per county. | `public/sitemap.xml` or dynamic generation | LOW | Validate sitemap, check meta |
| **13** | Add jurisdiction data versioning (data_version, last_crawled_at, crawl_confidence to jurisdictions table). Update JIE push script. | Migration SQL, `scripts/jie/jurisdictions/push_to_supabase.mjs` | LOW | Run push, verify version incremented |
| **13** | Validate 50-state expansion readiness: test with 1 non-CA state (TX or NY). | JIE scripts | LOW | Crawl 1 TX county, verify schema works |

### Phase 6 — Enterprise Hardening (Days 14-15)

| Day | Task | Files Changed | Risk | Verification |
|-----|------|--------------|------|-------------|
| **14** | Rename enterprise_rollup_scores columns (equipment_score → fire_safety_score, documentation_score → food_safety_score). Update enterprise-rollup-calculate. | Migration SQL, edge function | MEDIUM | Verify rollup still calculates correctly |
| **14** | Drop stale organization weight columns (operational_weight, equipment_weight, documentation_weight). | Migration SQL | LOW | Verify no code references (already confirmed) |
| **14** | Enforce model versioning: add trigger on compliance_score_snapshots preventing UPDATE of pillar scores (immutability). | Migration SQL (trigger) | MEDIUM | Attempt UPDATE, verify rejection |
| **15** | FK chain audit: verify every derived table has score_snapshot_id populated. Run backfill for any gaps. | Backfill script | LOW | COUNT(*) WHERE score_snapshot_id IS NULL = 0 |
| **15** | Error boundary audit: verify all edge functions have proper error handling, logging, and timeout behavior. | All modified edge functions | LOW | Code review |
| **15** | Drop benchmark_snapshots table. Create migration to move any referenced data. | Migration SQL | LOW | Verify no code references |
| **15** | Final smoke test: full scoring pipeline end-to-end (calculate → snapshot → insurance → benchmark → risk → report). | — | LOW | Trace one location through full pipeline |

---

## 11. DEPLOYMENT ORDER

```
Day 1:
  1. Migration: compliance_score_snapshots schema additions (additive)
  2. Migration: score_model_versions table (new)
  3. Deploy: calculate-compliance-score (updated to write snapshots)

Day 2:
  4. Migration: FK columns on derived tables (all nullable, additive)
  5. Migration: snapshot_id on score_calculations + backfill

Day 3:
  6. Deploy: Frontend scoring deprecation (demo fallback preserved)

Day 4:
  7. Migration: risk_assessments table (new)
  8. Deploy: correlation-engine (new function)

Day 5:
  9. Deploy: insurance-risk-calculate (reads from snapshot)
  10. Deploy: benchmark-snapshot (reads from snapshot)

Day 6:
  11. Migration: intelligence_insights source_type column (additive)
  12. Migration: backward-compatible views
  13. Deploy: intelligence-collect (adds source_type)

Day 7:
  14. Deploy: intelligence-webhook (changed write target)
  15. Deploy: ai-pattern-analysis (changed write target)
  16. Deploy: ai-predictive-alerts (changed write target)

Day 8:
  17. Deploy: ai-weekly-digest (changed write target)
  18. Deploy: ai-corrective-action-draft (changed write target)
  19. Deploy: monitor-regulations (changed write target)
  20. Deploy: Frontend Intelligence Hub (unified feed)

Day 9:
  21. Deploy: reportGenerator.ts rewrite
  22. Deploy: HealthDeptReport county template from DB

Day 10:
  23. Deploy: generate-compliance-package PDF implementation

Days 11-13:
  24. Migration: RLS for public jurisdiction reads
  25. Deploy: Public county pages + state overview
  26. Deploy: Sitemap generation
  27. Migration: jurisdiction versioning columns

Day 14:
  28. Migration: enterprise_rollup_scores column rename
  29. Migration: Drop stale organization weight columns
  30. Migration: Immutability trigger on snapshots
  31. Deploy: enterprise-rollup-calculate (updated)

Day 15:
  32. Migration: Drop benchmark_snapshots
  33. Run: FK chain backfill audit
  34. Run: Full end-to-end smoke test
```

All migrations Days 1-13 are **additive** (new columns, new tables, new views). Destructive changes (drops, renames) are concentrated on Days 14-15 after all dependent code is updated.

---

## 12. RISK OF REGRESSION ASSESSMENT

| Change | Risk Level | What Could Break | Mitigation |
|--------|-----------|-----------------|------------|
| calculate-compliance-score writes to snapshots | MEDIUM | Function fails on new UPSERT, breaking daily scoring | Add write inside try/catch; score_calculations write succeeds first |
| insurance-risk-calculate reads from snapshots | MEDIUM | Snapshot doesn't exist for location → null scores | Fallback to raw calculation if snapshot missing; log warning |
| Intelligence store consolidation | MEDIUM | Frontend queries ai_insights table directly → empty results | Backward-compatible views maintain old table names |
| Enterprise rollup column rename | MEDIUM | Any query using old column names breaks | Rename in migration + update all queries atomically |
| Immutability trigger on snapshots | LOW | Legitimate score correction blocked | Admin override via service role (trigger checks auth.role()) |
| Public county pages | LOW | SEO pages expose incorrect jurisdiction data | Confidence filtering (only show confidence='high' or 'medium') |
| PDF generation in compliance package | LOW | pdf-lib fails → package returns error | Fallback to JSON manifest if PDF generation fails |
| Frontend scoring deprecation | MEDIUM | Demo mode breaks if DB read fails | Preserve demo data fallback in all scoring reads |
| Drop benchmark_snapshots | LOW | Any remaining reference → query error | Grep entire codebase for references before drop |
| FK backfill | LOW | Orphaned rows without matching snapshot | Nullable FKs; backfill script handles mismatches gracefully |

---

## 13. DEFINITION OF v1.0 COMPLETE

### Scoring Checklist

- [ ] `calculate-compliance-score` is the SOLE scoring authority
- [ ] Every invocation writes to `compliance_score_snapshots` with model_version
- [ ] `compliance_score_snapshots` rows are immutable (trigger enforced)
- [ ] `score_model_versions` table has v1.0 entry
- [ ] `score_calculations` has FK to snapshot (audit chain)
- [ ] Frontend NEVER calculates compliance scores (reads from DB or uses demo fallback)
- [ ] Insurance risk derives FROM snapshot (FK populated)
- [ ] Benchmark derives FROM snapshot (FK populated)
- [ ] Enterprise rollup derives FROM snapshot chain (FK populated)
- [ ] sensor-compliance-aggregate has FK to snapshot (operational metric only)
- [ ] No derived table computes overall_score independently
- [ ] Organization weight columns dropped or repurposed

### Intelligence Checklist

- [ ] `intelligence_insights` is the SINGLE intelligence store
- [ ] All 7 edge functions write to intelligence_insights with correct source_type
- [ ] `ai_insights`, `regulatory_changes`, `ai_corrective_actions`, `ai_weekly_digests` deprecated with views
- [ ] Deduplication on source_url exists
- [ ] Approval workflow: pending_review → published
- [ ] Demo mode: DB first, static fallback only if empty

### Risk & Correlation Checklist

- [ ] `risk_assessments` table exists with FK to snapshot
- [ ] `correlation-engine` runs daily with 8 deterministic rules
- [ ] `drivers_json` populated with explainable risk factors
- [ ] `intelligence_refs` populated with correlated insight IDs
- [ ] Insurance tier derived from risk assessment, not recalculated

### Reporting Checklist

- [ ] HealthDeptReport reads from compliance_score_snapshots
- [ ] generate-compliance-package produces PDF with canonical scores
- [ ] Full audit chain traceable: score_calculations → snapshot → risk → report

### Jurisdiction Checklist

- [ ] 52+ CA jurisdictions in DB with grading_system, fire_authority
- [ ] Jurisdiction logic fully abstracted (no hardcoded county rules in scoring)
- [ ] Multi-layer support (food_safety + fire_safety + federal)
- [ ] JIE push script versioning (data_version incremented)
- [ ] Public county pages live for validated jurisdictions

### SEO Checklist

- [ ] /compliance/california renders 58 counties
- [ ] /compliance/california/:county renders for all validated counties
- [ ] Sitemap generated with all public county URLs
- [ ] Meta tags (title, description, OG) per county page
- [ ] 50-state expansion validated with 1 non-CA state

### Enterprise Hardening Checklist

- [ ] enterprise_rollup_scores uses current pillar names (fire_safety_score, food_safety_score)
- [ ] FK chain: 0 rows in derived tables with NULL score_snapshot_id
- [ ] Immutability trigger on compliance_score_snapshots active
- [ ] benchmark_snapshots table dropped
- [ ] All edge functions have error handling and timeouts
- [ ] End-to-end smoke test passes (scoring → snapshot → insurance → benchmark → risk → report)

---

## APPENDIX: Module Governance Audit (Re-verified)

| Module | Separate Scoring? | Uses Core Compliance? | Creates Tables? | Status |
|--------|------------------|----------------------|----------------|--------|
| Restaurant Full-Service | NO | YES (template) | NO | CLEAN |
| Restaurant QSR | NO | YES (template) | NO | CLEAN |
| Hotel | NO | YES (template) | NO | CLEAN |
| Healthcare/Senior Living | NO | YES (template) | NO | CLEAN |
| Education K-12 | NO | YES (template) | NO | CLEAN |
| Catering | NO | YES (template) | NO | CLEAN |
| SB1383 | NO | YES (jurisdiction rule) | NO | CLEAN |
| NFPA Fire Safety | NO | YES (integrated pillar) | NO | CLEAN |
| USDA | NOT IMPLEMENTED | N/A | N/A | N/A |
| CMS | NOT IMPLEMENTED | N/A | N/A | N/A |
| Joint Commission | NOT IMPLEMENTED | N/A | N/A | N/A |

**All 8 active modules use templates/configuration — none create parallel scoring. CLEAN.**

---

## APPENDIX: Edge Function Inventory (96 Functions)

### Compliance & Scoring (3)
- calculate-compliance-score, check-equipment-alerts, check-onboarding-progress

### Insurance (5)
- insurance-risk-calculate, insurance-risk-fire-safety, insurance-risk-verify, insurance-risk-history, insurance-risk-incidents

### Benchmark (4)
- benchmark-snapshot, benchmark-aggregate, benchmark-badge-check, benchmark-quarterly-report

### Intelligence (3)
- intelligence-collect, intelligence-approve, intelligence-webhook

### AI / Copilot (8)
- ai-chat, ai-pattern-analysis, ai-predictive-alerts, ai-weekly-digest, ai-corrective-action-draft, ai-document-analysis, copilot-analyze, landing-chat

### Enterprise (7)
- enterprise-sso-callback, enterprise-scim-users, enterprise-tenant-provision, enterprise-rollup-calculate, enterprise-report-generate, enterprise-alert-rollup, enterprise-audit-export

### IoT / Sensors (8)
- iot-sensor-webhook, iot-sensor-pull, iot-sensor-alerts, sensor-threshold-evaluate, sensor-alert-escalate, sensor-device-health, sensor-defrost-detect, sensor-compliance-aggregate

### Training (9)
- training-enroll, training-quiz-score, training-certificate-gen, training-sb476-report, training-auto-enroll, training-completion-handler, training-progress-reminder, training-content-translate, training-analytics-aggregate, training-ai-companion, training-ai-quiz-gen

### Playbook (5)
- playbook-auto-trigger, playbook-escalation-monitor, playbook-completion-handler, playbook-food-loss-calculator, playbook-report-generator, playbook-ai-assistant

### Vendor (5)
- vendor-contact, vendor-secure-upload, vendor-lead-notify, vendor-credential-check, vendor-certification-evaluate, vendor-recommendation-engine, vendor-analytics-snapshot

### API / Integrations (11)
- api-oauth-authorize, api-oauth-token, api-token-validate, api-rate-limiter, api-webhook-dispatch, api-webhook-retry, api-usage-aggregate, api-marketplace-publish, risk-score-api, integration-sync-engine, integration-oauth-callback, integration-data-mapper, integration-conflict-resolver, integration-health-check

### Offline (5)
- offline-sync-handler, offline-sync-pull, offline-conflict-resolver, offline-device-manager, offline-photo-batch-upload

### Other (7)
- stripe-create-checkout, stripe-webhook, stripe-customer-portal, send-team-invite, send-sms-invite, send-reminders, classify-document, monitor-regulations, generate-compliance-package, generate-haccp-from-checklists, process-service-reminders, send-document-alerts, auto-request-documents, send-missing-doc-reminders, iot-process-reading

**Functions that write compliance state:** calculate-compliance-score (SOLE AUTHORITY after v1.0)
**Functions that write derived scores:** insurance-risk-calculate, benchmark-snapshot, enterprise-rollup-calculate, sensor-compliance-aggregate
**Functions that write intelligence:** intelligence-collect, intelligence-approve, intelligence-webhook, ai-pattern-analysis, ai-predictive-alerts, ai-weekly-digest, ai-corrective-action-draft, monitor-regulations
