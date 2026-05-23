import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./tmp_backfill_plan.json','utf8'));

console.log('=== MISSING agency_address ===');
data.filter(r => !r.agency_address).forEach(r =>
  console.log(r.county, r.city, '| path:', r.agency_address_path || 'NONE')
);

console.log('\n=== MISSING agency_phone ===');
data.filter(r => !r.agency_phone).forEach(r =>
  console.log(r.county, r.city, '| bucket:', r.agency_phone_bucket, '| skips:', r.skip_reasons.filter(s=>s.includes('phone')).join('; '))
);

console.log('\n=== MISSING agency_website ===');
data.filter(r => !r.agency_website).forEach(r =>
  console.log(r.county, r.city)
);

console.log('\n=== POC PROMOTED ===');
data.filter(r => r.poc_name).forEach(r =>
  console.log(r.county, r.city, '|', r.poc_name, '|', r.poc_title, '|', r.poc_name_path)
);
