# Phase 2d — Manual Research Queue

Jurisdictions where Firecrawl batch crawl returned no usable contact data.
These require manual research (phone calls, Google, or direct website inspection).

---

## EHD — 22 deferred + 5 rejected fills (27 total with remaining gaps)

### Fully deferred (no extractions from crawl)

| # | Slug | Remaining NULL fields | Crawl status |
|---|---|---|---|
| 1 | alameda-ca | poc_name, agency_email | no_extractions |
| 2 | calaveras-ca | poc_name, agency_email, agency_fax | no_website |
| 3 | el-dorado-ca | poc_name | no_extractions |
| 4 | glenn-ca | agency_email, agency_fax | no_extractions |
| 5 | inyo-ca | agency_fax | no_extractions |
| 6 | kern-ca | poc_name | no_extractions |
| 7 | kings-ca | poc_name, agency_email, agency_fax | no_extractions |
| 8 | lake-ca | poc_name, agency_email, agency_fax | no_extractions |
| 9 | madera-ca | poc_name, agency_email, agency_fax | no_extractions |
| 10 | mariposa-ca | poc_name | no_content |
| 11 | merced-ca | poc_name, agency_email | no_extractions |
| 12 | modoc-ca | poc_name, agency_email, agency_fax | no_extractions |
| 13 | orange-ca | poc_name, agency_fax | no_content |
| 14 | plumas-ca | poc_name, agency_email | no_extractions |
| 15 | sierra-ca | agency_email, agency_fax | no_content |
| 16 | siskiyou-ca | poc_name, agency_email, agency_fax | no_extractions |
| 17 | sutter-ca | agency_email, agency_fax, agency_address | no_extractions |
| 18 | tehama-ca | poc_name, agency_email, agency_fax | no_extractions |
| 19 | trinity-ca | poc_name | no_extractions |
| 20 | tulare-ca | poc_name, agency_address | no_extractions |
| 21 | tuolumne-ca | agency_email | no_extractions |
| 22 | yuba-ca | poc_name, agency_email, agency_fax | no_extractions |

### Rejected fills — still have gaps

| # | Slug | Remaining NULL fields | Rejected value | Reason |
|---|---|---|---|---|
| 23 | imperial-ca | poc_name, agency_email | poc_name="Environmental Health Staff" | Department name |
| 24 | la-county-ca | poc_name, agency_email, agency_fax, agency_address | agency_email="phwebinformatics@ph.lacounty.gov" | Wrong team |
| 25 | long-beach-ca | poc_name, agency_fax | poc_name="Public Works Services" | Department name |
| 26 | mendocino-ca | poc_name, agency_fax | poc_name="Environmental Health" | Department name |
| 27 | shasta-ca | poc_name, agency_email | poc_name="Environmental Health" | Department name |

---

## Fire AHJ — 43 deferred + 3 rejected fills (46 total with zero fills)

### Fully deferred (no extractions from crawl)

| # | Slug | Remaining NULL fields | Crawl status |
|---|---|---|---|
| 1 | alameda-ca | poc, email, fax, address | no_content |
| 2 | alpine-ca | poc, email, fax, address | no_extractions |
| 3 | amador-ca | poc, email, fax, address | no_extractions |
| 4 | butte-ca | poc, email, fax, address | no_extractions |
| 5 | calaveras-ca | poc, email, fax, address | no_content |
| 6 | colusa-ca | poc, email, fax, address | no_extractions |
| 7 | del-norte-ca | poc, email, fax, address | no_extractions |
| 8 | el-dorado-ca | poc, email, fax, address | no_extractions |
| 9 | fresno-ca | poc, email, fax, address | no_content |
| 10 | glenn-ca | poc, email, fax, address | no_extractions |
| 11 | humboldt-ca | poc, email, fax, address | no_extractions |
| 12 | imperial-ca | poc, email, fax, address | no_content |
| 13 | kern-ca | poc, email, fax, address | no_extractions |
| 14 | kings-ca | poc, email, fax, address | no_extractions |
| 15 | lake-ca | poc, email, fax, address | no_extractions |
| 16 | lassen-ca | poc, email, fax, address | no_extractions |
| 17 | long-beach-ca | poc, email, fax, address | no_website |
| 18 | madera-ca | poc, email, fax, address | no_extractions |
| 19 | marin-ca | poc, email, fax, address | no_content |
| 20 | mariposa-ca | poc, email, fax, address | no_extractions |
| 21 | mendocino-ca | poc, email, fax, address | no_extractions |
| 22 | merced-ca | poc, email, fax, address | no_extractions |
| 23 | modoc-ca | poc, email, fax, address | no_extractions |
| 24 | mono-ca | poc, email, fax, address | no_extractions |
| 25 | napa-ca | poc, email, fax, address | no_extractions |
| 26 | nevada-ca | poc, email, fax, address | no_extractions |
| 27 | plumas-ca | poc, email, fax, address | no_content |
| 28 | san-diego-ca | poc, email, fax, address | no_content |
| 29 | san-francisco-ca | poc, email, fax, address | no_extractions |
| 30 | san-joaquin-ca | poc, email, fax, address | no_content |
| 31 | san-mateo-ca | poc, email, fax, address | no_content |
| 32 | santa-cruz-ca | poc, email, fax, address | no_content |
| 33 | shasta-ca | poc, email, fax, address | no_content |
| 34 | sierra-ca | poc, email, fax, address | no_content |
| 35 | siskiyou-ca | poc, email, fax, address | no_extractions |
| 36 | sonoma-ca | poc, email, fax, address | no_extractions |
| 37 | stanislaus-ca | poc, email, fax, address | no_content |
| 38 | sutter-ca | poc, email, fax, address | no_extractions |
| 39 | tehama-ca | poc, email, fax, address | no_extractions |
| 40 | trinity-ca | poc, email, fax, address | no_extractions |
| 41 | tuolumne-ca | poc, email, fax, address | no_extractions |
| 42 | yolo-ca | poc, email, fax, address | no_extractions |
| 43 | yuba-ca | poc, email, fax, address | no_content |

### Rejected fills — still have all 4 gaps

| # | Slug | Rejected value | Reason |
|---|---|---|---|
| 44 | inyo-ca | fire_ahj_poc_name="District Lookup" | Junk extraction |
| 45 | riverside-ca | fire_ahj_poc_name="Riverside County Fire" | Department name |
| 46 | tulare-ca | fire_ahj_poc_name="Fire Department\n\nFire" | Junk/malformed |

### Partially filled — remaining gaps after accepted fills

| Slug | Filled fields (Phase 2d) | Remaining NULL fields |
|---|---|---|
| la-county-ca | fire_ahj_address, fire_ahj_poc_name | fire_ahj_email, fire_ahj_fax |
| orange-ca | fire_ahj_address, fire_ahj_poc_name | fire_ahj_email, fire_ahj_fax |
| san-benito-ca | fire_ahj_address | fire_ahj_poc_name, fire_ahj_email, fire_ahj_fax |
| san-bernardino-ca | fire_ahj_email, fire_ahj_poc_name | fire_ahj_fax, fire_ahj_address |
| santa-clara-ca | fire_ahj_email, fire_ahj_poc_name | fire_ahj_fax, fire_ahj_address |
| solano-ca | fire_ahj_address | fire_ahj_poc_name, fire_ahj_email, fire_ahj_fax |

---

## Summary

| Category | Count |
|---|---|
| EHD jurisdictions with remaining gaps | 27 |
| Fire AHJ jurisdictions with zero fills | 46 |
| Fire AHJ partially filled (still have gaps) | 6 |
| Total distinct jurisdictions needing manual work | 52 |
| EHD NULL fields remaining | ~62 |
| Fire AHJ NULL fields remaining | ~198 |
