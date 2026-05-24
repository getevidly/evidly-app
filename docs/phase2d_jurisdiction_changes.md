# Phase 2d — Fire AHJ Jurisdiction Change Candidates

## Summary

Per Step 1b audit: identify fire AHJ rows where `fire_ahj_website IS NULL`
AND no fire-related info exists in `fire_jurisdiction_config` JSONB.

**Result: 3 rows matched — all previously processed or deferred.**

| Slug | fire_ahj_website | fire_jurisdiction_config | Status |
|---|---|---|---|
| berkeley-ca | NULL | NULL | Already processed Phase 2 batch 1 — skip |
| long-beach-ca | NULL | NULL | City fire dept — needs manual research |
| pasadena-ca | NULL | NULL | Already processed Phase 2 batch 1 — skip |

### long-beach-ca

Long Beach Fire Department is a city fire department (separate from LA County Fire).
No fire_jurisdiction_config JSONB exists. This city-level fire AHJ needs manual research
to populate: fire_ahj_website, fire_ahj_poc_name, fire_ahj_poc_title, fire_ahj_email,
fire_ahj_fax, fire_ahj_address.

Candidate URL: https://www.longbeach.gov/fire/

## CAL FIRE Contract Counties (38 of 54)

38 CA jurisdictions contract fire services to CAL FIRE. Their `fire_ahj_website`
points to the county's general website (not a CAL FIRE-specific page). The local
fire prevention bureau (FPB) contact may differ from the county website contact.
These were crawled during Phase 2d batch crawl using the county website as seed.
If no fire-specific contact data was extracted, these are deferred to manual queue.

| ahj_type | Count |
|---|---|
| cal_fire_contract | 38 |
| county_fd | 12 |
| city_fd | 1 |
| unknown (no config) | 3 |
