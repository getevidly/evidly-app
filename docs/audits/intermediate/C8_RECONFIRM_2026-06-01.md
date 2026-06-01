# C8 RE-CONFIRMATION — Audit Log RPC & Trail Integrity

**Date:** 2026-06-01
**Auditor:** Claude Code (read-only codebase analysis)
**Ref:** PHASE2_WIRED_BROKEN.txt, line 30 / lines 443-454, commit c7f06d9
**Scope:** Codebase-only investigation. SQL queries for PROD verification listed but not executed (no Supabase SQL Editor access in this session). Arthur should run Part A queries against PROD to complete the picture.

---

## 1. VERDICT

**C8 CONFIRMED — and scope of breakage is WIDER than originally reported.**

The `log_audit_event` RPC does not exist in any migration. But C8 understated the problem: the 6 admin pages that bypass the RPC and insert directly into `platform_audit_log` also silently fail because RLS revokes INSERT from the `authenticated` role. Only edge functions using `service_role` can write audit rows. The entire frontend audit compliance trail is non-functional.

---

## 2. FUNCTION — `log_audit_event`

**Status: ABSENT**

- Zero matches for `log_audit_event` in all 90+ migration files (`supabase/migrations/`).
- Zero matches for `CREATE FUNCTION.*log_audit_event` anywhere in the repo.
- 80+ `CREATE FUNCTION` statements exist across migrations — none create `log_audit_event`.
- ADMIN_DB.txt (May 12 documentation snapshot) lists it as one of 2 RPCs (line 8), but this is a documentation artifact — the function was planned but never created.

**PROD verification needed — run A1 query:**
```sql
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname ILIKE '%audit%'
ORDER BY 1, 2;
```
If A1 returns a `log_audit_event` match, run A2 for the body. If not, function is confirmed absent in both code and PROD.

---

## 3. TABLE — `platform_audit_log`

### 3a. Migration status — TWO CONFLICTING DEFINITIONS

**Migration 1:** `20260520000000_admin_security_hardening.sql` (lines 14-70)
- `CREATE TABLE IF NOT EXISTS platform_audit_log`
- Full SOX schema: `actor_id, actor_email, actor_role, actor_ip, actor_user_agent, action, resource_type, resource_id, old_value, new_value, metadata, success, error_message, created_at`
- RLS enabled, policy `admin_read_audit_log` (SELECT for platform_admin), policy `service_role_insert_audit` (INSERT for service_role only)
- **Line 70: `REVOKE INSERT ON platform_audit_log FROM authenticated`** — explicitly blocks all frontend inserts

**Migration 2:** `20260804000000_create_audit_logs.sql` (lines 1-23)
- `CREATE TABLE platform_audit_log` (no `IF NOT EXISTS`)
- Slimmer schema: `id, organization_id, actor_id, action, resource_type, resource_id, success, error_message, metadata, created_at`
- Missing columns vs Migration 1: `actor_email, actor_role, actor_ip, actor_user_agent, old_value, new_value`
- RLS enabled, but **zero INSERT policies for authenticated** — comment says "service_role bypasses RLS automatically"

**Conflict:** If Migration 1 ran first (timestamp `0520` < `0804`), Migration 2 would error on `CREATE TABLE` (no `IF NOT EXISTS`). If only Migration 2 was applied, the schema lacks columns that frontend code tries to insert (`actor_email`, `old_value`, `new_value`).

**Either way, frontend authenticated inserts are blocked by RLS.**

### 3b. `admin_audit_log` — DOES NOT EXIST

- Zero matches in `supabase/migrations/` for `admin_audit_log`.
- Only referenced in ADMIN_DB.txt documentation (line 123: `admin_audit_log -- INSERT (via RPC)`).
- The original C8 finding referenced this table name, but the actual target table is `platform_audit_log`.

**PROD verification needed — run A3-A6 queries to confirm which table(s) exist and their actual schema/row count.**

---

## 4. CALL SITES

| # | Path | Line(s) | Caller Type | Target | Arg Shape | Failure Handling |
|---|------|---------|-------------|--------|-----------|-----------------|
| 1 | `src/hooks/useAuditLog.ts` | 19 | Frontend `.rpc()` | `log_audit_event` RPC | `{ p_action, p_resource_type, p_resource_id, p_metadata }` | Empty catch — silent |
| 2 | `src/components/auth/RequireAdmin.tsx` | 28-33 | Frontend (via #1) | `log_audit_event` RPC | action=`'security.unauthorized_route_access'`, resourceType=`'admin_route'`, resourceId=pathname, metadata=`{ attempted_role }` | Silent (inherited from #1) |
| 3 | `src/pages/admin/AdminAuditLog.tsx` | 147 | Frontend direct insert | `platform_audit_log` | `{ action, actor_id, actor_email, resource_type, metadata, success }` | `.catch(() => {})` |
| 4 | `src/pages/admin/AdminOrgs.tsx` | 126 | Frontend direct insert | `platform_audit_log` | `{ actor_id, actor_email, action, resource_type, resource_id, old_value, new_value }` | `.catch(() => {})` |
| 5 | `src/pages/admin/AdminSecurity.tsx` | 131 | Frontend direct insert | `platform_audit_log` | `{ actor_id, actor_email, action, resource_type, resource_id, old_value, new_value }` | `.catch(() => {})` |
| 6 | `src/pages/admin/AdminSecurity.tsx` | 163 | Frontend direct insert | `platform_audit_log` | `{ actor_id, actor_email, action, resource_type, resource_id }` | `.catch(() => {})` |
| 7 | `src/pages/admin/AdminSecurity.tsx` | 180 | Frontend direct insert | `platform_audit_log` | `{ actor_id, actor_email, action, resource_type, metadata }` | `.catch(() => {})` |
| 8 | `src/pages/admin/AdminUsers.tsx` | 139 | Frontend direct insert | `platform_audit_log` | `{ actor_id, actor_email, action, resource_type, resource_id, old_value, new_value }` | `.catch(() => {})` |
| 9 | `src/pages/admin/IntelligenceAdmin.tsx` | 556 | Frontend direct insert | `platform_audit_log` | `{ actor_id, actor_email, action, resource_type, old_value, new_value }` | `.catch(() => {})` |
| 10 | `src/pages/admin/IntelligenceAdmin.tsx` | 602 | Frontend direct insert | `platform_audit_log` | `{ actor_id, actor_email, action, resource_type, resource_id, old_value, new_value }` | `.catch(() => {})` |
| 11 | `supabase/functions/hoodops-webhook/index.ts` | 113 | Edge fn (service_role) | `platform_audit_log` | `{ organization_id, action, resource_type, resource_id, success, error_message, metadata }` | Logs error to console |
| 12 | `supabase/functions/classify-signals/index.ts` | 252 | Edge fn (supabaseAdmin) | `platform_audit_log` | `{ action, resource_type, success, metadata }` | `.catch(() => {})` |
| 13 | `src/hooks/deficiencies/useDeficiencyUpload.ts` | 299 | COMMENTED OUT | `platform_audit_log` | n/a | n/a (TODO comment) |

**Summary:** 12 active call sites. 2 use service_role (edge functions) and can write. 10 use authenticated frontend client and silently fail.

---

## 5. SIGNATURE MATCH

### RPC path (call site #1-2)
The hook passes `{ p_action, p_resource_type, p_resource_id, p_metadata }`. No function exists to match against. If created, the RPC would need to accept these 4 params and insert into `platform_audit_log` using service_role privileges (since authenticated is REVOKE'd).

### Direct insert path (call sites #3-10)
Frontend code inserts columns like `actor_email`, `old_value`, `new_value` — these exist in Migration 1's schema but NOT in Migration 2's schema. If PROD has Migration 2's slimmer schema, inserts with those columns would fail even if RLS were fixed. Column mismatch depends on which migration is actually applied.

### Edge function path (call sites #11-12)
- hoodops-webhook inserts `organization_id` — exists in Migration 2 only, not Migration 1.
- classify-signals inserts minimal columns (`action, resource_type, success, metadata`) — compatible with both schemas.

**There is a schema split.** Frontend code assumes Migration 1 columns. Edge functions assume Migration 2 columns. These are incompatible.

---

## 6. MIGRATION DRIFT

| Artifact | In Migrations? | Notes |
|----------|---------------|-------|
| `log_audit_event` function | NO | Never created in any migration |
| `admin_audit_log` table | NO | Only in ADMIN_DB.txt doc; no migration creates it |
| `platform_audit_log` table | YES (x2, conflicting) | Two incompatible CREATE TABLE statements |

**Drift is certain.** The RPC was planned but never built. The table has two conflicting definitions in the migration history. PROD state must be verified with A3-A6 queries to determine which (if either) schema is live.

---

## 7. SCOPE OF BREAKAGE

### Actions that route through the broken path

| Admin Action | File | Audit Action String |
|-------------|------|-------------------|
| Unauthorized route access attempt | RequireAdmin.tsx | `security.unauthorized_route_access` |
| Organization update | AdminOrgs.tsx | `admin.org_updated` |
| MFA policy change | AdminSecurity.tsx | `admin.mfa_policy_changed` |
| Session revocation | AdminSecurity.tsx | `admin.session_revoked` |
| All sessions revoked | AdminSecurity.tsx | `admin.all_sessions_revoked` |
| User actions (suspend/unsuspend/role change/etc.) | AdminUsers.tsx | Various `admin.*` actions |
| Manual signal creation | IntelligenceAdmin.tsx | `signal.created_manual` |
| Signal edit | IntelligenceAdmin.tsx | `signal.edited` |
| Audit log export | AdminAuditLog.tsx | `data.audit_log_exported` |

**9 distinct admin action categories with 10 frontend call sites — all silently fail.**

### What DOES work
- Edge function `hoodops-webhook` writes with service_role — likely succeeds if Migration 2 schema is live.
- Edge function `classify-signals` writes with supabaseAdmin (service_role) — likely succeeds.

### Compliance trail status
The "Prove" trail is **wholly non-functional for admin actions**. No admin mutation, security event, or configuration change is recorded. The audit log UI (`AdminAuditLog.tsx`) both reads and writes to the same broken table — so it shows nothing and its own export-logging fails.

Edge function operational logging may partially work (2 of 12 call sites), but these are machine-to-machine events, not admin compliance actions.

---

## 8. D1 INPUT — Recommended Fix Scope & Options

### What the fix actually requires

Based on findings, a complete fix needs:

1. **Resolve the migration conflict.** Determine which `platform_audit_log` schema is in PROD (run A3-A4). Produce a single canonical migration that either creates or alters to the correct schema. The schema must include both the SOX columns (actor_email, old_value, new_value) for frontend and organization_id for edge functions.

2. **Create the `log_audit_event` RPC.** A `SECURITY DEFINER` function that accepts `(p_action, p_resource_type, p_resource_id, p_metadata)`, enriches with `auth.uid()`, caller's email/role, and inserts into `platform_audit_log` using elevated privileges (since authenticated INSERT is revoked).

3. **Fix or replace frontend direct inserts.** Two options:
   - **(a)** Route all 8 frontend direct-insert call sites through the RPC (consistent, centralized).
   - **(b)** Add an INSERT policy for `platform_admin` role (lets direct inserts work for admins, but loses the enrichment that an RPC provides).

4. **Reconcile column shapes.** Frontend code inserts `actor_email`/`old_value`/`new_value`; edge functions insert `organization_id`. The canonical schema needs all columns. Verify no call site will hit a NOT NULL column it doesn't populate.

5. **Add at least one RLS SELECT policy** so the admin UI can actually read the audit log.

### Rough size
- 1 migration (schema reconciliation + RPC creation + policies): ~60-80 lines SQL
- 1-8 frontend file edits (if routing through RPC): touch 6 files, ~10 lines each
- 0 edge function changes (they already work with service_role)

### Three D1 options

**Option A — Build pre-launch (Recommended)**
Create the RPC, reconcile the schema, fix call sites. This is the SOX-grade compliance trail that the security hardening migration was designed for. Without it, EvidLY has zero admin audit trail. Rough scope: 1 migration + 6-8 file edits. Requires running the Part A SQL queries first to confirm PROD state.

**Option B — Document and defer to July**
Accept that audit logging is non-functional for launch. Document the gap formally. Ship with the broken trail and prioritize in a July sprint. Risk: any pre-July compliance inquiry or SOX audit question about admin action history has no answer. The silent-fail pattern means no user-visible regression either.

**Option C — Rip out the calls**
Remove `useAuditLog.ts`, remove the hook from `RequireAdmin.tsx`, remove all 8 direct-insert `.catch(() => {})` blocks. This eliminates dead code and makes the gap explicit (no audit logging at all, rather than silent-fail audit logging). Smaller than Option A but removes the scaffolding that Option A would build on. Rough scope: delete 1 file + edit 7 files.

**Recommendation:** Option A. The infrastructure is 90% there — the table exists (in some form), the call sites exist, the action taxonomy is already defined. The missing piece is one RPC function + one policy fix. The alternative (shipping with a wholly non-functional compliance trail that silently pretends to work) is worse than either fixing it or honestly removing it.

---

## APPENDIX — Part A SQL Queries (not yet executed)

These SELECT-only queries should be run in the Supabase SQL Editor against PROD (`irxgmhxhmxtzfwuieblc`) to complete this audit. Results should be appended to this report.

### A1 — Function existence
```sql
SELECT n.nspname AS schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname ILIKE '%audit%'
ORDER BY 1, 2;
```

### A2 — Function body (only if A1 finds log_audit_event)
```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'log_audit_event';
```

### A3 — Audit-related tables
```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name ILIKE '%audit%'
ORDER BY 1, 2;
```

### A4 — platform_audit_log columns
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'platform_audit_log'
ORDER BY ordinal_position;
```

### A5 — RLS + policies
```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class WHERE relname = 'platform_audit_log';

SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE tablename = 'platform_audit_log';
```

### A6 — Row count + latest write
```sql
SELECT count(*) AS row_count FROM platform_audit_log;
SELECT max(created_at) AS latest_write FROM platform_audit_log;
```

### A7 — Audit-writing triggers
```sql
SELECT event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE action_statement ILIKE '%audit%'
ORDER BY 2, 3;
```

### A8 — Migration history references
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE name ILIKE '%audit%'
   OR array_to_string(statements, ' ') ILIKE '%log_audit_event%'
   OR array_to_string(statements, ' ') ILIKE '%admin_audit_log%'
ORDER BY version;
```
