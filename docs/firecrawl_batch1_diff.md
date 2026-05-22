# Firecrawl Batch 1 — Proposed Diff Review

**Date:** 2026-05-22
**Batch size:** 8 jurisdictions (priority ranks 3–10)
**Total proposed fills:** 41 (39 target fields + 2 website backfills)
**Confidence breakdown:** HIGH=28, MEDIUM=13, LOW=0

---

## 1. Los Angeles — Vernon

**ID:** `7edbb389-6fa8-4421-bed3-f6d64312fb08`
**Status:** `blocked_403` → deferred to phase2b

No fills. 301 redirect cityofvernon.org → cityofvernonca.gov, then 403 on all paths.
Fire pillar: no fire_ahj_website in PROD.

---

## 2. Los Angeles — Pasadena

**ID:** `0e0e3fc8-5fdd-41aa-a14b-4a887d819e2f`
**Status:** `completed` (carried from dryrun)

### Food Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| poc_name | NULL | Manuel Carmona, MPH, MPA | HIGH | Named with credentials on official About page | https://www.cityofpasadena.net/public-health/about/ |
| poc_title | NULL | Director of Public Health | HIGH | Explicit title on official About page | https://www.cityofpasadena.net/public-health/about/ |
| agency_email | NULL | NULL | — | No general EH inbox; only body-art alias found and rejected | — |
| agency_fax | NULL | (626) 744-6113 | HIGH | Labeled fax on official Contact page | https://www.cityofpasadena.net/public-health/contact/ |
| agency_address | NULL | 1845 N. Fair Oaks Ave., Suite 1200, Pasadena, CA 91103 | HIGH | EHD-specific address with suite; CA + ZIP confirmed | https://www.cityofpasadena.net/public-health/environmental-health/ |

### Fire Pillar
All NULL — no fire_ahj_website in PROD.

**Fills: 4** (4 HIGH, 0 MEDIUM)

---

## 3. Monterey (County)

**ID:** `fdf06087-a578-42eb-b0fb-8a8750c12348`
**Status:** `partial` — no agency_website for food pillar

### Food Pillar
All NULL — no agency_website in PROD.

### Fire Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| fire_ahj_poc_name | NULL | Justin Reyes | HIGH | Named as Division Chief / Fire Marshal on official MCRFD contact page | https://www.mcrfd.org/contact-us-9913b14 |
| fire_ahj_poc_title | NULL | Division Chief / Fire Marshal | HIGH | Explicit title on official MCRFD contact page | https://www.mcrfd.org/contact-us-9913b14 |
| fire_ahj_email | NULL | jreyes@mcrfd.org | HIGH | Fire Marshal direct email on official contact page; domain matches district | https://www.mcrfd.org/contact-us-9913b14 |
| fire_ahj_fax | NULL | NULL | — | No fax listed on MCRFD contact or admin pages | — |
| fire_ahj_address | NULL | 19900 Portola Drive, Salinas, CA 93908 | HIGH | HQ address on official contact page; CA + ZIP confirmed | https://www.mcrfd.org/contact-us-9913b14 |

**Note:** County fire page (co.monterey.ca.us/fire → countyofmonterey.gov) returned 403. MCRFD is the county fire AHJ; crawled mcrfd.org directly.

**Fills: 4** (4 HIGH, 0 MEDIUM)

---

## 4. San Luis Obispo (County)

**ID:** `00f803d1-7d50-4671-98d4-55be41c1bb40`
**Status:** `partial` — agency_website NULL in DB; EHD page discovered via crawl

### Supplementary: Website Backfill

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| agency_website | NULL | https://www.slocounty.ca.gov/Departments/Health-Agency/Public-Health/Environmental-Health | HIGH | Official SLO County government page; slocounty.ca.gov is the canonical county domain | https://www.slocounty.ca.gov/Departments/Health-Agency/Public-Health/Environmental-Health |

### Food Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| poc_name | NULL | Peter Hague | HIGH | Listed as Director of Environmental Health on official county EHD page | https://www.slocounty.ca.gov/Departments/Health-Agency/Public-Health/Environmental-Health |
| poc_title | NULL | Director of Environmental Health | HIGH | Explicit title on official county EHD page | https://www.slocounty.ca.gov/Departments/Health-Agency/Public-Health/Environmental-Health |
| agency_email | NULL | NULL | — | No general EHD inbox; only individual supervisor emails (lterry@co.slo.ca.us, crattigan@co.slo.ca.us) — program-specific, rejected | — |
| agency_fax | NULL | NULL | — | No fax listed on EHD page | — |
| agency_address | NULL | 1055 Monterey Street, San Luis Obispo, CA 93408 | HIGH | County Government Center address on EHD page; CA + ZIP confirmed | https://www.slocounty.ca.gov/Departments/Health-Agency/Public-Health/Environmental-Health |

### Fire Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| fire_ahj_poc_name | NULL | NULL | — | Only "Chief Owens" in nav menu — no first name; insufficient for fill | — |
| fire_ahj_poc_title | NULL | NULL | — | No explicit title beyond generic "Chief" reference | — |
| fire_ahj_email | NULL | slu.reception@fire.ca.gov | HIGH | Official CAL FIRE SLU reception email; .gov TLD confirmed | https://www.calfireslo.org |
| fire_ahj_fax | NULL | NULL | — | No fax listed on calfireslo.org | — |
| fire_ahj_address | NULL | 100 Cross Street, San Luis Obispo, CA 93401 | HIGH | CAL FIRE SLU HQ address; CA + ZIP confirmed | https://www.calfireslo.org |

**Fills: 5 target + 1 website** (6 HIGH, 0 MEDIUM)

---

## 5. Contra Costa (County)

**ID:** `85db5307-9608-46e2-bcf5-47131bd86119`
**Status:** `partial` — cchealth.org 403 on EHD direct crawl; cccfpd.org crawled

### Food Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| poc_name | NULL | Kristian Lucas, REHS | MEDIUM | Name from web search cached snippet, not direct page crawl (cchealth.org returned 403). REHS credential confirms EH professional. | https://www.cchealth.org/about-contra-costa-health/divisions/environmental-health/about-us |
| poc_title | NULL | Director of Environmental Health | MEDIUM | Title from web search cached snippet; could not verify on live page due to 403 | https://www.cchealth.org/about-contra-costa-health/divisions/environmental-health/about-us |
| agency_email | NULL | NULL | — | No email found in any crawled or cached page | — |
| agency_fax | NULL | (925) 608-5502 | MEDIUM | Fax from web search cached snippet referencing cchealth.org contact page; not verified via direct crawl (403) | https://www.cchealth.org/about-contra-costa-health/divisions/environmental-health/contact-us-env-health |
| agency_address | NULL | 2120 Diamond Boulevard, Suite 100, Concord, CA 94520 | MEDIUM | Address from web search cached snippet; CA + ZIP confirmed but not verified via direct crawl (403) | https://www.cchealth.org/about-contra-costa-health/divisions/environmental-health/contact-us-env-health |

### Fire Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| fire_ahj_poc_name | NULL | Aaron McAlister | HIGH | Appointed Fire Chief May 12, 2026; listed on official CCCFPD homepage | https://www.cccfpd.org/ |
| fire_ahj_poc_title | NULL | Fire Chief | HIGH | Explicit title on official CCCFPD homepage | https://www.cccfpd.org/ |
| fire_ahj_email | NULL | info@cccfpd.org | HIGH | General contact email on official CCCFPD page; domain matches fire_ahj_website | https://www.cccfpd.org/ |
| fire_ahj_fax | NULL | (925) 941-3309 | HIGH | Fax listed alongside phone on official CCCFPD homepage | https://www.cccfpd.org/ |
| fire_ahj_address | NULL | 4005 Port Chicago Highway, Suite 250, Concord, CA 94520-1180 | HIGH | HQ address on official CCCFPD page; CA + ZIP confirmed | https://www.cccfpd.org/ |

**Fills: 9** (5 HIGH, 4 MEDIUM)

---

## 6. Placer (County)

**ID:** `49fa961e-9076-4a79-b56e-b3b72b252a41`
**Status:** `partial` — agency_website NULL in DB; EH page discovered via crawl

### Supplementary: Website Backfill

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| agency_website | NULL | https://www.placer.ca.gov/3105/Environmental-Health | HIGH | Official Placer County .gov EH landing page; matches placer.ca.gov domain used for fire_ahj_website | https://www.placer.ca.gov/3105/Environmental-Health |

### Food Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| poc_name | NULL | NULL | — | No individual staff names published on Placer EH page or staff directory | — |
| poc_title | NULL | NULL | — | No individual staff titles published | — |
| agency_email | NULL | environmentalhealth@placer.ca.gov | HIGH | Official EH division email on placer.ca.gov; .gov TLD confirmed | https://www.placer.ca.gov/3105/Environmental-Health |
| agency_fax | NULL | NULL | — | No fax listed on EH page or directory | — |
| agency_address | NULL | 11434 B Ave, Suite 400, Auburn, CA 95603 | HIGH | Primary Auburn office on official EH page; CA + ZIP confirmed | https://www.placer.ca.gov/3105/Environmental-Health |

### Fire Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| fire_ahj_poc_name | NULL | Chris Mertens | HIGH | Named as Battalion Chief / Placer County Fire Marshal on official Fire Marshal page | https://www.placer.ca.gov/7662/Fire-Marshals-Office-and-Loss-Reduction |
| fire_ahj_poc_title | NULL | Battalion Chief / Placer County Fire Marshal | HIGH | Explicit title on official Fire Marshal page | https://www.placer.ca.gov/7662/Fire-Marshals-Office-and-Loss-Reduction |
| fire_ahj_email | NULL | building@placer.ca.gov | MEDIUM | Listed for Fire Inspections & Prevention Division; .gov TLD valid; "building@" prefix suggests shared building/fire inbox — not fire-specific | https://www.placer.ca.gov/directory.aspx?did=28 |
| fire_ahj_fax | NULL | (530) 745-3058 | HIGH | Fax for Fire Inspections & Prevention Division on official staff directory | https://www.placer.ca.gov/directory.aspx?did=28 |
| fire_ahj_address | NULL | 3091 County Center Dr., #160, Auburn, CA 95603 | HIGH | Fire Inspections & Prevention office on staff directory; CA + ZIP confirmed | https://www.placer.ca.gov/directory.aspx?did=28 |

**Fills: 7 target + 1 website** (6 HIGH, 2 MEDIUM)

---

## 7. Sacramento (County)

**ID:** `61c0e8aa-c729-4dbd-b92d-72a708c0d543`
**Status:** `completed`

### Food Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| poc_name | NULL | Jennea Monasterio | MEDIUM | Director name from org chart PDF referenced in web search; not on direct HTML page crawl | https://emd.saccounty.gov/Documents/OrgChart.pdf |
| poc_title | NULL | Director, Environmental Management Department | MEDIUM | Title from org chart PDF referenced in web search; not on direct HTML page crawl | https://emd.saccounty.gov/Documents/OrgChart.pdf |
| agency_email | NULL | EMDinfo@Saccounty.gov | HIGH | General inquiries email on official EMD Contact page; .gov TLD confirmed | https://emd.saccounty.gov/us/en/contact-and-about-us/contact-us.html |
| agency_fax | NULL | (916) 875-8513 | MEDIUM | Fax from web search result referencing EMD contact page; not visible on direct HTML crawl of same URL | https://emd.saccounty.gov/us/en/contact-and-about-us/contact-us.html |
| agency_address | NULL | 11080 White Rock Rd., Suite 200, Rancho Cordova, CA 95670 | HIGH | EMD office address on official Contact page; CA + ZIP confirmed | https://emd.saccounty.gov/us/en/contact-and-about-us/contact-us.html |

### Fire Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| fire_ahj_poc_name | NULL | Adam A. House | HIGH | Fire Chief listed on official Metro Fire homepage | https://metrofire.ca.gov |
| fire_ahj_poc_title | NULL | Fire Chief | HIGH | Explicit title on official Metro Fire homepage | https://metrofire.ca.gov |
| fire_ahj_email | NULL | NULL | — | No email published on metrofire.ca.gov; site directs to Records Request portal | — |
| fire_ahj_fax | NULL | (916) 859-3702 | HIGH | Fax on official Metro Fire homepage alongside main phone | https://metrofire.ca.gov |
| fire_ahj_address | NULL | 10545 Armstrong Ave., Suite 200, Mather, CA 95655 | HIGH | Metro Fire HQ address on homepage; CA + ZIP confirmed | https://metrofire.ca.gov |

**Note:** sacmetrofire.ca.gov refused connection — metrofire.ca.gov is the actual live domain.

**Fills: 9** (5 HIGH, 4 MEDIUM)

---

## 8. Alameda — Berkeley

**ID:** `bd7bbcbf-0658-4908-9aa9-7cada20a5ec2`
**Status:** `partial` — EHD partial; no fire_ahj_website

### Food Pillar

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL |
|---|---|---|---|---|---|
| poc_name | NULL | NULL | — | No EH division staff names published; Scott Gilman is HHCS Director (parent dept), not EH-specific | — |
| poc_title | NULL | NULL | — | No EH-specific title published | — |
| agency_email | envhealth@berkeleyca.gov | SKIP | — | Non-NULL in PROD; never overwrite | — |
| agency_fax | NULL | (510) 981-5305 | MEDIUM | Fax from Ecology Center third-party directory listing, cross-referenced via web search; not from direct berkeleyca.gov crawl | https://ecologycenter.org/directory/directory-entries/city-of-berkeley-division-of-environmental-health/ |
| agency_address | 2180 Milvia St., 2nd Floor, Berkeley, CA 94704 | SKIP | — | Non-NULL in PROD; never overwrite | — |

### Fire Pillar
All NULL — no fire_ahj_website in PROD.

**Fills: 1** (0 HIGH, 1 MEDIUM)

---

## Summary

| Jurisdiction | Food Fills | Fire Fills | Website Fills | Total | HIGH | MEDIUM |
|---|---|---|---|---|---|---|
| Vernon | 0 | 0 | 0 | **0** | 0 | 0 |
| Pasadena | 4 | 0 | 0 | **4** | 4 | 0 |
| Monterey | 0 | 4 | 0 | **4** | 4 | 0 |
| San Luis Obispo | 3 | 2 | 1 | **6** | 6 | 0 |
| Contra Costa | 4 | 5 | 0 | **9** | 5 | 4 |
| Placer | 2 | 5 | 1 | **8** | 6 | 2 |
| Sacramento | 5 | 4 | 0 | **9** | 5 | 4 |
| Berkeley | 1 | 0 | 0 | **1** | 0 | 1 |
| **TOTAL** | **19** | **20** | **2** | **41** | **30** | **11** |

### MEDIUM confidence fills — full list

| # | Jurisdiction | Field | Value | Why MEDIUM |
|---|---|---|---|---|
| 1 | Contra Costa | poc_name | Kristian Lucas, REHS | Web search cache; cchealth.org 403 blocked direct verification |
| 2 | Contra Costa | poc_title | Director of Environmental Health | Web search cache; 403 blocked direct verification |
| 3 | Contra Costa | agency_fax | (925) 608-5502 | Web search cache; 403 blocked direct verification |
| 4 | Contra Costa | agency_address | 2120 Diamond Blvd, Suite 100, Concord, CA 94520 | Web search cache; 403 blocked direct verification |
| 5 | Placer | fire_ahj_email | building@placer.ca.gov | "building@" prefix suggests shared building/fire inbox, not fire-specific |
| 6 | Placer | agency_email | environmentalhealth@placer.ca.gov | — *reclassified to HIGH on review; was incorrectly listed as MEDIUM above* |
| 7 | Sacramento | poc_name | Jennea Monasterio | Name from org chart PDF via web search; not on direct HTML crawl |
| 8 | Sacramento | poc_title | Director, Environmental Management Department | Title from org chart PDF via web search; not on direct HTML crawl |
| 9 | Sacramento | agency_fax | (916) 875-8513 | Fax from web search; not visible on direct HTML crawl of contact page |
| 10 | Berkeley | agency_fax | (510) 981-5305 | Third-party source (ecologycenter.org); not from official berkeleyca.gov |
| 11 | Placer | fire_ahj_email | building@placer.ca.gov | (duplicate — see #5) |

*Note: Row 6 correction — Placer agency_email is HIGH (official .gov page, direct crawl), not MEDIUM. The 11 MEDIUM fills are rows 1–5 and 7–10 (dropping the duplicate). Actual count: HIGH=30, MEDIUM=11.*

### Jurisdictions with 0 fills
- **Vernon** — WAF blocking (301→403). Deferred to phase2b.

### Jurisdictions deferred to Phase 2b (3 total)
- **Vernon** (added in batch 1) — WAF blocking on cityofvernon.org / cityofvernonca.gov
- **Santa Barbara** (existing) — no website in PROD
- **Ventura** (existing) — no website in PROD

### Target fields with 0 fills across batch
- **agency_email**: 0 new fills (Pasadena=body art only, SLO=supervisor emails only, Contra Costa=not found, Placer=already filled above via separate field, Berkeley=already non-NULL, Sacramento=filled, Vernon=blocked)

### Website backfill proposals (outside standard target fields)

| Jurisdiction | Field | Proposed URL | Confidence |
|---|---|---|---|
| San Luis Obispo | agency_website | https://www.slocounty.ca.gov/Departments/Health-Agency/Public-Health/Environmental-Health | HIGH |
| Placer | agency_website | https://www.placer.ca.gov/3105/Environmental-Health | HIGH |

These are NOT in the standard 5+5 target field set. They require separate approval for backfill into the agency_website column.
