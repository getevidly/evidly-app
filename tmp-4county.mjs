import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  'https://irxgmhxhmxtzfwuieblc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
);

const counties = ['Alameda','San Joaquin','Santa Clara','Tulare'];

async function main() {
  for (const county of counties) {
    const { data: j, error } = await admin
      .from('jurisdictions')
      .select('county, grading_type, grading_config, agency_name, jie_audit_status, fire_ahj_name, fire_jurisdiction_config, hood_cleaning_default, hood_cleaning_local_override')
      .eq('county', county).eq('state', 'CA').eq('is_active', true).limit(1).single();
    if (error) { console.log(county + ': ERROR ' + error.message); continue; }
    if (!j) { console.log(county + ': NOT FOUND'); continue; }
    const gc = j.grading_config || {};
    const fc = j.fire_jurisdiction_config || {};
    console.log('========================================');
    console.log('COUNTY:', j.county);
    console.log('  grading_type:', j.grading_type);
    console.log('  grading_config:', JSON.stringify(gc));
    console.log('  agency_name:', j.agency_name || '(EMPTY)');
    console.log('  jie_audit_status:', j.jie_audit_status || '(EMPTY)');
    console.log('  fire_ahj_name:', j.fire_ahj_name || '(EMPTY)');
    console.log('  fire_jurisdiction_config:', JSON.stringify(fc));
    console.log('  hood_cleaning_default:', j.hood_cleaning_default || '(EMPTY)');
    console.log('  hood_cleaning_local_override:', j.hood_cleaning_local_override ? JSON.stringify(j.hood_cleaning_local_override) : 'null');
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
