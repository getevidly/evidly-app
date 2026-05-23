# Phase 2c Manual Queue — 2026-05-22

Jurisdictions skipped during Phase 2c automated crawl. Reasons: WAF 403, JS-rendered pages,
redirect loops, no agency_website, or no extractable contact data from public web.

## EHD Manual Queue

| County | City | Reason | Missing Fields | Target URL |
|---|---|---|---|---|
| Alameda | — | JS-rendered page, no content extracted | agency_email, poc_name, poc_title | https://health.alamedacountyca.gov/contact-us-ehd/ |
| Amador | — | 403 WAF block | agency_fax, agency_email, poc_name, poc_title | https://www.amadorcounty.gov/departments/environmental-health |
| Calaveras | — | No agency_website in PROD | agency_email, agency_website, poc_name, poc_title | MANUAL RESEARCH REQUIRED |
| Colusa | — | Partial data only (address found) | agency_phone, agency_fax, agency_email, poc_name, poc_title | https://www.countyofcolusaca.gov/Directory.aspx |
| El Dorado | — | Not crawled this batch | poc_name, poc_title | https://www.eldoradocounty.ca.gov/County-Government/County-Departments/Environmental-Management |
| Glenn | — | 403 WAF block | agency_fax, agency_email | https://countyofglenn.net/ |
| Imperial | — | No POC/email/fax on page | agency_email, poc_name, poc_title | https://www.icphd.org/environmental-health |
| Inyo | — | Not crawled this batch | agency_fax | https://www.inyocounty.us/services/environmental-health |
| Kern | — | POC not found on web | poc_name, poc_title | https://www.kernpublichealth.com/i-want-to/contact-us |
| Kings | — | Not crawled this batch | agency_phone, agency_fax, agency_email, poc_name, poc_title | https://www.countyofkingsca.gov/departments/environment-health-service |
| Lake | — | Not crawled this batch | agency_phone, agency_fax, agency_email, poc_name, poc_title | https://www.lakecountyca.gov/211/Environmental-Health |
| Los Angeles | — | Redirect loop (http/https) | agency_fax, agency_email, agency_address, poc_name, poc_title | http://publichealth.lacounty.gov/eh/about/contact-us.htm |
| Los Angeles | Long Beach | 404 on food page | agency_fax, poc_name, poc_title | https://www.longbeach.gov/health/eh/ |
| Madera | — | No useful data found | agency_fax, agency_email, poc_name, poc_title | https://www.maderacounty.com/government/community-economic-development-department/divisions/environmental-health-division |
| Mariposa | — | Not crawled this batch | poc_name, poc_title | http://www.mariposacounty.gov/235/Environmental-Health |
| Mendocino | — | Not crawled this batch | agency_phone, agency_fax, agency_address, poc_name, poc_title | https://www.mendocinocounty.gov/how-do-i/report/food-sanitation-issues |
| Merced | — | Not crawled this batch | agency_email, poc_name, poc_title | https://www.countyofmerced.com/eh |
| Modoc | — | Not crawled this batch | agency_fax, agency_email, poc_name, poc_title | https://environmentalhealth.co.modoc.ca.us/ |
| Orange | — | POC not found, no fax | poc_name, poc_title | https://www.ochealthinfo.com/about-hca/public-health-services/environmental-health-division/resources/contact-information |
| Plumas | — | Not crawled this batch | agency_email, poc_name, poc_title | https://www.plumascounty.us/275/Food-Safety |
| San Bernardino | — | POC not found | poc_name, poc_title | https://ehs.sbcounty.gov/contact-us/ |
| Shasta | — | Not crawled this batch | agency_email, poc_name, poc_title | https://www.shastacounty.gov/environmental-health |
| Sierra | — | Not crawled this batch | agency_fax, agency_email | https://www.sierracounty.ca.gov/232/Food-Safety |
| Siskiyou | — | Not crawled this batch | agency_fax, agency_email, poc_name, poc_title | https://www.siskiyoucounty.gov/environmentalhealth/page/food |
| Sutter | — | Not crawled this batch | agency_phone, agency_fax, agency_email, agency_address | https://www.sutter.gov/ |
| Tehama | — | Not crawled this batch | agency_phone, agency_fax, agency_email, poc_name, poc_title | https://www.tehama.gov/government/departments/environmental-health/ |
| Trinity | — | Not crawled this batch | poc_name, poc_title | https://www.trinitycounty.org/486/Food-Facilities |
| Tulare | — | Not crawled this batch | agency_address, poc_name, poc_title | https://tularecountyeh.org/ |
| Tuolumne | — | Not crawled this batch | agency_email | https://www.tuolumnecounty.ca.gov/247/Safe-Food |

## Fire AHJ Manual Queue

All ~52 remaining CA jurisdictions have fire AHJ contact gaps (fire_ahj_fax, fire_ahj_email,
fire_ahj_address, fire_ahj_poc_name, fire_ahj_poc_title). No fire department websites were
crawled in Phase 2c due to:
- Most fire_ahj_website values are bare domains without clear contact pages
- Fire department contact structures vary widely (FPB vs county fire vs city fire vs CAL FIRE)
- Phase 2c prioritized EHD fills which have higher coverage leverage

**Recommendation:** Phase 2d should target fire AHJ contacts with the hosted Firecrawl API
(handles WAF) using the fire_ahj_website column as the crawl seed.

## CDPH Contact List (Priority Data Source)

The CDPH maintains a verified statewide directory of all CA Environmental Health departments:
- **May 2025 edition:** https://www.cdph.ca.gov/Programs/CEH/DRSEM/CDPH%20Document%20Library/EMB/REHS/EH_Dept_Contact_List_050925.pdf
- **July 2024 ADA edition:** https://www.cdph.ca.gov/Programs/CEH/DRSEM/CDPH%20Document%20Library/EMB/REHS/EH_Dept_Contact_List_070124_ADA.pdf

Both failed WebFetch due to SSL certificate errors on cdph.ca.gov.
Manual download and parsing would fill most EHD gaps in one pass.
