import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  'https://irxgmhxhmxtzfwuieblc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
);

const counties = ['Merced','Stanislaus','San Joaquin','Madera','Alameda','Mariposa','Santa Cruz','Santa Clara','Tulare','Fresno','El Dorado'];

async function main() {
  for (const county of counties) {
    const { data: j } = await admin
      .from('jurisdictions')
      .select('county, grading_type, grading_config, agency_name, jie_audit_status')
      .eq('county', county).eq('state', 'CA').eq('is_active', true).limit(1).single();
    if (!j) { console.log(county + ': NOT FOUND'); continue; }
    const gc = j.grading_config || {};
    const hasTiers = gc.tiers && typeof gc.tiers === 'object' && !Array.isArray(gc.tiers) && Object.keys(gc.tiers).length > 0;
    const hasPV = gc.point_values && typeof gc.point_values === 'object' && Object.keys(gc.point_values).length > 0;
    console.log('---');
    console.log('COUNTY:', j.county);
    console.log('grading_type:', j.grading_type);
    console.log('agency_name:', j.agency_name);
    console.log('jie_audit_status:', j.jie_audit_status);
    if (hasTiers) {
      console.log('TIERS:');
      for (const [name, range] of Object.entries(gc.tiers)) {
        if (Array.isArray(range)) {
          console.log('  ' + name + ': ' + (range[1] != null ? range[0] + '-' + range[1] : range[0] + '+'));
        } else {
          console.log('  ' + name + ': ' + String(range));
        }
      }
    } else {
      console.log('TIERS: (none)');
    }
    if (hasPV) {
      console.log('POINT_VALUES:');
      for (const [cat, pts] of Object.entries(gc.point_values)) {
        console.log('  ' + cat + ': ' + pts);
      }
    } else {
      console.log('POINT_VALUES: (none)');
    }
    console.log('direction:', gc.direction || '(not set)');
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
