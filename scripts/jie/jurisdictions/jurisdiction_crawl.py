#!/usr/bin/env python3
"""EvidLY Jurisdiction Intelligence Engine — Crawl Engine"""
import anthropic, asyncio, json, os, sys, argparse
from datetime import datetime, timezone
from pathlib import Path

CRAWL_SYSTEM_PROMPT = """You are a compliance research specialist for EvidLY, a commercial kitchen compliance platform. 
Your task is to research and VERIFY the health department inspection and grading/scoring system for a specific jurisdiction.

CRITICAL RULES:
1. NEVER guess or assume grading types. Only report what you can verify from official sources.
2. Search the actual health department website for the jurisdiction.
3. If you cannot verify the grading system, say so explicitly — do not fabricate data.
4. Distinguish between LETTER GRADES (A/B/C), NUMERICAL SCORES (0-100), PASS/FAIL, and other systems.
5. Note the specific department name that handles food facility inspections.
6. Identify inspection frequency, re-inspection triggers, and any public disclosure requirements.
7. Note whether the state or local jurisdiction is the primary inspection authority.
8. Identify which food code the jurisdiction follows (FDA Food Code year, state-specific code, or local code).

RESPOND ONLY WITH VALID JSON matching this exact schema (no markdown, no backticks, no preamble):
{
    "jurisdiction_name": "string",
    "jurisdiction_type": "county | city | federal | state",
    "state": "string — Two-letter state code",
    "department_name": "string — Full name of health/EH department",
    "department_url": "string — Official website URL",
    "grading_system": {
        "type": "letter_grade | numerical_score | pass_fail | hybrid | other | unknown",
        "description": "string — How the system works",
        "letter_grades": ["A","B","C"] or null,
        "score_range_min": number or null,
        "score_range_max": number or null,
        "passing_threshold": number or null,
        "grade_thresholds": {"A":{"min":90,"max":100},"B":{"min":80,"max":89}} or null
    },
    "inspection_details": {
        "frequency": "string",
        "risk_categories": ["High","Moderate","Low"] or null,
        "reinspection_trigger": "string",
        "public_disclosure": "string"
    },
    "fire_safety_authority": {
        "department_name": "string — Fire dept or AHJ",
        "hood_system_inspection_required": true/false or null,
        "ansul_system_requirements": "string or null",
        "inspection_frequency": "string or null"
    },
    "regulatory_framework": {
        "food_code_basis": "string — e.g. CA Retail Food Code, FDA Food Code 2022, TX TAC 228",
        "state_vs_local_authority": "string — who conducts inspections",
        "local_ordinances": "string",
        "permit_types": ["Health Permit","Food Handler Card"]
    },
    "data_sources": ["string — URLs"],
    "confidence_level": "high | medium | low",
    "confidence_notes": "string",
    "needs_manual_verification": true/false,
    "verification_notes": "string"
}"""

def build_user_prompt(jurisdiction):
    name = jurisdiction["name"]
    jtype = jurisdiction.get("type","county")
    state = jurisdiction.get("state","CA")
    notes = jurisdiction.get("notes","")
    return f"""Research and verify the health department food facility inspection and grading/scoring system for:
**{name}** ({jtype}) — {state}
{f"Additional context: {notes}" if notes else ""}
Search for:
1. Official {name} environmental health / health department website
2. Food facility inspection program details
3. Whether they use letter grades, numerical scores, pass/fail, or another system
4. Inspection frequency and risk-based scheduling
5. Fire safety inspection requirements for commercial kitchens (hood systems, suppression systems, fire AHJ)
6. Local ordinances beyond state food code
7. Which food code they follow (FDA Food Code, state-specific code, etc.)
8. Whether inspections are state, county, or city level
IMPORTANT: Only report verified information. If you cannot find definitive answers, mark confidence as "low" and flag for manual verification. Do NOT guess or fabricate any grading methodology."""

async def crawl_jurisdiction(client, jurisdiction, semaphore, results_dir, max_retries=2):
    name = jurisdiction["name"]
    state = jurisdiction.get("state","??")
    attempts = []
    raw_text = ""
    async with semaphore:
        print(f"  🔍 Starting: {name} ({state})...")
        for attempt in range(max_retries + 1):
            start_time = datetime.now(timezone.utc)
            rec = {"attempt":attempt+1,"started_at":start_time.isoformat(),"error":None,"error_type":None}
            try:
                response = await client.messages.create(
                    model="claude-sonnet-4-20250514", max_tokens=4096,
                    system=CRAWL_SYSTEM_PROMPT,
                    tools=[{"type":"web_search_20250305","name":"web_search"}],
                    messages=[{"role":"user","content":build_user_prompt(jurisdiction)}])
                raw_text = "".join(b.text for b in response.content if hasattr(b,"text"))
                if not raw_text.strip():
                    rec["error"]="Empty response"; rec["error_type"]="empty_response"; attempts.append(rec)
                    if attempt < max_retries: await asyncio.sleep(2**attempt); continue
                    else: break
                cleaned = raw_text.strip()
                for prefix in ["```json","```"]:
                    if cleaned.startswith(prefix): cleaned = cleaned[len(prefix):]
                if cleaned.endswith("```"): cleaned = cleaned[:-3]
                result = json.loads(cleaned.strip())
                if not isinstance(result, dict):
                    rec["error"]=f"Not a dict: {type(result).__name__}"; rec["error_type"]="invalid_structure"
                    attempts.append(rec)
                    if attempt < max_retries: await asyncio.sleep(2**attempt); continue
                    else: break
                elapsed = (datetime.now(timezone.utc)-start_time).total_seconds()
                result["_meta"] = {"crawled_at":datetime.now(timezone.utc).isoformat(),"duration_seconds":elapsed,
                    "model":"claude-sonnet-4-20250514","input_tokens":response.usage.input_tokens,
                    "output_tokens":response.usage.output_tokens,"status":"success","attempts":attempt+1,
                    "attempt_log":attempts+[rec],"stop_reason":response.stop_reason}
                safe = name.lower().replace(" ","_").replace(".","").replace("—","_")
                with open(results_dir/f"{safe}.json","w") as f: json.dump(result,f,indent=2)
                conf = result.get("confidence_level","?")
                flag = " ⚠️  VERIFY" if result.get("needs_manual_verification") else ""
                print(f"  ✅ {name} ({elapsed:.1f}s, att {attempt+1}) — {conf}{flag}")
                return result
            except json.JSONDecodeError as e:
                rec["error"]=f"JSON parse: {e}"; rec["error_type"]="json_parse_error"; attempts.append(rec)
                if attempt < max_retries: print(f"  ⏳ Parse error {name}, retry..."); await asyncio.sleep(2**attempt); continue
                err = {"jurisdiction_name":name,"state":state,"error":str(e),"error_type":"json_parse_error",
                    "raw_response_preview":raw_text[:3000],"_meta":{"status":"parse_error","attempts":attempt+1,"attempt_log":attempts}}
                safe = name.lower().replace(" ","_").replace(".","").replace("—","_")
                with open(results_dir/f"{safe}_ERROR.json","w") as f: json.dump(err,f,indent=2)
                print(f"  ❌ Parse error (final): {name}"); return err
            except anthropic.RateLimitError as e:
                rec["error"]=str(e); rec["error_type"]="rate_limit"; attempts.append(rec)
                if attempt < max_retries: wait=15*(attempt+1); print(f"  ⏳ Rate limited {name}, {wait}s..."); await asyncio.sleep(wait); continue
            except anthropic.APIConnectionError as e:
                rec["error"]=str(e); rec["error_type"]="connection_error"; attempts.append(rec)
                if attempt < max_retries: await asyncio.sleep(5*(attempt+1)); continue
            except anthropic.APIStatusError as e:
                rec["error"]=f"Status {e.status_code}"; rec["error_type"]=f"api_{e.status_code}"; attempts.append(rec)
                if 400<=e.status_code<500 and e.status_code!=429: print(f"  ❌ {e.status_code} {name}"); break
                if attempt < max_retries: await asyncio.sleep(5*(attempt+1)); continue
            except Exception as e:
                rec["error"]=f"{type(e).__name__}: {e}"; rec["error_type"]=type(e).__name__; attempts.append(rec)
                print(f"  ❌ {type(e).__name__} {name}: {str(e)[:80]}")
                if attempt < max_retries: await asyncio.sleep(3*(attempt+1)); continue
        last = attempts[-1] if attempts else {"error":"Unknown","error_type":"unknown"}
        err = {"jurisdiction_name":name,"state":state,"error":f"All {max_retries+1} attempts failed. Last: {last.get('error')}",
            "error_type":last.get("error_type","unknown"),
            "_meta":{"status":"all_retries_failed","attempts":len(attempts),"attempt_log":attempts}}
        safe = name.lower().replace(" ","_").replace(".","").replace("—","_")
        with open(results_dir/f"{safe}_ERROR.json","w") as f: json.dump(err,f,indent=2)
        return err

def generate_verification_report(results, results_dir):
    ok = [r for r in results if r.get("_meta",{}).get("status")=="success"]
    err = [r for r in results if r.get("_meta",{}).get("status")!="success"]
    lines = [f"# Crawl Report\n**{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}** | {len(results)} total | {len(ok)} success | {len(err)} errors\n",
        "**Run validate_jurisdictions.py for full validation.**\n"]
    if err:
        lines.append("## Errors\n")
        for r in err:
            lines.append(f"- **{r.get('jurisdiction_name','?')}**: {r.get('error','?')[:200]}")
        lines.append("")
    if ok:
        lines.append("## Successful\n")
        for r in sorted(ok, key=lambda x:x.get("jurisdiction_name","")):
            gs = r.get("grading_system",{})
            lines.append(f"- **{r.get('jurisdiction_name')}** ({r.get('state')}) — {gs.get('type','?')} — conf: {r.get('confidence_level','?')}")
    with open(results_dir/"_crawl_report.md","w") as f: f.write("\n".join(lines))

async def main():
    p = argparse.ArgumentParser()
    p.add_argument("--jurisdictions",required=True)
    p.add_argument("--output",default="results")
    p.add_argument("--max-concurrent",type=int,default=5)
    p.add_argument("--max-retries",type=int,default=2)
    p.add_argument("--filter",nargs="*")
    args = p.parse_args()
    if not os.environ.get("ANTHROPIC_API_KEY"): print("❌ Set ANTHROPIC_API_KEY"); sys.exit(1)
    with open(args.jurisdictions) as f: jurisdictions = json.load(f)
    if args.filter:
        jurisdictions = [j for j in jurisdictions if any(t.lower() in j["name"].lower() for t in args.filter)]
        if not jurisdictions: print("❌ No matches"); sys.exit(1)
    rd = Path(args.output); rd.mkdir(parents=True, exist_ok=True)
    print(f"🏗️  Crawling {len(jurisdictions)} jurisdictions (max {args.max_concurrent} concurrent, {args.max_retries} retries)")
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    sem = asyncio.Semaphore(args.max_concurrent)
    t0 = datetime.now(timezone.utc)
    results = await asyncio.gather(*[crawl_jurisdiction(client,j,sem,rd,args.max_retries) for j in jurisdictions])
    elapsed = (datetime.now(timezone.utc)-t0).total_seconds()
    with open(rd/"_all_jurisdictions.json","w") as f: json.dump(results,f,indent=2)
    generate_verification_report(results, rd)
    ok = sum(1 for r in results if r.get("_meta",{}).get("status")=="success")
    err_count = len(results) - ok
    print(f"\n🏁 Crawl done: {ok}/{len(results)} in {elapsed:.0f}s ({err_count} errors)")
    print(f"\n{'='*60}")
    print("⛔ DO NOT IMPORT THESE RESULTS INTO jurisdiction_configs.")
    print("   Run validation first. Nothing touches the database without it.")
    print(f"{'='*60}")
    print(f"\n   python3 validate_jurisdictions.py --input {rd}/ --strict")
    print(f"   python3 validate_jurisdictions.py --input {rd}/ --export validated/ --strict")
    print(f"\n   Only records in validated/ are eligible for DB import.")

if __name__ == "__main__": asyncio.run(main())
