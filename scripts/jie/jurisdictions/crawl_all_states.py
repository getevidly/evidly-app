#!/usr/bin/env python3
"""EvidLY Multi-State Orchestrator"""
import asyncio,json,os,sys,argparse
from datetime import datetime,timezone
from pathlib import Path
from jurisdiction_crawl import crawl_jurisdiction,generate_verification_report
try: import anthropic
except: print("pip install anthropic"); sys.exit(1)

STATE_PRIORITY=[("CA","California"),("TX","Texas"),("NY","New York"),("FL","Florida"),("OH","Ohio"),
    ("IL","Illinois"),("MA","Massachusetts"),("AZ","Arizona"),("NV","Nevada"),("WA","Washington"),("OR","Oregon")]
STATE_FILES={s:f"jurisdictions/{s.lower()}_jurisdictions.json" for s,_ in STATE_PRIORITY}

def load_j(state,base,pf=None):
    fp=base/STATE_FILES.get(state,"")
    if not fp.exists(): return []
    with open(fp) as f: data=json.load(f)
    return [j for j in data if j.get("priority") in pf] if pf else data

async def run_state(client,state,jurisdictions,out,mc,mr):
    sd=out/state.lower(); sd.mkdir(parents=True,exist_ok=True)
    sem=asyncio.Semaphore(mc)
    results=await asyncio.gather(*[crawl_jurisdiction(client,j,sem,sd,mr) for j in jurisdictions])
    generate_verification_report(results,sd); return results

async def main():
    p=argparse.ArgumentParser()
    p.add_argument("--states",nargs="*"); p.add_argument("--priority")
    p.add_argument("--output",default="results"); p.add_argument("--max-concurrent",type=int,default=5)
    p.add_argument("--max-retries",type=int,default=2); p.add_argument("--dry-run",action="store_true")
    p.add_argument("--sequential-states",action="store_true")
    a=p.parse_args()
    if not a.dry_run and not os.environ.get("ANTHROPIC_API_KEY"): print("❌ Set ANTHROPIC_API_KEY"); sys.exit(1)
    states=[s.upper() for s in a.states] if a.states else [s for s,_ in STATE_PRIORITY]
    pf=[x.strip() for x in a.priority.split(",")] if a.priority else None
    base=Path(__file__).parent; aj={}
    for s in states:
        j=load_j(s,base,pf)
        if j: aj[s]=j
    if not aj: print("❌ No jurisdictions"); sys.exit(1)
    total=sum(len(v) for v in aj.values())
    for s in states:
        if s in aj: print(f"  {s}: {len(aj[s])}")
    print(f"  TOTAL: {total}")
    if a.dry_run:
        for s,js in aj.items():
            print(f"\n  {s}:")
            for j in js: print(f"    - {j['name']} ({j.get('priority','?')})")
        print(f"\n  💰 ~${total*3000/1e6*6:.2f}"); return
    out=Path(a.output); out.mkdir(parents=True,exist_ok=True)
    client=anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    t0=datetime.now(timezone.utc); ar={}
    if a.sequential_states:
        for s,js in aj.items():
            print(f"\n🏛️ {s}: {len(js)}"); ar[s]=await run_state(client,s,js,out,a.max_concurrent,a.max_retries)
    else:
        tasks={s:run_state(client,s,j,out,a.max_concurrent,a.max_retries) for s,j in aj.items()}
        rl=await asyncio.gather(*tasks.values()); ar=dict(zip(tasks.keys(),rl))
    elapsed=(datetime.now(timezone.utc)-t0).total_seconds()
    with open(out/"_master_results.json","w") as f: json.dump({"meta":{"time":elapsed,"states":list(ar.keys())},"results":ar},f,indent=2)
    generate_verification_report([r for rs in ar.values() for r in rs],out)
    for s,rs in ar.items():
        ok=sum(1 for r in rs if r.get("_meta",{}).get("status")=="success")
        print(f"  {s}: {ok}/{len(rs)}")
    print(f"\n⏱️ {elapsed:.0f}s")
    print(f"\n{'='*60}")
    print("⛔ DO NOT IMPORT INTO jurisdiction_configs.")
    print("   Run validation first. Nothing touches the DB without it.")
    print(f"{'='*60}")
    print(f"\n   python3 validate_jurisdictions.py --input {out}/ --strict")
    print(f"   python3 validate_jurisdictions.py --input {out}/ --export validated/ --strict")
    print(f"\n   Only records in validated/ are eligible for DB import.")

if __name__=="__main__": asyncio.run(main())
