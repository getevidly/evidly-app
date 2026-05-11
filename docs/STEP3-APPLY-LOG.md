# STEP3-APPLY-LOG — Phase 1 Schema Migrations

> **Date:** 2026-05-10
> **PROD project:** irxgmhxhmxtzfwuieblc
> **Apply method:** Supabase CLI (`npx supabase db query --linked`)
> **Operator:** Claude Code (automated, human-approved plan)

---

## Pre-Apply Checklist

```sql
SELECT (SELECT count(*) FROM compliance_documents) AS cd_rows,
       (SELECT count(*) FROM compliance_document_requests) AS cdr_rows,
       (SELECT count(*) FROM vendor_service_records) AS vsr_rows;
```

| cd_rows | cdr_rows | vsr_rows |
|---|---|---|
| 0 | 0 | 0 |

**Result: ✅ PASS — all target tables empty**

```sql
SELECT name FROM vault.decrypted_secrets
WHERE name IN ('project_url', 'service_role_key');
```

| name |
|---|
| service_role_key |

**Result: ⚠️ `project_url` missing, `service_role_key` present. Acceptable — M13 (cron) is deferred.**

---

## Migration Apply Log

### M1 — compliance_documents.category CHECK (4-value)

**File:** `20260810000001_cd_category_4value.sql`

**Verification:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'compliance_documents_category_check';
```

| conname | pg_get_constraintdef |
|---|---|
| compliance_documents_category_check | CHECK ((category = ANY (ARRAY['kitchen'::text, 'employee'::text, 'service'::text, 'business'::text]))) |

**Result: ✅ PASS**

---

### M2 — compliance_documents.status CHECK (6-value) + partial index

**File:** `20260810000002_cd_status_6value.sql`

**Verification (constraint):**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'compliance_documents_status_check';
```

| conname | pg_get_constraintdef |
|---|---|
| compliance_documents_status_check | CHECK ((status = ANY (ARRAY['current'::text, 'expiring'::text, 'expired'::text, 'pending_review'::text, 'requested'::text, 'overdue'::text]))) |

**Verification (index):**
```sql
SELECT indexdef FROM pg_indexes
WHERE indexname = 'idx_compliance_documents_org_pending';
```

| indexdef |
|---|
| CREATE INDEX idx_compliance_documents_org_pending ON public.compliance_documents USING btree (organization_id, status) WHERE (status = ANY (ARRAY['pending_review'::text, 'requested'::text])) |

**Result: ✅ PASS**

---

### M3 — subject_user_id column + CHECK + index

**File:** `20260810000003_cd_subject_user_id.sql`

**Verification (column):**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'compliance_documents' AND column_name = 'subject_user_id';
```

| column_name | data_type | is_nullable |
|---|---|---|
| subject_user_id | uuid | YES |

**Verification (constraint):**
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass
  AND conname = 'cd_employee_requires_subject';
```

| conname |
|---|
| cd_employee_requires_subject |

**Result: ✅ PASS**

---

### M4 — SKIPPED (expiry_date already exists)

---

### M5 — vendor_service_record_id on compliance_document_requests

**File:** `20260810000004_cdr_vendor_service_record_id.sql`

**Verification:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'compliance_document_requests'
  AND column_name = 'vendor_service_record_id';
```

| column_name | data_type |
|---|---|
| vendor_service_record_id | uuid |

**Result: ✅ PASS**

---

### M6 — viewed_at on compliance_document_requests

**File:** `20260810000005_cdr_viewed_at.sql`

**Verification:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'compliance_document_requests'
  AND column_name = 'viewed_at';
```

| column_name | data_type |
|---|---|
| viewed_at | timestamp with time zone |

**Result: ✅ PASS**

---

### M7 — SKIPPED (resend_count already exists)

---

### M8 — FK constraint on location_service_schedules.vendor_id

**File:** `20260810000006_lss_vendor_id_fk.sql`

**Pre-check:** 0 orphaned vendor_ids confirmed.

**Verification:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.location_service_schedules'::regclass
  AND conname = 'lss_vendor_id_fkey';
```

| conname | pg_get_constraintdef |
|---|---|
| lss_vendor_id_fkey | FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL |

**Result: ✅ PASS**

---

### M9a — vendor_id column on vendor_service_records (nullable)

**File:** `20260810000007_vsr_vendor_id_nullable.sql`

**Verification:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_service_records' AND column_name = 'vendor_id';
```

| column_name | data_type | is_nullable |
|---|---|---|
| vendor_id | uuid | YES |

**Result: ✅ PASS**

---

### M9b — Backfill vendor_id (no-op on 0 rows)

**File:** `20260810000008_vsr_vendor_id_backfill.sql`

**Verification:**
```sql
SELECT count(*) AS total_rows,
       count(vendor_id) AS has_vendor_id,
       count(*) - count(vendor_id) AS missing_vendor_id
FROM vendor_service_records;
```

| total_rows | has_vendor_id | missing_vendor_id |
|---|---|---|
| 0 | 0 | 0 |

**NOT NULL constraint: NOT applied (commented out per plan)**

**Result: ✅ PASS**

---

### M10 — share_recommendation_rules table + 15 seed rows

**File:** `20260810000009_share_recommendation_rules.sql`

**Verification:**
```sql
SELECT recipient_type, count(*) AS rules
FROM share_recommendation_rules
GROUP BY recipient_type ORDER BY recipient_type;
```

| recipient_type | rules |
|---|---|
| ahj | 3 |
| auditor | 2 |
| client_legal | 2 |
| ehd | 3 |
| insurance_broker | 3 |
| insurance_carrier | 2 |

**Total: 15 rows ✅**

**Result: ✅ PASS**

---

### M11 — RLS policies (replace 5 → 8)

**File:** `20260810000010_cd_rls_policies.sql`

**Verification:**
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'compliance_documents'
ORDER BY policyname;
```

| policyname | cmd | roles |
|---|---|---|
| cd_delete_management | DELETE | {authenticated} |
| cd_insert_org_member | INSERT | {authenticated} |
| cd_insert_vendor_self_service | INSERT | {authenticated} |
| cd_select_org_member | SELECT | {authenticated} |
| cd_service_role_insert | INSERT | {service_role} |
| cd_service_role_update | UPDATE | {service_role} |
| cd_update_org_member | UPDATE | {authenticated} |
| cd_update_vendor_self_service | UPDATE | {authenticated} |

**Total: 8 policies ✅**

**Result: ✅ PASS**

---

### M12 — Additional indexes

**File:** `20260810000011_cd_additional_indexes.sql`

**Verification:**
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'compliance_documents'
  AND indexname IN ('idx_cd_org_cat_status_loc_vendor', 'idx_cd_expiry_not_null', 'idx_cd_subject_user_id')
ORDER BY indexname;
```

| indexname |
|---|
| idx_cd_expiry_not_null |
| idx_cd_org_cat_status_loc_vendor |
| idx_cd_subject_user_id |

**Total: 3 indexes ✅**

**Result: ✅ PASS**

---

### M13 — DEFERRED (cron registration)

**Not applied.** Deferred until vendor-service-record-trigger edge function is deployed.
Migration file written: `20260810000012_cron_vendor_service_record_trigger.sql`

---

### M14 — Table comments

**File:** `20260810000013_table_comments.sql`

**Verification:**
```sql
SELECT obj_description('public.compliance_documents'::regclass) IS NOT NULL AS has_comment;
```

| has_comment |
|---|
| true |

**Result: ✅ PASS**

---

## Post-Apply Summary

```sql
-- CHECK constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.compliance_documents'::regclass AND contype = 'c'
ORDER BY conname;
```

| conname | pg_get_constraintdef |
|---|---|
| cd_employee_requires_subject | CHECK (((category <> 'employee'::text) OR (subject_user_id IS NOT NULL))) |
| compliance_documents_category_check | CHECK ((category = ANY (ARRAY['kitchen'::text, 'employee'::text, 'service'::text, 'business'::text]))) |
| compliance_documents_import_source_check | CHECK ((import_source = ANY (ARRAY[...]))) |
| compliance_documents_status_check | CHECK ((status = ANY (ARRAY['current'::text, 'expiring'::text, 'expired'::text, 'pending_review'::text, 'requested'::text, 'overdue'::text]))) |

**4 CHECK constraints (3 new/updated + 1 pre-existing import_source)**

| Metric | Expected | Actual | Status |
|---|---|---|---|
| CHECK constraints | 3 (+ import_source) | 4 | ✅ |
| RLS policies | 8 | 8 | ✅ |
| Index count | 11 | 11 | ✅ |
| share_recommendation_rules exists | true | true | ✅ |
| Seed rows | 15 | 15 | ✅ |
| New columns | 4 | 4 | ✅ |
| Cron registered | SKIPPED | N/A | DEFERRED |

---

## Migrations NOT Applied

| Migration | Reason |
|---|---|
| M4 | expiry_date already exists — no action needed |
| M7 | resend_count already exists — no action needed |
| M13 | Cron deferred until edge function deployed |

## Vault Note

`project_url` vault secret is missing. Must be added before M13 can be applied. `service_role_key` is present.

---

*End of STEP3-APPLY-LOG.md*
