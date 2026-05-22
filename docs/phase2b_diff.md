# Phase 2b Manual Contact Backfill — Proposed Fills

**Date**: 2026-05-22
**Jurisdictions**: 3 (Santa Barbara, Ventura, Vernon)
**Total proposed contact fills**: 27
**Confidence**: HIGH=23, MEDIUM=4
**Sources**: Manual web research via WebFetch + WebSearch
**Data source tag**: `manual_phase2b` (food/fire) or `manual_jurisdiction_change_2020` (Vernon fire)

---

## 1. Santa Barbara County (feae8f1d-517f-4b8e-a521-bbb115ba7b0e)

### Food (EHD) — 6 fills

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL | Action |
|---|---|---|---|---|---|---|
| agency_website | NULL | `https://www.countyofsb.org/2198/Environmental-Health-Division` | HIGH | Official county CivicPlus page, live 200 | countyofsb.org/2198 | FILL-IF-NULL |
| agency_email | NULL | `phdehsweb@sbcphd.org` | MEDIUM | Web search cached; original /phd/environmental-health-services returns 404 — email from icarol.info aggregator | icarol.info/ResourceView2.aspx?org=2283&agencynum=5150442 | FILL-IF-NULL |
| agency_fax | NULL | `(805) 681-4901` | HIGH | CDPH search cached, consistent across icarol + countyoffice sources | web search cached | FILL-IF-NULL |
| agency_address | NULL | `225 Camino del Remedio, Santa Barbara, CA 93110` | HIGH | CA+ZIP verified, consistent across multiple sources | web search cached | FILL-IF-NULL |
| poc_name | NULL | `Lars Seifert` | MEDIUM | Hired Oct 2020; confirmed active through Mar 2024 (Goleta Beach press); unconfirmed 2025+ | santamariatimes.com + edhat.com | FILL-IF-NULL |
| poc_title | NULL | `Director, Environmental Health Services` | MEDIUM | Per hire announcement; theorg.com also lists as "Deputy Director of Operations" (dual title) | santamariatimes.com + theorg.com | FILL-IF-NULL |

### Fire (AHJ) — 5 fills

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL | Action |
|---|---|---|---|---|---|---|
| fire_ahj_website | NULL | `https://sbcfire.com/` | HIGH | Official SBC Fire domain, live 200 | sbcfire.com | FILL-IF-NULL |
| fire_ahj_poc_name | NULL | `Garrett Huff` | HIGH | Headquarters Staff page lists as Fire Chief with email ghuff@countyofsb.org | sbcfire.com/headquarters-staff | FILL-IF-NULL |
| fire_ahj_poc_title | NULL | `Fire Chief` | HIGH | Same source | sbcfire.com/headquarters-staff | FILL-IF-NULL |
| fire_ahj_fax | NULL | `(805) 681-5563` | HIGH | countyoffice.org cached listing | countyoffice.org/santa-barbara-county-fire-department-headquarters | FILL-IF-NULL |
| fire_ahj_address | NULL | `4410 Cathedral Oaks Road, Santa Barbara, CA 93110` | HIGH | CA+ZIP verified, consistent across multiple sources | countyoffice.org + web search | FILL-IF-NULL |

### Metadata

| Field | Current | Proposed |
|---|---|---|
| contact_data_source | unverified | manual_phase2b |
| contact_last_verified | NULL | now() |
| contact_verified_by | NULL | manual-phase2b-research |
| fire_ahj_data_source | unverified | manual_phase2b |
| fire_ahj_last_verified | NULL | now() |
| fire_ahj_verified_by | NULL | manual-phase2b-research |

**Santa Barbara subtotal**: 11 contact fills (6 food + 5 fire) + 6 metadata

---

## 2. Ventura County (43ec04a6-eb8e-4c36-b4f9-d9e560232dad)

### Food (EHD) — 5 fills

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL | Action |
|---|---|---|---|---|---|---|
| agency_website | NULL | `https://rma.venturacounty.gov/divisions/environmental-health/` | HIGH | Official county RMA site; ventura.org/environmental-health/ 302→ venturacounty.gov | rma.venturacounty.gov | FILL-IF-NULL |
| agency_fax | NULL | `(805) 654-2480` | HIGH | Web search cached, consistent across multiple county sources | web search cached | FILL-IF-NULL |
| agency_email | NULL | `EHDmessages@ventura.org` | MEDIUM | Web search cached; .org TLD but matches county domain ventura.org | web search cached | FILL-IF-NULL |
| agency_address | NULL | `800 S. Victoria Ave., #1730, Ventura, CA 93009` | HIGH | CA+ZIP verified; 3rd Floor Government Center Admin Building | rma.venturacounty.gov | FILL-IF-NULL |
| poc_name | NULL | — | — | Charles Genkel found as "Director" on rma.venturacounty.gov/about-environmental-health; DEFERRED — title is EH Director under RMA, need to confirm he's the EHD contact for food safety specifically | — | NOT PROPOSED |

### Fire (AHJ) — 4 fills

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL | Action |
|---|---|---|---|---|---|---|
| fire_ahj_website | NULL | `https://fire.venturacounty.gov/` | HIGH | Official fire dept domain; vcfd.org 301→ this | fire.venturacounty.gov | FILL-IF-NULL |
| fire_ahj_poc_name | NULL | `Dustin Gardner` | HIGH | Official county appointment; confirmed in May 2025 VCFD Board report | news.venturacounty.gov + vcportal.ventura.org | FILL-IF-NULL |
| fire_ahj_poc_title | NULL | `Fire Chief` | HIGH | Same sources | news.venturacounty.gov | FILL-IF-NULL |
| fire_ahj_address | NULL | `2400 Conejo Spectrum Street, Thousand Oaks, CA 91320` | HIGH | New HQ since May 2024; confirmed on fire.venturacounty.gov/headquarters/ and 2025 VCFD Board report; CA+ZIP verified | fire.venturacounty.gov/headquarters + vcportal.ventura.org | FILL-IF-NULL |

### Not Found

| Field | Current | Proposed | Note |
|---|---|---|---|
| fire_ahj_email | NULL | — | FHRP Unit email fhrp@ventura.org is program-specific (Fire Hazard Reduction); rejected per extraction contract |
| fire_ahj_fax | NULL | — | Old Camarillo HQ fax (805) 388-4718 is stale — HQ moved to 2400 Conejo Spectrum St, Thousand Oaks May 2024; new HQ page does not list a fax; set NULL rather than carry stale number |

### Metadata

| Field | Current | Proposed |
|---|---|---|
| contact_data_source | unverified | manual_phase2b |
| contact_last_verified | NULL | now() |
| contact_verified_by | NULL | manual-phase2b-research |
| fire_ahj_data_source | unverified | manual_phase2b |
| fire_ahj_last_verified | NULL | now() |
| fire_ahj_verified_by | NULL | manual-phase2b-research |

**Ventura subtotal**: 8 contact fills (4 food + 4 fire) + 6 metadata

---

## 3. Vernon (7edbb389-6fa8-4421-bed3-f6d64312fb08)

### CRITICAL: Jurisdiction Change

Vernon Fire Department was **disbanded October 21, 2020**. Fire services are now provided by **Los Angeles County Fire Department** (LACoFD) under contract. Former Vernon FD Stations 1 and 2 became LACoFD Stations 13 and 52.

All `fire_ahj_*` values must reference LACoFD, not Vernon FD.

### Current fire_ahj_* values (verbatim)

| Field | Current Value |
|---|---|
| fire_ahj_phone | NULL |
| fire_ahj_fax | NULL |
| fire_ahj_email | NULL |
| fire_ahj_address | NULL |
| fire_ahj_website | NULL |
| fire_ahj_poc_name | NULL |
| fire_ahj_poc_title | NULL |
| fire_ahj_data_source | unverified |
| fire_ahj_last_verified | NULL |
| fire_ahj_verified_by | NULL |

**Stale Vernon FD references found**: NONE (all fields NULL). Wholesale replace is effectively a FILL with LACoFD data + jurisdiction-change data source tag.

### Food (EHD) — 4 fills

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL | Action |
|---|---|---|---|---|---|---|
| agency_website | `https://www.cityofvernon.org/government/departments/health-environmental-control` | `https://www.cityofvernonca.gov/government/health` | HIGH | Old domain cityofvernon.org 301→ cityofvernonca.gov; new URL confirmed via web search (returns 403 to bots but valid for browsers) | cityofvernonca.gov | **REPLACE** |
| poc_name | NULL | `Freddie Agyin` | HIGH | LinkedIn profile + multiple web directory sources confirm current Director | linkedin.com/in/freddie-agyin + 211la.org | FILL-IF-NULL |
| poc_title | NULL | `Director` | HIGH | LinkedIn: "Director at City of Vernon Health & Env. Control Dept." | linkedin.com/in/freddie-agyin | FILL-IF-NULL |
| agency_address | NULL | `4305 S. Santa Fe Ave., Vernon, CA 90058` | HIGH | CA+ZIP verified; consistent across lacounty.gov locator, 211la.org, countyoffice.org | locator.lacounty.gov + 211la.org | FILL-IF-NULL |

### Fire (AHJ — LA County Fire Department) — 4 fills

| Field | Current | Proposed | Confidence | Confidence Reason | Source URL | Action |
|---|---|---|---|---|---|---|
| fire_ahj_website | NULL | `https://fire.lacounty.gov/` | HIGH | Official LACoFD domain | fire.lacounty.gov | FILL-IF-NULL |
| fire_ahj_poc_name | NULL | `Anthony C. Marrone` | HIGH | LACoFD Fire Chief; confirmed across Wikipedia, lacounty.gov locator, theorg.com | wikipedia.org + locator.lacounty.gov | FILL-IF-NULL |
| fire_ahj_poc_title | NULL | `Fire Chief` | HIGH | Same sources | wikipedia.org | FILL-IF-NULL |
| fire_ahj_address | NULL | `1320 N. Eastern Ave., Los Angeles, CA 90063` | HIGH | LACoFD HQ; CA+ZIP verified; confirmed via Waze + lacounty.gov locator | locator.lacounty.gov + waze.com | FILL-IF-NULL |

### Deliberately NOT filled (fire)

| Field | Current | Reason |
|---|---|---|
| fire_ahj_phone | NULL | LACoFD HQ phone exists but not specific to Vernon jurisdiction; leave NULL |
| fire_ahj_email | NULL | No general LACoFD contact email found; program-specific only |
| fire_ahj_fax | NULL | No LACoFD fax found |

### Metadata

| Field | Current | Proposed |
|---|---|---|
| contact_data_source | unverified | manual_phase2b |
| contact_last_verified | NULL | now() |
| contact_verified_by | NULL | manual-phase2b-research |
| fire_ahj_data_source | unverified | **manual_jurisdiction_change_2020** |
| fire_ahj_last_verified | NULL | now() |
| fire_ahj_verified_by | NULL | manual-phase2b-research |

**Vernon subtotal**: 8 contact fills (4 food + 4 fire, including 1 REPLACE) + 6 metadata

---

## Summary

| Jurisdiction | Food Fills | Fire Fills | Total Contact | REPLACE | Confidence |
|---|---|---|---|---|---|
| Santa Barbara | 6 | 5 | 11 | 0 | HIGH=8, MEDIUM=3 |
| Ventura | 4 | 4 | 8 | 0 | HIGH=7, MEDIUM=1 |
| Vernon | 4 | 4 | 8 | 1 (agency_website) | HIGH=8, MEDIUM=0 |
| **TOTAL** | **14** | **13** | **27** | **1** | **HIGH=23, MEDIUM=4** |

Note: Santa Barbara poc_name/poc_title are MEDIUM confidence (Lars Seifert, hired 2020, confirmed through Mar 2024 but unverified 2025+). If rejected, total drops to 25 (HIGH=23, MEDIUM=2).

## MEDIUM Confidence Full List

| # | Jurisdiction | Field | Value | Reason |
|---|---|---|---|---|
| 1 | Santa Barbara | agency_email | phdehsweb@sbcphd.org | Source page 404; email from aggregator icarol.info |
| 2 | Santa Barbara | poc_name | Lars Seifert | Hired 2020; last confirmed Mar 2024; unverified 2025+ |
| 3 | Santa Barbara | poc_title | Director, Environmental Health Services | Dual title ambiguity (theorg.com lists "Deputy Director of Operations") |
| 4 | Ventura | agency_email | EHDmessages@ventura.org | .org TLD (matches county domain ventura.org but not .gov/.us) |
| ~~5~~ | ~~Ventura~~ | ~~fire_ahj_fax~~ | ~~(805) 388-4718~~ | REMOVED — stale Camarillo HQ fax; new Thousand Oaks HQ page lists no fax; set NULL |

## Ventura EHD Director — Deferred

Charles Genkel found as "Director" of Environmental Health on rma.venturacounty.gov. Not proposed because:
- Title is EH Director under Resource Management Agency (RMA)
- Need to confirm he's the direct EHD contact for food safety programs specifically
- Can be added in a follow-up batch if confirmed

## Vernon Fire — Jurisdiction Change Context

- Vernon City Council voted to contract fire protection to LACoFD in 2019
- Vernon Fire Department disbanded **October 21, 2020**
- Former VFD Station 1 → LACoFD Station 13 (3375 Fruitland Ave., Vernon)
- Former VFD Station 2 → LACoFD Station 52 (4301 S. Santa Fe Ave., Vernon)
- fire_ahj_data_source set to `manual_jurisdiction_change_2020` (not `manual_phase2b`)
- fire_jurisdiction_config JSONB column is OUT OF SCOPE for this migration

## TODO: Post-Phase-2b Cleanup

- **Vernon `fire_jurisdiction_config` JSONB requires post-Phase-2b audit to align with LACoFD jurisdiction change (2020).** The JSONB column likely still references "City of Vernon Fire Department" or similar pre-2020 agency identity. This is a separate cleanup item — do NOT modify JSONB in the Phase 2b migration.
