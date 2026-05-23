#!/usr/bin/env python3
"""Generate Step 3C reports from PROD data and dry run document."""
import json, os

# --- Load PROD data ---
tool_result_path = os.path.join(
    os.path.expanduser('~'),
    '.claude', 'projects',
    'C--Users-newpa-OneDrive-Desktop-evidly-app',
    '580d35b8-7fc5-49b6-a3cc-1f99be14d156',
    'tool-results',
    'toolu_01ECFkFLc3ZT228eNtcipveu.txt')
with open(tool_result_path, 'r', encoding='utf-8') as f:
    raw = f.read()
# Extract JSON
start = raw.index('{')
data = json.loads(raw[start:])
rows = data['rows']

# --- Load source paths from dry run ---
with open('docs/jurisdiction_backfill_dryrun_20260521.md', 'r', encoding='utf-8') as f:
    dryrun = f.read()
drylines = dryrun.split('\n')

source_paths = {}  # (county, city, field) -> path
source_buckets = {}  # (county, city, field) -> bucket
for line in drylines:
    if not line.startswith('|') or '---|' in line or 'Column' in line or '_SKIP' in line:
        continue
    parts = line.split('|')
    if len(parts) < 9:
        continue
    county = parts[2].strip()
    city_raw = parts[3].strip()
    col = parts[4].strip()
    new_val = parts[6].strip()
    src_path = parts[7].strip()
    bucket = parts[8].strip()
    city = city_raw if any(c.isalnum() for c in city_raw) else None
    has_val = len(new_val) > 1 and any(c.isalnum() for c in new_val)
    key = (county, city, col)
    if has_val:
        source_paths[key] = src_path
        source_buckets[key] = bucket

# SD0 fill counties
sd0_counties = ['Colusa','Inyo','Marin','Modoc','Mono','Nevada','Placer','Plumas',
    'San Diego','San Francisco','San Mateo','Santa Cruz','Sierra','Siskiyou',
    'Sonoma','Sutter','Tehama','Trinity','Tuolumne','Yolo','Yuba']

# Phone confidence map from dry run
phone_confidence = {}
for line in drylines:
    if '| agency_phone |' in line and line.startswith('|'):
        parts = line.split('|')
        if len(parts) >= 9:
            county = parts[2].strip()
            city_raw = parts[3].strip()
            city = city_raw if any(c.isalnum() for c in city_raw) else None
            bucket = parts[8].strip()
            src = parts[7].strip()
            val = parts[6].strip()
            has_val = len(val) > 1 and any(c.isalnum() for c in val)
            phone_confidence[(county, city)] = {
                'bucket': bucket if has_val else 'NULL',
                'src': src if has_val else None,
                'val': val if has_val else None
            }

# EHD and Fire fields
ehd_fields = ['agency_phone','agency_fax','agency_email','agency_address',
              'agency_website','poc_name','poc_title']
fire_fields = ['fire_ahj_phone','fire_ahj_fax','fire_ahj_email',
               'fire_ahj_address','fire_ahj_website','fire_ahj_poc_name','fire_ahj_poc_title']

# ============================================================
# REPORT 1: Coverage
# ============================================================
r1_lines = ['# Jurisdiction Contact Coverage Report \u2014 2026-05-21', '',
    '| County | City | Pillar | Field | Status | Source Bucket | Source JSONB Path | Value |',
    '|---|---|---|---|---|---|---|---|']
r1_count = 0
for row in rows:
    county = row['county']
    city = row['city'] or '\u2014'
    city_key = row['city']
    ds = row['contact_data_source'] or 'unverified'
    fds = row['fire_ahj_data_source'] or 'unverified'
    for f in ehd_fields:
        val = row.get(f)
        status = 'Filled' if val else 'Missing'
        key = (county, city_key, f)
        if val:
            sp = source_paths.get(key, ds)
            if f == 'agency_website' and county in sd0_counties and source_buckets.get(key) == 'SD0_FILL':
                sb = 'sd0_fallback'
            else:
                sb = source_buckets.get(key, ds)
        else:
            sp = '\u2014'
            sb = '\u2014'
        disp_val = val if val else '\u2014'
        r1_lines.append(f'| {county} | {city} | EHD | {f} | {status} | {sb} | {sp} | {disp_val} |')
        r1_count += 1
    for f in fire_fields:
        val = row.get(f)
        status = 'Filled' if val else 'Missing'
        key = (county, city_key, f)
        if val:
            sp = source_paths.get(key, fds)
            sb = source_buckets.get(key, fds)
        else:
            sp = '\u2014'
            sb = '\u2014'
        disp_val = val if val else '\u2014'
        r1_lines.append(f'| {county} | {city} | Fire | {f} | {status} | {sb} | {sp} | {disp_val} |')
        r1_count += 1

with open('docs/jurisdiction_contact_coverage_20260521.md', 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(r1_lines) + '\n')
print(f'Report 1: {r1_count} rows')

# ============================================================
# REPORT 2: Gaps
# ============================================================
r2_lines = ['# Jurisdiction Contact Gaps Report \u2014 2026-05-21', '',
    '## EHD Gaps', '',
    '| County | City | Pillar | Field | Reason for Gap | Firecrawl Target URL |',
    '|---|---|---|---|---|---|']
r2_ehd = 0
r2_fire = 0
fire_gap_lines = []
for row in rows:
    county = row['county']
    city = row['city'] or '\u2014'
    website = row.get('agency_website')
    fire_web = row.get('fire_ahj_website')
    for f in ehd_fields:
        val = row.get(f)
        if val is None:
            if f in ('poc_name','poc_title'):
                reason = 'No POC in JSONB'
            elif f == 'agency_website':
                reason = 'No website in JSONB or source_documents'
            elif f == 'agency_fax':
                reason = 'No fax in agency_contact'
            elif f == 'agency_email':
                reason = 'No email in agency_contact'
            elif f == 'agency_phone':
                reason = 'No phone in agency_contact'
            elif f == 'agency_address':
                reason = 'No address in JSONB'
            else:
                reason = 'Not in JSONB'
            target = website if website else 'MANUAL RESEARCH REQUIRED'
            r2_lines.append(f'| {county} | {city} | EHD | {f} | {reason} | {target} |')
            r2_ehd += 1
    for f in fire_fields:
        val = row.get(f)
        if val is None:
            fire_reason_map = {
                'fire_ahj_phone': 'No ahj_phone in fire config',
                'fire_ahj_fax': 'No ahj_fax in fire config',
                'fire_ahj_email': 'No ahj_email in fire config',
                'fire_ahj_address': 'No ahj_address in fire config',
                'fire_ahj_website': 'No ahj_website in fire config',
                'fire_ahj_poc_name': 'No POC in fire config',
                'fire_ahj_poc_title': 'No POC in fire config',
            }
            has_any_fire = fire_web or row.get('fire_ahj_phone')
            if not has_any_fire:
                reason = 'No fire config'
            else:
                reason = fire_reason_map.get(f, 'Not in fire config')
            target = fire_web if fire_web else 'MANUAL RESEARCH REQUIRED'
            fire_gap_lines.append(f'| {county} | {city} | Fire | {f} | {reason} | {target} |')
            r2_fire += 1

r2_lines.append('')
r2_lines.append('## Fire AHJ Gaps')
r2_lines.append('')
r2_lines.append('| County | City | Pillar | Field | Reason for Gap | Firecrawl Target URL |')
r2_lines.append('|---|---|---|---|---|---|')
r2_lines.extend(fire_gap_lines)

with open('docs/jurisdiction_contact_gaps_20260521.md', 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(r2_lines) + '\n')
print(f'Report 2: {r2_ehd + r2_fire} rows (EHD: {r2_ehd}, Fire: {r2_fire})')

# ============================================================
# REPORT 3: Phone Source Quality
# ============================================================
r3_lines = ['# Phone Source Quality Flags \u2014 2026-05-21', '',
    '| County | City | Phone Source JSONB Key | Confidence | Value | Notes |',
    '|---|---|---|---|---|---|']
r3_count = 0
for row in rows:
    county = row['county']
    city = row['city'] or '\u2014'
    city_key = row['city']
    val = row.get('agency_phone')
    pc = phone_confidence.get((county, city_key), {})
    if val:
        src = pc.get('src', 'unknown')
        bucket = pc.get('bucket', 'unknown')
        if bucket == 'HIGH':
            conf = 'HIGH'
            notes = 'Direct agency_contact.phone'
        elif bucket == 'LOW':
            conf = 'LOW'
            notes = 'Non-canonical key (board of supervisors, general line)'
        elif bucket == 'DIRECT':
            conf = 'HIGH'
            notes = 'Direct match'
        else:
            conf = 'HIGH'
            notes = ''
    else:
        src = '\u2014'
        conf = 'NULL'
        notes = 'No phone found in any JSONB path'
    disp = val if val else '\u2014'
    r3_lines.append(f'| {county} | {city} | {src} | {conf} | {disp} | {notes} |')
    r3_count += 1

with open('docs/phone_source_quality_flags_20260521.md', 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(r3_lines) + '\n')
print(f'Report 3: {r3_count} rows')

# ============================================================
# REPORT 4: Priority List (top 10 worst)
# ============================================================
all_fields = ehd_fields + fire_fields
priority = []
for row in rows:
    county = row['county']
    city = row['city'] or '\u2014'
    ehd_missing = [f for f in ehd_fields if row.get(f) is None]
    fire_missing = [f for f in fire_fields if row.get(f) is None]
    total = len(ehd_missing) + len(fire_missing)
    website = row.get('agency_website')
    fire_web = row.get('fire_ahj_website')
    manual = 'yes' if (not website and not fire_web) else ('yes' if not website or not fire_web else 'no')
    # Only flag manual if BOTH are missing
    manual = 'yes' if (not website or not fire_web) else 'no'
    priority.append({
        'county': county, 'city': city,
        'ehd_missing': ehd_missing, 'fire_missing': fire_missing,
        'total': total, 'website': website, 'fire_web': fire_web,
        'manual': manual
    })
priority.sort(key=lambda x: -x['total'])
top10 = priority[:10]

r4_lines = ['# Jurisdiction Priority List \u2014 2026-05-21', '',
    '| Rank | County | City | Missing EHD Fields | Missing Fire Fields | Total Missing | Specific Gaps | Firecrawl URLs (EHD + Fire) | Manual Flag |',
    '|---|---|---|---|---|---|---|---|---|']
for i, p in enumerate(top10):
    ehd_str = ', '.join(p['ehd_missing']) if p['ehd_missing'] else 'none'
    fire_str = ', '.join(p['fire_missing']) if p['fire_missing'] else 'none'
    gaps = ', '.join(p['ehd_missing'] + p['fire_missing'])
    ehd_url = p['website'] if p['website'] else 'NONE'
    fire_url = p['fire_web'] if p['fire_web'] else 'NONE'
    urls = f'EHD: {ehd_url} / Fire: {fire_url}'
    r4_lines.append(f'| {i+1} | {p["county"]} | {p["city"]} | {len(p["ehd_missing"])} | {len(p["fire_missing"])} | {p["total"]} | {gaps} | {urls} | {p["manual"]} |')

with open('docs/jurisdiction_priority_list_20260521.md', 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(r4_lines) + '\n')
print(f'Report 4: {len(top10)} rows')
