#!/usr/bin/env python3
"""
EvidLY Jurisdiction Intelligence Engine — DB Loader
====================================================

Maps validated crawl JSON into the existing `jurisdictions` table in Supabase.
Generates SQL UPDATE statements to correct/enrich seeded data.

Usage:
    # Generate SQL from validated results
    python3 load_jurisdictions.py --input results/ca/ --output update_jurisdictions.sql

    # Preview what would change (dry run)
    python3 load_jurisdictions.py --input results/ca/ --dry-run

    # Generate for specific counties only
    python3 load_jurisdictions.py --input results/ca/ --filter "Merced" "Fresno"

Then run the SQL in Supabase SQL Editor or through Claude Code.
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone


def map_grading_type(crawl_gs: dict) -> str:
    """Map crawl grading_system.type to DB grading_type enum."""
    gtype = crawl_gs.get("type", "unknown")
    mapping = {
        "letter_grade": "letter_grade",
        "numerical_score": "score_only",
        "pass_fail": "pass_fail",
        "hybrid": "letter_grade",  # Most hybrids are letter + score
        "other": "report_only",    # Custom systems default to report_only
        "unknown": "report_only",  # Unknown = no public grading = report_only
    }
    return mapping.get(gtype, "report_only")


def map_scoring_type(crawl_gs: dict) -> str:
    """Map crawl grading_system to DB scoring_type."""
    gtype = crawl_gs.get("type", "unknown")
    desc = crawl_gs.get("description", "").lower()

    if gtype == "letter_grade":
        if "deduction" in desc or "100 points" in desc or "start" in desc:
            return "weighted_deduction"
        return "weighted_deduction"  # Most CA letter grade counties
    elif gtype == "numerical_score":
        return "weighted_deduction"
    elif gtype == "pass_fail":
        return "pass_fail"
    elif gtype == "other":
        # Check for known patterns
        if "good" in desc and "satisfactory" in desc:
            return "weighted_deduction"  # Point-based like Merced
        if "violation" in desc and "count" in desc:
            return "major_violation_count"
        return "weighted_deduction"
    elif gtype == "unknown":
        return "weighted_deduction"  # CalCode default
    return "weighted_deduction"


def build_grading_config(crawl_gs: dict) -> dict:
    """Build grading_config JSONB from crawl data."""
    config = {
        "crawl_type": crawl_gs.get("type"),
        "description": crawl_gs.get("description"),
    }

    if crawl_gs.get("letter_grades"):
        config["letter_grades"] = crawl_gs["letter_grades"]
    if crawl_gs.get("grade_thresholds"):
        config["grade_thresholds"] = crawl_gs["grade_thresholds"]
    if crawl_gs.get("score_range_min") is not None:
        config["score_range_min"] = crawl_gs["score_range_min"]
    if crawl_gs.get("score_range_max") is not None:
        config["score_range_max"] = crawl_gs["score_range_max"]
    if crawl_gs.get("passing_threshold") is not None:
        config["passing_threshold"] = crawl_gs["passing_threshold"]

    return config


def build_violation_weight_map(crawl_gs: dict, crawl_insp: dict) -> dict:
    """Build violation_weight_map JSONB from crawl data."""
    weights = {}
    gt = crawl_gs.get("grade_thresholds")
    if isinstance(gt, dict):
        weights["grade_thresholds"] = gt

    # Extract any violation weights mentioned in description
    desc = crawl_gs.get("description", "")
    if desc:
        weights["methodology_description"] = desc

    return weights if weights else {}


def map_fire_ahj_type(crawl_fire: dict) -> str:
    """Map fire safety authority to fire_ahj_type."""
    dept = crawl_fire.get("department_name", "").lower()

    if "cal fire" in dept or "state fire marshal" in dept:
        return "cal_fire"
    elif "county fire" in dept or "county" in dept:
        return "county_fire"
    elif "city fire" in dept or "city" in dept:
        return "city_fire"
    elif "fire district" in dept or "district" in dept:
        return "fire_district"
    elif "federal" in dept or "nps" in dept:
        return "federal"
    elif "fire protection" in dept:
        return "county_fire"  # Most "Fire Protection District" in CA are county-level
    else:
        return "county_fire"  # Default for CA


def escape_sql(val: str) -> str:
    """Escape single quotes for SQL."""
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"


def generate_update_sql(record: dict) -> str:
    """Generate an UPDATE statement for one jurisdiction."""

    # Extract county name from jurisdiction_name
    jname = record.get("jurisdiction_name", "")
    county = jname.replace(" County", "").strip()
    state = record.get("state", "CA")

    gs = record.get("grading_system", {})
    insp = record.get("inspection_details", {})
    fire = record.get("fire_safety_authority", {})
    reg = record.get("regulatory_framework", {})
    validation = record.get("_validation", {})

    # Map fields
    grading_type = map_grading_type(gs)
    scoring_type = map_scoring_type(gs)
    grading_config = build_grading_config(gs)
    violation_weight_map = build_violation_weight_map(gs, insp)
    fire_ahj_type = map_fire_ahj_type(fire)

    # Thresholds
    pass_threshold = gs.get("passing_threshold")
    if pass_threshold is None and gs.get("grade_thresholds"):
        # Try to extract from grade thresholds
        gt = gs["grade_thresholds"]
        # Lowest passing grade minimum
        mins = [v.get("min") for v in gt.values()
                if isinstance(v, dict) and v.get("min") is not None]
        if mins:
            pass_threshold = min(mins)

    # Warning threshold = passing + buffer
    warning_threshold = None
    if isinstance(pass_threshold, (int, float)):
        warning_threshold = int(pass_threshold) + 5

    # Critical = pass threshold
    critical_threshold = pass_threshold

    # Build notes with crawl metadata
    notes_parts = []
    confidence = validation.get("computed_confidence", record.get("confidence_level", "?"))
    conf_score = validation.get("computed_confidence_score", "?")
    notes_parts.append(f"JIE crawl: confidence={confidence}({conf_score})")

    if record.get("needs_manual_verification"):
        notes_parts.append("NEEDS MANUAL VERIFICATION")

    verify_notes = record.get("verification_notes", "")
    if verify_notes:
        notes_parts.append(verify_notes)

    # Inspection details for notes
    freq = insp.get("frequency", "")
    if freq:
        notes_parts.append(f"Inspection freq: {freq[:200]}")

    reinsp = insp.get("reinspection_trigger", "")
    if reinsp:
        notes_parts.append(f"Reinspection: {reinsp[:200]}")

    notes = " | ".join(notes_parts)

    # Data sources
    sources = record.get("data_sources", [])
    data_source_url = sources[0] if sources else record.get("department_url", "")
    dept_url = record.get("department_url", "")

    # Scoring methodology description
    scoring_methodology = gs.get("description", "")
    if reg.get("food_code_basis"):
        scoring_methodology = f"{reg['food_code_basis']}. {scoring_methodology}"

    # Build the SQL
    sets = []
    sets.append(f"agency_name = {escape_sql(record.get('department_name'))}")
    sets.append(f"scoring_type = {escape_sql(scoring_type)}")
    sets.append(f"grading_type = {escape_sql(grading_type)}")
    sets.append(f"grading_config = {escape_sql(json.dumps(grading_config))}::jsonb")
    sets.append(f"scoring_methodology = {escape_sql(scoring_methodology[:500])}")
    sets.append(f"violation_weight_map = {escape_sql(json.dumps(violation_weight_map))}::jsonb")

    if pass_threshold is not None:
        sets.append(f"pass_threshold = {int(pass_threshold)}")
    if warning_threshold is not None:
        sets.append(f"warning_threshold = {int(warning_threshold)}")
    if critical_threshold is not None:
        sets.append(f"critical_threshold = {int(critical_threshold)}")

    sets.append(f"fire_ahj_name = {escape_sql(fire.get('department_name'))}")
    sets.append(f"fire_ahj_type = {escape_sql(fire_ahj_type)}")

    if fire.get("ansul_system_requirements"):
        has_amendments = True
    else:
        has_amendments = False
    sets.append(f"has_local_amendments = {str(has_amendments).lower()}")

    sets.append(f"data_source_type = 'jie_crawl'")
    sets.append(f"data_source_url = {escape_sql(data_source_url[:500])}")
    sets.append(f"notes = {escape_sql(notes[:1000])}")
    sets.append(f"last_sync_at = now()")
    sets.append(f"updated_at = now()")

    set_clause = ",\n    ".join(sets)

    # Match on state + county (case-insensitive)
    sql = f"""-- {jname} ({state}) — confidence: {confidence}({conf_score})
UPDATE jurisdictions
SET
    {set_clause}
WHERE state = {escape_sql(state)}
  AND lower(county) = lower({escape_sql(county)});"""

    return sql


def load_results(input_path: Path, name_filter: list = None) -> list:
    """Load validated crawl results."""
    records = []

    if input_path.is_dir():
        for f in sorted(input_path.rglob("*.json")):
            if f.name.startswith("_"):
                continue
            try:
                with open(f) as fh:
                    data = json.load(fh)
                if isinstance(data, dict):
                    meta = data.get("_meta", {})
                    if meta.get("status") == "success" or "_validation" in data:
                        records.append(data)
            except (json.JSONDecodeError, OSError):
                pass

    if name_filter:
        records = [
            r for r in records
            if any(f.lower() in r.get("jurisdiction_name", "").lower()
                   for f in name_filter)
        ]

    return records


def main():
    parser = argparse.ArgumentParser(
        description="Generate SQL to update jurisdictions table from crawl data"
    )
    parser.add_argument("--input", required=True, help="Path to validated results")
    parser.add_argument("--output", default=None, help="Output SQL file path")
    parser.add_argument("--filter", nargs="*", help="Filter by jurisdiction name")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    input_path = Path(args.input)
    records = load_results(input_path, args.filter)

    if not records:
        print("❌ No validated records found")
        sys.exit(1)

    print(f"📂 Loaded {len(records)} validated records\n")

    # Generate SQL
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sql_parts = [
        f"-- EvidLY Jurisdiction Intelligence Engine — DB Update",
        f"-- Generated: {timestamp}",
        f"-- Records: {len(records)}",
        f"-- Source: {input_path}",
        f"--",
        f"-- Run in Supabase SQL Editor or via Claude Code",
        f"-- These UPDATE existing seeded rows with crawl-verified data",
        f"",
        f"BEGIN;",
        f"",
    ]

    for record in sorted(records, key=lambda r: r.get("jurisdiction_name", "")):
        jname = record.get("jurisdiction_name", "?")
        gs = record.get("grading_system", {})
        conf = record.get("_validation", {}).get("computed_confidence",
               record.get("confidence_level", "?"))

        sql = generate_update_sql(record)
        sql_parts.append(sql)
        sql_parts.append("")

        if args.dry_run:
            grading_type = map_grading_type(gs)
            print(f"  {jname}: grading_type → {grading_type}, "
                  f"scoring_type → {map_scoring_type(gs)}, "
                  f"conf: {conf}")

    # Verification query
    sql_parts.append("-- Verification: check updated rows")
    counties = [r.get("jurisdiction_name", "").replace(" County", "").strip()
                for r in records]
    county_list = ", ".join(f"'{c}'" for c in counties)
    sql_parts.append(f"""SELECT county, grading_type, scoring_type, agency_name,
       fire_ahj_name, pass_threshold, data_source_type, updated_at
FROM jurisdictions
WHERE county IN ({county_list})
ORDER BY county;""")
    sql_parts.append("")
    sql_parts.append("COMMIT;")

    full_sql = "\n".join(sql_parts)

    if args.dry_run:
        print(f"\n{'='*60}")
        print(f"DRY RUN — {len(records)} records would be updated")
        print(f"{'='*60}")
        return

    # Write SQL file
    if args.output:
        out_path = Path(args.output)
    else:
        out_path = input_path / "_update_jurisdictions.sql"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        f.write(full_sql)

    print(f"✅ Generated SQL: {out_path}")
    print(f"   {len(records)} UPDATE statements")
    print(f"\n   Run in Supabase SQL Editor or tell Claude Code:")
    print(f"   Run the SQL in {out_path} against Supabase")


if __name__ == "__main__":
    main()
