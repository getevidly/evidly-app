# EvidLY Jurisdiction Intelligence Engine

Parallel Claude API crawl → validation → verified export → DB import.

**Nothing touches `jurisdiction_configs` without passing validation.**

## Workflow

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌────────────┐
│  1. CRAWL   │ ──▶ │  2. VALIDATE     │ ──▶ │  3. EXPORT   │ ──▶ │ 4. IMPORT  │
│  Raw JSON   │     │  Schema check    │     │  Clean JSON  │     │ Supabase   │
│  from web   │     │  Integrity rules │     │  Computed    │     │ jurisdiction│
│  search     │     │  Cross-checks    │     │  confidence  │     │ _configs   │
│             │     │  Confidence calc │     │  only        │     │            │
└─────────────┘     └──────────────────┘     └──────────────┘     └────────────┘
                           │                        │
                     Blocked records          Validated records
                     stay in results/         go to validated/
                     Fix and re-crawl         Ready for DB
```

## Setup

```bash
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Step 1: Crawl

```bash
# Single state
python3 jurisdiction_crawl.py --jurisdictions jurisdictions/ca_jurisdictions.json --output results/ca/

# All 11 states (267 jurisdictions)
python3 crawl_all_states.py --output results/

# Dry run first
python3 crawl_all_states.py --dry-run

# Just priority markets
python3 crawl_all_states.py --states CA TX NY FL --priority phase_1,phase_2,tier_1

# Adjust concurrency / retries
python3 crawl_all_states.py --max-concurrent 10 --max-retries 3
```

## Step 2: Validate (mandatory)

```bash
# Validate — exits nonzero if anything fails
python3 validate_jurisdictions.py --input results/ --strict

# Verbose — see every issue
python3 validate_jurisdictions.py --input results/ --strict --verbose
```

### What validation checks

**Schema** — Every required field present with correct type. Valid enum values.

**Grading integrity:**
- `letter_grade` → must have `letter_grades` array + `grade_thresholds`
- `numerical_score` → must have `score_range_min/max`, threshold sanity (min < max, threshold within range)
- `pass_fail` → shouldn't have letter grades populated (suggests hybrid)
- `hybrid` → must describe what's combined
- `unknown` → MUST have `needs_manual_verification: true` or blocked
- Grade threshold overlap/gap detection
- Threshold-to-grade array consistency

**Inspection integrity** — Frequency defined, reinspection triggers, risk categories.

**Fire safety integrity** — AHJ identified, hood system requirement known.

**Regulatory integrity** — Food code basis defined (fundamental requirement), inspection authority specified.

**Source validation** — URLs have http/https scheme, domains resolve, data_sources non-empty.

**Computed confidence** — Independent score 0-100 based on data completeness. Does NOT trust LLM self-report. Flags disagreements. Forces `needs_manual_verification` when computed confidence is low.

**Cross-jurisdiction** — Duplicate names caught. Unusual food code basis variation flagged. Grading type consistency within a state.

### Validation outcomes

| Outcome | Meaning |
|---------|---------|
| ✅ Clean | Zero errors, zero warnings. Ready for import. |
| ⚠️ Eligible with warnings | Importable but review warnings. Data gaps exist. |
| ❌ Blocked | Has errors. Fix source data and re-crawl/re-validate. |

## Step 3: Export validated records

```bash
python3 validate_jurisdictions.py --input results/ --export validated/ --strict
```

Only import-eligible records land in `validated/`. Each gets:
- `confidence_level` overridden with computed value (never LLM self-report)
- `_validation` block with score, timestamps, warning details

## Step 4: Import to Supabase

Load `validated/_validated_combined.json` into `jurisdiction_configs`. All scoring weights come FROM this config — never hardcoded.

## Coverage: 267 jurisdictions across 11 states

| State | Count | Notes |
|-------|:---:|-------|
| CA | 63 | All 58 counties + Berkeley/Long Beach/Pasadena/Vernon + NPS Federal |
| TX | 30 | Top metros + independent city health depts |
| NY | 20 | NYC (all boroughs) + top metro counties |
| FL | 20 | Top metro + tourism counties |
| OH | 20 | Top metros + independent city health depts |
| IL | 20 | Chicago + collar counties |
| MA | 20 | City/town-based (county govt abolished) |
| AZ | 17 | All 15 counties + Phoenix/Tucson |
| NV | 17 | All counties + Carson City |
| WA | 20 | Seattle metro + top counties |
| OR | 20 | Portland metro + top counties |

## Testing the validation layer

```bash
python3 test_validation.py
```

22 test cases covering: clean records, missing fields, wrong types, invalid enums, grading type / data mismatches, score range inversions, threshold boundary violations, unknown grading without verification flag, cross-jurisdiction duplicates, threshold overlaps, garbage descriptions, crawl error records, confidence override.

## Adding states

1. Create `jurisdictions/{state}_jurisdictions.json`
2. Add to `STATE_FILES` in `crawl_all_states.py`
3. Crawl → Validate → Export → Import

The same validation rules apply regardless of state.
