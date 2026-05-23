# Tribal Food Safety Audit — Findings Report

Date: 2026-05-21
Environment: PROD `irxgmhxhmxtzfwuieblc`
Mode: READ-ONLY (no writes performed)

---

## 1. Schema Confirmation

- Table name: `jurisdictions` — **confirmed** (public schema)
- Total columns: **46**
- Column list: `id, state, county, city, agency_name, agency_type, jurisdiction_type, county_fips, scoring_type, grading_type, grading_config, scoring_methodology, violation_weight_map, pass_threshold, warning_threshold, critical_threshold, fire_ahj_name, fire_ahj_type, fire_code_edition, nfpa96_edition, has_local_amendments, local_amendment_notes, hood_cleaning_default, data_source_type, data_source_url, data_source_tier, scraper_config, refresh_frequency, last_sync_at, facility_count, population_rank, is_active, notes, created_at, updated_at, data_version, last_crawled_at, crawl_confidence, fire_jurisdiction_config, confidence_score, last_verified, slug, jie_audit_status, jie_verified_source, jie_verified_date, regulatory_framework_id`
- `agency_name` column present: **yes**
- `name` column present: **no**
- `fire_jurisdiction_config` column present: **yes** (JSONB, nullable)
- `jie_audit_status` column present: **yes** (text, default `'needs_review'`)

### Tribal-Specific Columns — ALL MISSING FROM PROD

| Column | Exists on PROD? |
|---|---|
| `governmental_level` | **NO** |
| `tribal_entity_name` | **NO** |
| `tribal_food_authority` | **NO** |
| `food_code_basis` | **NO** |
| `sovereignty_type` | **NO** |
| `nigc_overlay` | **NO** |

These columns are referenced in code (`resolveJurisdictions.ts:144`) and in unapplied migrations (`20260705000000_tribal_casino_jurisdictions.sql`, `20260720000000_cleanup_tribal_duplicates_and_enforce_uniqueness.sql`) but have never been added to the PROD schema.

---

## 2. Row Counts

| State | Rows |
|---|---|
| AZ | 15 |
| CA | 62 |
| NV | 17 |
| OR | 36 |
| WA | 39 |
| **Total** | **169** |

JIE baseline match: **PASS** (169 total, CA=62)

### Comparison to Unapplied Migration Expectations

The unapplied migration `20260720000000` expects:
- CA=62 (match), AZ=24 (current: 15), OR=36, WA=39, NV=17, Total=178
- AZ gap of 9 rows = the 9 AZ tribal rows that were designed but never seeded to PROD
- Grand total gap (178 vs 169) = 9 missing AZ tribal rows

---

## 3. grading_config JSONB Structure

### Top-level keys present across CA (185 distinct keys total)

Common structural keys across most rows:
- `agency_address`, `agency_contact`, `agency_structure`
- `authority` (state + local code references)
- `evaluation_method`
- `grading_thresholds` (with `tiers[]` array)
- `violation_classification`
- `schema_version`
- `source_documents[]`
- `display_format`
- `produces_score`, `produces_letter_grade`, `produces_placard`
- `public_portals`
- `local_deltas_vs_calcode[]`
- `statute_deltas_vs_calcode[]`
- `cdc_five_risk_factors[]`
- `inspection_report_name`

### Distinct `evaluation_method` values

| State | evaluation_method | Count |
|---|---|---|
| AZ | null | 15 |
| CA | 100_point_deduction | 1 |
| CA | calcode_default | 6 |
| CA | calcode_narrative | 6 |
| CA | category_marking_with_voluntary_recognition | 1 |
| CA | compliance_posting | 1 |
| CA | major_violation_count | 4 |
| CA | major_violation_count_placard | 1 |
| CA | major_violation_count_placard_plus_compliance_score | 1 |
| CA | major_violation_count_to_placard | 1 |
| CA | major_violation_count_with_color_placard | 4 |
| CA | narrative_inspection_no_score_no_placard | 1 |
| CA | narrative_inspection_report | 1 |
| CA | narrative_inspection_report_only | 1 |
| CA | negative_numeric_deduction | 1 |
| CA | none | 20 |
| CA | numeric_deduction | 2 |
| CA | numeric_deduction_letter_grade | 1 |
| CA | numeric_deduction_pass_conditional_placard | 1 |
| CA | numeric_deduction_with_color_placard | 1 |
| CA | points_accumulation | 1 |
| CA | points_deduction_100 | 4 |
| CA | null | 2 |
| NV | null | 17 |
| OR | numeric | 36 |
| WA | four_tier_rating | 2 |
| WA | numeric | 36 |
| WA | three_tier_rating | 1 |

### Schema version distribution

| schema_version | Count |
|---|---|
| null | 115 |
| 2026-05-21 | 36 |
| 1.0 | 4 |
| v1.0 | 8 |
| 1.1 | 2 |
| 2026.05.21 | 1 |
| 2026-05-21-r2 | 1 |
| 2026.05 | 2 |

### Tribal markers in grading_config

8 CA county rows contain `tribal_jurisdiction_note` sub-keys in their `grading_config` (documenting adjacent tribal lands, not representing tribal jurisdictions themselves):
- Trinity, Humboldt, Mariposa, Modoc, Amador, Del Norte, Inyo, Calaveras

These are informational notes within county jurisdiction rows, not tribal authority data.

### Sample CA row grading_config (Berkeley — first CA row alphabetically)

```json
{
  "agency_address": "2180 Milvia St., 2nd Floor, Berkeley, CA 94704",
  "agency_contact": { "email": "envhealth@berkeleyca.gov", "phone": "(510) 981-5310", "url": "..." },
  "agency_structure": { "type": "independent_city_health_department", ... },
  "authority": { "local": "Berkeley Municipal Code Title 11 Chapter 11.28", "state": "California Retail Food Code (CalCode)" },
  "evaluation_method": "narrative_inspection_no_score_no_placard",
  "grading_thresholds": { "applicable": false, "schema": "no_score_no_grade", "tiers": [] },
  "produces_score": false, "produces_letter_grade": false, "produces_placard": false,
  "schema_version": "1.0",
  "violation_classification": { "major": "...", "minor": "...", "basis": "CalCode §113725" },
  "source_documents": [ ... ],
  "statute_deltas_vs_calcode": [ ... ]
}
```

---

## 4. fire_jurisdiction_config JSONB Structure

### Top-level keys (CA)

`ahj_name, ahj_phone, ahj_split_note, ahj_type, ahj_website, amendment_notes, cfc_2025_evidence, cfc_2025_local_adoption_status, cfc_2025_state_default, cfc_adopted_2025, cfc_edition, data_source, data_verified_date, federal_overlay, federal_overlay_details, hood_cleaning_enforcement, inspection_trigger, jie_demo_eligible, local_amendments, nfpa96_cleaning_frequencies, nfpa96_edition, permit_type, suppression_inspection, transparency`

### Rows missing fire_jurisdiction_config by state

| State | Missing |
|---|---|
| AZ | 15 (all AZ rows) |
| CA | 6 |
| NV | 0 |
| OR | 0 |
| WA | 0 |

### Sample CA fire_jurisdiction_config (Alameda County)

```json
{
  "ahj_name": "Alameda County Fire Department",
  "ahj_type": "county_fd",
  "cfc_edition": "2022 CFC with local amendments",
  "nfpa96_edition": "2024",
  "local_amendments": true,
  "nfpa96_cleaning_frequencies": {
    "high_volume_24hr_charbroil_wok": "Quarterly",
    "moderate_volume": "Semiannually",
    "low_volume_seasonal_church": "Annually",
    "solid_fuel": "Monthly"
  },
  "permit_type": "Operational Fire Permit — annual renewal, pass/fail",
  "ahj_split_note": "Berkeley has independent health AND fire authority...",
  "transparency": "MODERATE"
}
```

**Note:** OR/WA/NV fire configs use a different JSONB structure (more granular, with nested `nfpa_96_table_12_4`, `hood_suppression`, `ansul_system`, `fire_extinguisher`, `fire_alarm`, `sprinkler_system`, `grease_trap`, `pse_safeguards[]` objects). CA fire configs use a flatter structure.

---

## 5. CA Breakdown (62 baseline)

- Total CA rows: **62**
- CA county EHD agencies: 58 (one per county)
- CA independent city EHDs: **4** (all found)

| City EHD | County | Found |
|---|---|---|
| Berkeley | Alameda | **found** (`bd7bbcbf`) |
| Long Beach | Los Angeles | **found** (`b437576c`) |
| Pasadena | Los Angeles | **found** (`0e0e3fc8`) |
| Vernon | Los Angeles | **found** (`7edbb389`) |

### JIE audit status breakdown

- `verified`: 4 rows (San Luis Obispo, Merced, Monterey, Ventura, Santa Barbara)
- `needs_review`: 58 rows (all others)

---

## 6. Tribal Pre-Existence

- **Tribal rows in jurisdictions table: 0** (expected: 0) ✓
- **Tribal-related tables in public schema: none** ✓
- **Tribal markers in agency_name: 0 rows matched** ✓

### Pre-existing tribal references in JSONB

**grading_config:** 8 CA county rows contain `tribal_jurisdiction_note` sub-keys (informational notes about adjacent tribal lands, not tribal authority data):
- Trinity, Humboldt, Mariposa, Modoc, Amador, Del Norte, Inyo, Calaveras

**fire_jurisdiction_config:** 3 OR county rows contain tribal references in `ahj_split_notes` (noting nearby tribal fire jurisdictions as separate AHJs):
- Umatilla: "Umatilla Indian Reservation is separate tribal fire jurisdiction"
- Wasco (North Central PHD): "Warm Springs Reservation straddles Wasco/Jefferson counties with separate tribal fire jurisdiction"
- Jefferson: "Warm Springs Reservation (~50% of county area) is separate tribal fire jurisdiction"

**Assessment:** All existing tribal references are informational adjacency notes within county-level rows. No tribal-authority rows exist.

---

## 7. Drift Monitor

### Function

- `fn_jurisdiction_config_drift_check` exists: **yes**
- Type: `AFTER UPDATE` trigger on `jurisdictions` table
- Fields monitored: `grading_config`, `fire_ahj_name`, `fire_ahj_type`, `fire_code_edition`, `nfpa96_edition`, `has_local_amendments`, `local_amendment_notes`, `hood_cleaning_default`, `scoring_type`, `grading_type`
- On drift detection: inserts into `drift_monitor_executions`, creates `support_tickets` entry, inserts into `drift_alert_log`, fires `pg_notify('drift_detected', ...)`

### Hardcoded baseline counts

The drift monitor trigger does **NOT** hardcode row counts — it monitors per-row field changes, not table-level counts. Row count enforcement exists only in the unapplied migration `20260720000000` (not on PROD).

### Trigger

- `trg_jurisdiction_config_drift` exists: **yes**
- Definition: `AFTER UPDATE ON public.jurisdictions FOR EACH ROW EXECUTE FUNCTION fn_jurisdiction_config_drift_check()`

### drift_alert_log table columns

`id (uuid), execution_id (uuid), jurisdiction_id (uuid), jurisdiction_name (text), drift_type (text), column_name (text), old_value (jsonb), new_value (jsonb), diff_summary (text), severity (text), alert_channel (text), ticket_id (uuid), email_sent (boolean), email_id (text), acknowledged (boolean), acknowledged_by (uuid), acknowledged_at (timestamptz), created_at (timestamptz)`

### Recent drift alerts (last 30 days)

- Total alerts: **257**
- Most recent: 2026-05-22 (Trinity, Tehama, Sutter, Siskiyou, Sierra, Plumas, Modoc — all CA methodology updates)
- Severity breakdown: mix of `critical` (scoring_type/grading_type changes) and `high` (grading_config changes)

---

## 8. RLS

- RLS enabled on jurisdictions: **yes**
- Number of policies: **2**
- Policy summary:
  - **"Jurisdictions readable by all authenticated"**: SELECT for `{authenticated}` — qual: `true` (all rows visible)
  - **"Jurisdictions readable by anon"**: SELECT for `{anon}` — qual: `(is_active = true)` (only active rows visible)
- No INSERT/UPDATE/DELETE policies exist (writes via service role only)

---

## 9. Code Consumers

### Files reading from `jurisdictions` table: 15 matches in `src/`

- `src/utils/jurisdictionLookup.ts:46,59,74`
- `src/lib/resolveJurisdictions.ts:143`
- `src/hooks/useJurisdiction.ts:46`
- `src/pages/AdminClientOnboarding.tsx:81,91`
- `src/pages/admin/Configure.tsx:907`
- `src/pages/admin/EvidLYIntelligence.tsx:450`
- `src/pages/admin/JurisdictionIntelligence.tsx:60`
- `src/pages/JurisdictionIntelligence.tsx:102,111`
- `src/pages/insights/InspectionForecast.jsx:50`
- `src/pages/public/CountyCompliance.tsx:226`
- `src/pages/public/CaliforniaCompliance.tsx:52`

Plus 2 in `supabase/functions/`:
- `supabase/functions/canonical-correlate/index.ts:34`
- `supabase/functions/_shared/briefingTemplates/citationResolver.ts:106`

### Files referencing `grading_config`: 34 matches

Key files: `useJurisdiction.ts`, `reportGenerator.ts`, `resolveJurisdictions.ts`, `HealthDeptReport.tsx`, `InspectionForecast.jsx`, `CountyCompliance.tsx`, all `ScoreTable*.jsx` public pages, `calculate-compliance-score/index.ts`, `citationResolver.ts`

### Files referencing `fire_jurisdiction_config`: 12 matches

Key files: `HeroJurisdictionSummary.tsx:115,125`, `useComplianceScore.ts:79`, `useJurisdiction.ts:25,88`, `types/jurisdiction.ts:28,110`, `FacilitySafety.tsx:162`, `ScoreTableCountyDetail.jsx:105,324,499`, `fireJurisdictionConfig.test.ts`

### Files referencing tribal/sovereign/casino/tga/compact: **40+ matches** (NOT zero)

Key files with tribal infrastructure already in code:
- `src/lib/resolveJurisdictions.ts` — **Full tribal dual-jurisdiction resolver** (CASINO-JIE-01): `TribalOrg` interface, `ResolvedJurisdictions` interface, `TribalJurisdictionRecord` interface, `resolveJurisdictions()` function, `useOrgJurisdiction()` hook
- `src/types/jurisdiction.ts:155-168` — `TribalJurisdictionConfig` interface, `GovernmentalLevel` type (includes `'tribal'`)
- `src/types/jurisdiction.ts:26` — `FireAhjType` includes `'tribal_fire'`
- `supabase/functions/generate-partner-demo/index.ts` — `tribal_casino` demo generator
- `supabase/functions/generate-demo-template/index.ts` — `tribal_casino` industry type handling
- `supabase/migrations/20260703000000_staging_demo_tours.sql` — `tribal_casino` in demo tour industry arrays
- `src/pages/public/ScoreTableState.jsx:48` — selects `tribal_entity_name` column (doesn't exist on PROD)

---

## 10. Reference Row Template

### Merced County — Complete Row (scalar columns)

```
id:                  81e6c154-dd33-4499-8344-1dcf2f7fe5fa
state:               CA
county:              Merced
city:                null
agency_name:         Merced County Community and Economic Development Department, Division of Environmental Health
agency_type:         county_ehd
jurisdiction_type:   food_safety
scoring_type:        points_accumulation
grading_type:        three_tier_rating
pass_threshold:      null
warning_threshold:   7
critical_threshold:  14
fire_ahj_name:       Merced County Fire Department
fire_ahj_type:       county_fd
fire_code_edition:   2022 CFC
nfpa96_edition:      2024
has_local_amendments: true
data_source_type:    jie_crawl
data_source_url:     https://www.countyofmerced.com/1637/Food-Protection-and-Inspection
data_source_tier:    3
facility_count:      null
population_rank:     20
is_active:           true
jie_audit_status:    verified
confidence_score:    92
slug:                merced-ca
```

### Merced County — grading_config JSONB (key structure)

```json
{
  "schema_version": "2026-05-21",
  "evaluation_method": "points_accumulation",
  "display_format": "three_tier_rating_with_color",
  "scoring_direction": "accumulation_higher_is_worse",
  "produces_score": true,
  "produces_letter_grade": false,
  "produces_placard": true,
  "authority": { "state_code": "...", "local_code": "...", "rating_system_legal_basis": "departmental_policy_under_state_enabling" },
  "grading_thresholds": {
    "applicable": true,
    "schema": "points_accumulation_three_tier_rating_with_color",
    "scoring_direction": "accumulation_higher_is_worse",
    "tiers": [
      { "label": "Good", "color": "Green", "score_min": 0, "score_max": 6 },
      { "label": "Satisfactory", "color": "Yellow", "score_min": 7, "score_max": 13 },
      { "label": "Unsatisfactory", "color": "Red", "score_min": 14, "score_max": null }
    ]
  },
  "violation_classification": { "major": "7 points", "minor": "3 points", "grp": "1 point", "repeat": "double" },
  "violation_weight_evidence": { ... },
  "source_documents": [ ... ],
  "local_deltas_vs_calcode": [ ... ],
  "agency_contact": { "phone": "209-381-1100", "website": "https://www.countyofmerced.com/eh" },
  "cdc_five_risk_factors": [ ... ]
}
```

### Merced County — fire_jurisdiction_config JSONB

```json
{
  "ahj_name": "Merced County Fire Department (CAL FIRE/Merced County)",
  "ahj_type": "cal_fire_contract",
  "cfc_edition": "2022 CFC",
  "cfc_adopted_2025": false,
  "cfc_2025_state_default": true,
  "cfc_2025_local_adoption_status": "not_adopted_locally",
  "nfpa96_edition": "2024",
  "local_amendments": false,
  "ahj_split_note": "City of Merced Fire: (209) 385-6891. CAL FIRE MVU for unincorporated...",
  "nfpa96_cleaning_frequencies": { "high_volume_24hr_charbroil_wok": "Quarterly", "moderate_volume": "Semiannually", "low_volume_seasonal_church": "Annually", "solid_fuel": "Monthly" },
  "permit_type": "Operational Fire Permit — annual renewal, pass/fail",
  "jie_demo_eligible": true,
  "transparency": "LOW"
}
```

---

## 11. Blockers / Anomalies / Surprises

### CRITICAL: Tribal columns do not exist on PROD

The following columns are referenced in application code (`src/lib/resolveJurisdictions.ts`, `src/types/jurisdiction.ts`, `src/pages/public/ScoreTableState.jsx`) but **do not exist on the PROD `jurisdictions` table**:

- `governmental_level`
- `tribal_entity_name`
- `tribal_food_authority`
- `food_code_basis`
- `sovereignty_type`
- `nigc_overlay`

The code in `resolveJurisdictions.ts:144` issues a `.select()` that includes `tribal_entity_name, tribal_food_authority, food_code_basis, sovereignty_type, nigc_overlay` — these columns will silently return `null` via Supabase PostgREST (non-existent columns are ignored, not errored).

### CRITICAL: Unapplied migration gap

13 migrations in the repo (versions `20260705000000` through `20260720000001`) have **never been applied to PROD**. These include:

| Version | Name | Status |
|---|---|---|
| 20260705000000 | tribal_casino_jurisdictions | NOT APPLIED |
| 20260707000000 | fire_jurisdiction_config | NOT APPLIED |
| 20260708000000 | nv_jurisdictions_fire_config | NOT APPLIED |
| 20260709000000 | or_jurisdictions_fire_config | NOT APPLIED |
| 20260710000000 | wa_jurisdictions_fire_config | NOT APPLIED |
| 20260711000000 | az_jurisdictions_food_safety | NOT APPLIED |
| 20260713000000 | fire_fix_02 | NOT APPLIED |
| 20260714000000 | az_fire_jurisdiction_configs | NOT APPLIED |
| 20260715000000 | fire_fix_03 | NOT APPLIED |
| 20260716000000 | scoretable_slugs | NOT APPLIED |
| 20260717000000 | fire_fix_04_remove_casino_override | NOT APPLIED |
| 20260720000000 | cleanup_tribal_duplicates_and_enforce_uniqueness | NOT APPLIED |
| 20260720000001 | backfill_ca_city_slugs | NOT APPLIED |

However, migration `20260721000000` (add_regions_hierarchy) **IS applied**, meaning the 0705-0720 batch was intentionally skipped on PROD.

### AZ fire_jurisdiction_config missing

All 15 AZ rows have `fire_jurisdiction_config = NULL`. This is because migration `20260714000000_az_fire_jurisdiction_configs.sql` was never applied.

### ScoreTableState.jsx queries non-existent columns

`src/pages/public/ScoreTableState.jsx:48` selects `tribal_entity_name` and `governmental_level` — columns that don't exist on PROD. Supabase PostgREST silently ignores unknown columns in `.select()`, so this doesn't error but returns no tribal data.

### Schema version inconsistency

115 of 169 rows have `null` schema_version, and the remaining use 7 different format conventions (1.0, v1.0, 1.1, 2026-05-21, 2026.05.21, 2026-05-21-r2, 2026.05).

### fire_jurisdiction_config structural divergence between states

CA uses a flatter JSONB structure (direct keys like `ahj_name`, `cfc_edition`). OR/WA/NV use a more granular nested structure (with `nfpa_96_table_12_4`, `hood_suppression`, `ansul_system`, etc.). Tribal fire configs will need to decide which shape to follow.

---

## 12. Open Questions for Arthur

1. **Tribal column strategy:** The code already has `TribalJurisdictionConfig` types and a `resolveJurisdictions.ts` resolver referencing 6 columns (`governmental_level`, `tribal_entity_name`, `tribal_food_authority`, `food_code_basis`, `sovereignty_type`, `nigc_overlay`) that don't exist on PROD. Should tribal design add these columns via new migration, or should the approach be revised?

2. **Unapplied migration batch (0705-0720):** These 13 migrations were skipped on PROD but exist in the repo. Should they be treated as dead/staging-only, or should some subset be applied before tribal work begins? The `20260720000000` migration has hardcoded counts that no longer match PROD state (expects AZ=24 including 9 tribal, but PROD has AZ=15).

3. **CA tribal scope:** The cleanup migration explicitly removed 7 CA tribal rows (Agua Caliente, Morongo, Pechanga, San Manuel, Santa Ynez, Table Mountain, Tachi-Yokut) as "incomplete coverage — revisit post-launch." Is the current audit the start of that revisit? How many CA tribal jurisdictions should Phase 1 target?

4. **AZ tribal state:** The unapplied migration expected 9 AZ tribal rows. Were these designed and tested on staging? Should AZ tribal be part of this Phase 1 or separate?

5. **fire_jurisdiction_config shape for tribal:** Should tribal fire configs use the CA flat shape or the OR/WA/NV granular nested shape?

6. **Drift monitor extension:** The current trigger monitors per-row field changes (not row counts). Should it be extended with a row-count assertion for tribal rows, or is the existing field-level monitoring sufficient?

7. **Unique constraint:** The unapplied migration `20260720000000` adds `UNIQUE (state, agency_name, governmental_level, county)`. Since `governmental_level` doesn't exist on PROD, this constraint doesn't exist. Should it be added as part of the tribal column migration?
