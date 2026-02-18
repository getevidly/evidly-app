#!/usr/bin/env python3
"""
EvidLY Jurisdiction Intelligence Engine — Validation & Integrity Layer
======================================================================

Validates crawled jurisdiction data BEFORE it touches the database.
Nothing goes into jurisdiction_configs without passing this.

Usage:
    # Validate a single state's results
    python3 validate_jurisdictions.py --input results/ca/

    # Validate all states
    python3 validate_jurisdictions.py --input results/

    # Strict mode — zero tolerance, any failure = nonzero exit code
    python3 validate_jurisdictions.py --input results/ --strict

    # Export only validated records (clean output for DB import)
    python3 validate_jurisdictions.py --input results/ca/ --export validated/ca/

    # Show full detail on failures
    python3 validate_jurisdictions.py --input results/ca/ --verbose

Exit codes:
    0 = All records passed validation
    1 = Some records failed validation (details in report)
    2 = Fatal error (can't read input, etc.)
"""

import json
import sys
import argparse
import re
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse


# ============================================================================
# SCHEMA DEFINITION — Single source of truth for jurisdiction_configs shape
# ============================================================================

VALID_GRADING_TYPES = {
    "letter_grade", "numerical_score", "pass_fail", "hybrid", "other", "unknown"
}
VALID_CONFIDENCE_LEVELS = {"high", "medium", "low"}
VALID_JURISDICTION_TYPES = {"county", "city", "federal", "state"}
VALID_US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC",
}

# Required top-level fields and their expected types
REQUIRED_FIELDS = {
    "jurisdiction_name": str,
    "jurisdiction_type": str,
    "state": str,
    "department_name": str,
    "grading_system": dict,
    "inspection_details": dict,
    "fire_safety_authority": dict,
    "regulatory_framework": dict,
    "confidence_level": str,
    "needs_manual_verification": bool,
}

# Required nested fields
REQUIRED_GRADING_FIELDS = {"type": str, "description": str}
REQUIRED_INSPECTION_FIELDS = {"frequency": str}
REQUIRED_FIRE_FIELDS = {"department_name": str}
REQUIRED_REGULATORY_FIELDS = {"food_code_basis": str}


# ============================================================================
# VALIDATION RESULT TYPES
# ============================================================================

@dataclass
class ValidationIssue:
    """A single validation problem found in a record."""
    severity: str   # "error" = blocks import, "warning" = needs review, "info" = observation
    category: str   # schema, integrity, consistency, confidence, source
    field: str      # dotted path to the field, e.g. "grading_system.type"
    message: str    # human-readable description
    value: object = None  # the actual problematic value

    def __str__(self):
        icon = {"error": "❌", "warning": "⚠️ ", "info": "ℹ️ "}.get(self.severity, "?")
        val_str = f" (got: {repr(self.value)[:80]})" if self.value is not None else ""
        return f"{icon} [{self.category}] {self.field}: {self.message}{val_str}"


@dataclass
class ValidationResult:
    """Complete validation result for one jurisdiction record."""
    jurisdiction_name: str
    state: str
    source_file: str
    issues: list = field(default_factory=list)
    computed_confidence: Optional[str] = None
    computed_confidence_score: int = 0
    llm_confidence: Optional[str] = None
    import_eligible: bool = True  # False if any errors exist

    @property
    def errors(self):
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self):
        return [i for i in self.issues if i.severity == "warning"]

    @property
    def infos(self):
        return [i for i in self.issues if i.severity == "info"]

    def add(self, severity, category, fld, message, value=None):
        issue = ValidationIssue(severity, category, fld, message, value)
        self.issues.append(issue)
        if severity == "error":
            self.import_eligible = False
        return issue


# ============================================================================
# VALIDATORS — Each function checks one aspect of data integrity
# ============================================================================

def validate_schema(record: dict, result: ValidationResult):
    """Check that all required fields exist with correct types."""

    # Top-level required fields
    for field_name, expected_type in REQUIRED_FIELDS.items():
        if field_name not in record:
            result.add("error", "schema", field_name, "Missing required field")
        elif not isinstance(record[field_name], expected_type):
            result.add(
                "error", "schema", field_name,
                f"Wrong type: expected {expected_type.__name__}, "
                f"got {type(record[field_name]).__name__}",
                record[field_name],
            )

    # Grading system nested fields
    gs = record.get("grading_system")
    if isinstance(gs, dict):
        for fname, ftype in REQUIRED_GRADING_FIELDS.items():
            if fname not in gs:
                result.add("error", "schema", f"grading_system.{fname}",
                           "Missing required field")
            elif not isinstance(gs[fname], ftype):
                result.add("error", "schema", f"grading_system.{fname}",
                           f"Wrong type: expected {ftype.__name__}", gs[fname])

    # Inspection details nested fields
    insp = record.get("inspection_details")
    if isinstance(insp, dict):
        for fname, ftype in REQUIRED_INSPECTION_FIELDS.items():
            if fname not in insp:
                result.add("error", "schema", f"inspection_details.{fname}",
                           "Missing required field")

    # Fire safety nested fields
    fire = record.get("fire_safety_authority")
    if isinstance(fire, dict):
        for fname, ftype in REQUIRED_FIRE_FIELDS.items():
            if fname not in fire:
                result.add("warning", "schema", f"fire_safety_authority.{fname}",
                           "Missing field — fire AHJ unknown")

    # Regulatory framework nested fields
    reg = record.get("regulatory_framework")
    if isinstance(reg, dict):
        for fname, ftype in REQUIRED_REGULATORY_FIELDS.items():
            if fname not in reg:
                result.add("error", "schema", f"regulatory_framework.{fname}",
                           "Missing required field")

    # data_sources should be a non-empty list
    ds = record.get("data_sources")
    if ds is None:
        result.add("warning", "schema", "data_sources",
                    "Missing data_sources field — no provenance")
    elif not isinstance(ds, list):
        result.add("error", "schema", "data_sources",
                    "data_sources must be a list", ds)
    elif len(ds) == 0:
        result.add("warning", "schema", "data_sources",
                    "Empty data_sources — no provenance")


def validate_enum_values(record: dict, result: ValidationResult):
    """Check that enum fields contain valid values."""

    jtype = record.get("jurisdiction_type")
    if isinstance(jtype, str) and jtype not in VALID_JURISDICTION_TYPES:
        result.add("error", "schema", "jurisdiction_type",
                    f"Invalid value. Must be one of: {VALID_JURISDICTION_TYPES}", jtype)

    state = record.get("state")
    if isinstance(state, str) and state not in VALID_US_STATES:
        result.add("error", "schema", "state",
                    "Invalid state code. Must be 2-letter US state abbreviation.", state)

    gs = record.get("grading_system", {})
    gtype = gs.get("type") if isinstance(gs, dict) else None
    if isinstance(gtype, str) and gtype not in VALID_GRADING_TYPES:
        result.add("error", "schema", "grading_system.type",
                    f"Invalid value. Must be one of: {VALID_GRADING_TYPES}", gtype)

    conf = record.get("confidence_level")
    if isinstance(conf, str) and conf not in VALID_CONFIDENCE_LEVELS:
        result.add("error", "schema", "confidence_level",
                    f"Invalid value. Must be one of: {VALID_CONFIDENCE_LEVELS}", conf)


def validate_grading_integrity(record: dict, result: ValidationResult):
    """Check that grading system data is internally consistent."""

    gs = record.get("grading_system")
    if not isinstance(gs, dict):
        return

    gtype = gs.get("type")
    desc = gs.get("description", "")

    # -- letter_grade must have letter_grades array and thresholds --
    if gtype == "letter_grade":
        lg = gs.get("letter_grades")
        if lg is None or (isinstance(lg, list) and len(lg) == 0):
            result.add("error", "integrity", "grading_system.letter_grades",
                       "type is 'letter_grade' but letter_grades array is missing or empty")
        gt = gs.get("grade_thresholds")
        if gt is None or (isinstance(gt, dict) and len(gt) == 0):
            result.add("warning", "integrity", "grading_system.grade_thresholds",
                       "type is 'letter_grade' but no grade_thresholds defined — "
                       "scoring cannot be computed")
        # Validate threshold consistency if both exist
        if isinstance(lg, list) and isinstance(gt, dict):
            for grade in lg:
                if grade not in gt:
                    result.add("warning", "integrity", "grading_system.grade_thresholds",
                               f"Grade '{grade}' in letter_grades but missing from thresholds")
            for grade in gt:
                if grade not in lg:
                    result.add("warning", "integrity", "grading_system.grade_thresholds",
                               f"Grade '{grade}' in thresholds but not in letter_grades array")
            # Check threshold overlaps/gaps
            _validate_threshold_ranges(gt, result)

    # -- numerical_score must have score range --
    elif gtype == "numerical_score":
        smin = gs.get("score_range_min")
        smax = gs.get("score_range_max")
        if smin is None or smax is None:
            result.add("error", "integrity", "grading_system.score_range",
                       "type is 'numerical_score' but score_range_min/max not defined")
        elif isinstance(smin, (int, float)) and isinstance(smax, (int, float)):
            if smin >= smax:
                result.add("error", "integrity", "grading_system.score_range",
                           f"score_range_min ({smin}) >= score_range_max ({smax})")
            if smin < 0:
                result.add("warning", "integrity", "grading_system.score_range_min",
                           "Negative minimum score — verify this is correct", smin)
            if smax > 200:
                result.add("warning", "integrity", "grading_system.score_range_max",
                           "Unusually high maximum score — verify", smax)

    # -- pass_fail shouldn't have letter grades populated --
    elif gtype == "pass_fail":
        lg = gs.get("letter_grades")
        if isinstance(lg, list) and len(lg) > 0:
            result.add("warning", "integrity", "grading_system.letter_grades",
                       "type is 'pass_fail' but letter_grades populated — "
                       "should this be 'hybrid'?")

    # -- hybrid should explain what it combines --
    elif gtype == "hybrid":
        if not isinstance(desc, str) or len(desc) < 20:
            result.add("warning", "integrity", "grading_system.description",
                       "type is 'hybrid' but description lacks detail on "
                       "what systems are combined")

    # -- unknown MUST flag for verification --
    elif gtype == "unknown":
        if not record.get("needs_manual_verification"):
            result.add("error", "integrity", "grading_system.type",
                       "type is 'unknown' but needs_manual_verification is not True — "
                       "cannot import unverified grading data")

    # Check for placeholder descriptions
    if isinstance(desc, str):
        garbage = [
            r"^n/?a$", r"^unknown$", r"^none$", r"^tbd$",
            r"^not available$", r"^.$", r"^see above$",
        ]
        for pat in garbage:
            if re.match(pat, desc.strip(), re.IGNORECASE):
                result.add("warning", "integrity", "grading_system.description",
                           "Placeholder/garbage description", desc)
                break

    # Passing threshold sanity
    pt = gs.get("passing_threshold")
    smax = gs.get("score_range_max")
    smin = gs.get("score_range_min")
    if isinstance(pt, (int, float)):
        if isinstance(smax, (int, float)) and pt > smax:
            result.add("error", "integrity", "grading_system.passing_threshold",
                       f"passing_threshold ({pt}) exceeds score_range_max ({smax})")
        if isinstance(smin, (int, float)) and pt < smin:
            result.add("error", "integrity", "grading_system.passing_threshold",
                       f"passing_threshold ({pt}) below score_range_min ({smin})")
        if pt == 0:
            result.add("warning", "integrity", "grading_system.passing_threshold",
                       "passing_threshold is 0 — verify this is correct")


def _validate_threshold_ranges(thresholds: dict, result: ValidationResult):
    """Check that grade thresholds don't overlap or have gaps."""
    ranges = []
    for grade, bounds in thresholds.items():
        if not isinstance(bounds, dict):
            continue
        lo = bounds.get("min")
        hi = bounds.get("max")
        if isinstance(lo, (int, float)) and isinstance(hi, (int, float)):
            if lo > hi:
                result.add("error", "integrity", "grading_system.grade_thresholds",
                           f"Grade '{grade}' has min ({lo}) > max ({hi})")
            ranges.append((lo, hi, grade))

    # Sort by min and check for overlaps
    ranges.sort(key=lambda x: x[0])
    for i in range(len(ranges) - 1):
        _, hi_a, grade_a = ranges[i]
        lo_b, _, grade_b = ranges[i + 1]
        if hi_a >= lo_b:
            result.add("warning", "integrity", "grading_system.grade_thresholds",
                       f"Possible overlap: '{grade_a}' max={hi_a} vs '{grade_b}' min={lo_b}")


def validate_inspection_integrity(record: dict, result: ValidationResult):
    """Check inspection details for completeness and sanity."""

    insp = record.get("inspection_details")
    if not isinstance(insp, dict):
        return

    freq = insp.get("frequency", "")
    if isinstance(freq, str) and len(freq.strip()) < 5:
        result.add("warning", "integrity", "inspection_details.frequency",
                    "Frequency description too vague", freq)

    reinsp = insp.get("reinspection_trigger")
    if reinsp is None or (isinstance(reinsp, str) and len(reinsp.strip()) < 3):
        result.add("warning", "integrity", "inspection_details.reinspection_trigger",
                    "No reinspection trigger defined — operators won't know "
                    "what triggers follow-up")

    disc = insp.get("public_disclosure")
    if disc is None or (isinstance(disc, str) and len(disc.strip()) < 3):
        result.add("info", "integrity", "inspection_details.public_disclosure",
                    "No public disclosure info — not all jurisdictions require this")


def validate_fire_safety_integrity(record: dict, result: ValidationResult):
    """Check fire safety data for completeness."""

    fire = record.get("fire_safety_authority")
    if not isinstance(fire, dict):
        result.add("warning", "integrity", "fire_safety_authority",
                    "Fire safety authority data missing entirely")
        return

    dept = fire.get("department_name", "")
    if isinstance(dept, str) and len(dept.strip()) < 3:
        result.add("warning", "integrity", "fire_safety_authority.department_name",
                    "Fire AHJ name is missing or too short")

    hood = fire.get("hood_system_inspection_required")
    if hood is None:
        result.add("warning", "integrity",
                    "fire_safety_authority.hood_system_inspection_required",
                    "Hood system requirement unknown — critical for "
                    "commercial kitchen compliance")


def validate_regulatory_integrity(record: dict, result: ValidationResult):
    """Check regulatory framework data."""

    reg = record.get("regulatory_framework")
    if not isinstance(reg, dict):
        return

    food_code = reg.get("food_code_basis", "")
    if isinstance(food_code, str) and len(food_code.strip()) < 5:
        result.add("error", "integrity", "regulatory_framework.food_code_basis",
                    "Food code basis is missing or too vague — fundamental requirement")

    auth = reg.get("state_vs_local_authority", "")
    if isinstance(auth, str) and len(auth.strip()) < 3:
        result.add("warning", "integrity",
                    "regulatory_framework.state_vs_local_authority",
                    "Inspection authority (state/county/city) not specified")


def validate_sources(record: dict, result: ValidationResult):
    """Check data source URLs for basic validity."""

    sources = record.get("data_sources", [])
    if not isinstance(sources, list):
        return

    dept_url = record.get("department_url")
    all_urls = list(sources)
    if isinstance(dept_url, str) and dept_url.strip():
        all_urls.append(dept_url)
    else:
        result.add("warning", "source", "department_url",
                    "No department URL provided")

    for i, url in enumerate(all_urls):
        if not isinstance(url, str):
            result.add("warning", "source", f"data_sources[{i}]",
                       "Non-string source entry", url)
            continue

        url = url.strip()
        if not url:
            continue

        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                result.add("warning", "source", f"data_sources[{i}]",
                           "URL missing http/https scheme", url)
            if not parsed.netloc:
                result.add("warning", "source", f"data_sources[{i}]",
                           "URL has no domain", url)
        except Exception:
            result.add("warning", "source", f"data_sources[{i}]",
                       "Invalid URL format", url)


def compute_confidence(record: dict, result: ValidationResult) -> int:
    """
    Compute an independent confidence score based on data completeness
    and quality signals. Does NOT trust the LLM's self-reported confidence.

    Returns integer score 0-100.
    """

    score = 100  # Start at 100, deduct for problems

    gs = record.get("grading_system", {})
    if not isinstance(gs, dict):
        gs = {}

    # --- Grading system completeness (40 points at stake) ---
    gtype = gs.get("type", "unknown")
    if gtype == "unknown":
        score -= 40
    elif gtype in ("letter_grade", "numerical_score"):
        if gtype == "letter_grade":
            if not gs.get("letter_grades"):
                score -= 20
            if not gs.get("grade_thresholds"):
                score -= 15
        elif gtype == "numerical_score":
            if gs.get("score_range_min") is None or gs.get("score_range_max") is None:
                score -= 20
            if gs.get("passing_threshold") is None:
                score -= 10

    desc = gs.get("description", "")
    if not isinstance(desc, str) or len(desc) < 20:
        score -= 10

    # --- Inspection details (20 points at stake) ---
    insp = record.get("inspection_details", {})
    if not isinstance(insp, dict):
        insp = {}
    if not insp.get("frequency"):
        score -= 10
    if not insp.get("reinspection_trigger"):
        score -= 5
    if not insp.get("risk_categories"):
        score -= 5

    # --- Fire safety (20 points at stake) ---
    fire = record.get("fire_safety_authority", {})
    if not isinstance(fire, dict):
        fire = {}
    if not fire.get("department_name"):
        score -= 10
    if fire.get("hood_system_inspection_required") is None:
        score -= 10

    # --- Regulatory (15 points at stake) ---
    reg = record.get("regulatory_framework", {})
    if not isinstance(reg, dict):
        reg = {}
    if not reg.get("food_code_basis"):
        score -= 15

    # --- Source quality (15 points at stake) ---
    sources = record.get("data_sources", [])
    if not isinstance(sources, list):
        sources = []
    if len(sources) == 0:
        score -= 15
    elif len(sources) == 1:
        score -= 5
    # Bonus for .gov sources (max +5)
    gov_sources = [s for s in sources if isinstance(s, str) and ".gov" in s.lower()]
    if gov_sources:
        score += 5

    # --- Penalize existing validation errors ---
    error_count = len(result.errors)
    warning_count = len(result.warnings)
    score -= (error_count * 10)
    score -= (warning_count * 3)

    # Clamp to 0-100
    score = max(0, min(100, score))

    # Map to level
    if score >= 75:
        computed = "high"
    elif score >= 45:
        computed = "medium"
    else:
        computed = "low"

    result.computed_confidence = computed
    result.computed_confidence_score = score
    result.llm_confidence = record.get("confidence_level", "unknown")

    # Flag disagreement
    llm_conf = result.llm_confidence
    if computed != llm_conf and llm_conf in VALID_CONFIDENCE_LEVELS:
        conf_rank = {"high": 3, "medium": 2, "low": 1}
        if conf_rank.get(llm_conf, 0) > conf_rank.get(computed, 0):
            result.add("warning", "confidence", "confidence_level",
                       f"LLM self-reported '{llm_conf}' but computed confidence "
                       f"is '{computed}' (score: {score}/100) — LLM may be overconfident",
                       {"llm": llm_conf, "computed": computed, "score": score})

    # Force manual verification flag when confidence is low
    if computed == "low" and not record.get("needs_manual_verification"):
        result.add("error", "confidence", "needs_manual_verification",
                    f"Computed confidence is LOW (score: {score}/100) but "
                    f"needs_manual_verification is not True — cannot import "
                    f"low-confidence data without verification flag")

    return score


# ============================================================================
# CROSS-JURISDICTION VALIDATION
# ============================================================================

def validate_cross_jurisdiction(
    all_results: list, all_records: list
) -> list:
    """Check for inconsistencies across jurisdictions in the same state."""

    cross_issues = []

    # Group by state
    by_state = {}
    for vr, rec in zip(all_results, all_records):
        state = rec.get("state", "??")
        by_state.setdefault(state, []).append((vr, rec))

    for state, entries in by_state.items():
        if len(entries) < 2:
            continue

        # --- Food code basis consistency ---
        food_codes = {}
        for vr, rec in entries:
            reg = rec.get("regulatory_framework", {})
            if isinstance(reg, dict):
                fc = reg.get("food_code_basis", "")
                if isinstance(fc, str) and fc.strip():
                    food_codes.setdefault(fc.strip(), []).append(
                        rec.get("jurisdiction_name", "?")
                    )

        if len(food_codes) > 3:
            codes_summary = {k: len(v) for k, v in food_codes.items()}
            cross_issues.append(ValidationIssue(
                "warning", "consistency", f"state:{state}",
                f"{len(food_codes)} distinct food code bases — "
                f"verify: {codes_summary}",
            ))

        # --- Duplicate jurisdiction names ---
        seen = {}
        for _, rec in entries:
            name = rec.get("jurisdiction_name", "?")
            norm = name.strip().lower()
            if norm in seen:
                cross_issues.append(ValidationIssue(
                    "error", "consistency", "jurisdiction_name",
                    f"Duplicate jurisdiction name in {state}: '{name}'",
                ))
            seen[norm] = True

        # --- Grading system consistency check ---
        # Most counties in a state should have the same grading type
        # (exceptions: city-level overrides like LA County letter grades)
        grading_types = {}
        for vr, rec in entries:
            gs = rec.get("grading_system", {})
            if isinstance(gs, dict):
                gt = gs.get("type", "unknown")
                grading_types.setdefault(gt, []).append(
                    rec.get("jurisdiction_name", "?")
                )
        if len(grading_types) > 3 and "unknown" not in grading_types:
            cross_issues.append(ValidationIssue(
                "warning", "consistency", f"state:{state}",
                f"{len(grading_types)} distinct grading types — "
                f"unusual, verify: {list(grading_types.keys())}",
            ))

    return cross_issues


# ============================================================================
# MAIN VALIDATION PIPELINE
# ============================================================================

def validate_record(record: dict, source_file: str) -> ValidationResult:
    """Run all validators on a single jurisdiction record."""

    jname = record.get("jurisdiction_name", "UNKNOWN")
    state = record.get("state", "??")
    result = ValidationResult(
        jurisdiction_name=jname,
        state=state,
        source_file=source_file,
    )

    # Skip error records from the crawl
    meta = record.get("_meta", {})
    if meta.get("status") and meta["status"] != "success":
        result.add("error", "schema", "_meta.status",
                    f"Crawl failed: {record.get('error', 'unknown error')}")
        return result

    # Run validators in order
    validate_schema(record, result)
    validate_enum_values(record, result)
    validate_grading_integrity(record, result)
    validate_inspection_integrity(record, result)
    validate_fire_safety_integrity(record, result)
    validate_regulatory_integrity(record, result)
    validate_sources(record, result)
    compute_confidence(record, result)

    return result


def load_results(input_path: Path) -> list:
    """Load all jurisdiction JSON files from input path.
    Returns list of (record_dict, source_file_str) tuples.
    """
    records = []

    if input_path.is_file() and input_path.suffix == ".json":
        with open(input_path) as f:
            data = json.load(f)
        if isinstance(data, list):
            for i, rec in enumerate(data):
                records.append((rec, f"{input_path}[{i}]"))
        elif isinstance(data, dict):
            records.append((data, str(input_path)))
        return records

    if input_path.is_dir():
        for json_file in sorted(input_path.rglob("*.json")):
            # Skip internal/meta files
            if json_file.name.startswith("_"):
                continue
            try:
                with open(json_file) as f:
                    data = json.load(f)
                if isinstance(data, list):
                    for i, rec in enumerate(data):
                        records.append((rec, f"{json_file}[{i}]"))
                elif isinstance(data, dict):
                    records.append((data, str(json_file)))
            except (json.JSONDecodeError, OSError) as e:
                print(f"  ⚠️  Could not load {json_file}: {e}")

    return records


# ============================================================================
# REPORTING
# ============================================================================

def generate_report(
    all_results: list,
    cross_issues: list,
    output_path: Path,
):
    """Generate a comprehensive validation report."""

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    total = len(all_results)
    passed = sum(1 for r in all_results if r.import_eligible)
    failed = total - passed
    total_errors = sum(len(r.errors) for r in all_results)
    total_warnings = sum(len(r.warnings) for r in all_results)

    lines = []
    lines.append("# Jurisdiction Validation Report")
    lines.append(f"**{ts}**\n")

    # --- Summary table ---
    lines.append("## Summary\n")
    lines.append("| Metric | Count |")
    lines.append("|--------|-------|")
    lines.append(f"| Total records | {total} |")
    lines.append(f"| ✅ Import eligible | {passed} |")
    lines.append(f"| ❌ Blocked (has errors) | {failed} |")
    lines.append(f"| Total errors | {total_errors} |")
    lines.append(f"| Total warnings | {total_warnings} |")
    lines.append(f"| Cross-jurisdiction issues | {len(cross_issues)} |")
    lines.append("")

    # --- Confidence distribution ---
    conf_dist = {"high": 0, "medium": 0, "low": 0}
    for r in all_results:
        if r.computed_confidence in conf_dist:
            conf_dist[r.computed_confidence] += 1
    lines.append("## Computed Confidence Distribution\n")
    lines.append("| Level | Count | % |")
    lines.append("|-------|-------|---|")
    for level in ["high", "medium", "low"]:
        count = conf_dist[level]
        pct = (count / total * 100) if total > 0 else 0
        lines.append(f"| {level} | {count} | {pct:.0f}% |")
    lines.append("")

    # --- Confidence vs LLM disagreements ---
    disagreements = [
        r for r in all_results
        if r.computed_confidence != r.llm_confidence
        and r.llm_confidence in VALID_CONFIDENCE_LEVELS
    ]
    if disagreements:
        lines.append("## Confidence Disagreements (Computed vs LLM)\n")
        lines.append("| Jurisdiction | State | LLM Said | Computed | Score |")
        lines.append("|-------------|-------|----------|----------|-------|")
        for r in sorted(disagreements, key=lambda x: x.computed_confidence_score):
            lines.append(
                f"| {r.jurisdiction_name} | {r.state} | "
                f"{r.llm_confidence} | {r.computed_confidence} | "
                f"{r.computed_confidence_score}/100 |"
            )
        lines.append("")

    # --- Cross-jurisdiction issues ---
    if cross_issues:
        lines.append("## Cross-Jurisdiction Issues\n")
        for ci in cross_issues:
            lines.append(f"- {ci}")
        lines.append("")

    # --- BLOCKED records ---
    failed_results = [r for r in all_results if not r.import_eligible]
    if failed_results:
        lines.append(f"## ❌ BLOCKED FROM IMPORT ({len(failed_results)} records)\n")
        lines.append("These records have errors that must be fixed before import.\n")
        for r in sorted(failed_results, key=lambda x: x.jurisdiction_name):
            lines.append(f"### {r.jurisdiction_name} ({r.state})")
            lines.append(f"Source: `{r.source_file}`\n")
            for issue in r.errors:
                lines.append(f"- {issue}")
            if r.warnings:
                lines.append(f"\nAlso has {len(r.warnings)} warning(s):")
                for issue in r.warnings:
                    lines.append(f"- {issue}")
            lines.append("")

    # --- WARNED records ---
    warned_results = [r for r in all_results if r.import_eligible and r.warnings]
    if warned_results:
        lines.append(
            f"## ⚠️  IMPORT ELIGIBLE WITH WARNINGS ({len(warned_results)} records)\n"
        )
        for r in sorted(warned_results, key=lambda x: x.jurisdiction_name):
            lines.append(f"### {r.jurisdiction_name} ({r.state})")
            lines.append(
                f"Confidence: {r.computed_confidence} "
                f"(score: {r.computed_confidence_score}/100, "
                f"LLM said: {r.llm_confidence})\n"
            )
            for issue in r.warnings:
                lines.append(f"- {issue}")
            lines.append("")

    # --- CLEAN records ---
    clean_results = [
        r for r in all_results if r.import_eligible and not r.warnings
    ]
    if clean_results:
        lines.append(f"## ✅ CLEAN — Ready for Import ({len(clean_results)} records)\n")
        for r in sorted(clean_results, key=lambda x: x.jurisdiction_name):
            lines.append(
                f"- {r.jurisdiction_name} ({r.state}) — "
                f"confidence: {r.computed_confidence} "
                f"({r.computed_confidence_score}/100)"
            )
        lines.append("")

    # Write
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        f.write("\n".join(lines))

    return passed, failed


def export_validated(all_results: list, all_records: list, export_dir: Path) -> int:
    """Export only import-eligible records to a clean directory for DB import."""

    export_dir.mkdir(parents=True, exist_ok=True)
    exported = 0

    eligible = []
    for vr, rec in zip(all_results, all_records):
        if not vr.import_eligible:
            continue

        # Override confidence with computed confidence — never trust LLM self-report
        rec["confidence_level"] = vr.computed_confidence
        rec["_validation"] = {
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "computed_confidence": vr.computed_confidence,
            "computed_confidence_score": vr.computed_confidence_score,
            "llm_confidence": vr.llm_confidence,
            "error_count": 0,
            "warning_count": len(vr.warnings),
            "warnings": [str(w) for w in vr.warnings],
            "import_eligible": True,
        }

        safe = (
            vr.jurisdiction_name.lower()
            .replace(" ", "_")
            .replace(".", "")
            .replace("—", "_")
        )
        state = rec.get("state", "XX").lower()
        outpath = export_dir / f"{state}_{safe}.json"
        with open(outpath, "w") as f:
            json.dump(rec, f, indent=2)
        eligible.append(rec)
        exported += 1

    # Combined file for bulk DB import
    with open(export_dir / "_validated_combined.json", "w") as f:
        json.dump(eligible, f, indent=2)

    return exported


# ============================================================================
# CLI ENTRY POINT
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="EvidLY Jurisdiction Data Validation & Integrity Check"
    )
    parser.add_argument(
        "--input", required=True,
        help="Path to results directory or JSON file",
    )
    parser.add_argument(
        "--strict", action="store_true",
        help="Exit code 1 if ANY record fails validation",
    )
    parser.add_argument(
        "--export", default=None,
        help="Export validated records to this directory",
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Show all issues including info-level",
    )
    parser.add_argument(
        "--report", default=None,
        help="Custom path for validation report "
             "(default: <input>/_validation_report.md)",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ Input path does not exist: {input_path}")
        sys.exit(2)

    # Load
    print(f"📂 Loading records from: {input_path}")
    records_with_sources = load_results(input_path)
    if not records_with_sources:
        print(f"❌ No jurisdiction records found in {input_path}")
        sys.exit(2)
    print(f"   Found {len(records_with_sources)} records\n")

    # Validate each record
    all_records = []
    all_results = []

    for record, source_file in records_with_sources:
        vr = validate_record(record, source_file)
        all_records.append(record)
        all_results.append(vr)

        # Per-record console output
        if vr.import_eligible:
            icon = "⚠️ " if vr.warnings else "✅"
        else:
            icon = "❌"

        parts = []
        if vr.errors:
            parts.append(f"{len(vr.errors)} err")
        if vr.warnings:
            parts.append(f"{len(vr.warnings)} warn")
        detail = ", ".join(parts) if parts else "clean"

        conf_str = (
            f"{vr.computed_confidence}({vr.computed_confidence_score})"
            if vr.computed_confidence
            else "?"
        )
        print(f"  {icon} {vr.jurisdiction_name} ({vr.state}) — "
              f"conf:{conf_str} — {detail}")

        if args.verbose:
            for issue in vr.issues:
                print(f"      {issue}")

    # Cross-jurisdiction
    print(f"\n🔗 Cross-jurisdiction checks...")
    cross_issues = validate_cross_jurisdiction(all_results, all_records)
    if cross_issues:
        for ci in cross_issues:
            print(f"  {ci}")
    else:
        print("  ✅ No cross-jurisdiction issues")

    # Report
    if args.report:
        report_path = Path(args.report)
    elif input_path.is_dir():
        report_path = input_path / "_validation_report.md"
    else:
        report_path = input_path.parent / "_validation_report.md"

    passed, failed = generate_report(all_results, cross_issues, report_path)

    # Export
    if args.export:
        export_dir = Path(args.export)
        exported = export_validated(all_results, all_records, export_dir)
        print(f"\n📦 Exported {exported} validated records to {export_dir}/")

    # Final summary
    total = len(all_results)
    print(f"\n{'='*60}")
    print("VALIDATION COMPLETE")
    print(f"{'='*60}")
    print(f"  Total:    {total}")
    print(f"  ✅ Passed: {passed}")
    print(f"  ❌ Failed: {failed}")
    print(f"  📋 Report: {report_path}")

    if failed > 0:
        print(f"\n  ⛔ {failed} record(s) BLOCKED from import.")
        print("     Fix errors and re-validate before loading "
              "into jurisdiction_configs.")

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
