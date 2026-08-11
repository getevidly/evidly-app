import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  'https://irxgmhxhmxtzfwuieblc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
);

const counties = ['Merced','Stanislaus','San Joaquin','Madera','Alameda','Mariposa',
  'Santa Cruz','Santa Clara','Tulare','Fresno','El Dorado','San Francisco'];

async function main() {
  for (const county of counties) {
    const { data: j } = await admin
      .from('jurisdictions')
      .select('county, fire_jurisdiction_config, hood_cleaning_default')
      .eq('county', county).eq('state', 'CA').eq('is_active', true).limit(1).single();
    if (!j) continue;
    const fc = j.fire_jurisdiction_config || {};
    console.log('---', j.county, '---');
    console.log('  hood_cleaning_default (column):', j.hood_cleaning_default || '(EMPTY)');
    console.log('  cfc_edition:', fc.cfc_edition || '(not set)');
    console.log('  nfpa96_edition:', fc.nfpa96_edition || '(not set)');
    console.log('  nfpa_96_table_12_4:', fc.nfpa_96_table_12_4 != null ? JSON.stringify(fc.nfpa_96_table_12_4) : '(not set)');
    console.log('  hood_cleaning_enforcement:', fc.hood_cleaning_enforcement || '(not set)');
    console.log('  local_amendments:', fc.local_amendments != null ? JSON.stringify(fc.local_amendments) : '(not set)');
    console.log('  amendment_notes:', fc.amendment_notes || '(not set)');
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
