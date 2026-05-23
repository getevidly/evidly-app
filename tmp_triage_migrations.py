"""
Migration Sync Triage Script — Phase 1
Compares local migration files vs PROD schema_migrations and PROD catalog.
Produces a categorization report.
"""
import os
import re
import glob
import json
from datetime import datetime

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), 'supabase', 'migrations')

# Windows: /tmp in git bash maps to %LOCALAPPDATA%/Temp
TMP_DIR = os.environ.get('LOCALAPPDATA', '') + '\\Temp' if os.name == 'nt' else '/tmp'

# ── Load catalog snapshots ────────────────────────────────────────────────────

def load_lines(path):
    with open(path, 'r') as f:
        return set(line.strip() for line in f if line.strip())

def tmp(name):
    return os.path.join(TMP_DIR, name)

remote_versions = load_lines(tmp('remote_versions.txt'))
prod_tables = load_lines(tmp('prod_tables.txt'))
prod_columns = load_lines(tmp('prod_columns.txt'))  # "table.column"
prod_indexes = load_lines(tmp('prod_indexes.txt'))
prod_constraints = load_lines(tmp('prod_constraints.txt'))
prod_policies_raw = load_lines(tmp('prod_policies.txt'))  # "polname@table"
prod_policies = {}
for p in prod_policies_raw:
    if '@' in p:
        name, tbl = p.split('@', 1)
        prod_policies[name] = tbl
prod_functions = load_lines(tmp('prod_functions.txt'))
prod_views = load_lines(tmp('prod_views.txt'))
prod_enums = load_lines(tmp('prod_enums.txt'))
prod_triggers_raw = load_lines(tmp('prod_triggers.txt'))  # "tgname@table"
prod_triggers = {}
for t in prod_triggers_raw:
    if '@' in t:
        name, tbl = t.split('@', 1)
        prod_triggers[name] = tbl
prod_rls_enabled = load_lines(tmp('prod_rls_enabled.txt'))

# ── Discover local files ──────────────────────────────────────────────────────

local_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, '*.sql')))
local_map = {}  # version -> filepath
for f in local_files:
    basename = os.path.basename(f)
    match = re.match(r'^(\d+)_', basename)
    if match:
        local_map[match.group(1)] = f

# ── Compute gaps ──────────────────────────────────────────────────────────────

local_versions = set(local_map.keys())
parity = local_versions & remote_versions
local_only = local_versions - remote_versions
remote_only = remote_versions - local_versions

print(f"Local files: {len(local_files)}")
print(f"Remote versions: {len(remote_versions)}")
print(f"Parity: {len(parity)}")
print(f"Local-only: {len(local_only)}")
print(f"Remote-only: {len(remote_only)}")
print()

# ── DDL operation extraction ──────────────────────────────────────────────────

# Patterns to detect DDL operations in migration SQL
DDL_PATTERNS = [
    # CREATE TABLE
    (r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["\']?(\w+)["\']?',
     'CREATE_TABLE'),
    # DROP TABLE
    (r'DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["\']?(\w+)["\']?',
     'DROP_TABLE'),
    # ALTER TABLE ... ADD COLUMN
    (r'ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS\s+)?(?:public\.)?)?["\']?(\w+)["\']?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?["\']?(\w+)["\']?',
     'ADD_COLUMN'),
    # ALTER TABLE ... DROP COLUMN
    (r'ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS\s+)?(?:public\.)?)?["\']?(\w+)["\']?\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?["\']?(\w+)["\']?',
     'DROP_COLUMN'),
    # ALTER TABLE ... ADD CONSTRAINT
    (r'ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS\s+)?(?:public\.)?)?["\']?(\w+)["\']?\s+ADD\s+CONSTRAINT\s+["\']?(\w+)["\']?',
     'ADD_CONSTRAINT'),
    # ALTER TABLE ... DROP CONSTRAINT
    (r'ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS\s+)?(?:public\.)?)?["\']?(\w+)["\']?\s+DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?["\']?(\w+)["\']?',
     'DROP_CONSTRAINT'),
    # CREATE INDEX
    (r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["\']?(\w+)["\']?',
     'CREATE_INDEX'),
    # DROP INDEX
    (r'DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["\']?(\w+)["\']?',
     'DROP_INDEX'),
    # CREATE POLICY
    (r'CREATE\s+POLICY\s+["\']?([^"\';\s]+)["\']?\s+ON\s+(?:public\.)?["\']?(\w+)["\']?',
     'CREATE_POLICY'),
    # DROP POLICY
    (r'DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?["\']?([^"\';\s]+)["\']?\s+ON\s+(?:public\.)?["\']?(\w+)["\']?',
     'DROP_POLICY'),
    # CREATE OR REPLACE FUNCTION
    (r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?["\']?(\w+)["\']?\s*\(',
     'CREATE_FUNCTION'),
    # DROP FUNCTION
    (r'DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["\']?(\w+)["\']?',
     'DROP_FUNCTION'),
    # CREATE OR REPLACE VIEW
    (r'CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?["\']?(\w+)["\']?',
     'CREATE_VIEW'),
    # DROP VIEW
    (r'DROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["\']?(\w+)["\']?',
     'DROP_VIEW'),
    # CREATE TYPE (enum)
    (r'CREATE\s+TYPE\s+(?:public\.)?["\']?(\w+)["\']?\s+AS\s+ENUM',
     'CREATE_ENUM'),
    # DROP TYPE
    (r'DROP\s+TYPE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["\']?(\w+)["\']?',
     'DROP_TYPE'),
    # ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    (r'ALTER\s+TABLE\s+(?:public\.)?["\']?(\w+)["\']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY',
     'ENABLE_RLS'),
    # CREATE TRIGGER
    (r'CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+["\']?(\w+)["\']?\s+.*?\s+ON\s+(?:public\.)?["\']?(\w+)["\']?',
     'CREATE_TRIGGER'),
    # DROP TRIGGER
    (r'DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?["\']?(\w+)["\']?\s+ON\s+(?:public\.)?["\']?(\w+)["\']?',
     'DROP_TRIGGER'),
    # ALTER TYPE ... ADD VALUE (enum value)
    (r"ALTER\s+TYPE\s+(?:public\.)?[\"']?(\w+)[\"']?\s+ADD\s+VALUE",
     'ALTER_ENUM_ADD'),
    # INSERT INTO
    (r'INSERT\s+INTO\s+(?:public\.)?["\']?(\w+)["\']?',
     'INSERT_INTO'),
    # UPDATE table SET
    (r'UPDATE\s+(?:public\.)?["\']?(\w+)["\']?\s+SET\s+',
     'UPDATE_TABLE'),
    # DELETE FROM
    (r'DELETE\s+FROM\s+(?:public\.)?["\']?(\w+)["\']?',
     'DELETE_FROM'),
    # ALTER TABLE ... ALTER COLUMN (type change, default, not null)
    (r'ALTER\s+TABLE\s+(?:(?:IF\s+EXISTS\s+)?(?:public\.)?)?["\']?(\w+)["\']?\s+ALTER\s+COLUMN\s+["\']?(\w+)["\']?',
     'ALTER_COLUMN'),
    # ALTER TABLE ... RENAME COLUMN
    (r'ALTER\s+TABLE\s+(?:public\.)?["\']?(\w+)["\']?\s+RENAME\s+COLUMN\s+["\']?(\w+)["\']?\s+TO\s+["\']?(\w+)["\']?',
     'RENAME_COLUMN'),
    # GRANT
    (r'GRANT\s+.*\s+ON\s+(?:TABLE\s+)?(?:public\.)?["\']?(\w+)["\']?',
     'GRANT'),
    # CREATE EXTENSION
    (r'CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?["\']?(\w+)["\']?',
     'CREATE_EXTENSION'),
    # CREATE SCHEMA
    (r'CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?["\']?(\w+)["\']?',
     'CREATE_SCHEMA'),
]

def strip_comments(sql):
    """Remove SQL comments (-- and /* */) but keep strings."""
    # Remove single-line comments
    sql = re.sub(r'--[^\n]*', '', sql)
    # Remove block comments
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    return sql

def extract_header_comment(sql):
    """Extract first comment block as description."""
    lines = sql.split('\n')
    desc_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('--'):
            desc_lines.append(stripped.lstrip('- ').strip())
        elif stripped and not stripped.startswith('--'):
            break
    return ' '.join(desc_lines[:3]) if desc_lines else '(no header comment)'

def extract_ddl_ops(sql_content):
    """Extract DDL operations from SQL content."""
    clean_sql = strip_comments(sql_content)
    ops = []
    for pattern, op_type in DDL_PATTERNS:
        for m in re.finditer(pattern, clean_sql, re.IGNORECASE | re.DOTALL):
            groups = [g for g in m.groups() if g is not None]
            ops.append({
                'type': op_type,
                'args': groups,
                'match': m.group(0)[:120]
            })
    return ops

def check_op_in_prod(op):
    """Check if a DDL operation's effect is present in PROD catalog.
    Returns: 'present', 'absent', or 'unclear'
    """
    op_type = op['type']
    args = op['args']

    if op_type == 'CREATE_TABLE':
        table = args[0].lower()
        return 'present' if table in prod_tables else 'absent'

    elif op_type == 'DROP_TABLE':
        table = args[0].lower()
        return 'present' if table not in prod_tables else 'absent'

    elif op_type == 'ADD_COLUMN':
        table = args[0].lower()
        col = args[1].lower()
        key = f"{table}.{col}"
        return 'present' if key in prod_columns else 'absent'

    elif op_type == 'DROP_COLUMN':
        table = args[0].lower()
        col = args[1].lower()
        key = f"{table}.{col}"
        return 'present' if key not in prod_columns else 'absent'

    elif op_type == 'ADD_CONSTRAINT':
        constraint = args[1].lower()
        return 'present' if constraint in prod_constraints else 'absent'

    elif op_type == 'DROP_CONSTRAINT':
        constraint = args[1].lower()
        return 'present' if constraint not in prod_constraints else 'absent'

    elif op_type == 'CREATE_INDEX':
        idx = args[0].lower()
        return 'present' if idx in prod_indexes else 'absent'

    elif op_type == 'DROP_INDEX':
        idx = args[0].lower()
        return 'present' if idx not in prod_indexes else 'absent'

    elif op_type == 'CREATE_POLICY':
        policy = args[0].lower()
        # strip quotes
        policy = policy.strip('"').strip("'")
        return 'present' if policy in prod_policies else 'absent'

    elif op_type == 'DROP_POLICY':
        policy = args[0].lower()
        policy = policy.strip('"').strip("'")
        return 'present' if policy not in prod_policies else 'absent'

    elif op_type == 'CREATE_FUNCTION':
        func = args[0].lower()
        return 'present' if func in prod_functions else 'absent'

    elif op_type == 'DROP_FUNCTION':
        func = args[0].lower()
        return 'present' if func not in prod_functions else 'absent'

    elif op_type == 'CREATE_VIEW':
        view = args[0].lower()
        return 'present' if view in prod_views else 'absent'

    elif op_type == 'DROP_VIEW':
        view = args[0].lower()
        return 'present' if view not in prod_views else 'absent'

    elif op_type == 'CREATE_ENUM':
        enum = args[0].lower()
        return 'present' if enum in prod_enums else 'absent'

    elif op_type == 'DROP_TYPE':
        enum = args[0].lower()
        return 'present' if enum not in prod_enums else 'absent'

    elif op_type == 'ENABLE_RLS':
        table = args[0].lower()
        return 'present' if table in prod_rls_enabled else 'absent'

    elif op_type == 'CREATE_TRIGGER':
        trigger = args[0].lower()
        return 'present' if trigger in prod_triggers else 'absent'

    elif op_type == 'DROP_TRIGGER':
        trigger = args[0].lower()
        return 'present' if trigger not in prod_triggers else 'absent'

    elif op_type == 'ALTER_ENUM_ADD':
        # Can't easily check enum values, mark as unclear
        return 'unclear'

    elif op_type in ('INSERT_INTO', 'UPDATE_TABLE', 'DELETE_FROM'):
        # Data operations can't be verified via schema reflection
        return 'unclear'

    elif op_type == 'ALTER_COLUMN':
        # Column exists check (type/default changes can't be fully verified)
        table = args[0].lower()
        col = args[1].lower()
        key = f"{table}.{col}"
        return 'present' if key in prod_columns else 'absent'

    elif op_type == 'RENAME_COLUMN':
        # Check new name exists
        table = args[0].lower()
        new_col = args[2].lower() if len(args) > 2 else args[1].lower()
        key = f"{table}.{new_col}"
        return 'present' if key in prod_columns else 'absent'

    elif op_type in ('GRANT', 'CREATE_EXTENSION', 'CREATE_SCHEMA'):
        return 'unclear'

    return 'unclear'

# ── Triage each LOCAL_ONLY file ───────────────────────────────────────────────

categories = {
    'APPLIED_IDENTICAL': [],
    'APPLIED_PARTIAL': [],
    'NOT_APPLIED_DEAD': [],
    'NOT_APPLIED_REAL': [],
    'UNCLEAR': [],
}

local_only_sorted = sorted(local_only)
print(f"Processing {len(local_only_sorted)} local-only files...")
print()

for i, version in enumerate(local_only_sorted):
    filepath = local_map[version]
    basename = os.path.basename(filepath)

    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except Exception as e:
        categories['UNCLEAR'].append({
            'version': version,
            'file': basename,
            'description': f'(error reading file: {e})',
            'reason': f'File read error: {e}',
            'ops': [],
            'present': [],
            'absent': [],
            'unclear_ops': [],
        })
        continue

    header = extract_header_comment(content)
    ops = extract_ddl_ops(content)

    present_ops = []
    absent_ops = []
    unclear_ops = []

    for op in ops:
        status = check_op_in_prod(op)
        if status == 'present':
            present_ops.append(op)
        elif status == 'absent':
            absent_ops.append(op)
        else:
            unclear_ops.append(op)

    total_checkable = len(present_ops) + len(absent_ops)

    entry = {
        'version': version,
        'file': basename,
        'description': header[:200],
        'ops': ops,
        'present': present_ops,
        'absent': absent_ops,
        'unclear_ops': unclear_ops,
        'total_ops': len(ops),
        'total_checkable': total_checkable,
    }

    if total_checkable == 0:
        if len(unclear_ops) > 0:
            entry['reason'] = 'Only data ops (INSERT/UPDATE/DELETE) or unchecked DDL — cannot verify via schema reflection'
            entry['category'] = 'UNCLEAR'
            categories['UNCLEAR'].append(entry)
        elif len(ops) == 0:
            entry['reason'] = 'No DDL or DML ops detected — possibly empty/comment-only file or non-standard SQL'
            entry['category'] = 'UNCLEAR'
            categories['UNCLEAR'].append(entry)
        else:
            entry['reason'] = 'All ops unclear'
            entry['category'] = 'UNCLEAR'
            categories['UNCLEAR'].append(entry)
    elif len(absent_ops) == 0:
        # All checkable ops present in PROD
        entry['reason'] = 'All checkable DDL effects present in PROD — likely applied via another route or re-timestamped'
        entry['category'] = 'APPLIED_IDENTICAL'
        categories['APPLIED_IDENTICAL'].append(entry)
    elif len(present_ops) == 0:
        # No checkable ops present in PROD
        # Determine if dead or real pending
        # Check if the target tables/objects even exist
        references_existing = False
        for op in absent_ops:
            if op['type'] in ('ADD_COLUMN', 'ALTER_COLUMN', 'ADD_CONSTRAINT', 'CREATE_POLICY', 'CREATE_TRIGGER', 'ENABLE_RLS', 'CREATE_INDEX'):
                # These reference an existing table - check if table exists
                if op['args'] and op['args'][0].lower() in prod_tables:
                    references_existing = True
                    break
            elif op['type'] == 'CREATE_TABLE':
                # Creating a table that doesn't exist - could be real pending
                references_existing = True  # It's a new object, so it's "real"
                break

        if references_existing:
            entry['reason'] = 'REAL PENDING — DDL effects NOT in PROD and target objects exist or are new tables'
            entry['category'] = 'NOT_APPLIED_REAL'
            categories['NOT_APPLIED_REAL'].append(entry)
        else:
            entry['reason'] = 'No DDL effects in PROD and targets don\'t exist — likely dead/abandoned or references dropped tables'
            entry['category'] = 'NOT_APPLIED_DEAD'
            categories['NOT_APPLIED_DEAD'].append(entry)
    else:
        # Mix of present and absent
        entry['reason'] = f'PARTIAL — {len(present_ops)} ops present, {len(absent_ops)} ops absent in PROD'
        entry['category'] = 'APPLIED_PARTIAL'
        categories['APPLIED_PARTIAL'].append(entry)

    if (i + 1) % 20 == 0:
        print(f"  Processed {i+1}/{len(local_only_sorted)}...")

print(f"  Processed {len(local_only_sorted)}/{len(local_only_sorted)} — done.")
print()

# ── Print summary ─────────────────────────────────────────────────────────────

print("=" * 60)
print("CATEGORY COUNTS")
print("=" * 60)
for cat, items in categories.items():
    print(f"  {cat}: {len(items)} files")
print()

# ── Generate report ───────────────────────────────────────────────────────────

report_path = os.path.join(TMP_DIR, 'migration-sync-triage-report.md')

with open(report_path, 'w', encoding='utf-8') as f:
    f.write(f"# Migration Sync Triage Report — {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")

    f.write("## Summary\n\n")
    f.write(f"- Total local files: {len(local_files)}\n")
    f.write(f"- Total remote versions: {len(remote_versions)}\n")
    f.write(f"- Parity (both local + remote): {len(parity)}\n")
    f.write(f"- Local-only (local file, no remote tracking): {len(local_only)}\n")
    f.write(f"- Remote-only (remote tracking, no local file): {len(remote_only)}\n\n")

    f.write("## Category Counts\n\n")
    f.write(f"- **APPLIED-IDENTICAL**: {len(categories['APPLIED_IDENTICAL'])} files — all DDL effects present in PROD\n")
    f.write(f"- **APPLIED-PARTIAL**: {len(categories['APPLIED_PARTIAL'])} files — some DDL present, some missing\n")
    f.write(f"- **NOT-APPLIED-DEAD**: {len(categories['NOT_APPLIED_DEAD'])} files — zero DDL present, targets don't exist\n")
    f.write(f"- **NOT-APPLIED-REAL**: {len(categories['NOT_APPLIED_REAL'])} files — zero DDL present, targets exist or new tables\n")
    f.write(f"- **UNCLEAR**: {len(categories['UNCLEAR'])} files — only data ops or no detectable DDL\n\n")

    # ── APPLIED-IDENTICAL ──
    f.write(f"## APPLIED-IDENTICAL files ({len(categories['APPLIED_IDENTICAL'])} files)\n\n")
    f.write("These files' DDL effects are fully present in PROD. Safe to mark as applied via `migration repair --status applied`.\n\n")
    for entry in sorted(categories['APPLIED_IDENTICAL'], key=lambda e: e['version']):
        f.write(f"- `{entry['file']}` — {entry['description'][:120]}\n")
        ops_summary = ', '.join(set(op['type'] for op in entry['present']))
        f.write(f"  - Ops present: {ops_summary}\n")
        if entry['unclear_ops']:
            unclear_summary = ', '.join(set(op['type'] for op in entry['unclear_ops']))
            f.write(f"  - Unclear ops (not checked): {unclear_summary}\n")
    f.write("\n")

    # ── APPLIED-PARTIAL ──
    f.write(f"## APPLIED-PARTIAL files ({len(categories['APPLIED_PARTIAL'])} files) ⚠️ REQUIRES REVIEW\n\n")
    for entry in sorted(categories['APPLIED_PARTIAL'], key=lambda e: e['version']):
        f.write(f"### `{entry['file']}`\n\n")
        f.write(f"Description: {entry['description'][:200]}\n\n")
        f.write("**DDL ops present in PROD:**\n")
        for op in entry['present']:
            f.write(f"- {op['type']}: {' / '.join(op['args'])}\n")
        f.write("\n**DDL ops MISSING from PROD:**\n")
        for op in entry['absent']:
            f.write(f"- {op['type']}: {' / '.join(op['args'])}\n")
        if entry['unclear_ops']:
            f.write("\n**Unclear ops:**\n")
            for op in entry['unclear_ops']:
                f.write(f"- {op['type']}: {' / '.join(op['args'])}\n")
        f.write(f"\nBest guess: {entry['reason']}\n\n")

    # ── NOT-APPLIED-DEAD ──
    f.write(f"## NOT-APPLIED-DEAD files ({len(categories['NOT_APPLIED_DEAD'])} files)\n\n")
    f.write("These files' DDL effects are not in PROD and their targets don't exist. Likely abandoned drafts.\n\n")
    for entry in sorted(categories['NOT_APPLIED_DEAD'], key=lambda e: e['version']):
        f.write(f"- `{entry['file']}` — {entry['description'][:120]}\n")
        if entry['absent']:
            ops_summary = ', '.join(f"{op['type']}({'/'.join(op['args'])})" for op in entry['absent'][:5])
            f.write(f"  - Missing ops: {ops_summary}\n")
    f.write("\n")

    # ── NOT-APPLIED-REAL ──
    f.write(f"## NOT-APPLIED-REAL files ({len(categories['NOT_APPLIED_REAL'])} files) ⚠️ HIGH PRIORITY\n\n")
    f.write("These files contain DDL that is NOT in PROD but targets existing tables or creates new ones.\n\n")
    for entry in sorted(categories['NOT_APPLIED_REAL'], key=lambda e: e['version']):
        f.write(f"### `{entry['file']}`\n\n")
        f.write(f"Description: {entry['description'][:200]}\n\n")
        f.write("**DDL ops missing in PROD:**\n")
        for op in entry['absent']:
            f.write(f"- {op['type']}: {' / '.join(op['args'])}\n")
        if entry['unclear_ops']:
            f.write("\n**Unclear ops:**\n")
            for op in entry['unclear_ops']:
                f.write(f"- {op['type']}: {' / '.join(op['args'])}\n")
        f.write(f"\nRisk: {entry['reason']}\n\n")

    # ── UNCLEAR ──
    f.write(f"## UNCLEAR files ({len(categories['UNCLEAR'])} files)\n\n")
    f.write("These files cannot be auto-categorized — only data ops, no detectable DDL, or file read errors.\n\n")
    for entry in sorted(categories['UNCLEAR'], key=lambda e: e['version']):
        f.write(f"- `{entry['file']}` — {entry['description'][:120]}\n")
        f.write(f"  - Reason: {entry['reason']}\n")
        if entry.get('unclear_ops'):
            ops_summary = ', '.join(f"{op['type']}({'/'.join(op['args'])})" for op in entry['unclear_ops'][:5])
            f.write(f"  - Ops: {ops_summary}\n")
    f.write("\n")

    # ── REMOTE-ONLY ──
    f.write(f"## Remote-Only versions ({len(remote_only)})\n\n")
    f.write("These versions are in PROD's schema_migrations but have no local file.\n\n")
    # Load remote names for the remote-only ones
    # We'll just list them since we know them from the 14a diagnostic
    remote_only_names = {
        '20260312100000': 'intelligence_feed_read_at',
        '20260317000000': 'permissions_tables',
        '20260321000000': 'notifications_superpower',
        '20260321100000': 'demo_wire',
        '20260321200000': 'drop_external_tables',
        '20260322000000': 'ie_inspection_reports_distributions',
        '20260322100000': 'firecrawl_crawl_engine',
        '20260322200000': 'inspection_reports_storage',
        '20260525000000': 'drift_monitor',
    }
    for v in sorted(remote_only):
        name = remote_only_names.get(v, '(unknown)')
        f.write(f"- `{v}` / {name} — effects in PROD: assumed yes (was applied)\n")
    f.write("\n")

    # ── RECOMMENDED ACTIONS ──
    f.write("## Recommended Actions (per category)\n\n")
    f.write("1. **APPLIED-IDENTICAL**: Create local placeholder files, run `migration repair --status applied`, then delete placeholders. Or: bulk insert into schema_migrations via `db query`. One commit.\n")
    f.write("2. **APPLIED-PARTIAL**: STOP. Manual review per file before any action. Each needs human judgment on whether missing ops are intentional or a real gap.\n")
    f.write("3. **NOT-APPLIED-DEAD**: Delete local files. One commit.\n")
    f.write("4. **NOT-APPLIED-REAL**: STOP. Each file becomes its own apply decision — either apply to PROD or delete if superseded.\n")
    f.write("5. **UNCLEAR**: Manual review per file.\n")
    f.write("6. **REMOTE-ONLY**: Create placeholder files, run `migration repair --status applied` for the 9 known orphans. Or: keep placeholder files permanently.\n\n")

    # ── VERSION LIST FOR REFERENCE ──
    f.write("## Appendix: Full local-only version list\n\n")
    f.write("```\n")
    for v in sorted(local_only):
        basename = os.path.basename(local_map[v])
        f.write(f"{basename}\n")
    f.write("```\n")

print(f"Report written to: {report_path}")
print()
print("Done.")
