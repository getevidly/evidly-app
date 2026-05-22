# Phase 2b Manual Research Queue — 2026-05-22

Jurisdictions requiring manual research — either no website in PROD or WAF blocking on all crawl attempts.

| Rank | County | City | ID | Missing Food (excl. phone) | Missing Fire (excl. phone) | Total Target Fields | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Santa Barbara | — | feae8f1d-517f-4b8e-a521-bbb115ba7b0e | fax, email, address, poc_name, poc_title | fax, email, address, poc_name, poc_title | 10 | No website in JSONB or source_documents. All 14 contact fields NULL. |
| 2 | Ventura | — | 43ec04a6-eb8e-4c36-b4f9-d9e560232dad | fax, email, address, poc_name, poc_title | fax, email, address, poc_name, poc_title | 10 | No website in JSONB or source_documents. All 14 contact fields NULL. |
| 3 | Los Angeles | Vernon | 7edbb389-6fa8-4421-bed3-f6d64312fb08 | fax, email, address, poc_name, poc_title | fax, email, address, poc_name, poc_title | 10 | WAF blocking — 301 redirect cityofvernon.org → cityofvernonca.gov, then 403 on all paths. No fire_ahj_website. |

## Suggested Manual Research URLs

- **Santa Barbara County EHD**: https://www.countyofsb.org/phd/environmental-health-services
- **Santa Barbara County Fire**: https://www.sbcfire.com/
- **Ventura County EHD**: https://www.ventura.org/environmental-health/
- **Ventura County Fire**: https://vcfd.org/
- **Vernon EHD**: https://www.cityofvernonca.gov/government/departments/health-environmental-control (403 — try phone or in-person)
- **Vernon Fire**: Unknown — no fire_ahj_website in PROD

## Status

- [ ] Santa Barbara — EHD researched
- [ ] Santa Barbara — Fire researched
- [ ] Ventura — EHD researched
- [ ] Ventura — Fire researched
- [ ] Vernon — EHD researched (WAF blocked, needs phone/manual)
- [ ] Vernon — Fire researched
