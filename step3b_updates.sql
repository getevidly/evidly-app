BEGIN;

-- Alameda
UPDATE jurisdictions SET
    agency_address = '1131 Harbor Bay Parkway, Alameda, CA 94502',
    agency_fax = '(510) 337-9432',
    agency_phone = '(510) 567-6700',
    agency_website = 'https://www.acgov.org/aceh',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(510) 618-3478',
    fire_ahj_website = 'acgov.org/fire'
WHERE state = 'CA' AND county = 'Alameda' AND city IS NULL;

-- Alameda (Berkeley)
UPDATE jurisdictions SET
    agency_address = '2180 Milvia St., 2nd Floor, Berkeley, CA 94704',
    agency_email = 'envhealth@berkeleyca.gov',
    agency_phone = '(510) 981-5310',
    agency_website = 'https://berkeleyca.gov/doing-business/operating-berkeley/food-service/food-safety-and-inspection-program',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'unverified'
WHERE state = 'CA' AND county = 'Alameda' AND city = 'Berkeley';

-- Alpine
UPDATE jurisdictions SET
    agency_address = '75 A Diamond Valley Rd, Markleeville, CA 96120',
    agency_email = 'dlampson@alpinecountyca.gov',
    agency_fax = '530.694.2252',
    agency_phone = '530.694.2235',
    agency_website = 'https://alpinecountyca.gov/200/Environmental-Health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 694-2241',
    fire_ahj_website = 'alpinecountyca.gov',
    poc_name = 'Dennis Lampson',
    poc_title = 'Environmental Health Director'
WHERE state = 'CA' AND county = 'Alpine' AND city IS NULL;

-- Amador
UPDATE jurisdictions SET
    agency_address = '810 Court Street, Jackson, CA 95642',
    agency_phone = '(209) 223-6470',
    agency_website = 'https://www.amadorcounty.gov/departments/environmental-health',
    contact_data_source = 'firecrawl_pending_review',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(209) 223-6388',
    fire_ahj_website = 'amadorgov.org/fire'
WHERE state = 'CA' AND county = 'Amador' AND city IS NULL;

-- Butte
UPDATE jurisdictions SET
    agency_address = '202 Mira Loma Drive, Oroville, CA 95965',
    agency_email = 'jveilleaux@buttecounty.net',
    agency_fax = '530-538-5339',
    agency_phone = '530-552-3880',
    agency_website = 'https://buttecounty.net/publichealth',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 538-7111',
    fire_ahj_website = 'buttecounty.net/fire',
    poc_name = 'Elaine McSpadden',
    poc_title = 'Environmental Health Director'
WHERE state = 'CA' AND county = 'Butte' AND city IS NULL;

-- Calaveras
UPDATE jurisdictions SET
    agency_address = '891 Mountain Ranch Road, Building E, San Andreas, CA 95249',
    agency_fax = '(209) 754-6722',
    agency_phone = '(209) 754-6399',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(209) 754-6600',
    fire_ahj_website = 'calaveras.ca.gov/fire'
WHERE state = 'CA' AND county = 'Calaveras' AND city IS NULL;

-- Colusa
UPDATE jurisdictions SET
    agency_address = '1213 Market Street, Colusa, CA 95932',
    agency_website = 'https://www.countyofcolusaca.gov/425/Retail-Food-Safety',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 458-0350',
    fire_ahj_website = 'countyofcolusa.org'
WHERE state = 'CA' AND county = 'Colusa' AND city IS NULL;

-- Contra Costa
UPDATE jurisdictions SET
    agency_website = 'https://www.cchealth.org/about-contra-costa-health/divisions/environmental-health',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(925) 941-3300',
    fire_ahj_website = 'cccfpd.org'
WHERE state = 'CA' AND county = 'Contra Costa' AND city IS NULL;

-- Del Norte
UPDATE jurisdictions SET
    agency_address = '981 H Street, Suite 110, Crescent City, CA 95531',
    agency_email = 'environmental-health@co.del-norte.ca.us',
    agency_fax = '(707) 465-0340',
    agency_phone = '(707) 465-0426',
    agency_website = 'https://www.co.del-norte.ca.us/departments/EnvironmentalHealth',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(707) 465-2284',
    fire_ahj_website = 'co.del-norte.ca.us'
WHERE state = 'CA' AND county = 'Del Norte' AND city IS NULL;

-- El Dorado
UPDATE jurisdictions SET
    agency_address = '2850 Fairlane Court, Building C, Placerville, CA 95667',
    agency_email = 'emd.info@edcgov.us',
    agency_fax = '530-642-1531',
    agency_phone = '530-621-5300',
    agency_website = 'https://www.eldoradocounty.ca.gov/County-Government/County-Departments/Environmental-Management',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 621-5897',
    fire_ahj_website = 'edcgov.us/fire'
WHERE state = 'CA' AND county = 'El Dorado' AND city IS NULL;

-- Fresno
UPDATE jurisdictions SET
    agency_address = '1221 Fulton Street, 3rd Floor, P.O. Box 11867, Fresno, CA 93775-1867',
    agency_email = 'EnvironmentalHealth@fresnocountyca.gov',
    agency_fax = '559-455-4646',
    agency_phone = '559-600-3357',
    agency_website = 'https://www.fcdph.org',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(559) 456-7920',
    fire_ahj_website = 'co.fresno.ca.us/departments/fire'
WHERE state = 'CA' AND county = 'Fresno' AND city IS NULL;

-- Glenn
UPDATE jurisdictions SET
    agency_address = '225 N. Tehama Street, Willows, CA 95988',
    agency_phone = '(530) 934-6102',
    agency_website = 'https://countyofglenn.net/government/departments/planning-community-development-services/environmental-health/food-safety',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 934-6570',
    fire_ahj_website = 'countyofglenn.net/fire',
    poc_name = 'John H Wells',
    poc_title = 'Environmental Health Specialist'
WHERE state = 'CA' AND county = 'Glenn' AND city IS NULL;

-- Humboldt
UPDATE jurisdictions SET
    agency_address = '100 H Street, Suite 100, Eureka, CA 95501',
    agency_phone = '(707) 445-6215',
    agency_website = 'https://humboldtgov.org/564/Environmental-Health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(707) 441-4050',
    fire_ahj_website = 'humboldtgov.org/fire'
WHERE state = 'CA' AND county = 'Humboldt' AND city IS NULL;

-- Imperial
UPDATE jurisdictions SET
    agency_address = '797 Main Street, Suite B, El Centro, CA 92243',
    agency_fax = '(442) 265-1903',
    agency_phone = '(442) 265-1888',
    agency_website = 'https://www.icphd.org/environmental-health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(760) 337-6880',
    fire_ahj_website = 'co.imperial.ca.us/fire'
WHERE state = 'CA' AND county = 'Imperial' AND city IS NULL;

-- Inyo
UPDATE jurisdictions SET
    agency_address = '1360 N. Main St., Bishop, CA 93514',
    agency_email = 'inyoehd@inyocounty.us',
    agency_phone = '(760) 878-0238',
    agency_website = 'https://www.inyocounty.us/services/environmental-health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(760) 878-0262',
    fire_ahj_website = 'inyocounty.us',
    poc_name = 'Jerry Oser',
    poc_title = 'Environmental Health Director'
WHERE state = 'CA' AND county = 'Inyo' AND city IS NULL;

-- Kern
UPDATE jurisdictions SET
    agency_address = '2700 M Street, Suite 300, Bakersfield, CA 93301',
    agency_email = 'eh@kerncounty.com',
    agency_fax = '661-862-8701',
    agency_phone = '661-862-8740',
    agency_website = 'https://www.kernpublichealth.com',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(661) 868-4193',
    fire_ahj_website = 'kerncountyfire.org'
WHERE state = 'CA' AND county = 'Kern' AND city IS NULL;

-- Kings
UPDATE jurisdictions SET
    agency_address = '1400 W. Lacey Blvd, Hanford, CA 93230',
    agency_website = 'https://www.countyofkingsca.gov/departments/environment-health-service',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(559) 582-3211 x2430',
    fire_ahj_website = 'countyofkings.com/fire'
WHERE state = 'CA' AND county = 'Kings' AND city IS NULL;

-- Lake
UPDATE jurisdictions SET
    agency_address = '255 N Forbes Street, Lakeport, CA 95453',
    agency_website = 'https://www.lakecountyca.gov/211/Environmental-Health',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(707) 994-8201',
    fire_ahj_website = 'co.lake.ca.us'
WHERE state = 'CA' AND county = 'Lake' AND city IS NULL;

-- Lassen
UPDATE jurisdictions SET
    agency_address = '707 Nevada St Ste 5, Susanville, CA 96130',
    agency_email = 'ehe@co.lassen.ca.us',
    agency_fax = '(530) 251-8373',
    agency_phone = '(530) 251-8269',
    agency_website = 'https://www.lassencounty.org/dept/environmental-health/environmental-health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 251-8100',
    fire_ahj_website = 'co.lassen.ca.us/fire',
    poc_name = 'Sara Chandler',
    poc_title = 'Environmental Health Specialist'
WHERE state = 'CA' AND county = 'Lassen' AND city IS NULL;

-- Los Angeles
UPDATE jurisdictions SET
    agency_phone = '(888) 700-9995',
    agency_website = 'http://publichealth.lacounty.gov',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(323) 890-4243',
    fire_ahj_website = 'fire.lacounty.gov/fire-prevention'
WHERE state = 'CA' AND county = 'Los Angeles' AND city IS NULL;

-- Los Angeles (Long Beach)
UPDATE jurisdictions SET
    agency_address = '2525 Grand Avenue, Room 220, Long Beach, CA, 90815',
    agency_email = 'foodinspectors@longbeach.gov',
    agency_phone = '(562) 570-4132',
    agency_website = 'https://www.longbeach.gov/health/eh/food',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'unverified'
WHERE state = 'CA' AND county = 'Los Angeles' AND city = 'Long Beach';

-- Los Angeles (Pasadena)
UPDATE jurisdictions SET
    agency_phone = '(626) 744-6004',
    agency_website = 'https://www.cityofpasadena.net/public-health/',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'unverified'
WHERE state = 'CA' AND county = 'Los Angeles' AND city = 'Pasadena';

-- Los Angeles (Vernon)
UPDATE jurisdictions SET
    agency_website = 'https://www.cityofvernon.org/government/departments/health-environmental-control',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'unverified'
WHERE state = 'CA' AND county = 'Los Angeles' AND city = 'Vernon';

-- Madera
UPDATE jurisdictions SET
    agency_address = '200 W. 4th Street, Madera, CA 93637',
    agency_phone = '(559) 675-7703',
    agency_website = 'https://www.maderacounty.com/government/community-economic-development-department/divisions/environmental-health-division',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(559) 675-7871',
    fire_ahj_website = 'maderacounty.com/government/fire'
WHERE state = 'CA' AND county = 'Madera' AND city IS NULL;

-- Marin
UPDATE jurisdictions SET
    agency_phone = '(415) 473-6907',
    agency_website = 'https://www.marincounty.gov/departments/cda/env-health-svcs/prgm-food',
    contact_data_source = 'firecrawl_pending_review',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(415) 473-6525',
    fire_ahj_website = 'marincounty.org/fire'
WHERE state = 'CA' AND county = 'Marin' AND city IS NULL;

-- Mariposa
UPDATE jurisdictions SET
    agency_address = '5100 Bullion Street, Mariposa, CA 95338',
    agency_email = 'eh@mariposacounty.gov',
    agency_fax = '(209) 966-8248',
    agency_phone = '(209) 966-2220',
    agency_website = 'http://www.mariposacounty.gov/235/Environmental-Health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(209) 966-3624',
    fire_ahj_website = 'mariposacounty.org/fire'
WHERE state = 'CA' AND county = 'Mariposa' AND city IS NULL;

-- Mendocino
UPDATE jurisdictions SET
    agency_email = 'enviroh@mendocinocounty.gov',
    agency_website = 'https://www.mendocinocounty.gov/how-do-i/report/food-sanitation-issues',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(707) 459-7400',
    fire_ahj_website = 'mendocinocounty.org/fire'
WHERE state = 'CA' AND county = 'Mendocino' AND city IS NULL;

-- Merced
UPDATE jurisdictions SET
    agency_address = '2222 "M" Street, Merced, CA 95340',
    agency_fax = '209-384-1593',
    agency_phone = '209-381-1100',
    agency_website = 'https://www.countyofmerced.com/eh',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(209) 385-7426',
    fire_ahj_website = 'co.merced.ca.us/fire'
WHERE state = 'CA' AND county = 'Merced' AND city IS NULL;

-- Modoc
UPDATE jurisdictions SET
    agency_address = '202 West 4th Street, Alturas, CA 96101',
    agency_phone = '(530) 233-6310',
    agency_website = 'https://environmentalhealth.co.modoc.ca.us/nav/food_sanitation_program.php',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 233-4416',
    fire_ahj_website = 'co.modoc.ca.us'
WHERE state = 'CA' AND county = 'Modoc' AND city IS NULL;

-- Mono
UPDATE jurisdictions SET
    agency_phone = '(760) 924-1846',
    agency_website = 'https://monocounty.ca.gov/environmental-health/page/food',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(760) 932-5380',
    fire_ahj_website = 'monocounty.ca.gov'
WHERE state = 'CA' AND county = 'Mono' AND city IS NULL;

-- Monterey
UPDATE jurisdictions SET
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(831) 755-5113',
    fire_ahj_website = 'co.monterey.ca.us/fire'
WHERE state = 'CA' AND county = 'Monterey' AND city IS NULL;

-- Napa
UPDATE jurisdictions SET
    agency_address = '1195 Third Street, Napa, CA 94559',
    agency_phone = '707-253-4540',
    agency_website = 'https://www.countyofnapa.org/1906/Retail-Food-Program',
    contact_data_source = 'firecrawl_pending_review',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(707) 253-4320',
    fire_ahj_website = 'countyofnapa.org/fire'
WHERE state = 'CA' AND county = 'Napa' AND city IS NULL;

-- Nevada
UPDATE jurisdictions SET
    agency_phone = '(530) 265-1222, Option 3',
    agency_website = 'https://www.nevadacountyca.gov/1470/Environmental-Health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 265-1581',
    fire_ahj_website = 'nevadacountyca.gov/fire'
WHERE state = 'CA' AND county = 'Nevada' AND city IS NULL;

-- Orange
UPDATE jurisdictions SET
    agency_address = '1241 E. Dyer Road, Suite 120, Santa Ana, CA 92705',
    agency_email = 'ehealth@ochca.com',
    agency_phone = '(714) 433-6000',
    agency_website = 'https://www.ocfoodinfo.com/',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(714) 573-6100',
    fire_ahj_website = 'ocfa.org'
WHERE state = 'CA' AND county = 'Orange' AND city IS NULL;

-- Placer
UPDATE jurisdictions SET
    agency_website = 'https://www.placer.ca.gov/5964/Placard-Program---Food-Safety',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 889-6600',
    fire_ahj_website = 'placer.ca.gov/fire'
WHERE state = 'CA' AND county = 'Placer' AND city IS NULL;

-- Plumas
UPDATE jurisdictions SET
    agency_address = '270 County Hospital Road, Suite 127, Quincy, CA 95971',
    agency_fax = '(530) 283-6241',
    agency_phone = '(530) 283-6355',
    agency_website = 'https://www.plumascounty.us/275/Food-Safety',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 283-0800',
    fire_ahj_website = 'plumas.ca.gov'
WHERE state = 'CA' AND county = 'Plumas' AND city IS NULL;

-- Riverside
UPDATE jurisdictions SET
    agency_address = 'Riverside County Department of Environmental Health (multi-office; Main Office: 4065 County Circle Dr, Suite 104, Riverside, CA 92503)',
    agency_phone = '(888) 722-4234',
    agency_website = 'https://www.rivcoeh.org/',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(951) 940-6900',
    fire_ahj_website = 'rvcfire.org'
WHERE state = 'CA' AND county = 'Riverside' AND city IS NULL;

-- Sacramento
UPDATE jurisdictions SET
    agency_website = 'http://emd.saccounty.gov',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(916) 859-4300',
    fire_ahj_website = 'sacmetrofire.ca.gov'
WHERE state = 'CA' AND county = 'Sacramento' AND city IS NULL;

-- San Benito
UPDATE jurisdictions SET
    agency_address = '351 Tres Pinos Rd C-1, Hollister, CA 95023',
    agency_email = 'Environmentalhealth@sanbenitocountyca.gov',
    agency_fax = '(831) 636-4037',
    agency_phone = '(831) 636-4035',
    agency_website = 'https://hhsa.sanbenitocountyca.gov/environmental-health-2-2/',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(831) 637-5523',
    fire_ahj_website = 'sanbenitocountyca.gov',
    poc_name = 'Darryl Wong, REHS',
    poc_title = 'Environmental Health Manager'
WHERE state = 'CA' AND county = 'San Benito' AND city IS NULL;

-- San Bernardino
UPDATE jurisdictions SET
    agency_address = '385 N. Arrowhead Ave., 2nd Floor, San Bernardino, CA 92415',
    agency_email = 'EHS.CustomerService@dph.sbcounty.gov',
    agency_fax = '909-387-4323',
    agency_phone = '1-800-442-2283',
    agency_website = 'https://ehs.sbcounty.gov/programs/food-facilities/',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(909) 386-8400',
    fire_ahj_website = 'sbcfire.org'
WHERE state = 'CA' AND county = 'San Bernardino' AND city IS NULL;

-- San Diego
UPDATE jurisdictions SET
    agency_address = '5500 Overland Ave #110, San Diego, CA 92123',
    agency_email = 'fhdutyeh@sdcounty.ca.gov',
    agency_fax = '(858) 505-6848',
    agency_phone = '(858) 505-6900',
    agency_website = 'https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/food.html',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(858) 565-5252',
    fire_ahj_website = 'sdfireauthority.org'
WHERE state = 'CA' AND county = 'San Diego' AND city IS NULL;

-- San Francisco (San Francisco)
UPDATE jurisdictions SET
    agency_address = 'Permit Center: 49 South Van Ness, 2nd floor, San Francisco, CA 94103',
    agency_phone = 'SF 311 (consolidated city/county intake)',
    agency_website = 'https://www.sfdph.org/dph/EH/Food/Placarding.asp',
    contact_data_source = 'firecrawl_pending_review',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(415) 558-3300',
    fire_ahj_website = 'sf.gov/departments/fire-department'
WHERE state = 'CA' AND county = 'San Francisco' AND city = 'San Francisco';

-- San Joaquin
UPDATE jurisdictions SET
    agency_phone = '(209) 468-3420',
    agency_website = 'https://sjcehd.com/',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(209) 953-6200',
    fire_ahj_website = 'sjcoes.com',
    poc_name = 'Jeff Carruesco',
    poc_title = 'Food Program Coordinator'
WHERE state = 'CA' AND county = 'San Joaquin' AND city IS NULL;

-- San Luis Obispo
UPDATE jurisdictions SET
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(805) 781-5957',
    fire_ahj_website = 'slocounty.ca.gov/fire'
WHERE state = 'CA' AND county = 'San Luis Obispo' AND city IS NULL;

-- San Mateo
UPDATE jurisdictions SET
    agency_address = '2000 Alameda de las Pulgas, Suite 100, San Mateo, CA 94403',
    agency_phone = '(650) 372-6200',
    agency_website = 'https://www.smchealth.org/food-safety',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(650) 363-4985',
    fire_ahj_website = 'smcgov.org/fire'
WHERE state = 'CA' AND county = 'San Mateo' AND city IS NULL;

-- Santa Barbara
UPDATE jurisdictions SET
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'unverified'
WHERE state = 'CA' AND county = 'Santa Barbara' AND city IS NULL;

-- Santa Clara
UPDATE jurisdictions SET
    agency_address = '1555 Berger Drive, Suite 300, San Jose, CA 95112',
    agency_phone = '(408) 918-3400',
    agency_website = 'https://deh.santaclaracounty.gov',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(408) 378-4010',
    fire_ahj_website = 'sccfd.org'
WHERE state = 'CA' AND county = 'Santa Clara' AND city IS NULL;

-- Santa Cruz
UPDATE jurisdictions SET
    agency_email = 'Env.Hlth@co.santa-cruz.ca.us',
    agency_phone = '(831) 454-2022',
    agency_website = 'https://scceh.com/NewHome/Programs/ConsumerProtection/Food/AboutRestaurantInspections.aspx',
    contact_data_source = 'firecrawl_pending_review',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(831) 454-2400',
    fire_ahj_website = 'co.santa-cruz.ca.us/fire'
WHERE state = 'CA' AND county = 'Santa Cruz' AND city IS NULL;

-- Shasta
UPDATE jurisdictions SET
    agency_address = '1855 Placer Street, Redding, CA 96001',
    agency_fax = '(530) 225-5413',
    agency_phone = '(530) 225-5787',
    agency_website = 'https://www.shastacounty.gov/environmental-health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 225-2417',
    fire_ahj_website = 'fire.shastacounty.gov'
WHERE state = 'CA' AND county = 'Shasta' AND city IS NULL;

-- Sierra
UPDATE jurisdictions SET
    agency_address = '202 Front Street, P.O. Box 7, Loyalton, CA 96118',
    agency_phone = '(530) 993-6716',
    agency_website = 'https://www.sierracounty.ca.gov/232/Food-Safety',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 289-3201',
    fire_ahj_website = 'sierracounty.ca.gov',
    poc_name = 'Elizabeth Morgan, MPH, REHS',
    poc_title = 'Environmental Health Specialist III (senior)'
WHERE state = 'CA' AND county = 'Sierra' AND city IS NULL;

-- Siskiyou
UPDATE jurisdictions SET
    agency_address = '806 South Main Street, Yreka, CA 96097',
    agency_phone = '(530) 841-2100',
    agency_website = 'https://www.siskiyoucounty.gov/environmentalhealth/page/food',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 842-8862',
    fire_ahj_website = 'co.siskiyou.ca.us/fire'
WHERE state = 'CA' AND county = 'Siskiyou' AND city IS NULL;

-- Solano
UPDATE jurisdictions SET
    agency_address = '675 Texas St, Suite 5500, Fairfield, CA 94533',
    agency_email = 'RMHelp@SolanoCounty.gov',
    agency_phone = '(707) 784-6765',
    agency_website = 'https://www.solanocounty.gov/government/resource-management/environmental-health',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(707) 428-7622',
    fire_ahj_website = 'fairfield.ca.gov/fire'
WHERE state = 'CA' AND county = 'Solano' AND city IS NULL;

-- Sonoma
UPDATE jurisdictions SET
    agency_address = '463 Aviation Blvd, Santa Rosa, CA 95403',
    agency_fax = '(707) 565-6525',
    agency_phone = '(707) 565-6565',
    agency_website = 'https://sonomacounty.gov/health-and-human-services/health-services/divisions/public-health/environmental-health/programs-and-services/food-safety-program/food-facility-inspections',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(707) 565-1152',
    fire_ahj_website = 'sonomacounty.ca.gov/fire'
WHERE state = 'CA' AND county = 'Sonoma' AND city IS NULL;

-- Stanislaus
UPDATE jurisdictions SET
    agency_address = '3800 Cornucopia Way, Suite C, Modesto, CA 95358',
    agency_phone = '(209) 525-6700',
    agency_website = 'https://www.stancounty.com/er/environmentalhealth/food-program.shtm',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(209) 552-3700',
    fire_ahj_website = 'stanislausfire.org'
WHERE state = 'CA' AND county = 'Stanislaus' AND city IS NULL;

-- Sutter
UPDATE jurisdictions SET
    agency_website = 'https://www.sutter.gov/government/county-departments/development-services/environmental-health/food',
    contact_data_source = 'firecrawl_pending_review',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 822-7171',
    fire_ahj_website = 'suttercounty.org/fire',
    poc_name = 'Jeff Williams',
    poc_title = 'Environmental Health Manager'
WHERE state = 'CA' AND county = 'Sutter' AND city IS NULL;

-- Tehama
UPDATE jurisdictions SET
    agency_address = '633 Washington Street, Room 36, Red Bluff, CA 96080',
    agency_website = 'https://www.tehama.gov/government/departments/environmental-health/',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 529-7921',
    fire_ahj_website = 'tehamacountyfire.org'
WHERE state = 'CA' AND county = 'Tehama' AND city IS NULL;

-- Trinity
UPDATE jurisdictions SET
    agency_address = '61 Airport Road / P.O. Box 476, Weaverville, CA 96093',
    agency_email = 'environmentalhealth@trinitycounty.org',
    agency_fax = '(530) 623-1353',
    agency_phone = '(530) 623-1459',
    agency_website = 'https://www.trinitycounty.org/486/Food-Facilities',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 623-4531',
    fire_ahj_website = 'trinitycounty.org'
WHERE state = 'CA' AND county = 'Trinity' AND city IS NULL;

-- Tulare
UPDATE jurisdictions SET
    agency_email = 'tularecountyeh@tularecounty.ca.gov',
    agency_fax = '(559) 749-9794',
    agency_phone = '(559) 624-7400',
    agency_website = 'https://tularecountyeh.org/',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(559) 624-7050',
    fire_ahj_website = 'tularecounty.ca.gov/fire'
WHERE state = 'CA' AND county = 'Tulare' AND city IS NULL;

-- Tuolumne
UPDATE jurisdictions SET
    agency_address = 'A. N. Francisco Building, 4th Floor (with some pages listing Floors 3 and 4 — both EH-occupied), 48 W. Yaney Street, Sonora, CA 95370',
    agency_fax = '(209) 533-5909',
    agency_phone = '(209) 533-5633',
    agency_website = 'https://www.tuolumnecounty.ca.gov/247/Safe-Food',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(209) 533-5633',
    fire_ahj_website = 'tuolumnecounty.ca.gov/fire',
    poc_name = 'Debbie Larson',
    poc_title = 'Director of Environmental Health'
WHERE state = 'CA' AND county = 'Tuolumne' AND city IS NULL;

-- Ventura
UPDATE jurisdictions SET
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'unverified'
WHERE state = 'CA' AND county = 'Ventura' AND city IS NULL;

-- Yolo
UPDATE jurisdictions SET
    agency_address = 'Yolo County Department of Community Services, Environmental Health Division, Consumer Protection Unit',
    agency_email = 'EHealth@YoloCounty.gov',
    agency_phone = '(530) 666-8646',
    agency_website = 'https://www.yolocounty.gov/government/general-government-departments/community-services/environmental-health-division/consumer-protection-programs',
    contact_data_source = 'jsonb_existing',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 666-8060',
    fire_ahj_website = 'yolocounty.org/oes'
WHERE state = 'CA' AND county = 'Yolo' AND city IS NULL;

-- Yuba
UPDATE jurisdictions SET
    agency_address = 'Yuba County Government Center, 915 8th Street, Marysville, CA 95901 (verify exact suite)',
    agency_website = 'https://www.yuba.gov/departments/community_development/environmental_health/retail_food/index.php',
    contact_data_source = 'unverified',
    fire_ahj_data_source = 'jsonb_existing',
    fire_ahj_phone = '(530) 749-5450',
    fire_ahj_website = 'co.yuba.ca.us/fire'
WHERE state = 'CA' AND county = 'Yuba' AND city IS NULL;
