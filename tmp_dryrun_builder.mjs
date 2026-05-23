/**
 * Dry-run backfill builder — reads tmp_backfill_source.json,
 * applies all refined plan rules, outputs dry-run mapping.
 */
import { readFileSync, writeFileSync } from 'fs';

const raw = JSON.parse(readFileSync('./tmp_backfill_source.json', 'utf8'));
const rows = raw.rows;

// ═══════════════════════════════════════════════════
// PHONE KEY CLASSIFICATION
// ═══════════════════════════════════════════════════
const HIGH_PHONE_KEYS = new Set([
  'phone','main_phone','phone_main','main_line','main',
  'direct_eh_line','main_county_phone','inspections_line',
  'main_phone_per_arthur_research_note','eh_director_phone'
]);

const LOW_PHONE_KEYS = new Set([
  'general_phone_board_of_supervisors','public_reporting_phone',
  'complaint_phone','phone_public_information'
]);

const SKIP_PHONE_KEYS = new Set([
  'phone_verification_status','phone_followup_needed',
  'phone_toll_free_in_county','after_hours_phone',
  'after_hours_reporting_hotline','after_hours_emergency',
  'after_hours','phone_24h_hotline','hazmat_after_hours',
  'hazmat_business_hours'
]);

// ═══════════════════════════════════════════════════
// POC ALLOWED KEYS → title mapping
// ═══════════════════════════════════════════════════
const POC_TITLE_MAP = {
  'eh_director': 'Environmental Health Director',
  'environmental_health_director': 'Environmental Health Director',
  'eh_manager': 'Environmental Health Manager',
  'environmental_health_manager': 'Environmental Health Manager',
  'food_program_coordinator': 'Food Program Coordinator',
  'consumer_protection_manager': 'Consumer Protection Manager',
  'named_eh_specialist': 'Environmental Health Specialist',
  'named_eh_staff': 'Environmental Health Specialist',
};

// These POC keys are SKIPPED (wrong role)
const SKIP_POC_KEYS = new Set([
  'cdd_director','pcdsa_director','health_services_director',
  'public_health_director','department_director_2024_2025',
  'director_per_research_note','director','ehs_deputy_director',
  'board_chair','county_administrator','assistant_director_at_launch'
]);

// ═══════════════════════════════════════════════════
// EMAIL KEY PRIORITY
// ═══════════════════════════════════════════════════
const EMAIL_KEYS = ['email','email_per_arthur_research_note'];

// ═══════════════════════════════════════════════════
// WEBSITE KEY PRIORITY
// ═══════════════════════════════════════════════════
const WEBSITE_KEYS = ['website','url','web_presence','website_primary',
  'website_canonical','website_program','contact_form',
  'food_sanitation_reporting_url'];

// ═══════════════════════════════════════════════════
// ADDRESS KEY PRIORITY (agency_contact nested — fallback only)
// ═══════════════════════════════════════════════════
const ADDRESS_KEYS = ['address','ehd_headquarters_address',
  'physical_address','mailing_address','main_county_center_address',
  'administrative_office_address','main_county_address'];

// ═══════════════════════════════════════════════════
// STATUS NOTE KEYS — always skip
// ═══════════════════════════════════════════════════
const STATUS_NOTE_KEYS = new Set([
  'phone_verification_status','phone_followup_needed',
  'eh_specific_contact_status','dehs_specific_address_status',
  'eh_specific_address_status','verification_status_note',
  'address_source','primary_source_verification_method',
  'director_verification_status','director_capture_rule',
  'staff_roster_capture_rule'
]);

// ═══════════════════════════════════════════════════
// STALE POC CHECK
// ═══════════════════════════════════════════════════
function isStale(key, value) {
  // Check key suffix for year
  const yearMatch = key.match(/(\d{4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year < 2024) return true; // older than ~24 months from May 2026
  }
  // Check value for year patterns like "(named on February 2016..."
  if (typeof value === 'string') {
    const valYearMatch = value.match(/\b(201[0-9]|202[0-3])\b/);
    if (valYearMatch) {
      const yr = parseInt(valYearMatch[1]);
      if (yr < 2024) return true;
    }
  }
  return false;
}

// Near-stale: 2024 dates (within 24-month window but approaching)
function isNearStale(key, value) {
  if (typeof value === 'string') {
    const valYearMatch = value.match(/\b2024\b/);
    if (valYearMatch) return true;
  }
  const keyMatch = key.match(/2024/);
  return !!keyMatch;
}

// ═══════════════════════════════════════════════════
// PROCESS EACH ROW
// ═══════════════════════════════════════════════════
const results = [];

for (const row of rows) {
  const ac = row.agency_contact || {};
  const ds = row.dept_structure || {};
  const pp = row.public_portals || {};
  const r = {
    id: row.id,
    county: row.county,
    city: row.city || '—',
    // Columns to fill
    agency_phone: null, agency_phone_path: null, agency_phone_bucket: 'NULL',
    agency_fax: null, agency_fax_path: null,
    agency_email: null, agency_email_path: null,
    agency_address: null, agency_address_path: null,
    agency_website: null, agency_website_path: null,
    poc_name: null, poc_name_path: null,
    poc_title: null,
    fire_ahj_phone: null, fire_ahj_phone_path: null,
    fire_ahj_website: null, fire_ahj_website_path: null,
    contact_data_source: 'unverified',
    fire_ahj_data_source: 'unverified',
    skip_reasons: [],
  };

  // ── PHONE ──
  for (const k of HIGH_PHONE_KEYS) {
    if (ac[k] && typeof ac[k] === 'string' && !STATUS_NOTE_KEYS.has(k)) {
      r.agency_phone = ac[k];
      r.agency_phone_path = `grading_config.agency_contact.${k}`;
      r.agency_phone_bucket = 'HIGH';
      break;
    }
  }
  if (!r.agency_phone) {
    for (const k of LOW_PHONE_KEYS) {
      if (ac[k] && typeof ac[k] === 'string') {
        r.agency_phone = ac[k];
        r.agency_phone_path = `grading_config.agency_contact.${k}`;
        r.agency_phone_bucket = 'LOW';
        break;
      }
    }
  }
  // Check for skipped phone keys to document
  if (!r.agency_phone) {
    for (const k of Object.keys(ac)) {
      if (SKIP_PHONE_KEYS.has(k)) {
        r.skip_reasons.push(`phone SKIP: ${k}`);
      }
      if (STATUS_NOTE_KEYS.has(k)) {
        r.skip_reasons.push(`phone STATUS_NOTE: ${k}`);
      }
    }
  }

  // ── FAX ──
  const faxKeys = ['fax','fax_per_arthur_research_note'];
  for (const k of faxKeys) {
    if (ac[k] && typeof ac[k] === 'string') {
      r.agency_fax = ac[k];
      r.agency_fax_path = `grading_config.agency_contact.${k}`;
      break;
    }
  }

  // ── EMAIL ──
  for (const k of EMAIL_KEYS) {
    if (ac[k] && typeof ac[k] === 'string') {
      r.agency_email = ac[k];
      r.agency_email_path = `grading_config.agency_contact.${k}`;
      break;
    }
  }
  // Fallback: department_structure.eh_director_email
  if (!r.agency_email && ds.eh_director_email) {
    r.agency_email = ds.eh_director_email;
    r.agency_email_path = 'grading_config.department_structure.eh_director_email';
  }
  // Fallback: nested consumer_protection_manager.email (Butte)
  if (!r.agency_email && ac.consumer_protection_manager && typeof ac.consumer_protection_manager === 'object' && ac.consumer_protection_manager.email) {
    r.agency_email = ac.consumer_protection_manager.email;
    r.agency_email_path = 'grading_config.agency_contact.consumer_protection_manager.email';
  }

  // ── ADDRESS ──
  // Primary: grading_config.agency_address (top-level JSONB key)
  if (row.gc_agency_address) {
    if (typeof row.gc_agency_address === 'string') {
      r.agency_address = row.gc_agency_address;
      r.agency_address_path = 'grading_config.agency_address';
    } else if (typeof row.gc_agency_address === 'object') {
      // Some jurisdictions store address as {street, city, state, zip} or {office, mailing}
      const ao = row.gc_agency_address;
      if (ao.office) {
        r.agency_address = ao.office;
        r.agency_address_path = 'grading_config.agency_address.office';
      } else if (ao.street) {
        const parts = [ao.street, ao.city, ao.state, ao.zip].filter(Boolean);
        r.agency_address = parts.join(', ');
        r.agency_address_path = 'grading_config.agency_address.{street,city,state,zip}';
      }
    }
  }
  // Fallback: agency_contact nested address keys
  if (!r.agency_address) {
    for (const k of ADDRESS_KEYS) {
      if (ac[k] && typeof ac[k] === 'string' && !STATUS_NOTE_KEYS.has(k)) {
        r.agency_address = ac[k];
        r.agency_address_path = `grading_config.agency_contact.${k}`;
        break;
      }
    }
  }

  // ── WEBSITE ──
  for (const k of WEBSITE_KEYS) {
    if (ac[k] && typeof ac[k] === 'string' && !STATUS_NOTE_KEYS.has(k)) {
      // Skip contact_form if it's not a real website
      if (k === 'contact_form' || k === 'food_sanitation_reporting_url') {
        // Only use as last resort; skip for now
        continue;
      }
      r.agency_website = ac[k];
      r.agency_website_path = `grading_config.agency_contact.${k}`;
      break;
    }
  }
  // Fallback: public_portals keys that look like main EH website
  if (!r.agency_website && typeof pp === 'object' && pp !== null && !Array.isArray(pp)) {
    const portalKeys = ['environmental_health_hub','environmental_health_landing',
      'environmental_health_division','environmental_health_division_landing',
      'food_program_hub','food_program_landing','food_safety_hub',
      'ehs_program_landing',
      'retail_food_facility_safety_landing','food_safety_program_landing',
      'consumer_food_program_landing','main_county_ehs_landing',
      'kcdph_environmental_health_services_division',
      'environmental_health_department',
      'environmental_health_home','environmental_health_canonical',
      'food_safety_landing'];
    for (const k of portalKeys) {
      if (pp[k] && typeof pp[k] === 'string' && !pp[k].includes('followup')) {
        r.agency_website = pp[k];
        r.agency_website_path = `grading_config.public_portals.${k}`;
        break;
      }
    }
  }
  // Last resort: contact_form / food_sanitation_reporting_url
  if (!r.agency_website) {
    for (const k of ['contact_form','food_sanitation_reporting_url']) {
      if (ac[k] && typeof ac[k] === 'string') {
        r.agency_website = ac[k];
        r.agency_website_path = `grading_config.agency_contact.${k}`;
        break;
      }
    }
  }

  // ── POC NAME + TITLE ──
  // Check direct allowed keys first
  let pocFound = false;
  for (const [key, title] of Object.entries(POC_TITLE_MAP)) {
    if (key === 'consumer_protection_manager' || key === 'food_program_coordinator') continue; // handle nested below
    if (ac[key]) {
      const val = ac[key];
      if (typeof val === 'string') {
        // Check staleness
        if (isStale(key, val)) {
          r.skip_reasons.push(`POC STALE: ${key} = ${val}`);
          continue;
        }
        // Parse name from "(title)" suffix if present
        let name = val;
        const parenMatch = val.match(/^([^(]+)\s*\(/);
        if (parenMatch) name = parenMatch[1].trim();
        r.poc_name = name;
        r.poc_name_path = `grading_config.agency_contact.${key}`;
        r.poc_title = title;
        // Check near-stale for Sutter etc.
        if (isNearStale(key, val)) {
          r.skip_reasons.push(`POC NEAR-STALE: ${key} = ${val} (promote but flag)`);
        }
        pocFound = true;
        break;
      }
    }
  }

  // Nested: leadership.environmental_health_director (Butte)
  if (!pocFound && ac.leadership && typeof ac.leadership === 'object' && ac.leadership.environmental_health_director) {
    const val = ac.leadership.environmental_health_director;
    if (typeof val === 'string') {
      r.poc_name = val;
      r.poc_name_path = 'grading_config.agency_contact.leadership.environmental_health_director';
      r.poc_title = 'Environmental Health Director';
      pocFound = true;
    }
  }

  // Nested: consumer_protection_manager.name (Butte — only if no leadership.eh_dir found)
  if (!pocFound && ac.consumer_protection_manager && typeof ac.consumer_protection_manager === 'object' && ac.consumer_protection_manager.name) {
    r.poc_name = ac.consumer_protection_manager.name;
    r.poc_name_path = 'grading_config.agency_contact.consumer_protection_manager.name';
    r.poc_title = 'Consumer Protection Manager';
    pocFound = true;
  }

  // Nested: food_program_coordinator.name (San Joaquin)
  if (!pocFound && ac.food_program_coordinator && typeof ac.food_program_coordinator === 'object' && ac.food_program_coordinator.name) {
    r.poc_name = ac.food_program_coordinator.name;
    r.poc_name_path = 'grading_config.agency_contact.food_program_coordinator.name';
    r.poc_title = 'Food Program Coordinator';
    pocFound = true;
  }

  // Array: staff_roster[0] (Sierra, Tuolumne)
  if (!pocFound && ac.staff_roster && Array.isArray(ac.staff_roster) && ac.staff_roster.length > 0) {
    const first = ac.staff_roster[0];
    if (first && first.name) {
      r.poc_name = first.name;
      r.poc_name_path = 'grading_config.agency_contact.staff_roster[0].name';
      r.poc_title = first.title || 'Environmental Health Specialist';
      pocFound = true;
    }
  }

  // Check dept_structure for POC if not found in agency_contact
  if (!pocFound) {
    for (const [key, title] of Object.entries(POC_TITLE_MAP)) {
      if (ds[key] && typeof ds[key] === 'string') {
        if (isStale(key, ds[key])) {
          r.skip_reasons.push(`POC STALE (dept_structure): ${key} = ${ds[key]}`);
          continue;
        }
        r.poc_name = ds[key];
        r.poc_name_path = `grading_config.department_structure.${key}`;
        r.poc_title = title;
        pocFound = true;
        break;
      }
    }
  }

  // Log skipped POC keys
  if (!pocFound) {
    for (const k of Object.keys(ac)) {
      if (SKIP_POC_KEYS.has(k)) {
        r.skip_reasons.push(`POC SKIP (wrong role): ${k}`);
      }
    }
  }

  // ── Sutter near-stale override ──
  const isSutter = r.county === 'Sutter';

  // ── FIRE AHJ ──
  if (row.fire_phone && typeof row.fire_phone === 'string') {
    r.fire_ahj_phone = row.fire_phone;
    r.fire_ahj_phone_path = 'fire_jurisdiction_config.ahj_phone';
  }
  if (row.fire_website && typeof row.fire_website === 'string') {
    r.fire_ahj_website = row.fire_website;
    r.fire_ahj_website_path = 'fire_jurisdiction_config.ahj_website';
  }

  // ── DATA SOURCE ASSIGNMENT ──
  // EHD
  if (r.agency_phone_bucket === 'LOW' || isSutter) {
    r.contact_data_source = 'firecrawl_pending_review';
  } else if (r.agency_phone_bucket === 'HIGH') {
    r.contact_data_source = 'jsonb_existing';
  } else {
    r.contact_data_source = 'unverified';
  }

  // Fire
  if (r.fire_ahj_phone) {
    r.fire_ahj_data_source = 'jsonb_existing';
  } else {
    r.fire_ahj_data_source = 'unverified';
  }

  results.push(r);
}

// ═══════════════════════════════════════════════════
// COUNTS
// ═══════════════════════════════════════════════════
const counts = {
  agency_phone: { filled: 0, null: 0 },
  agency_fax: { filled: 0, null: 0 },
  agency_email: { filled: 0, null: 0 },
  agency_address: { filled: 0, null: 0 },
  agency_website: { filled: 0, null: 0 },
  poc_name: { filled: 0, null: 0 },
  poc_title: { filled: 0, null: 0 },
  fire_ahj_phone: { filled: 0, null: 0 },
  fire_ahj_website: { filled: 0, null: 0 },
};

const phoneBuckets = { HIGH: 0, LOW: 0, NULL: 0 };
const dataSourceCounts = { jsonb_existing: 0, firecrawl_pending_review: 0, unverified: 0 };
const fireDataSourceCounts = { jsonb_existing: 0, unverified: 0 };

for (const r of results) {
  for (const col of Object.keys(counts)) {
    if (r[col]) counts[col].filled++;
    else counts[col].null++;
  }
  phoneBuckets[r.agency_phone_bucket]++;
  dataSourceCounts[r.contact_data_source]++;
  fireDataSourceCounts[r.fire_ahj_data_source]++;
}

// ═══════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════
console.log('=== CELL-LEVEL BREAKDOWN ===');
for (const [col, c] of Object.entries(counts)) {
  console.log(`${col}: ${c.filled} filled, ${c.null} NULL`);
}
console.log('\n=== PHONE SOURCE BUCKETS ===');
for (const [b, c] of Object.entries(phoneBuckets)) console.log(`${b}: ${c}`);
console.log('\n=== contact_data_source DISTRIBUTION ===');
for (const [s, c] of Object.entries(dataSourceCounts)) console.log(`${s}: ${c}`);
console.log('\n=== fire_ahj_data_source DISTRIBUTION ===');
for (const [s, c] of Object.entries(fireDataSourceCounts)) console.log(`${s}: ${c}`);

console.log(`\nTotal rows: ${results.length}`);

// Write full dry-run to file
let md = '# Jurisdiction Backfill Dry Run — 2026-05-21\n\n';
md += '| # | County | City | Column | Current | New Value | Source JSONB Path | Bucket |\n';
md += '|---|---|---|---|---|---|---|---|\n';

let lineNum = 0;
for (const r of results) {
  const cols = [
    ['agency_phone', r.agency_phone, r.agency_phone_path, r.agency_phone_bucket],
    ['agency_fax', r.agency_fax, r.agency_fax_path, r.agency_fax ? 'DIRECT' : '—'],
    ['agency_email', r.agency_email, r.agency_email_path, r.agency_email ? 'DIRECT' : '—'],
    ['agency_address', r.agency_address, r.agency_address_path, r.agency_address ? 'DIRECT' : '—'],
    ['agency_website', r.agency_website, r.agency_website_path, r.agency_website ? 'DIRECT' : '—'],
    ['poc_name', r.poc_name, r.poc_name_path, r.poc_name ? (r.poc_name_path?.includes('staff_roster') ? 'ARRAY' : r.poc_name_path?.includes('leadership') || r.poc_name_path?.includes('consumer_protection') || r.poc_name_path?.includes('food_program_coord') ? 'NESTED' : 'DIRECT') : '—'],
    ['poc_title', r.poc_title, r.poc_name_path ? 'mapped from key' : null, r.poc_title ? 'MAPPED' : '—'],
    ['contact_data_source', r.contact_data_source, 'rule-based', r.contact_data_source],
    ['fire_ahj_phone', r.fire_ahj_phone, r.fire_ahj_phone_path, r.fire_ahj_phone ? 'DIRECT' : '—'],
    ['fire_ahj_website', r.fire_ahj_website, r.fire_ahj_website_path, r.fire_ahj_website ? 'DIRECT' : '—'],
    ['fire_ahj_data_source', r.fire_ahj_data_source, 'rule-based', r.fire_ahj_data_source],
  ];

  for (const [col, val, path, bucket] of cols) {
    lineNum++;
    md += `| ${lineNum} | ${r.county} | ${r.city} | ${col} | NULL | ${val || '—'} | ${path || '—'} | ${bucket} |\n`;
  }

  // Add skip reasons as notes
  if (r.skip_reasons.length > 0) {
    for (const reason of r.skip_reasons) {
      lineNum++;
      md += `| ${lineNum} | ${r.county} | ${r.city} | _SKIP NOTE_ | — | — | ${reason} | SKIP |\n`;
    }
  }
}

writeFileSync('./docs/jurisdiction_backfill_dryrun_20260521.md', md, 'utf8');

// Also write the results as JSON for Step 3B
writeFileSync('./tmp_backfill_plan.json', JSON.stringify(results, null, 2), 'utf8');

console.log('\nDry-run file written: docs/jurisdiction_backfill_dryrun_20260521.md');
console.log('Plan JSON written: tmp_backfill_plan.json');
