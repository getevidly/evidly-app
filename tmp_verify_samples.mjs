import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./tmp_backfill_plan.json','utf8'));

const samples = ['Merced','Alpine','Amador','Butte','Sutter'];
for (const county of samples) {
  const r = data.find(d => d.county === county && d.city === '—');
  if (!r) continue;
  console.log(`\n=== ${r.county} (${r.id}) ===`);
  console.log(`  agency_phone:    ${r.agency_phone || 'NULL'} [${r.agency_phone_path || '—'}] bucket=${r.agency_phone_bucket}`);
  console.log(`  agency_fax:      ${r.agency_fax || 'NULL'} [${r.agency_fax_path || '—'}]`);
  console.log(`  agency_email:    ${r.agency_email || 'NULL'} [${r.agency_email_path || '—'}]`);
  console.log(`  agency_address:  ${r.agency_address || 'NULL'} [${r.agency_address_path || '—'}]`);
  console.log(`  agency_website:  ${r.agency_website || 'NULL'} [${r.agency_website_path || '—'}]`);
  console.log(`  poc_name:        ${r.poc_name || 'NULL'} [${r.poc_name_path || '—'}]`);
  console.log(`  poc_title:       ${r.poc_title || 'NULL'}`);
  console.log(`  contact_data_source: ${r.contact_data_source}`);
  console.log(`  fire_ahj_phone:  ${r.fire_ahj_phone || 'NULL'} [${r.fire_ahj_phone_path || '—'}]`);
  console.log(`  fire_ahj_website:${r.fire_ahj_website || 'NULL'} [${r.fire_ahj_website_path || '—'}]`);
  console.log(`  fire_ahj_data_source: ${r.fire_ahj_data_source}`);
  if (r.skip_reasons.length > 0) {
    console.log(`  SKIP REASONS: ${r.skip_reasons.join(' | ')}`);
  }
}
