# STEP3-PRECONDITIONS — CHECK Constraint Audits

> **Date:** 2026-05-10
> **Purpose:** Identify CHECK constraint mismatches that must be updated before Step 3 code rewiring
> **Status:** AUDIT ONLY — no migrations applied. Arthur review required.

---

## 1. compliance_document_activity_log.event_type

### Current CHECK (PROD)

```
requested, request_resent, request_cancelled, submitted, viewed, accepted,
rejected, archived, expired, expiring_warning, renewed, sent_to_third_party,
send_revoked, noted
```

(14 values)

### Expected Step 3 Writes

Per locked decisions and UI contract:

```
requested, viewed, accepted, rejected, resent, shared, viewed_share,
downloaded_share, expired, overdue
```

### Mismatch Analysis

| Value | In PROD? | In Step 3? | Action |
|---|---|---|---|
| `requested` | ✅ | ✅ | Keep |
| `viewed` | ✅ | ✅ | Keep |
| `accepted` | ✅ | ✅ | Keep |
| `rejected` | ✅ | ✅ | Keep |
| `expired` | ✅ | ✅ | Keep |
| `resent` | ❌ | ✅ | **ADD** |
| `shared` | ❌ | ✅ | **ADD** |
| `viewed_share` | ❌ | ✅ | **ADD** |
| `downloaded_share` | ❌ | ✅ | **ADD** |
| `overdue` | ❌ | ✅ | **ADD** |
| `request_resent` | ✅ | ❌ | Keep (legacy, may still be written by existing code) |
| `request_cancelled` | ✅ | ❌ | Keep (legacy) |
| `submitted` | ✅ | ❌ | Keep (legacy) |
| `archived` | ✅ | ❌ | Keep (legacy) |
| `expiring_warning` | ✅ | ❌ | Keep (legacy) |
| `renewed` | ✅ | ❌ | Keep (legacy) |
| `sent_to_third_party` | ✅ | ❌ | Keep (legacy — `shared` is the new canonical name) |
| `send_revoked` | ✅ | ❌ | Keep (legacy) |
| `noted` | ✅ | ❌ | Keep (used by resend-webhook for bounce logging) |

### Recommendation

**Additive update only.** Add 5 new values without removing existing ones. This preserves backward compatibility with any existing edge functions or code paths that write legacy values. Consolidation (e.g., `request_resent` → `resent`) is a future cleanup after Step 3 rewire is verified.

```sql
-- PROPOSED (not applied):
ALTER TABLE compliance_document_activity_log
  DROP CONSTRAINT compliance_document_activity_log_event_type_check;

ALTER TABLE compliance_document_activity_log
  ADD CONSTRAINT compliance_document_activity_log_event_type_check
    CHECK (event_type IN (
      'requested', 'request_resent', 'request_cancelled', 'submitted',
      'viewed', 'accepted', 'rejected', 'archived', 'expired',
      'expiring_warning', 'renewed', 'sent_to_third_party', 'send_revoked', 'noted',
      'resent', 'shared', 'viewed_share', 'downloaded_share', 'overdue'
    ));
```

**New total:** 19 values (14 existing + 5 new)

---

## 2. compliance_document_send_records.recipient_type

### Current CHECK (PROD)

```
government, insurance, property, custom
```

(4 generic category values)

### Expected Step 3 Values

Per `share_recommendation_rules` table and UI contract:

```
ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal
```

(6 specific recipient type values)

### Mismatch Analysis

| Current Value | Maps To | Notes |
|---|---|---|
| `government` | `ehd` + `ahj` | Split into two specific types |
| `insurance` | `insurance_broker` + `insurance_carrier` | Split into two specific types |
| `property` | `client_legal` | Approximate mapping |
| `custom` | (no mapping) | Freeform — may still be needed as fallback |

| New Value | Currently Covered By | Notes |
|---|---|---|
| `ehd` | `government` (partial) | Environmental Health Dept |
| `ahj` | `government` (partial) | Authority Having Jurisdiction — Fire |
| `insurance_broker` | `insurance` (partial) | Broker vs carrier distinction |
| `insurance_carrier` | `insurance` (partial) | Direct carrier relationship |
| `auditor` | (none) | **Completely new type** |
| `client_legal` | `property` (loose) | Client legal / landlord |

### Recommendation

**Replace CHECK constraint.** Since `compliance_document_send_records` has 0 rows (verified during pre-apply), a full replacement is safe. However, consider keeping `custom` as a fallback for ad-hoc sends.

**Option A — Full replacement (strict):**
```sql
-- PROPOSED (not applied):
ALTER TABLE compliance_document_send_records
  DROP CONSTRAINT compliance_document_send_records_recipient_type_check;

ALTER TABLE compliance_document_send_records
  ADD CONSTRAINT compliance_document_send_records_recipient_type_check
    CHECK (recipient_type IN (
      'ehd', 'ahj', 'insurance_broker', 'insurance_carrier', 'auditor', 'client_legal'
    ));
```

**Option B — Additive (preserves legacy + adds new):**
```sql
-- PROPOSED (not applied):
ALTER TABLE compliance_document_send_records
  DROP CONSTRAINT compliance_document_send_records_recipient_type_check;

ALTER TABLE compliance_document_send_records
  ADD CONSTRAINT compliance_document_send_records_recipient_type_check
    CHECK (recipient_type IN (
      'government', 'insurance', 'property', 'custom',
      'ehd', 'ahj', 'insurance_broker', 'insurance_carrier', 'auditor', 'client_legal'
    ));
```

**Arthur's call:** Option A is cleaner (matches `share_recommendation_rules` exactly). Option B is safer for any unknown references. With 0 rows and 0 app code wired to `compliance_document_send_records`, Option A is recommended.

---

## Summary

| Table | Constraint | Action | Values to Add |
|---|---|---|---|
| `compliance_document_activity_log` | `event_type` CHECK | ADD 5 values | resent, shared, viewed_share, downloaded_share, overdue |
| `compliance_document_send_records` | `recipient_type` CHECK | REPLACE (0 rows, 0 app code) | ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal |

**Neither migration is applied. Both require Arthur's review before Step 3 work begins.**

---

*End of STEP3-PRECONDITIONS.md*
