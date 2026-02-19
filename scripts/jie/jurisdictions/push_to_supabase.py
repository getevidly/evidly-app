#!/usr/bin/env python3
"""
EvidLY Jurisdiction Intelligence Engine - Supabase REST API Updater
===================================================================

Reads validated crawl JSON and PATCHes each jurisdiction record
via the Supabase PostgREST API (no psql needed).

Usage:
    python push_to_supabase.py
"""

import json
import sys
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone


# ── Config ──────────────────────────────────────────────────────────────
SUPABASE_URL = "https://irxgmhxhmxtzfwuieblc.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA"

VALIDATED_JSON = Path(__file__).parent / "results" / "validated" / "_validated_combined.json"

REST_ENDPOINT = f"{SUPABASE_URL}/rest/v1/jurisdictions"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# ── Mapping functions (mirroring load_jurisdictions.py) ─────────────────

def map_grading_type(crawl_gs: dict) -> str:
    gtype = crawl_gs.get("type", "unknown")
    mapping = {
        "letter_grade": "letter_grade",
        "numerical_score": "score_only",
        "pass_fail": "pass_fail",
        "hybrid": "letter_grade",
        "other": "report_only",
        "unknown": "report_only",
    }
    return mapping.get(gtype, "report_only")


def map_scoring_type(crawl_gs: dict) -> str:
    gtype = crawl_gs.get("type", "unknown")
    desc = crawl_gs.get("description", "").lower()
    if gtype == "letter_grade":
        return "weighted_deduction"
    elif gtype == "numerical_score":
        return "weighted_deduction"
    elif gtype == "pass_fail":
        return "pass_fail"
    elif gtype == "other":
        if "good" in desc and "satisfactory" in desc:
            return "weighted_deduction"
        if "violation" in desc and "count" in desc:
            return "major_violation_count"
        return "weighted_deduction"
    elif gtype == "unknown":
        return "weighted_deduction"
    return "weighted_deduction"


def build_grading_config(crawl_gs: dict) -> dict:
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


def build_violation_weight_map(crawl_gs: dict) -> dict:
    weights = {}
    gt = crawl_gs.get("grade_thresholds")
    if isinstance(gt, dict):
        weights["grade_thresholds"] = gt
    desc = crawl_gs.get("description", "")
    if desc:
        weights["methodology_description"] = desc
    return weights if weights else {}


def map_fire_ahj_type(crawl_fire: dict) -> str:
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
        return "county_fire"
    else:
        return "county_fire"


# ── Build the PATCH body for one record ─────────────────────────────────

def build_patch_body(record: dict) -> dict:
    gs = record.get("grading_system", {})
    insp = record.get("inspection_details", {})
    fire = record.get("fire_safety_authority", {})
    reg = record.get("regulatory_framework", {})
    validation = record.get("_validation", {})

    # Build notes
    notes_parts = []
    confidence = validation.get("computed_confidence", record.get("confidence_level", "?"))
    conf_score = validation.get("computed_confidence_score", "?")
    notes_parts.append(f"JIE crawl: confidence={confidence}({conf_score})")

    if record.get("needs_manual_verification"):
        notes_parts.append("NEEDS MANUAL VERIFICATION")

    verify_notes = record.get("verification_notes", "")
    if verify_notes:
        notes_parts.append(verify_notes)

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

    # Scoring methodology
    scoring_methodology = gs.get("description", "")
    if reg.get("food_code_basis"):
        scoring_methodology = f"{reg['food_code_basis']}. {scoring_methodology}"

    # Has local amendments
    has_amendments = bool(fire.get("ansul_system_requirements"))

    now_iso = datetime.now(timezone.utc).isoformat()

    body = {
        "agency_name": record.get("department_name"),
        "scoring_type": map_scoring_type(gs),
        "grading_type": map_grading_type(gs),
        "grading_config": build_grading_config(gs),
        "scoring_methodology": scoring_methodology[:500],
        "violation_weight_map": build_violation_weight_map(gs),
        "fire_ahj_name": fire.get("department_name"),
        "fire_ahj_type": map_fire_ahj_type(fire),
        "has_local_amendments": has_amendments,
        "data_source_type": "jie_crawl",
        "data_source_url": data_source_url[:500] if data_source_url else None,
        "notes": notes[:1000],
        "last_sync_at": now_iso,
        "updated_at": now_iso,
    }

    return body


# ── Execute PATCH via urllib ────────────────────────────────────────────

def patch_jurisdiction(county: str, state: str, body: dict) -> tuple:
    """
    PATCH the jurisdiction row matching state + county.
    Returns (success: bool, status_code: int, message: str)
    """
    # Build URL with query params to match the row
    params = urllib.parse.urlencode({
        "state": f"eq.{state}",
        "county": f"eq.{county}",
    })
    url = f"{REST_ENDPOINT}?{params}"

    data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, method="PATCH")
    for k, v in HEADERS.items():
        req.add_header(k, v)

    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            return (True, status, "OK")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return (False, e.code, err_body)
    except Exception as e:
        return (False, 0, str(e))


# ── Main ────────────────────────────────────────────────────────────────

def main():
    # Load validated JSON
    if not VALIDATED_JSON.exists():
        print(f"ERROR: Cannot find {VALIDATED_JSON}")
        sys.exit(1)

    with open(VALIDATED_JSON) as f:
        records = json.load(f)

    print(f"Loaded {len(records)} records from validated JSON")
    print(f"Target: {REST_ENDPOINT}")
    print(f"{'='*70}")

    succeeded = 0
    failed = 0
    failures = []

    for i, record in enumerate(records, 1):
        jname = record.get("jurisdiction_name", "?")
        county = jname.replace(" County", "").strip()
        state = record.get("state", "CA")

        body = build_patch_body(record)

        ok, status, msg = patch_jurisdiction(county, state, body)

        if ok:
            succeeded += 1
            print(f"  [{i:2d}/51] OK  {county} County ({state}) -> HTTP {status}")
        else:
            failed += 1
            failures.append((county, status, msg))
            print(f"  [{i:2d}/51] FAIL {county} County ({state}) -> HTTP {status}: {msg[:200]}")

    print(f"\n{'='*70}")
    print(f"RESULTS: {succeeded} succeeded, {failed} failed out of {len(records)} total")

    if failures:
        print(f"\nFailed counties:")
        for county, status, msg in failures:
            print(f"  - {county}: HTTP {status} => {msg[:300]}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
