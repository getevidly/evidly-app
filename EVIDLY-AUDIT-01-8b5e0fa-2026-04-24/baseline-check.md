# JIE Baseline Check

**Status: PASS**

Query: `SELECT state, COUNT(*) AS jurisdiction_count FROM jurisdictions GROUP BY state ORDER BY state;`

| State | Expected | Actual | Status |
|-------|----------|--------|--------|
| AZ    | 15       | 15     | PASS   |
| CA    | 62       | 62     | PASS   |
| NV    | 17       | 17     | PASS   |
| OR    | 36       | 36     | PASS   |
| WA    | 39       | 39     | PASS   |
| **Total** | **169** | **169** | **PASS** |

**Note:** Audit spec referenced column `state_code` but actual column is `state`. Schema documentation mismatch — not a data issue.

Checked on commit `8b5e0fae415f6650ef66661a8f26fb794ac732ef` at 2026-04-24.
