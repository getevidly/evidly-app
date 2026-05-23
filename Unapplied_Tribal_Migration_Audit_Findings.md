# Unapplied Tribal Migration Audit — Findings Report
Date: 2026-05-22
Repo: evidly-app
Mode: READ-ONLY (no execution, no edits)

## 1. Migration file metadata
- **Path:** `supabase/migrations/20260705000000_tribal_casino_jurisdictions.sql`
- **Line count:** 153
- **Header comments (verbatim):**
```sql
-- ═══════════════════════════════════════════════════════════════════════
-- CASINO-JIE-01: Tribal Casino Jurisdiction Support
-- Adds governmental_level to jurisdictions, tribal-specific columns,
-- org-level tribal fields, and seeds 7 CA tribal jurisdictions.
-- ADDITIVE ONLY — no changes to existing county/city jurisdiction behavior.
-- ═══════════════════════════════════════════════════════════════════════
```
- **Author/version annotations:** None. No author, no version number, no ticket ID beyond `CASINO-JIE-01`.

## 2. DDL operations

| Operation | Target | Change |
|---|---|---|
| ALTER TABLE ADD COLUMN | `jurisdictions.governmental_level` | TEXT NOT NULL DEFAULT 'county' CHECK IN ('county','city','tribal','federal') |
| UPDATE (backfill) | `jurisdictions.governmental_level` | SET = 'city' WHERE city IS NOT NULL AND governmental_level = 'county' |
| ALTER TABLE ADD COLUMN | `jurisdictions.tribal_entity_name` | TEXT |
| ALTER TABLE ADD COLUMN | `jurisdictions.tribal_food_authority` | TEXT |
| ALTER TABLE ADD COLUMN | `jurisdictions.tribal_fire_authority` | TEXT |
| ALTER TABLE ADD COLUMN | `jurisdictions.food_code_basis` | TEXT |
| ALTER TABLE ADD COLUMN | `jurisdictions.sovereignty_type` | TEXT |
| ALTER TABLE ADD COLUMN | `jurisdictions.nigc_overlay` | BOOLEAN DEFAULT FALSE |
| ALTER TABLE ADD COLUMN | `organizations.is_tribal` | BOOLEAN DEFAULT FALSE |
| ALTER TABLE ADD COLUMN | `organizations.tribal_jurisdiction_id` | UUID REFERENCES jurisdictions(id) |
| ALTER TABLE ADD COLUMN | `organizations.county_jurisdiction_id` | UUID REFERENCES jurisdictions(id) |
| INSERT (7 rows) | `jurisdictions` | 7 CA tribal jurisdiction seeds (see §5) |
| CREATE INDEX IF NOT EXISTS | `idx_jurisdictions_governmental_level` | ON jurisdictions(governmental_level) |
| CREATE INDEX IF NOT EXISTS | `idx_organizations_is_tribal` | ON organizations(is_tribal) WHERE is_tribal = true |

**Not present:** No CREATE TABLE, CREATE TYPE, CREATE TRIGGER, CREATE POLICY, CREATE FUNCTION.

## 3. Columns introduced or referenced

| Column | Table | Introduced by this migration? | Matches a flagged missing column? |
|---|---|---|---|
| `governmental_level` | jurisdictions | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `tribal_entity_name` | jurisdictions | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `tribal_food_authority` | jurisdictions | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `tribal_fire_authority` | jurisdictions | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `food_code_basis` | jurisdictions | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `sovereignty_type` | jurisdictions | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `nigc_overlay` | jurisdictions | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `is_tribal` | organizations | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `tribal_jurisdiction_id` | organizations | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `county_jurisdiction_id` | organizations | YES (ADD COLUMN IF NOT EXISTS) | YES |
| `state` | jurisdictions | NO — assumed to exist | NO |
| `county` | jurisdictions | NO — assumed to exist | NO |
| `agency_name` | jurisdictions | NO — assumed to exist | NO |
| `agency_type` | jurisdictions | NO — assumed to exist | NO |
| `jurisdiction_type` | jurisdictions | NO — assumed to exist | NO |
| `scoring_type` | jurisdictions | NO — assumed to exist | NO |
| `grading_type` | jurisdictions | NO — assumed to exist | NO |
| `grading_config` | jurisdictions | NO — assumed to exist | NO |
| `fire_ahj_name` | jurisdictions | NO — assumed to exist | NO |
| `hood_cleaning_default` | jurisdictions | NO — assumed to exist | NO |
| `is_active` | jurisdictions | NO — assumed to exist | NO |
| `notes` | jurisdictions | NO — assumed to exist | NO |
| `city` | jurisdictions | NO — used in backfill WHERE clause | NO |

**Summary:** This migration introduces **10 of the flagged missing columns** (7 on jurisdictions, 3 on organizations). The prior PROD audit counted 12 — the remaining columns referenced by code but NOT introduced by this migration are `food_safety_mode`, `food_safety_authority`, and `food_safety_advisory_text` on organizations (introduced by a different migration or column-add).

## 4. Enum extensions
- **None.** No `ALTER TYPE ... ADD VALUE` statements. The `governmental_level` is a CHECK constraint, not a Postgres enum.

## 5. Seed INSERT details (the 7 tribes)

All 7 rows share identical structure. Differences are `agency_name`, `county`, `tribal_entity_name`, and `notes` only.

### Tribe 1: Table Mountain Rancheria
- **agency_name:** `Table Mountain Rancheria TEHO`
- **state / county / city:** CA / Fresno / (not set)
- **agency_type:** `tribal_teho`
- **jurisdiction_type:** `food_safety`
- **slug:** not set (NULL)
- **scoring_type:** `advisory` — **non-standard value, not in current CHECK constraints**
- **grading_type:** `advisory` — **non-standard value, not in current CHECK constraints**
- **regulatory_framework_id:** not set (NULL, column not in INSERT)
- **grading_config top-level keys:** `nigc`, `advisory_note`
- **fire_jurisdiction_config top-level keys:** not set (column not in INSERT)
- **jie_audit_status:** not set (column not in INSERT)
- **jie_verified_date:** not set (column not in INSERT)

### Tribe 2: Tachi-Yokut Tribe
- **agency_name:** `Tachi-Yokut Tribe TEHO`
- **state / county / city:** CA / Kings / (not set)
- All other fields identical to Tribe 1

### Tribe 3: Santa Ynez Band of Chumash
- **agency_name:** `Santa Ynez Band of Chumash TEHO`
- **state / county / city:** CA / Santa Barbara / (not set)
- All other fields identical to Tribe 1

### Tribe 4: Morongo Band of Mission Indians
- **agency_name:** `Morongo Band of Mission Indians TEHO`
- **state / county / city:** CA / Riverside / (not set)
- All other fields identical to Tribe 1

### Tribe 5: Agua Caliente Band of Cahuilla Indians
- **agency_name:** `Agua Caliente Band of Cahuilla Indians TEHO`
- **state / county / city:** CA / Riverside / (not set)
- All other fields identical to Tribe 1

### Tribe 6: Pechanga Band of Luiseno Indians
- **agency_name:** `Pechanga Band of Luiseno Indians TEHO`
- **state / county / city:** CA / Riverside / (not set)
- All other fields identical to Tribe 1

### Tribe 7: San Manuel Band of Mission Indians
- **agency_name:** `San Manuel Band of Mission Indians TEHO`
- **state / county / city:** CA / San Bernardino / (not set)
- All other fields identical to Tribe 1

## 6. The 7 tribes — clean list
1. Table Mountain Rancheria TEHO — CA, Fresno — slug: (NULL)
2. Tachi-Yokut Tribe TEHO — CA, Kings — slug: (NULL)
3. Santa Ynez Band of Chumash TEHO — CA, Santa Barbara — slug: (NULL)
4. Morongo Band of Mission Indians TEHO — CA, Riverside — slug: (NULL)
5. Agua Caliente Band of Cahuilla Indians TEHO — CA, Riverside — slug: (NULL)
6. Pechanga Band of Luiseno Indians TEHO — CA, Riverside — slug: (NULL)
7. San Manuel Band of Mission Indians TEHO — CA, San Bernardino — slug: (NULL)

## 7. Schema_version on seeds
- **Value used:** Not set. The `grading_config` JSONB contains only `nigc` and `advisory_note` — no `schema_version` key.
- **Format match:** Neither the 2026-05-21 batch format nor the canonical integer-1 format. Absent entirely.
- **Anomaly:** The `grading_config` does not conform to the canonical grading_config spec v1. It has no `schema_version`, no `evaluation_method`, no `source`, no `methodology`. The top-level keys (`nigc`, `advisory_note`) are entirely custom/tribal-specific.

## 8. Drift monitor interaction
- **Trigger disable/bypass:** No. No `ALTER TABLE ... DISABLE TRIGGER`, no `SET session_replication_role`, no drift_alert_log inserts.
- **Drift_alert_log writes:** No.
- **Note:** The drift monitor trigger fires on UPDATE only (confirmed in prior PROD audit). Since this migration only does INSERTs for the tribal seeds and an UPDATE for the city backfill (`governmental_level`), the city backfill UPDATE will fire the drift monitor for any existing city jurisdiction row that has `governmental_level` changed. However, `governmental_level` is a NEW column being added in the same migration — the UPDATE sets it from the default 'county' to 'city', which may or may not trigger drift depending on whether the drift monitor watches `governmental_level` changes.

## 9. Rollback / safety
- **BEGIN/COMMIT wrap:** **NO.** The migration has no transaction wrapping. Each statement runs as auto-commit.
- **IF NOT EXISTS guards:** YES on ADD COLUMN (`ADD COLUMN IF NOT EXISTS` for all 10 columns). YES on CREATE INDEX (`IF NOT EXISTS`). **NO on the INSERT** — the 7 seed rows have no `ON CONFLICT` clause.
- **Conditional logic:** No. No DO blocks, no IF/THEN, no preflight checks.
- **Re-runability:** Partially idempotent. Columns and indexes are safe to re-run. **INSERT will fail on second run** if a unique constraint exists on any of the inserted columns. Without a unique constraint, re-running will create duplicate rows. This is exactly what happened — see §13.

## 10. Migration position
- **Immediately before:** `20260704000000_ops_intelligence.sql` — "SP8-OPS-INTEL-01: Operations Intelligence. Creates ops_intelligence_insights table for proactive ops insights."
- **Immediately after:** `20260706000000_partner_demo_system.sql` — "STAGING-DEMO-02: Partnership & Channel Demo System. Creates partner_demos and partner_demo_templates tables."

### 2 before / 2 after:
| Position | Timestamp | Filename | Header summary |
|---|---|---|---|
| -2 | 20260703000000 | `staging_demo_tours.sql` | STAGING-DEMO-01: Virtual Demo Environment. Creates demo_templates, demo_tours, demo_vendor_profiles. |
| -1 | 20260704000000 | `ops_intelligence.sql` | SP8-OPS-INTEL-01: Operations Intelligence. Creates ops_intelligence_insights table. |
| **Subject** | **20260705000000** | **`tribal_casino_jurisdictions.sql`** | **CASINO-JIE-01: Tribal Casino Jurisdiction Support.** |
| +1 | 20260706000000 | `partner_demo_system.sql` | STAGING-DEMO-02: Partnership & Channel Demo System. Creates partner_demos tables. |
| +2 | 20260707000000 | `fire_jurisdiction_config.sql` | FIRE-JIE-CA-01: California Fire Safety Configuration. Adds fire_jurisdiction_config JSONB column, normalizes fire_ahj_type. |

- **Total migrations in directory:** 416 `.sql` files
- **Timeframe inference:** Early July 2026 sprint. The tribal migration sits between demo/staging infrastructure (M0703, M0706) and the fire JIE build (M0707–M0718). This was the multi-state jurisdiction expansion sprint. FIRE-JIE-CA-01 (M0707) explicitly notes "all 62 CA **non-tribal** jurisdictions" — confirming the tribal migration was authored first and the fire config intentionally excluded tribal rows.

## 11. The 10 missing columns — code references

### Jurisdictions columns (7)

| Column | Table | Files referencing it | Introduced by this migration? |
|---|---|---|---|
| `governmental_level` | jurisdictions | `ScoreTableCountyDetail.jsx` (lines 209, 290, 325, 326), `ScoreTableState.jsx` (lines 48, 59, 60), `AdminClientOnboarding.tsx` (line 84), `resolveJurisdictions.ts` (not directly — via jurisdiction record) | YES |
| `tribal_entity_name` | jurisdictions | `ScoreTableCountyDetail.jsx` (lines 209, 290, 326), `ScoreTableState.jsx` (lines 173, 176), `AdminClientOnboarding.tsx` (line 83), `resolveJurisdictions.ts` (lines 34, 144, 154) | YES |
| `tribal_food_authority` | jurisdictions | `resolveJurisdictions.ts` (lines 35, 144), `jurisdiction.ts` type definition (line 159) | YES |
| `tribal_fire_authority` | jurisdictions | None found in `src/` queries (column exists in migration but no code reads it) | YES |
| `food_code_basis` | jurisdictions | `resolveJurisdictions.ts` (lines 36, 144), `jurisdiction.ts` type definition (line 160) | YES |
| `sovereignty_type` | jurisdictions | `resolveJurisdictions.ts` (lines 37, 144), `jurisdiction.ts` type definition (line 161), `generate-partner-demo/index.ts` (line 881) | YES |
| `nigc_overlay` | jurisdictions | `resolveJurisdictions.ts` (lines 38, 144), `jurisdiction.ts` type definition (line 162), `generate-partner-demo/index.ts` (line 884), `partnerDemoSystem.test.ts` (lines 164, 177) | YES |

### Organizations columns (3 from this migration)

| Column | Table | Files referencing it | Introduced by this migration? |
|---|---|---|---|
| `is_tribal` | organizations | `AdminClientOnboarding.tsx` (line 115), `resolveJurisdictions.ts` (lines 14, 59, 125), `generate-partner-demo/index.ts` (line 753) | YES |
| `tribal_jurisdiction_id` | organizations | `AdminClientOnboarding.tsx` (line 122), `resolveJurisdictions.ts` (lines 15, 60, 67, 125) | YES |
| `county_jurisdiction_id` | organizations | `AdminClientOnboarding.tsx` (line 123), `resolveJurisdictions.ts` (lines 16, 61, 68, 125) | YES |

### Organizations columns (3 NOT from this migration)

| Column | Table | Files referencing it | Introduced by this migration? |
|---|---|---|---|
| `food_safety_mode` | organizations | `resolveJurisdictions.ts` (lines 17, 125), `generate-partner-demo/index.ts` (line 754), `generate-demo-template/index.ts` (line 110) | **NO** |
| `food_safety_authority` | organizations | `AdminClientOnboarding.tsx` (line 117), `resolveJurisdictions.ts` (lines 18, 125), `generate-partner-demo/index.ts` (line 755), `generate-demo-template/index.ts` (line 112) | **NO** |
| `food_safety_advisory_text` | organizations | `AdminClientOnboarding.tsx` (line 120), `resolveJurisdictions.ts` (lines 19, 125), `generate-partner-demo/index.ts` (lines 756-760), `generate-demo-template/index.ts` (lines 113-118) | **NO** |

**Summary:** The 10 columns introduced by this migration account for all jurisdictions tribal columns and the core organizations tribal columns. Three additional organizations columns (`food_safety_mode`, `food_safety_authority`, `food_safety_advisory_text`) are referenced by code but NOT introduced by this migration — they must come from a separate migration or may also be missing from PROD. If this migration were applied, **10 of 13 code-referenced tribal columns would exist.** The remaining 3 need a separate investigation.

## 12. Reconciliation against transfer prompt's 6 tribes

The transfer prompt listed:
1. United Auburn Indian Community (UAIC) — Placer/Yuba
2. Tuolumne Band of Me-Wuk Indians — Tuolumne
3. Cachil DeHe Band of Wintun Indians (Colusa Indian Community) — Colusa
4. Picayune Rancheria of the Chukchansi Indians — Madera
5. Jackson Rancheria Band of Miwuk Indians — Amador
6. Coyote Valley Band of Pomo Indians — Mendocino

The migration seeds 7 tribes:
1. Table Mountain Rancheria — Fresno
2. Tachi-Yokut Tribe — Kings
3. Santa Ynez Band of Chumash — Santa Barbara
4. Morongo Band of Mission Indians — Riverside
5. Agua Caliente Band of Cahuilla Indians — Riverside
6. Pechanga Band of Luiseno Indians — Riverside
7. San Manuel Band of Mission Indians — San Bernardino

**Overlap:** 0 tribes. Zero intersection between the two lists.

**Tribes in migration but NOT in transfer prompt:** All 7 (Table Mountain, Tachi-Yokut, Santa Ynez, Morongo, Agua Caliente, Pechanga, San Manuel)

**Tribes in transfer prompt but NOT in migration:** All 6 (UAIC, Tuolumne Me-Wuk, Cachil DeHe/Colusa, Picayune Chukchansi, Jackson Rancheria Miwuk, Coyote Valley Pomo)

**Three competing tribe lists exist in the codebase:**

| Source | Tribe count | Tribes |
|---|---|---|
| This migration (20260705000000) | 7 | Table Mountain, Tachi-Yokut, Santa Ynez, Morongo, Agua Caliente, Pechanga, San Manuel |
| `AdminClientOnboarding.tsx` TRIBAL_OPTIONS | 7 | Same 7 as migration |
| `PartnerDemos.jsx` TRIBAL_OPTIONS | 7 | Same 7 as migration (but "Pechanga Band of Indians" — missing "Luiseno") |
| Transfer prompt | 6 | UAIC, Tuolumne Me-Wuk, Cachil DeHe, Picayune Chukchansi, Jackson Rancheria, Coyote Valley |

The migration's 7 tribes and the two UI files are aligned. The transfer prompt's 6 tribes are an entirely different set. **One of these lists is the intended production set; the other is stale or represents a different phase.**

## 13. Blockers / anomalies / surprises

### CRITICAL: Cleanup migration proves this migration WAS applied (and then partially reversed)

**Migration `20260720000000_cleanup_tribal_duplicates_and_enforce_uniqueness.sql`** (84 lines) contains explicit evidence:

```
-- Context: Production accumulated 30 duplicate tribal rows from repeat seed runs.
-- CA tribal dropped entirely — 7 of ~109 is incomplete coverage.
-- Revisit post-launch as dedicated CA tribal JIE buildout.
```

Actions taken by the cleanup migration:
1. **Deletes 30 duplicate tribal rows** (21 CA + 9 AZ) where `slug IS NULL` — duplicates caused by re-running this migration without `ON CONFLICT`
2. **Deletes all 7 remaining CA tribal originals** — intentionally dropped as "incomplete coverage"
3. **Preserves 9 AZ tribal rows** — "launch-ready coverage"
4. **Adds unique constraint** `(state, agency_name, governmental_level, county)` to prevent future duplicates
5. **Verifies end-state:** expects CA=62 (0 tribal), AZ=24 (9 tribal), OR=36, WA=39, NV=17, Grand=178

**Implication:** The tribal migration (20260705000000) WAS applied to PROD. The columns it introduced (`governmental_level`, `tribal_entity_name`, etc.) **should exist in PROD.** The prior audit's claim that these columns don't exist contradicts this finding. Either:
- (a) The prior PROD audit's column-existence check was wrong
- (b) A later migration dropped the columns (none found in the migration directory)
- (c) The cleanup migration was authored but never applied, and neither was this migration

**This contradiction must be resolved by running a live `information_schema.columns` query before any tribal design decision.**

### ANOMALY: Tribe name mismatch across codebase

| Source | Name |
|---|---|
| Migration + AdminClientOnboarding.tsx | `Pechanga Band of Luiseno Indians` |
| PartnerDemos.jsx | `Pechanga Band of Indians` |

The "Luiseno" qualifier is present in the migration and one UI file but missing in another. The official name is "Pechanga Band of Luiseño Indians."

### ANOMALY: No `ON CONFLICT` on INSERT — caused 30 duplicate rows

The INSERT has no idempotency guard. The cleanup migration confirms this caused 30 duplicates in PROD. The unique constraint was added only by the cleanup migration (`20260720000000`), not by this migration.

### ANOMALY: No `BEGIN`/`COMMIT` transaction wrap

If the INSERT fails partway through (e.g., after tribe 4), the DDL changes (columns, backfill) will persist but only some seed rows will exist. No rollback possible.

### ANOMALY: `scoring_type = 'advisory'` and `grading_type = 'advisory'` may violate CHECK constraints

The current `jurisdictions` table has CHECK constraints on `scoring_type` and `grading_type`. The values `'advisory'` for both fields are non-standard. Whether these are valid depends on whether the CHECK constraints were expanded by another migration. If they weren't, the INSERT would fail at runtime.

### ANOMALY: `grading_config` does not conform to canonical schema

The seed `grading_config` has top-level keys `nigc` and `advisory_note` — neither of which match the canonical schema v1 (`schema_version`, `evaluation_method`, `source`, `methodology`). Engine A dispatch on `evaluation_method` would fail or fall through to error for these rows.

### ANOMALY: No `fire_jurisdiction_config` populated

All 7 seeds set `fire_ahj_name = NULL` and do not include `fire_jurisdiction_config`. The migration header says "Fire safety remains under the county AHJ (existing rows)" — but there is no FK or pointer linking the tribal food-safety jurisdiction to the county fire-safety jurisdiction. The relationship is implicit (by county name), not enforced.

### ANOMALY: No `slug` set on any seed

All 7 rows have NULL `slug`. The `ScoreTableState.jsx` falls back to `toSlug(t.tribal_entity_name || t.county || "tribal")` (line 173), which would work. But the cleanup migration used `slug IS NULL` as a **duplicate marker** — meaning NULL slugs were treated as duplicates. Any re-insert without slugs would immediately be eligible for cleanup.

### ANOMALY: No `regulatory_framework_id` set

The INSERT does not include `regulatory_framework_id`. Tribal food safety uses "FDA Food Code 2022 (advisory)" per the `food_code_basis` column, but the FK to `regulatory_frameworks` is not set. Any code that joins `jurisdictions → regulatory_frameworks` will get NULL for tribal rows.

### ANOMALY: No `jie_audit_status` or `jie_verified_date` set

Tribal jurisdictions are not JIE-audited. They would default to whatever the column defaults are (likely NULL).

### INFO: 9 AZ tribal rows exist in PROD (if cleanup was applied)

The cleanup migration preserved 9 AZ tribal rows. These are not visible in this migration (they must have been seeded by `20260711000000_az_jurisdictions_food_safety.sql` or a similar AZ migration). This means the `governmental_level = 'tribal'` infrastructure IS being used — just for AZ, not CA.

### INFO: `generate-partner-demo` writes tribal config to `partner_demos.partner_config` JSONB (not to jurisdictions)

The edge function stores `sovereignty_type`, `nigc_overlay`, `nigc_config`, `food_safety_mode`, `food_safety_authority` inside the `partner_config` JSONB column on `partner_demos` — NOT on the jurisdictions or organizations tables. This is a demo-only path that avoids the missing-column issue.

### INFO: `TribalFoodSafetyAdvisory.jsx` is a dead export

The component at `src/components/TribalFoodSafetyAdvisory.jsx` (36 lines) is exported but **never imported** anywhere. `DemoTours.jsx` has a local copy (lines 72-93) that shadows it. This is dead code.

---

**End of findings. Waiting for Arthur's review. No changes proposed, no SQL drafted, no migration applied.**
