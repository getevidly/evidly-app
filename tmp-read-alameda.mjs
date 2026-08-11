import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  'https://irxgmhxhmxtzfwuieblc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
);

async function main() {
  // 1. Alameda jurisdiction row (county-level, city IS NULL)
  const { data: jur, error: e1 } = await admin
    .from('jurisdictions')
    .select('id, county, city, agency_name, fire_ahj_name, grading_type, grading_config, jie_audit_status')
    .eq('county', 'Alameda')
    .eq('state', 'CA')
    .is('city', null);

  if (e1) {
    console.error('Jurisdiction error:', JSON.stringify(e1));
    return;
  }
  console.log('=== ALAMEDA COUNTY JURISDICTION ROW ===');
  for (const r of jur) {
    console.log(JSON.stringify(r, null, 2));
  }

  // 2. Recent jurisdiction_edits for Alameda
  const { data: edits, error: e2 } = await admin
    .from('jurisdiction_edits')
    .select('field_name, old_value, new_value, edited_by, edited_at, batch_id')
    .eq('county', 'Alameda')
    .order('edited_at', { ascending: false })
    .limit(20);

  if (e2) {
    console.error('Edits error:', JSON.stringify(e2));
    return;
  }
  console.log('\n=== ALAMEDA JURISDICTION_EDITS (most recent first) ===');
  if (edits.length === 0) {
    console.log('(no edit history rows found)');
  } else {
    for (const e of edits) {
      console.log(JSON.stringify(e, null, 2));
    }
  }
}

main().catch(err => console.error('FATAL:', err));
