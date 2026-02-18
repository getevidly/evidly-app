# Jurisdiction Validation Report
**2026-02-18 20:06 UTC**

## Summary

| Metric | Count |
|--------|-------|
| Total records | 7 |
| ✅ Import eligible | 4 |
| ❌ Blocked (has errors) | 3 |
| Total errors | 3 |
| Total warnings | 0 |
| Cross-jurisdiction issues | 0 |

## Computed Confidence Distribution

| Level | Count | % |
|-------|-------|---|
| high | 1 | 14% |
| medium | 3 | 43% |
| low | 0 | 0% |

## Confidence Disagreements (Computed vs LLM)

| Jurisdiction | State | LLM Said | Computed | Score |
|-------------|-------|----------|----------|-------|
| Madera County | CA | low | medium | 55/100 |
| San Joaquin County | CA | low | medium | 55/100 |
| Merced County | CA | medium | high | 95/100 |

## ❌ BLOCKED FROM IMPORT (3 records)

These records have errors that must be fixed before import.

### Mariposa County (CA)
Source: `results\ca\mariposa_county_ERROR.json`

- ❌ [schema] _meta.status: Crawl failed: All 3 attempts failed. Last: Error code: 429 - {'type': 'error', 'error': {'type': 'rate_limit_error', 'message': "This request would exceed your organization's rate limit of 30,000 input tokens per minute (org: 6728659d-dbfc-44f4-bb20-4dae069ce88c, model: claude-sonnet-4-20250514). For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."}, 'request_id': 'req_011CYG7zJnzrXvbz5xMxLSCG'}

### Stanislaus County (CA)
Source: `results\ca\stanislaus_county_ERROR.json`

- ❌ [schema] _meta.status: Crawl failed: All 3 attempts failed. Last: Error code: 429 - {'type': 'error', 'error': {'type': 'rate_limit_error', 'message': "This request would exceed your organization's rate limit of 30,000 input tokens per minute (org: 6728659d-dbfc-44f4-bb20-4dae069ce88c, model: claude-sonnet-4-20250514). For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."}, 'request_id': 'req_011CYG7XAEYuoXmDoCoDpuXn'}

### Tulare County (CA)
Source: `results\ca\tulare_county_ERROR.json`

- ❌ [schema] _meta.status: Crawl failed: All 3 attempts failed. Last: Error code: 429 - {'type': 'error', 'error': {'type': 'rate_limit_error', 'message': "This request would exceed your organization's rate limit of 30,000 input tokens per minute (org: 6728659d-dbfc-44f4-bb20-4dae069ce88c, model: claude-sonnet-4-20250514). For details, refer to: https://docs.claude.com/en/api/rate-limits. You can see the response headers for current usage. Please reduce the prompt length or the maximum tokens requested, or try again later. You may also contact sales at https://www.anthropic.com/contact-sales to discuss your options for a rate limit increase."}, 'request_id': 'req_011CYG8t1dpcJ1P7NMkDwmcz'}

## ✅ CLEAN — Ready for Import (4 records)

- Fresno County (CA) — confidence: medium (60/100)
- Madera County (CA) — confidence: medium (55/100)
- Merced County (CA) — confidence: high (95/100)
- San Joaquin County (CA) — confidence: medium (55/100)
