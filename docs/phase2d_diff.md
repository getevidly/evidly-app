# Phase 2d — Contact Backfill Diff Review

## EHD Fills

### amador-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| agency_email | NULL | ACEH@amadorcounty.gov | HIGH | https://www.amadorcounty.gov/departments/environmental-health/contact |

### mendocino-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| agency_address | NULL | 860 N. Bush Street, Ukiah, CA 95482 | HIGH | https://www.mendocinocounty.gov/how-do-i/report/food-sanitation-issues/contact |

### san-bernardino-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| poc_name | NULL | Kristian Alfelor | MEDIUM | https://ehs.sbcounty.gov/programs/food-facilities/contact |
| poc_title | NULL | Chief of Environmental Health | MEDIUM | https://ehs.sbcounty.gov/programs/food-facilities/contact |

### Rejected EHD fills

| Slug | Field | Value | Reason |
|---|---|---|---|
| imperial-ca | poc_name | Environmental Health Staff | Department name, not a person |
| la-county-ca | agency_email | phwebinformatics@ph.lacounty.gov | Web informatics team, not EHD contact email |
| long-beach-ca | poc_name | Public Works Services | Department name, not a person |
| mendocino-ca | poc_name | Environmental Health | Department name, not a person |
| shasta-ca | poc_name | Environmental Health | Department name, not a person |

---

## Fire AHJ Fills

### la-county-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| fire_ahj_address | NULL | 1 Industry Hills Parkway, Industry, CA 91744 | HIGH | fire.lacounty.gov/fire-prevention |
| fire_ahj_poc_name | NULL | Alvin L. Brewer | MEDIUM | fire.lacounty.gov/fire-prevention |

### orange-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| fire_ahj_address | NULL | 1 Fire Authority Road, Irvine, CA 92602 | HIGH | ocfa.org |
| fire_ahj_poc_name | NULL | Craig Covey | MEDIUM | ocfa.org |

### san-benito-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| fire_ahj_address | NULL | 481 Fourth Street, 1st Floor, Hollister, CA 95023 | HIGH | sanbenitocountyca.gov |

### san-bernardino-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| fire_ahj_email | NULL | Smillerick@sbcfire.org | HIGH | sbcfire.org |
| fire_ahj_poc_name | NULL | Dan Munsey | MEDIUM | sbcfire.org |

Note: fire_ahj_email is a personal staff email (S. Millerick). May need updating if staff changes.

### santa-clara-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| fire_ahj_email | NULL | publicinfo@sccfd.org | HIGH | sccfd.org |
| fire_ahj_poc_name | NULL | Geo Blackshire | MEDIUM | sccfd.org |

### solano-ca
| Field | Current | Proposed | Confidence | Source URL |
|---|---|---|---|---|
| fire_ahj_address | NULL | 1200 Kentucky Street, Fairfield, CA 94533 | HIGH | fairfield.ca.gov/fire |

### Rejected Fire AHJ fills

| Slug | Field | Value | Reason |
|---|---|---|---|
| inyo-ca | fire_ahj_poc_name | District Lookup | Junk extraction, not a person |
| riverside-ca | fire_ahj_poc_name | Riverside County Fire | Department name, not a person |
| tulare-ca | fire_ahj_poc_name | Fire Department\n\nFire | Junk/malformed extraction |

---

## Summary

| Metric | Count |
|---|---|
| Total accepted fills | 14 |
| HIGH confidence | 7 |
| MEDIUM confidence | 7 |
| EHD jurisdictions touched | 3 |
| Fire AHJ jurisdictions touched | 6 |
| Total distinct jurisdictions | 8 |
| EHD jurisdictions deferred | 22 |
| Fire AHJ jurisdictions deferred | 43 |
| Fills rejected (bad quality) | 8 |
