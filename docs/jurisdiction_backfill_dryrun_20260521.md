# Jurisdiction Backfill Dry Run — 2026-05-21

| # | County | City | Column | Current | New Value | Source JSONB Path | Bucket |
|---|---|---|---|---|---|---|---|
| 1 | Alameda | — | agency_phone | NULL | (510) 567-6700 | grading_config.agency_contact.phone | HIGH |
| 2 | Alameda | — | agency_fax | NULL | (510) 337-9432 | grading_config.agency_contact.fax | DIRECT |
| 3 | Alameda | — | agency_email | NULL | — | — | — |
| 4 | Alameda | — | agency_address | NULL | 1131 Harbor Bay Parkway, Alameda, CA 94502 | grading_config.agency_address | DIRECT |
| 5 | Alameda | — | agency_website | NULL | https://www.acgov.org/aceh | grading_config.agency_contact.website | DIRECT |
| 6 | Alameda | — | poc_name | NULL | — | — | — |
| 7 | Alameda | — | poc_title | NULL | — | — | — |
| 8 | Alameda | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 9 | Alameda | — | fire_ahj_phone | NULL | (510) 618-3478 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 10 | Alameda | — | fire_ahj_website | NULL | acgov.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 11 | Alameda | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 12 | Alameda | Berkeley | agency_phone | NULL | (510) 981-5310 | grading_config.agency_contact.phone | HIGH |
| 13 | Alameda | Berkeley | agency_fax | NULL | — | — | — |
| 14 | Alameda | Berkeley | agency_email | NULL | envhealth@berkeleyca.gov | grading_config.agency_contact.email | DIRECT |
| 15 | Alameda | Berkeley | agency_address | NULL | 2180 Milvia St., 2nd Floor, Berkeley, CA 94704 | grading_config.agency_address | DIRECT |
| 16 | Alameda | Berkeley | agency_website | NULL | https://berkeleyca.gov/doing-business/operating-berkeley/food-service/food-safety-and-inspection-program | grading_config.agency_contact.url | DIRECT |
| 17 | Alameda | Berkeley | poc_name | NULL | — | — | — |
| 18 | Alameda | Berkeley | poc_title | NULL | — | — | — |
| 19 | Alameda | Berkeley | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 20 | Alameda | Berkeley | fire_ahj_phone | NULL | — | — | — |
| 21 | Alameda | Berkeley | fire_ahj_website | NULL | — | — | — |
| 22 | Alameda | Berkeley | fire_ahj_data_source | NULL | unverified | rule-based | unverified |
| 23 | Alpine | — | agency_phone | NULL | 530.694.2235 | grading_config.agency_contact.main_phone | HIGH |
| 24 | Alpine | — | agency_fax | NULL | 530.694.2252 | grading_config.agency_contact.fax | DIRECT |
| 25 | Alpine | — | agency_email | NULL | dlampson@alpinecountyca.gov | grading_config.department_structure.eh_director_email | DIRECT |
| 26 | Alpine | — | agency_address | NULL | 75 A Diamond Valley Rd, Markleeville, CA 96120 | grading_config.agency_address | DIRECT |
| 27 | Alpine | — | agency_website | NULL | https://alpinecountyca.gov/200/Environmental-Health | grading_config.public_portals.environmental_health_hub | DIRECT |
| 28 | Alpine | — | poc_name | NULL | Dennis Lampson | grading_config.agency_contact.eh_director | DIRECT |
| 29 | Alpine | — | poc_title | NULL | Environmental Health Director | mapped from key | MAPPED |
| 30 | Alpine | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 31 | Alpine | — | fire_ahj_phone | NULL | (530) 694-2241 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 32 | Alpine | — | fire_ahj_website | NULL | alpinecountyca.gov | fire_jurisdiction_config.ahj_website | DIRECT |
| 33 | Alpine | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 34 | Amador | — | agency_phone | NULL | (209) 223-6470 | grading_config.agency_contact.general_phone_board_of_supervisors | LOW |
| 35 | Amador | — | agency_fax | NULL | — | — | — |
| 36 | Amador | — | agency_email | NULL | — | — | — |
| 37 | Amador | — | agency_address | NULL | 810 Court Street, Jackson, CA 95642 | grading_config.agency_address | DIRECT |
| 38 | Amador | — | agency_website | NULL | https://www.amadorcounty.gov/departments/environmental-health | grading_config.agency_contact.website | DIRECT |
| 39 | Amador | — | poc_name | NULL | — | — | — |
| 40 | Amador | — | poc_title | NULL | — | — | — |
| 41 | Amador | — | contact_data_source | NULL | firecrawl_pending_review | rule-based | firecrawl_pending_review |
| 42 | Amador | — | fire_ahj_phone | NULL | (209) 223-6388 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 43 | Amador | — | fire_ahj_website | NULL | amadorgov.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 44 | Amador | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 45 | Butte | — | agency_phone | NULL | 530-552-3880 | grading_config.agency_contact.phone | HIGH |
| 46 | Butte | — | agency_fax | NULL | 530-538-5339 | grading_config.agency_contact.fax | DIRECT |
| 47 | Butte | — | agency_email | NULL | jveilleaux@buttecounty.net | grading_config.agency_contact.consumer_protection_manager.email | DIRECT |
| 48 | Butte | — | agency_address | NULL | 202 Mira Loma Drive, Oroville, CA 95965 | grading_config.agency_address | DIRECT |
| 49 | Butte | — | agency_website | NULL | https://buttecounty.net/publichealth | grading_config.agency_contact.website | DIRECT |
| 50 | Butte | — | poc_name | NULL | Elaine McSpadden | grading_config.agency_contact.leadership.environmental_health_director | NESTED |
| 51 | Butte | — | poc_title | NULL | Environmental Health Director | mapped from key | MAPPED |
| 52 | Butte | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 53 | Butte | — | fire_ahj_phone | NULL | (530) 538-7111 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 54 | Butte | — | fire_ahj_website | NULL | buttecounty.net/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 55 | Butte | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 56 | Calaveras | — | agency_phone | NULL | (209) 754-6399 | grading_config.agency_contact.phone | HIGH |
| 57 | Calaveras | — | agency_fax | NULL | (209) 754-6722 | grading_config.agency_contact.fax | DIRECT |
| 58 | Calaveras | — | agency_email | NULL | — | — | — |
| 59 | Calaveras | — | agency_address | NULL | 891 Mountain Ranch Road, Building E, San Andreas, CA 95249 | grading_config.agency_address | DIRECT |
| 60 | Calaveras | — | agency_website | NULL | — | — | — |
| 61 | Calaveras | — | poc_name | NULL | — | — | — |
| 62 | Calaveras | — | poc_title | NULL | — | — | — |
| 63 | Calaveras | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 64 | Calaveras | — | fire_ahj_phone | NULL | (209) 754-6600 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 65 | Calaveras | — | fire_ahj_website | NULL | calaveras.ca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 66 | Calaveras | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 67 | Colusa | — | agency_phone | NULL | — | — | NULL |
| 68 | Colusa | — | agency_fax | NULL | — | — | — |
| 69 | Colusa | — | agency_email | NULL | — | — | — |
| 70 | Colusa | — | agency_address | NULL | 1213 Market Street, Colusa, CA 95932 | grading_config.agency_address | DIRECT |
| 71 | Colusa | — | agency_website | NULL | https://www.countyofcolusaca.gov/425/Retail-Food-Safety | grading_config.source_documents[0].live_url | SD0_FILL |
| 72 | Colusa | — | poc_name | NULL | — | — | — |
| 73 | Colusa | — | poc_title | NULL | — | — | — |
| 74 | Colusa | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 75 | Colusa | — | fire_ahj_phone | NULL | (530) 458-0350 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 76 | Colusa | — | fire_ahj_website | NULL | countyofcolusa.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 77 | Colusa | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 78 | Contra Costa | — | agency_phone | NULL | — | — | NULL |
| 79 | Contra Costa | — | agency_fax | NULL | — | — | — |
| 80 | Contra Costa | — | agency_email | NULL | — | — | — |
| 81 | Contra Costa | — | agency_address | NULL | — | — | — |
| 82 | Contra Costa | — | agency_website | NULL | https://www.cchealth.org/about-contra-costa-health/divisions/environmental-health | grading_config.public_portals.environmental_health_division_landing | DIRECT |
| 83 | Contra Costa | — | poc_name | NULL | — | — | — |
| 84 | Contra Costa | — | poc_title | NULL | — | — | — |
| 85 | Contra Costa | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 86 | Contra Costa | — | fire_ahj_phone | NULL | (925) 941-3300 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 87 | Contra Costa | — | fire_ahj_website | NULL | cccfpd.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 88 | Contra Costa | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 89 | Del Norte | — | agency_phone | NULL | (707) 465-0426 | grading_config.agency_contact.phone | HIGH |
| 90 | Del Norte | — | agency_fax | NULL | (707) 465-0340 | grading_config.agency_contact.fax | DIRECT |
| 91 | Del Norte | — | agency_email | NULL | environmental-health@co.del-norte.ca.us | grading_config.agency_contact.email | DIRECT |
| 92 | Del Norte | — | agency_address | NULL | 981 H Street, Suite 110, Crescent City, CA 95531 | grading_config.agency_address | DIRECT |
| 93 | Del Norte | — | agency_website | NULL | https://www.co.del-norte.ca.us/departments/EnvironmentalHealth | grading_config.public_portals.environmental_health_division | DIRECT |
| 94 | Del Norte | — | poc_name | NULL | — | — | — |
| 95 | Del Norte | — | poc_title | NULL | — | — | — |
| 96 | Del Norte | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 97 | Del Norte | — | fire_ahj_phone | NULL | (707) 465-2284 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 98 | Del Norte | — | fire_ahj_website | NULL | co.del-norte.ca.us | fire_jurisdiction_config.ahj_website | DIRECT |
| 99 | Del Norte | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 100 | Del Norte | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): cdd_director | SKIP |
| 101 | El Dorado | — | agency_phone | NULL | 530-621-5300 | grading_config.agency_contact.phone | HIGH |
| 102 | El Dorado | — | agency_fax | NULL | 530-642-1531 | grading_config.agency_contact.fax | DIRECT |
| 103 | El Dorado | — | agency_email | NULL | emd.info@edcgov.us | grading_config.agency_contact.email | DIRECT |
| 104 | El Dorado | — | agency_address | NULL | 2850 Fairlane Court, Building C, Placerville, CA 95667 | grading_config.agency_address | DIRECT |
| 105 | El Dorado | — | agency_website | NULL | https://www.eldoradocounty.ca.gov/County-Government/County-Departments/Environmental-Management | grading_config.agency_contact.website | DIRECT |
| 106 | El Dorado | — | poc_name | NULL | — | — | — |
| 107 | El Dorado | — | poc_title | NULL | — | — | — |
| 108 | El Dorado | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 109 | El Dorado | — | fire_ahj_phone | NULL | (530) 621-5897 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 110 | El Dorado | — | fire_ahj_website | NULL | edcgov.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 111 | El Dorado | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 112 | Fresno | — | agency_phone | NULL | 559-600-3357 | grading_config.agency_contact.phone | HIGH |
| 113 | Fresno | — | agency_fax | NULL | 559-455-4646 | grading_config.agency_contact.fax | DIRECT |
| 114 | Fresno | — | agency_email | NULL | EnvironmentalHealth@fresnocountyca.gov | grading_config.agency_contact.email | DIRECT |
| 115 | Fresno | — | agency_address | NULL | 1221 Fulton Street, 3rd Floor, P.O. Box 11867, Fresno, CA 93775-1867 | grading_config.agency_address | DIRECT |
| 116 | Fresno | — | agency_website | NULL | https://www.fcdph.org | grading_config.agency_contact.website_primary | DIRECT |
| 117 | Fresno | — | poc_name | NULL | — | — | — |
| 118 | Fresno | — | poc_title | NULL | — | — | — |
| 119 | Fresno | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 120 | Fresno | — | fire_ahj_phone | NULL | (559) 456-7920 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 121 | Fresno | — | fire_ahj_website | NULL | co.fresno.ca.us/departments/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 122 | Fresno | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 123 | Glenn | — | agency_phone | NULL | (530) 934-6102 | grading_config.agency_contact.phone | HIGH |
| 124 | Glenn | — | agency_fax | NULL | — | — | — |
| 125 | Glenn | — | agency_email | NULL | — | — | — |
| 126 | Glenn | — | agency_address | NULL | 225 N. Tehama Street, Willows, CA 95988 | grading_config.agency_address | DIRECT |
| 127 | Glenn | — | agency_website | NULL | https://countyofglenn.net/government/departments/planning-community-development-services/environmental-health/food-safety | grading_config.public_portals.food_safety_hub | DIRECT |
| 128 | Glenn | — | poc_name | NULL | John H Wells | grading_config.agency_contact.named_eh_specialist | DIRECT |
| 129 | Glenn | — | poc_title | NULL | Environmental Health Specialist | mapped from key | MAPPED |
| 130 | Glenn | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 131 | Glenn | — | fire_ahj_phone | NULL | (530) 934-6570 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 132 | Glenn | — | fire_ahj_website | NULL | countyofglenn.net/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 133 | Glenn | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 134 | Humboldt | — | agency_phone | NULL | (707) 445-6215 | grading_config.agency_contact.phone | HIGH |
| 135 | Humboldt | — | agency_fax | NULL | — | — | — |
| 136 | Humboldt | — | agency_email | NULL | — | — | — |
| 137 | Humboldt | — | agency_address | NULL | 100 H Street, Suite 100, Eureka, CA 95501 | grading_config.agency_address | DIRECT |
| 138 | Humboldt | — | agency_website | NULL | https://humboldtgov.org/564/Environmental-Health | grading_config.public_portals.environmental_health_division | DIRECT |
| 139 | Humboldt | — | poc_name | NULL | — | — | — |
| 140 | Humboldt | — | poc_title | NULL | — | — | — |
| 141 | Humboldt | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 142 | Humboldt | — | fire_ahj_phone | NULL | (707) 441-4050 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 143 | Humboldt | — | fire_ahj_website | NULL | humboldtgov.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 144 | Humboldt | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 145 | Imperial | — | agency_phone | NULL | (442) 265-1888 | grading_config.agency_contact.phone | HIGH |
| 146 | Imperial | — | agency_fax | NULL | (442) 265-1903 | grading_config.agency_contact.fax | DIRECT |
| 147 | Imperial | — | agency_email | NULL | — | — | — |
| 148 | Imperial | — | agency_address | NULL | 797 Main Street, Suite B, El Centro, CA 92243 | grading_config.agency_address | DIRECT |
| 149 | Imperial | — | agency_website | NULL | https://www.icphd.org/environmental-health | grading_config.public_portals.environmental_health_division | DIRECT |
| 150 | Imperial | — | poc_name | NULL | — | — | — |
| 151 | Imperial | — | poc_title | NULL | — | — | — |
| 152 | Imperial | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 153 | Imperial | — | fire_ahj_phone | NULL | (760) 337-6880 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 154 | Imperial | — | fire_ahj_website | NULL | co.imperial.ca.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 155 | Imperial | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 156 | Inyo | — | agency_phone | NULL | (760) 878-0238 | grading_config.agency_contact.phone | HIGH |
| 157 | Inyo | — | agency_fax | NULL | — | — | — |
| 158 | Inyo | — | agency_email | NULL | inyoehd@inyocounty.us | grading_config.agency_contact.email | DIRECT |
| 159 | Inyo | — | agency_address | NULL | 1360 N. Main St., Bishop, CA 93514 | grading_config.agency_address | DIRECT |
| 160 | Inyo | — | agency_website | NULL | https://www.inyocounty.us/services/environmental-health | grading_config.source_documents[0].live_url | SD0_FILL |
| 161 | Inyo | — | poc_name | NULL | Jerry Oser | grading_config.agency_contact.eh_director | DIRECT |
| 162 | Inyo | — | poc_title | NULL | Environmental Health Director | mapped from key | MAPPED |
| 163 | Inyo | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 164 | Inyo | — | fire_ahj_phone | NULL | (760) 878-0262 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 165 | Inyo | — | fire_ahj_website | NULL | inyocounty.us | fire_jurisdiction_config.ahj_website | DIRECT |
| 166 | Inyo | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 167 | Kern | — | agency_phone | NULL | 661-862-8740 | grading_config.agency_contact.phone | HIGH |
| 168 | Kern | — | agency_fax | NULL | 661-862-8701 | grading_config.agency_contact.fax | DIRECT |
| 169 | Kern | — | agency_email | NULL | eh@kerncounty.com | grading_config.agency_contact.email | DIRECT |
| 170 | Kern | — | agency_address | NULL | 2700 M Street, Suite 300, Bakersfield, CA 93301 | grading_config.agency_address | DIRECT |
| 171 | Kern | — | agency_website | NULL | https://www.kernpublichealth.com | grading_config.agency_contact.website | DIRECT |
| 172 | Kern | — | poc_name | NULL | — | — | — |
| 173 | Kern | — | poc_title | NULL | — | — | — |
| 174 | Kern | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 175 | Kern | — | fire_ahj_phone | NULL | (661) 868-4193 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 176 | Kern | — | fire_ahj_website | NULL | kerncountyfire.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 177 | Kern | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 178 | Kings | — | agency_phone | NULL | — | — | NULL |
| 179 | Kings | — | agency_fax | NULL | — | — | — |
| 180 | Kings | — | agency_email | NULL | — | — | — |
| 181 | Kings | — | agency_address | NULL | 1400 W. Lacey Blvd, Hanford, CA 93230 | grading_config.agency_address | DIRECT |
| 182 | Kings | — | agency_website | NULL | https://www.countyofkingsca.gov/departments/environment-health-service | grading_config.public_portals.main_county_ehs_landing | DIRECT |
| 183 | Kings | — | poc_name | NULL | — | — | — |
| 184 | Kings | — | poc_title | NULL | — | — | — |
| 185 | Kings | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 186 | Kings | — | fire_ahj_phone | NULL | (559) 582-3211 x2430 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 187 | Kings | — | fire_ahj_website | NULL | countyofkings.com/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 188 | Kings | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 189 | Kings | — | _SKIP NOTE_ | — | — | phone STATUS_NOTE: dehs_specific_address_status | SKIP |
| 190 | Lake | — | agency_phone | NULL | — | — | NULL |
| 191 | Lake | — | agency_fax | NULL | — | — | — |
| 192 | Lake | — | agency_email | NULL | — | — | — |
| 193 | Lake | — | agency_address | NULL | 255 N Forbes Street, Lakeport, CA 95453 | grading_config.agency_address | DIRECT |
| 194 | Lake | — | agency_website | NULL | https://www.lakecountyca.gov/211/Environmental-Health | grading_config.public_portals.environmental_health_landing | DIRECT |
| 195 | Lake | — | poc_name | NULL | — | — | — |
| 196 | Lake | — | poc_title | NULL | — | — | — |
| 197 | Lake | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 198 | Lake | — | fire_ahj_phone | NULL | (707) 994-8201 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 199 | Lake | — | fire_ahj_website | NULL | co.lake.ca.us | fire_jurisdiction_config.ahj_website | DIRECT |
| 200 | Lake | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 201 | Lake | — | _SKIP NOTE_ | — | — | phone STATUS_NOTE: eh_specific_contact_status | SKIP |
| 202 | Lassen | — | agency_phone | NULL | (530) 251-8269 | grading_config.agency_contact.phone | HIGH |
| 203 | Lassen | — | agency_fax | NULL | (530) 251-8373 | grading_config.agency_contact.fax | DIRECT |
| 204 | Lassen | — | agency_email | NULL | ehe@co.lassen.ca.us | grading_config.agency_contact.email | DIRECT |
| 205 | Lassen | — | agency_address | NULL | 707 Nevada St Ste 5, Susanville, CA 96130 | grading_config.agency_address | DIRECT |
| 206 | Lassen | — | agency_website | NULL | https://www.lassencounty.org/dept/environmental-health/environmental-health | grading_config.public_portals.environmental_health_home | DIRECT |
| 207 | Lassen | — | poc_name | NULL | Sara Chandler | grading_config.agency_contact.named_eh_staff | DIRECT |
| 208 | Lassen | — | poc_title | NULL | Environmental Health Specialist | mapped from key | MAPPED |
| 209 | Lassen | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 210 | Lassen | — | fire_ahj_phone | NULL | (530) 251-8100 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 211 | Lassen | — | fire_ahj_website | NULL | co.lassen.ca.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 212 | Lassen | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 213 | Los Angeles | — | agency_phone | NULL | (888) 700-9995 | grading_config.agency_contact.phone | HIGH |
| 214 | Los Angeles | — | agency_fax | NULL | — | — | — |
| 215 | Los Angeles | — | agency_email | NULL | — | — | — |
| 216 | Los Angeles | — | agency_address | NULL | — | — | — |
| 217 | Los Angeles | — | agency_website | NULL | http://publichealth.lacounty.gov | grading_config.agency_contact.url | DIRECT |
| 218 | Los Angeles | — | poc_name | NULL | — | — | — |
| 219 | Los Angeles | — | poc_title | NULL | — | — | — |
| 220 | Los Angeles | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 221 | Los Angeles | — | fire_ahj_phone | NULL | (323) 890-4243 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 222 | Los Angeles | — | fire_ahj_website | NULL | fire.lacounty.gov/fire-prevention | fire_jurisdiction_config.ahj_website | DIRECT |
| 223 | Los Angeles | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 224 | Los Angeles | Long Beach | agency_phone | NULL | (562) 570-4132 | grading_config.agency_contact.phone | HIGH |
| 225 | Los Angeles | Long Beach | agency_fax | NULL | — | — | — |
| 226 | Los Angeles | Long Beach | agency_email | NULL | foodinspectors@longbeach.gov | grading_config.agency_contact.email | DIRECT |
| 227 | Los Angeles | Long Beach | agency_address | NULL | 2525 Grand Avenue, Room 220, Long Beach, CA, 90815 | grading_config.agency_address.{street,city,state,zip} | DIRECT |
| 228 | Los Angeles | Long Beach | agency_website | NULL | https://www.longbeach.gov/health/eh/food | grading_config.agency_contact.website | DIRECT |
| 229 | Los Angeles | Long Beach | poc_name | NULL | — | — | — |
| 230 | Los Angeles | Long Beach | poc_title | NULL | — | — | — |
| 231 | Los Angeles | Long Beach | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 232 | Los Angeles | Long Beach | fire_ahj_phone | NULL | — | — | — |
| 233 | Los Angeles | Long Beach | fire_ahj_website | NULL | — | — | — |
| 234 | Los Angeles | Long Beach | fire_ahj_data_source | NULL | unverified | rule-based | unverified |
| 235 | Los Angeles | Pasadena | agency_phone | NULL | (626) 744-6004 | grading_config.agency_contact.phone | HIGH |
| 236 | Los Angeles | Pasadena | agency_fax | NULL | — | — | — |
| 237 | Los Angeles | Pasadena | agency_email | NULL | — | — | — |
| 238 | Los Angeles | Pasadena | agency_address | NULL | — | — | — |
| 239 | Los Angeles | Pasadena | agency_website | NULL | https://www.cityofpasadena.net/public-health/ | grading_config.agency_contact.url | DIRECT |
| 240 | Los Angeles | Pasadena | poc_name | NULL | — | — | — |
| 241 | Los Angeles | Pasadena | poc_title | NULL | — | — | — |
| 242 | Los Angeles | Pasadena | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 243 | Los Angeles | Pasadena | fire_ahj_phone | NULL | — | — | — |
| 244 | Los Angeles | Pasadena | fire_ahj_website | NULL | — | — | — |
| 245 | Los Angeles | Pasadena | fire_ahj_data_source | NULL | unverified | rule-based | unverified |
| 246 | Los Angeles | Vernon | agency_phone | NULL | — | — | NULL |
| 247 | Los Angeles | Vernon | agency_fax | NULL | — | — | — |
| 248 | Los Angeles | Vernon | agency_email | NULL | — | — | — |
| 249 | Los Angeles | Vernon | agency_address | NULL | — | — | — |
| 250 | Los Angeles | Vernon | agency_website | NULL | https://www.cityofvernon.org/government/departments/health-environmental-control | grading_config.agency_contact.website | DIRECT |
| 251 | Los Angeles | Vernon | poc_name | NULL | — | — | — |
| 252 | Los Angeles | Vernon | poc_title | NULL | — | — | — |
| 253 | Los Angeles | Vernon | contact_data_source | NULL | unverified | rule-based | unverified |
| 254 | Los Angeles | Vernon | fire_ahj_phone | NULL | — | — | — |
| 255 | Los Angeles | Vernon | fire_ahj_website | NULL | — | — | — |
| 256 | Los Angeles | Vernon | fire_ahj_data_source | NULL | unverified | rule-based | unverified |
| 257 | Madera | — | agency_phone | NULL | (559) 675-7703 | grading_config.agency_contact.main_county_phone | HIGH |
| 258 | Madera | — | agency_fax | NULL | — | — | — |
| 259 | Madera | — | agency_email | NULL | — | — | — |
| 260 | Madera | — | agency_address | NULL | 200 W. 4th Street, Madera, CA 93637 | grading_config.agency_address | DIRECT |
| 261 | Madera | — | agency_website | NULL | https://www.maderacounty.com/government/community-economic-development-department/divisions/environmental-health-division | grading_config.public_portals.environmental_health_division | DIRECT |
| 262 | Madera | — | poc_name | NULL | — | — | — |
| 263 | Madera | — | poc_title | NULL | — | — | — |
| 264 | Madera | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 265 | Madera | — | fire_ahj_phone | NULL | (559) 675-7871 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 266 | Madera | — | fire_ahj_website | NULL | maderacounty.com/government/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 267 | Madera | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 268 | Marin | — | agency_phone | NULL | (415) 473-6907 | grading_config.agency_contact.public_reporting_phone | LOW |
| 269 | Marin | — | agency_fax | NULL | — | — | — |
| 270 | Marin | — | agency_email | NULL | — | — | — |
| 271 | Marin | — | agency_address | NULL | — | — | — |
| 272 | Marin | — | agency_website | NULL | https://www.marincounty.gov/departments/cda/env-health-svcs/prgm-food | grading_config.source_documents[0].live_url | SD0_FILL |
| 273 | Marin | — | poc_name | NULL | — | — | — |
| 274 | Marin | — | poc_title | NULL | — | — | — |
| 275 | Marin | — | contact_data_source | NULL | firecrawl_pending_review | rule-based | firecrawl_pending_review |
| 276 | Marin | — | fire_ahj_phone | NULL | (415) 473-6525 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 277 | Marin | — | fire_ahj_website | NULL | marincounty.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 278 | Marin | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 279 | Marin | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): ehs_deputy_director | SKIP |
| 280 | Mariposa | — | agency_phone | NULL | (209) 966-2220 | grading_config.agency_contact.phone | HIGH |
| 281 | Mariposa | — | agency_fax | NULL | (209) 966-8248 | grading_config.agency_contact.fax | DIRECT |
| 282 | Mariposa | — | agency_email | NULL | eh@mariposacounty.gov | grading_config.agency_contact.email | DIRECT |
| 283 | Mariposa | — | agency_address | NULL | 5100 Bullion Street, Mariposa, CA 95338 | grading_config.agency_address | DIRECT |
| 284 | Mariposa | — | agency_website | NULL | http://www.mariposacounty.gov/235/Environmental-Health | grading_config.public_portals.environmental_health_landing | DIRECT |
| 285 | Mariposa | — | poc_name | NULL | — | — | — |
| 286 | Mariposa | — | poc_title | NULL | — | — | — |
| 287 | Mariposa | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 288 | Mariposa | — | fire_ahj_phone | NULL | (209) 966-3624 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 289 | Mariposa | — | fire_ahj_website | NULL | mariposacounty.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 290 | Mariposa | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 291 | Mendocino | — | agency_phone | NULL | — | — | NULL |
| 292 | Mendocino | — | agency_fax | NULL | — | — | — |
| 293 | Mendocino | — | agency_email | NULL | enviroh@mendocinocounty.gov | grading_config.agency_contact.email | DIRECT |
| 294 | Mendocino | — | agency_address | NULL | — | — | — |
| 295 | Mendocino | — | agency_website | NULL | https://www.mendocinocounty.gov/how-do-i/report/food-sanitation-issues | grading_config.agency_contact.food_sanitation_reporting_url | DIRECT |
| 296 | Mendocino | — | poc_name | NULL | — | — | — |
| 297 | Mendocino | — | poc_title | NULL | — | — | — |
| 298 | Mendocino | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 299 | Mendocino | — | fire_ahj_phone | NULL | (707) 459-7400 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 300 | Mendocino | — | fire_ahj_website | NULL | mendocinocounty.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 301 | Mendocino | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 302 | Merced | — | agency_phone | NULL | 209-381-1100 | grading_config.agency_contact.phone | HIGH |
| 303 | Merced | — | agency_fax | NULL | 209-384-1593 | grading_config.agency_contact.fax | DIRECT |
| 304 | Merced | — | agency_email | NULL | — | — | — |
| 305 | Merced | — | agency_address | NULL | 2222 "M" Street, Merced, CA 95340 | grading_config.agency_address | DIRECT |
| 306 | Merced | — | agency_website | NULL | https://www.countyofmerced.com/eh | grading_config.agency_contact.website | DIRECT |
| 307 | Merced | — | poc_name | NULL | — | — | — |
| 308 | Merced | — | poc_title | NULL | — | — | — |
| 309 | Merced | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 310 | Merced | — | fire_ahj_phone | NULL | (209) 385-7426 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 311 | Merced | — | fire_ahj_website | NULL | co.merced.ca.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 312 | Merced | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 313 | Modoc | — | agency_phone | NULL | (530) 233-6310 | grading_config.agency_contact.phone | HIGH |
| 314 | Modoc | — | agency_fax | NULL | — | — | — |
| 315 | Modoc | — | agency_email | NULL | — | — | — |
| 316 | Modoc | — | agency_address | NULL | 202 West 4th Street, Alturas, CA 96101 | grading_config.agency_address | DIRECT |
| 317 | Modoc | — | agency_website | NULL | https://environmentalhealth.co.modoc.ca.us/nav/food_sanitation_program.php | grading_config.source_documents[0].live_url | SD0_FILL |
| 318 | Modoc | — | poc_name | NULL | — | — | — |
| 319 | Modoc | — | poc_title | NULL | — | — | — |
| 320 | Modoc | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 321 | Modoc | — | fire_ahj_phone | NULL | (530) 233-4416 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 322 | Modoc | — | fire_ahj_website | NULL | co.modoc.ca.us | fire_jurisdiction_config.ahj_website | DIRECT |
| 323 | Modoc | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 324 | Modoc | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): health_services_director | SKIP |
| 325 | Mono | — | agency_phone | NULL | (760) 924-1846 | grading_config.agency_contact.direct_eh_line | HIGH |
| 326 | Mono | — | agency_fax | NULL | — | — | — |
| 327 | Mono | — | agency_email | NULL | — | — | — |
| 328 | Mono | — | agency_address | NULL | — | — | — |
| 329 | Mono | — | agency_website | NULL | https://monocounty.ca.gov/environmental-health/page/food | grading_config.source_documents[0].live_url | SD0_FILL |
| 330 | Mono | — | poc_name | NULL | — | — | — |
| 331 | Mono | — | poc_title | NULL | — | — | — |
| 332 | Mono | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 333 | Mono | — | fire_ahj_phone | NULL | (760) 932-5380 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 334 | Mono | — | fire_ahj_website | NULL | monocounty.ca.gov | fire_jurisdiction_config.ahj_website | DIRECT |
| 335 | Mono | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 336 | Monterey | — | agency_phone | NULL | — | — | NULL |
| 337 | Monterey | — | agency_fax | NULL | — | — | — |
| 338 | Monterey | — | agency_email | NULL | — | — | — |
| 339 | Monterey | — | agency_address | NULL | — | — | — |
| 340 | Monterey | — | agency_website | NULL | — | — | — |
| 341 | Monterey | — | poc_name | NULL | — | — | — |
| 342 | Monterey | — | poc_title | NULL | — | — | — |
| 343 | Monterey | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 344 | Monterey | — | fire_ahj_phone | NULL | (831) 755-5113 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 345 | Monterey | — | fire_ahj_website | NULL | co.monterey.ca.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 346 | Monterey | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 347 | Napa | — | agency_phone | NULL | 707-253-4540 | grading_config.agency_contact.phone_public_information | LOW |
| 348 | Napa | — | agency_fax | NULL | — | — | — |
| 349 | Napa | — | agency_email | NULL | — | — | — |
| 350 | Napa | — | agency_address | NULL | 1195 Third Street, Napa, CA 94559 | grading_config.agency_address | DIRECT |
| 351 | Napa | — | agency_website | NULL | https://www.countyofnapa.org/1906/Retail-Food-Program | grading_config.agency_contact.website_program | DIRECT |
| 352 | Napa | — | poc_name | NULL | — | — | — |
| 353 | Napa | — | poc_title | NULL | — | — | — |
| 354 | Napa | — | contact_data_source | NULL | firecrawl_pending_review | rule-based | firecrawl_pending_review |
| 355 | Napa | — | fire_ahj_phone | NULL | (707) 253-4320 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 356 | Napa | — | fire_ahj_website | NULL | countyofnapa.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 357 | Napa | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 358 | Napa | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): department_director_2024_2025 | SKIP |
| 359 | Nevada | — | agency_phone | NULL | (530) 265-1222, Option 3 | grading_config.agency_contact.main_line | HIGH |
| 360 | Nevada | — | agency_fax | NULL | — | — | — |
| 361 | Nevada | — | agency_email | NULL | — | — | — |
| 362 | Nevada | — | agency_address | NULL | — | — | — |
| 363 | Nevada | — | agency_website | NULL | https://www.nevadacountyca.gov/1470/Environmental-Health | grading_config.source_documents[0].live_url | SD0_FILL |
| 364 | Nevada | — | poc_name | NULL | — | — | — |
| 365 | Nevada | — | poc_title | NULL | — | — | — |
| 366 | Nevada | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 367 | Nevada | — | fire_ahj_phone | NULL | (530) 265-1581 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 368 | Nevada | — | fire_ahj_website | NULL | nevadacountyca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 369 | Nevada | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 370 | Nevada | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): public_health_director | SKIP |
| 371 | Orange | — | agency_phone | NULL | (714) 433-6000 | grading_config.agency_contact.phone_main | HIGH |
| 372 | Orange | — | agency_fax | NULL | — | — | — |
| 373 | Orange | — | agency_email | NULL | ehealth@ochca.com | grading_config.agency_contact.email | DIRECT |
| 374 | Orange | — | agency_address | NULL | 1241 E. Dyer Road, Suite 120, Santa Ana, CA 92705 | grading_config.agency_address | DIRECT |
| 375 | Orange | — | agency_website | NULL | https://www.ocfoodinfo.com/ | grading_config.agency_contact.website | DIRECT |
| 376 | Orange | — | poc_name | NULL | — | — | — |
| 377 | Orange | — | poc_title | NULL | — | — | — |
| 378 | Orange | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 379 | Orange | — | fire_ahj_phone | NULL | (714) 573-6100 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 380 | Orange | — | fire_ahj_website | NULL | ocfa.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 381 | Orange | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 382 | Placer | — | agency_phone | NULL | — | — | NULL |
| 383 | Placer | — | agency_fax | NULL | — | — | — |
| 384 | Placer | — | agency_email | NULL | — | — | — |
| 385 | Placer | — | agency_address | NULL | — | — | — |
| 386 | Placer | — | agency_website | NULL | https://www.placer.ca.gov/5964/Placard-Program---Food-Safety | grading_config.source_documents[0].live_url | SD0_FILL |
| 387 | Placer | — | poc_name | NULL | — | — | — |
| 388 | Placer | — | poc_title | NULL | — | — | — |
| 389 | Placer | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 390 | Placer | — | fire_ahj_phone | NULL | (530) 889-6600 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 391 | Placer | — | fire_ahj_website | NULL | placer.ca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 392 | Placer | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 393 | Placer | — | _SKIP NOTE_ | — | — | POC STALE: environmental_health_director = Wesley Nicks (named on February 2016 placard launch announcement) | SKIP |
| 394 | Placer | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): assistant_director_at_launch | SKIP |
| 395 | Plumas | — | agency_phone | NULL | (530) 283-6355 | grading_config.agency_contact.phone | HIGH |
| 396 | Plumas | — | agency_fax | NULL | (530) 283-6241 | grading_config.agency_contact.fax | DIRECT |
| 397 | Plumas | — | agency_email | NULL | — | — | — |
| 398 | Plumas | — | agency_address | NULL | 270 County Hospital Road, Suite 127, Quincy, CA 95971 | grading_config.agency_address | DIRECT |
| 399 | Plumas | — | agency_website | NULL | https://www.plumascounty.us/275/Food-Safety | grading_config.source_documents[0].live_url | SD0_FILL |
| 400 | Plumas | — | poc_name | NULL | — | — | — |
| 401 | Plumas | — | poc_title | NULL | — | — | — |
| 402 | Plumas | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 403 | Plumas | — | fire_ahj_phone | NULL | (530) 283-0800 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 404 | Plumas | — | fire_ahj_website | NULL | plumas.ca.gov | fire_jurisdiction_config.ahj_website | DIRECT |
| 405 | Plumas | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 406 | Riverside | — | agency_phone | NULL | (888) 722-4234 | grading_config.agency_contact.phone_main | HIGH |
| 407 | Riverside | — | agency_fax | NULL | — | — | — |
| 408 | Riverside | — | agency_email | NULL | — | — | — |
| 409 | Riverside | — | agency_address | NULL | Riverside County Department of Environmental Health (multi-office; Main Office: 4065 County Circle Dr, Suite 104, Riverside, CA 92503) | grading_config.agency_address | DIRECT |
| 410 | Riverside | — | agency_website | NULL | https://www.rivcoeh.org/ | grading_config.agency_contact.website | DIRECT |
| 411 | Riverside | — | poc_name | NULL | — | — | — |
| 412 | Riverside | — | poc_title | NULL | — | — | — |
| 413 | Riverside | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 414 | Riverside | — | fire_ahj_phone | NULL | (951) 940-6900 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 415 | Riverside | — | fire_ahj_website | NULL | rvcfire.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 416 | Riverside | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 417 | Sacramento | — | agency_phone | NULL | — | — | NULL |
| 418 | Sacramento | — | agency_fax | NULL | — | — | — |
| 419 | Sacramento | — | agency_email | NULL | — | — | — |
| 420 | Sacramento | — | agency_address | NULL | — | — | — |
| 421 | Sacramento | — | agency_website | NULL | http://emd.saccounty.gov | grading_config.agency_contact.url | DIRECT |
| 422 | Sacramento | — | poc_name | NULL | — | — | — |
| 423 | Sacramento | — | poc_title | NULL | — | — | — |
| 424 | Sacramento | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 425 | Sacramento | — | fire_ahj_phone | NULL | (916) 859-4300 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 426 | Sacramento | — | fire_ahj_website | NULL | sacmetrofire.ca.gov | fire_jurisdiction_config.ahj_website | DIRECT |
| 427 | Sacramento | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 428 | San Benito | — | agency_phone | NULL | (831) 636-4035 | grading_config.agency_contact.phone | HIGH |
| 429 | San Benito | — | agency_fax | NULL | (831) 636-4037 | grading_config.agency_contact.fax | DIRECT |
| 430 | San Benito | — | agency_email | NULL | Environmentalhealth@sanbenitocountyca.gov | grading_config.agency_contact.email | DIRECT |
| 431 | San Benito | — | agency_address | NULL | 351 Tres Pinos Rd C-1, Hollister, CA 95023 | grading_config.agency_address | DIRECT |
| 432 | San Benito | — | agency_website | NULL | https://hhsa.sanbenitocountyca.gov/environmental-health-2-2/ | grading_config.public_portals.environmental_health_canonical | DIRECT |
| 433 | San Benito | — | poc_name | NULL | Darryl Wong, REHS | grading_config.agency_contact.eh_manager | DIRECT |
| 434 | San Benito | — | poc_title | NULL | Environmental Health Manager | mapped from key | MAPPED |
| 435 | San Benito | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 436 | San Benito | — | fire_ahj_phone | NULL | (831) 637-5523 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 437 | San Benito | — | fire_ahj_website | NULL | sanbenitocountyca.gov | fire_jurisdiction_config.ahj_website | DIRECT |
| 438 | San Benito | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 439 | San Bernardino | — | agency_phone | NULL | 1-800-442-2283 | grading_config.agency_contact.phone | HIGH |
| 440 | San Bernardino | — | agency_fax | NULL | 909-387-4323 | grading_config.agency_contact.fax | DIRECT |
| 441 | San Bernardino | — | agency_email | NULL | EHS.CustomerService@dph.sbcounty.gov | grading_config.agency_contact.email | DIRECT |
| 442 | San Bernardino | — | agency_address | NULL | 385 N. Arrowhead Ave., 2nd Floor, San Bernardino, CA 92415 | grading_config.agency_address | DIRECT |
| 443 | San Bernardino | — | agency_website | NULL | https://ehs.sbcounty.gov/programs/food-facilities/ | grading_config.public_portals.ehs_program_landing | DIRECT |
| 444 | San Bernardino | — | poc_name | NULL | — | — | — |
| 445 | San Bernardino | — | poc_title | NULL | — | — | — |
| 446 | San Bernardino | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 447 | San Bernardino | — | fire_ahj_phone | NULL | (909) 386-8400 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 448 | San Bernardino | — | fire_ahj_website | NULL | sbcfire.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 449 | San Bernardino | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 450 | San Diego | — | agency_phone | NULL | (858) 505-6900 | grading_config.agency_contact.main | HIGH |
| 451 | San Diego | — | agency_fax | NULL | (858) 505-6848 | grading_config.agency_contact.fax | DIRECT |
| 452 | San Diego | — | agency_email | NULL | fhdutyeh@sdcounty.ca.gov | grading_config.agency_contact.email | DIRECT |
| 453 | San Diego | — | agency_address | NULL | 5500 Overland Ave #110, San Diego, CA 92123 | grading_config.agency_address.office | DIRECT |
| 454 | San Diego | — | agency_website | NULL | https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/food.html | grading_config.source_documents[0].live_url | SD0_FILL |
| 455 | San Diego | — | poc_name | NULL | — | — | — |
| 456 | San Diego | — | poc_title | NULL | — | — | — |
| 457 | San Diego | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 458 | San Diego | — | fire_ahj_phone | NULL | (858) 565-5252 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 459 | San Diego | — | fire_ahj_website | NULL | sdfireauthority.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 460 | San Diego | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 461 | San Francisco | San Francisco | agency_phone | NULL | SF 311 (consolidated city/county intake) | grading_config.agency_contact.complaint_phone | LOW |
| 462 | San Francisco | San Francisco | agency_fax | NULL | — | — | — |
| 463 | San Francisco | San Francisco | agency_email | NULL | — | — | — |
| 464 | San Francisco | San Francisco | agency_address | NULL | Permit Center: 49 South Van Ness, 2nd floor, San Francisco, CA 94103 | grading_config.agency_address | DIRECT |
| 465 | San Francisco | San Francisco | agency_website | NULL | https://www.sfdph.org/dph/EH/Food/Placarding.asp | grading_config.source_documents[0].live_url | SD0_FILL |
| 466 | San Francisco | San Francisco | poc_name | NULL | — | — | — |
| 467 | San Francisco | San Francisco | poc_title | NULL | — | — | — |
| 468 | San Francisco | San Francisco | contact_data_source | NULL | firecrawl_pending_review | rule-based | firecrawl_pending_review |
| 469 | San Francisco | San Francisco | fire_ahj_phone | NULL | (415) 558-3300 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 470 | San Francisco | San Francisco | fire_ahj_website | NULL | sf.gov/departments/fire-department | fire_jurisdiction_config.ahj_website | DIRECT |
| 471 | San Francisco | San Francisco | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 472 | San Joaquin | — | agency_phone | NULL | (209) 468-3420 | grading_config.agency_contact.main_phone | HIGH |
| 473 | San Joaquin | — | agency_fax | NULL | — | — | — |
| 474 | San Joaquin | — | agency_email | NULL | — | — | — |
| 475 | San Joaquin | — | agency_address | NULL | — | — | — |
| 476 | San Joaquin | — | agency_website | NULL | https://sjcehd.com/ | grading_config.agency_contact.website | DIRECT |
| 477 | San Joaquin | — | poc_name | NULL | Jeff Carruesco | grading_config.agency_contact.food_program_coordinator.name | NESTED |
| 478 | San Joaquin | — | poc_title | NULL | Food Program Coordinator | mapped from key | MAPPED |
| 479 | San Joaquin | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 480 | San Joaquin | — | fire_ahj_phone | NULL | (209) 953-6200 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 481 | San Joaquin | — | fire_ahj_website | NULL | sjcoes.com | fire_jurisdiction_config.ahj_website | DIRECT |
| 482 | San Joaquin | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 483 | San Luis Obispo | — | agency_phone | NULL | — | — | NULL |
| 484 | San Luis Obispo | — | agency_fax | NULL | — | — | — |
| 485 | San Luis Obispo | — | agency_email | NULL | — | — | — |
| 486 | San Luis Obispo | — | agency_address | NULL | — | — | — |
| 487 | San Luis Obispo | — | agency_website | NULL | — | — | — |
| 488 | San Luis Obispo | — | poc_name | NULL | — | — | — |
| 489 | San Luis Obispo | — | poc_title | NULL | — | — | — |
| 490 | San Luis Obispo | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 491 | San Luis Obispo | — | fire_ahj_phone | NULL | (805) 781-5957 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 492 | San Luis Obispo | — | fire_ahj_website | NULL | slocounty.ca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 493 | San Luis Obispo | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 494 | San Mateo | — | agency_phone | NULL | (650) 372-6200 | grading_config.agency_contact.phone | HIGH |
| 495 | San Mateo | — | agency_fax | NULL | — | — | — |
| 496 | San Mateo | — | agency_email | NULL | — | — | — |
| 497 | San Mateo | — | agency_address | NULL | 2000 Alameda de las Pulgas, Suite 100, San Mateo, CA 94403 | grading_config.agency_address | DIRECT |
| 498 | San Mateo | — | agency_website | NULL | https://www.smchealth.org/food-safety | grading_config.source_documents[0].live_url | SD0_FILL |
| 499 | San Mateo | — | poc_name | NULL | — | — | — |
| 500 | San Mateo | — | poc_title | NULL | — | — | — |
| 501 | San Mateo | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 502 | San Mateo | — | fire_ahj_phone | NULL | (650) 363-4985 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 503 | San Mateo | — | fire_ahj_website | NULL | smcgov.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 504 | San Mateo | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 505 | Santa Barbara | — | agency_phone | NULL | — | — | NULL |
| 506 | Santa Barbara | — | agency_fax | NULL | — | — | — |
| 507 | Santa Barbara | — | agency_email | NULL | — | — | — |
| 508 | Santa Barbara | — | agency_address | NULL | — | — | — |
| 509 | Santa Barbara | — | agency_website | NULL | — | — | — |
| 510 | Santa Barbara | — | poc_name | NULL | — | — | — |
| 511 | Santa Barbara | — | poc_title | NULL | — | — | — |
| 512 | Santa Barbara | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 513 | Santa Barbara | — | fire_ahj_phone | NULL | — | — | — |
| 514 | Santa Barbara | — | fire_ahj_website | NULL | — | — | — |
| 515 | Santa Barbara | — | fire_ahj_data_source | NULL | unverified | rule-based | unverified |
| 516 | Santa Clara | — | agency_phone | NULL | (408) 918-3400 | grading_config.agency_contact.phone | HIGH |
| 517 | Santa Clara | — | agency_fax | NULL | — | — | — |
| 518 | Santa Clara | — | agency_email | NULL | — | — | — |
| 519 | Santa Clara | — | agency_address | NULL | 1555 Berger Drive, Suite 300, San Jose, CA 95112 | grading_config.agency_address | DIRECT |
| 520 | Santa Clara | — | agency_website | NULL | https://deh.santaclaracounty.gov | grading_config.agency_contact.url | DIRECT |
| 521 | Santa Clara | — | poc_name | NULL | — | — | — |
| 522 | Santa Clara | — | poc_title | NULL | — | — | — |
| 523 | Santa Clara | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 524 | Santa Clara | — | fire_ahj_phone | NULL | (408) 378-4010 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 525 | Santa Clara | — | fire_ahj_website | NULL | sccfd.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 526 | Santa Clara | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 527 | Santa Cruz | — | agency_phone | NULL | (831) 454-2022 | grading_config.agency_contact.public_reporting_phone | LOW |
| 528 | Santa Cruz | — | agency_fax | NULL | — | — | — |
| 529 | Santa Cruz | — | agency_email | NULL | Env.Hlth@co.santa-cruz.ca.us | grading_config.agency_contact.email | DIRECT |
| 530 | Santa Cruz | — | agency_address | NULL | — | — | — |
| 531 | Santa Cruz | — | agency_website | NULL | https://scceh.com/NewHome/Programs/ConsumerProtection/Food/AboutRestaurantInspections.aspx | grading_config.source_documents[0].live_url | SD0_FILL |
| 532 | Santa Cruz | — | poc_name | NULL | — | — | — |
| 533 | Santa Cruz | — | poc_title | NULL | — | — | — |
| 534 | Santa Cruz | — | contact_data_source | NULL | firecrawl_pending_review | rule-based | firecrawl_pending_review |
| 535 | Santa Cruz | — | fire_ahj_phone | NULL | (831) 454-2400 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 536 | Santa Cruz | — | fire_ahj_website | NULL | co.santa-cruz.ca.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 537 | Santa Cruz | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 538 | Shasta | — | agency_phone | NULL | (530) 225-5787 | grading_config.agency_contact.phone | HIGH |
| 539 | Shasta | — | agency_fax | NULL | (530) 225-5413 | grading_config.agency_contact.fax | DIRECT |
| 540 | Shasta | — | agency_email | NULL | — | — | — |
| 541 | Shasta | — | agency_address | NULL | 1855 Placer Street, Redding, CA 96001 | grading_config.agency_address | DIRECT |
| 542 | Shasta | — | agency_website | NULL | https://www.shastacounty.gov/environmental-health | grading_config.public_portals.environmental_health_landing | DIRECT |
| 543 | Shasta | — | poc_name | NULL | — | — | — |
| 544 | Shasta | — | poc_title | NULL | — | — | — |
| 545 | Shasta | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 546 | Shasta | — | fire_ahj_phone | NULL | (530) 225-2417 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 547 | Shasta | — | fire_ahj_website | NULL | fire.shastacounty.gov | fire_jurisdiction_config.ahj_website | DIRECT |
| 548 | Shasta | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 549 | Sierra | — | agency_phone | NULL | (530) 993-6716 | grading_config.agency_contact.phone | HIGH |
| 550 | Sierra | — | agency_fax | NULL | — | — | — |
| 551 | Sierra | — | agency_email | NULL | — | — | — |
| 552 | Sierra | — | agency_address | NULL | 202 Front Street, P.O. Box 7, Loyalton, CA 96118 | grading_config.agency_address | DIRECT |
| 553 | Sierra | — | agency_website | NULL | https://www.sierracounty.ca.gov/232/Food-Safety | grading_config.source_documents[0].live_url | SD0_FILL |
| 554 | Sierra | — | poc_name | NULL | Elizabeth Morgan, MPH, REHS | grading_config.agency_contact.staff_roster[0].name | ARRAY |
| 555 | Sierra | — | poc_title | NULL | Environmental Health Specialist III (senior) | mapped from key | MAPPED |
| 556 | Sierra | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 557 | Sierra | — | fire_ahj_phone | NULL | (530) 289-3201 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 558 | Sierra | — | fire_ahj_website | NULL | sierracounty.ca.gov | fire_jurisdiction_config.ahj_website | DIRECT |
| 559 | Sierra | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 560 | Siskiyou | — | agency_phone | NULL | (530) 841-2100 | grading_config.agency_contact.phone | HIGH |
| 561 | Siskiyou | — | agency_fax | NULL | — | — | — |
| 562 | Siskiyou | — | agency_email | NULL | — | — | — |
| 563 | Siskiyou | — | agency_address | NULL | 806 South Main Street, Yreka, CA 96097 | grading_config.agency_address | DIRECT |
| 564 | Siskiyou | — | agency_website | NULL | https://www.siskiyoucounty.gov/environmentalhealth/page/food | grading_config.source_documents[0].live_url | SD0_FILL |
| 565 | Siskiyou | — | poc_name | NULL | — | — | — |
| 566 | Siskiyou | — | poc_title | NULL | — | — | — |
| 567 | Siskiyou | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 568 | Siskiyou | — | fire_ahj_phone | NULL | (530) 842-8862 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 569 | Siskiyou | — | fire_ahj_website | NULL | co.siskiyou.ca.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 570 | Siskiyou | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 571 | Solano | — | agency_phone | NULL | (707) 784-6765 | grading_config.agency_contact.main_phone | HIGH |
| 572 | Solano | — | agency_fax | NULL | — | — | — |
| 573 | Solano | — | agency_email | NULL | RMHelp@SolanoCounty.gov | grading_config.agency_contact.email | DIRECT |
| 574 | Solano | — | agency_address | NULL | 675 Texas St, Suite 5500, Fairfield, CA 94533 | grading_config.agency_address | DIRECT |
| 575 | Solano | — | agency_website | NULL | https://www.solanocounty.gov/government/resource-management/environmental-health | grading_config.public_portals.environmental_health_division_landing | DIRECT |
| 576 | Solano | — | poc_name | NULL | — | — | — |
| 577 | Solano | — | poc_title | NULL | — | — | — |
| 578 | Solano | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 579 | Solano | — | fire_ahj_phone | NULL | (707) 428-7622 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 580 | Solano | — | fire_ahj_website | NULL | fairfield.ca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 581 | Solano | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 582 | Solano | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): director_per_research_note | SKIP |
| 583 | Sonoma | — | agency_phone | NULL | (707) 565-6565 | grading_config.agency_contact.phone | HIGH |
| 584 | Sonoma | — | agency_fax | NULL | (707) 565-6525 | grading_config.agency_contact.fax | DIRECT |
| 585 | Sonoma | — | agency_email | NULL | — | — | — |
| 586 | Sonoma | — | agency_address | NULL | 463 Aviation Blvd, Santa Rosa, CA 95403 | grading_config.agency_address | DIRECT |
| 587 | Sonoma | — | agency_website | NULL | https://sonomacounty.gov/health-and-human-services/health-services/divisions/public-health/environmental-health/programs-and-services/food-safety-program/food-facility-inspections | grading_config.source_documents[0].live_url | SD0_FILL |
| 588 | Sonoma | — | poc_name | NULL | — | — | — |
| 589 | Sonoma | — | poc_title | NULL | — | — | — |
| 590 | Sonoma | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 591 | Sonoma | — | fire_ahj_phone | NULL | (707) 565-1152 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 592 | Sonoma | — | fire_ahj_website | NULL | sonomacounty.ca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 593 | Sonoma | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 594 | Stanislaus | — | agency_phone | NULL | (209) 525-6700 | grading_config.agency_contact.main_phone | HIGH |
| 595 | Stanislaus | — | agency_fax | NULL | — | — | — |
| 596 | Stanislaus | — | agency_email | NULL | — | — | — |
| 597 | Stanislaus | — | agency_address | NULL | 3800 Cornucopia Way, Suite C, Modesto, CA 95358 | grading_config.agency_address | DIRECT |
| 598 | Stanislaus | — | agency_website | NULL | https://www.stancounty.com/er/environmentalhealth/food-program.shtm | grading_config.agency_contact.website | DIRECT |
| 599 | Stanislaus | — | poc_name | NULL | — | — | — |
| 600 | Stanislaus | — | poc_title | NULL | — | — | — |
| 601 | Stanislaus | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 602 | Stanislaus | — | fire_ahj_phone | NULL | (209) 552-3700 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 603 | Stanislaus | — | fire_ahj_website | NULL | stanislausfire.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 604 | Stanislaus | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 605 | Sutter | — | agency_phone | NULL | — | — | NULL |
| 606 | Sutter | — | agency_fax | NULL | — | — | — |
| 607 | Sutter | — | agency_email | NULL | — | — | — |
| 608 | Sutter | — | agency_address | NULL | — | — | — |
| 609 | Sutter | — | agency_website | NULL | https://www.sutter.gov/government/county-departments/development-services/environmental-health/food | grading_config.source_documents[0].live_url | SD0_FILL |
| 610 | Sutter | — | poc_name | NULL | Jeff Williams | grading_config.agency_contact.environmental_health_manager | DIRECT |
| 611 | Sutter | — | poc_title | NULL | Environmental Health Manager | mapped from key | MAPPED |
| 612 | Sutter | — | contact_data_source | NULL | firecrawl_pending_review | rule-based | firecrawl_pending_review |
| 613 | Sutter | — | fire_ahj_phone | NULL | (530) 822-7171 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 614 | Sutter | — | fire_ahj_website | NULL | suttercounty.org/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 615 | Sutter | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 616 | Sutter | — | _SKIP NOTE_ | — | — | POC NEAR-STALE: environmental_health_manager = Jeff Williams (per Appeal-Democrat coverage dated July 11, 2024) (promote but flag) | SKIP |
| 617 | Tehama | — | agency_phone | NULL | — | — | NULL |
| 618 | Tehama | — | agency_fax | NULL | — | — | — |
| 619 | Tehama | — | agency_email | NULL | — | — | — |
| 620 | Tehama | — | agency_address | NULL | 633 Washington Street, Room 36, Red Bluff, CA 96080 | grading_config.agency_address | DIRECT |
| 621 | Tehama | — | agency_website | NULL | https://www.tehama.gov/government/departments/environmental-health/ | grading_config.source_documents[0].live_url | SD0_FILL |
| 622 | Tehama | — | poc_name | NULL | — | — | — |
| 623 | Tehama | — | poc_title | NULL | — | — | — |
| 624 | Tehama | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 625 | Tehama | — | fire_ahj_phone | NULL | (530) 529-7921 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 626 | Tehama | — | fire_ahj_website | NULL | tehamacountyfire.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 627 | Tehama | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 628 | Tehama | — | _SKIP NOTE_ | — | — | phone STATUS_NOTE: address_source | SKIP |
| 629 | Trinity | — | agency_phone | NULL | (530) 623-1459 | grading_config.agency_contact.phone | HIGH |
| 630 | Trinity | — | agency_fax | NULL | (530) 623-1353 | grading_config.agency_contact.fax | DIRECT |
| 631 | Trinity | — | agency_email | NULL | environmentalhealth@trinitycounty.org | grading_config.agency_contact.email | DIRECT |
| 632 | Trinity | — | agency_address | NULL | 61 Airport Road / P.O. Box 476, Weaverville, CA 96093 | grading_config.agency_address | DIRECT |
| 633 | Trinity | — | agency_website | NULL | https://www.trinitycounty.org/486/Food-Facilities | grading_config.source_documents[0].live_url | SD0_FILL |
| 634 | Trinity | — | poc_name | NULL | — | — | — |
| 635 | Trinity | — | poc_title | NULL | — | — | — |
| 636 | Trinity | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 637 | Trinity | — | fire_ahj_phone | NULL | (530) 623-4531 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 638 | Trinity | — | fire_ahj_website | NULL | trinitycounty.org | fire_jurisdiction_config.ahj_website | DIRECT |
| 639 | Trinity | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 640 | Trinity | — | _SKIP NOTE_ | — | — | POC SKIP (wrong role): director | SKIP |
| 641 | Tulare | — | agency_phone | NULL | (559) 624-7400 | grading_config.agency_contact.main_phone_per_arthur_research_note | HIGH |
| 642 | Tulare | — | agency_fax | NULL | (559) 749-9794 | grading_config.agency_contact.fax_per_arthur_research_note | DIRECT |
| 643 | Tulare | — | agency_email | NULL | tularecountyeh@tularecounty.ca.gov | grading_config.agency_contact.email_per_arthur_research_note | DIRECT |
| 644 | Tulare | — | agency_address | NULL | — | — | — |
| 645 | Tulare | — | agency_website | NULL | https://tularecountyeh.org/ | grading_config.agency_contact.website | DIRECT |
| 646 | Tulare | — | poc_name | NULL | — | — | — |
| 647 | Tulare | — | poc_title | NULL | — | — | — |
| 648 | Tulare | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 649 | Tulare | — | fire_ahj_phone | NULL | (559) 624-7050 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 650 | Tulare | — | fire_ahj_website | NULL | tularecounty.ca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 651 | Tulare | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 652 | Tuolumne | — | agency_phone | NULL | (209) 533-5633 | grading_config.agency_contact.main_phone | HIGH |
| 653 | Tuolumne | — | agency_fax | NULL | (209) 533-5909 | grading_config.agency_contact.fax | DIRECT |
| 654 | Tuolumne | — | agency_email | NULL | — | — | — |
| 655 | Tuolumne | — | agency_address | NULL | A. N. Francisco Building, 4th Floor (with some pages listing Floors 3 and 4 — both EH-occupied), 48 W. Yaney Street, Sonora, CA 95370 | grading_config.agency_address | DIRECT |
| 656 | Tuolumne | — | agency_website | NULL | https://www.tuolumnecounty.ca.gov/247/Safe-Food | grading_config.source_documents[0].live_url | SD0_FILL |
| 657 | Tuolumne | — | poc_name | NULL | Debbie Larson | grading_config.agency_contact.staff_roster[0].name | ARRAY |
| 658 | Tuolumne | — | poc_title | NULL | Director of Environmental Health | mapped from key | MAPPED |
| 659 | Tuolumne | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 660 | Tuolumne | — | fire_ahj_phone | NULL | (209) 533-5633 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 661 | Tuolumne | — | fire_ahj_website | NULL | tuolumnecounty.ca.gov/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 662 | Tuolumne | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 663 | Ventura | — | agency_phone | NULL | — | — | NULL |
| 664 | Ventura | — | agency_fax | NULL | — | — | — |
| 665 | Ventura | — | agency_email | NULL | — | — | — |
| 666 | Ventura | — | agency_address | NULL | — | — | — |
| 667 | Ventura | — | agency_website | NULL | — | — | — |
| 668 | Ventura | — | poc_name | NULL | — | — | — |
| 669 | Ventura | — | poc_title | NULL | — | — | — |
| 670 | Ventura | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 671 | Ventura | — | fire_ahj_phone | NULL | — | — | — |
| 672 | Ventura | — | fire_ahj_website | NULL | — | — | — |
| 673 | Ventura | — | fire_ahj_data_source | NULL | unverified | rule-based | unverified |
| 674 | Yolo | — | agency_phone | NULL | (530) 666-8646 | grading_config.agency_contact.phone | HIGH |
| 675 | Yolo | — | agency_fax | NULL | — | — | — |
| 676 | Yolo | — | agency_email | NULL | EHealth@YoloCounty.gov | grading_config.agency_contact.email | DIRECT |
| 677 | Yolo | — | agency_address | NULL | Yolo County Department of Community Services, Environmental Health Division, Consumer Protection Unit | grading_config.agency_address | DIRECT |
| 678 | Yolo | — | agency_website | NULL | https://www.yolocounty.gov/government/general-government-departments/community-services/environmental-health-division/consumer-protection-programs | grading_config.source_documents[0].live_url | SD0_FILL |
| 679 | Yolo | — | poc_name | NULL | — | — | — |
| 680 | Yolo | — | poc_title | NULL | — | — | — |
| 681 | Yolo | — | contact_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 682 | Yolo | — | fire_ahj_phone | NULL | (530) 666-8060 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 683 | Yolo | — | fire_ahj_website | NULL | yolocounty.org/oes | fire_jurisdiction_config.ahj_website | DIRECT |
| 684 | Yolo | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 685 | Yuba | — | agency_phone | NULL | — | — | NULL |
| 686 | Yuba | — | agency_fax | NULL | — | — | — |
| 687 | Yuba | — | agency_email | NULL | — | — | — |
| 688 | Yuba | — | agency_address | NULL | Yuba County Government Center, 915 8th Street, Marysville, CA 95901 (verify exact suite) | grading_config.agency_address | DIRECT |
| 689 | Yuba | — | agency_website | NULL | https://www.yuba.gov/departments/community_development/environmental_health/retail_food/index.php | grading_config.source_documents[0].live_url | SD0_FILL |
| 690 | Yuba | — | poc_name | NULL | — | — | — |
| 691 | Yuba | — | poc_title | NULL | — | — | — |
| 692 | Yuba | — | contact_data_source | NULL | unverified | rule-based | unverified |
| 693 | Yuba | — | fire_ahj_phone | NULL | (530) 749-5450 | fire_jurisdiction_config.ahj_phone | DIRECT |
| 694 | Yuba | — | fire_ahj_website | NULL | co.yuba.ca.us/fire | fire_jurisdiction_config.ahj_website | DIRECT |
| 695 | Yuba | — | fire_ahj_data_source | NULL | jsonb_existing | rule-based | jsonb_existing |
| 696 | Yuba | — | _SKIP NOTE_ | — | — | phone SKIP: phone_verification_status | SKIP |
| 697 | Yuba | — | _SKIP NOTE_ | — | — | phone STATUS_NOTE: phone_verification_status | SKIP |


---

## Extended Mapping Notes (3A.2 — 2026-05-22)

### source_documents[0].live_url fallback (SD0_FILL bucket)

21 agency_website cells filled from .
These are JIE research artifact URLs, not agency-confirmed canonical pages.
All flagged at cell-level as  (firecrawl_pending_review quality).

**Row-level contact_data_source is UNCHANGED for all 21 rows:**

| County | contact_data_source (unchanged) | agency_website (NEW) |
|---|---|---|
| Colusa | unverified | https://www.countyofcolusaca.gov/425/Retail-Food-Safety |
| Inyo | jsonb_existing | https://www.inyocounty.us/services/environmental-health |
| Marin | firecrawl_pending_review | https://www.marincounty.gov/departments/cda/env-health-svcs/prgm-food |
| Modoc | jsonb_existing | https://environmentalhealth.co.modoc.ca.us/nav/food_sanitation_program.php |
| Mono | jsonb_existing | https://monocounty.ca.gov/environmental-health/page/food |
| Nevada | jsonb_existing | https://www.nevadacountyca.gov/1470/Environmental-Health |
| Placer | unverified | https://www.placer.ca.gov/5964/Placard-Program---Food-Safety |
| Plumas | jsonb_existing | https://www.plumascounty.us/275/Food-Safety |
| San Diego | jsonb_existing | https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/food.html |
| San Francisco | firecrawl_pending_review | https://www.sfdph.org/dph/EH/Food/Placarding.asp |
| San Mateo | jsonb_existing | https://www.smchealth.org/food-safety |
| Santa Cruz | firecrawl_pending_review | https://scceh.com/NewHome/Programs/ConsumerProtection/Food/AboutRestaurantInspections.aspx |
| Sierra | jsonb_existing | https://www.sierracounty.ca.gov/232/Food-Safety |
| Siskiyou | jsonb_existing | https://www.siskiyoucounty.gov/environmentalhealth/page/food |
| Sonoma | jsonb_existing | https://sonomacounty.gov/health-and-human-services/health-services/divisions/public-health/environmental-health/programs-and-services/food-safety-program/food-facility-inspections |
| Sutter | firecrawl_pending_review | https://www.sutter.gov/government/county-departments/development-services/environmental-health/food |
| Tehama | unverified | https://www.tehama.gov/government/departments/environmental-health/ |
| Trinity | jsonb_existing | https://www.trinitycounty.org/486/Food-Facilities |
| Tuolumne | jsonb_existing | https://www.tuolumnecounty.ca.gov/247/Safe-Food |
| Yolo | jsonb_existing | https://www.yolocounty.gov/government/general-government-departments/community-services/environmental-health-division/consumer-protection-programs |
| Yuba | unverified | https://www.yuba.gov/departments/community_development/environmental_health/retail_food/index.php |
