import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  'https://irxgmhxhmxtzfwuieblc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
);

const counties = ['Merced','Stanislaus','San Joaquin','Madera','Alameda','Mariposa',
  'Santa Cruz','Santa Clara','Tulare','Fresno','El Dorado'];

async function main() {
  for (const county of counties) {
    const { data: j } = await admin
      .from('jurisdictions')
      .select('county, grading_type, grading_config, agency_name, jie_audit_status, fire_ahj_name, fire_jurisdiction_config, hood_cleaning_local_override')
      .eq('county', county).eq('state', 'CA').eq('is_active', true).limit(1).single();
    if (!j) { console.log(county + ': NOT FOUND'); continue; }
    const gc = j.grading_config || {};
    const fc = j.fire_jurisdiction_config || {};
    const hasTiers = gc.tiers && typeof gc.tiers === 'object' && !Array.isArray(gc.tiers) && Object.keys(gc.tiers).length > 0;
    const hasPV = gc.point_values && typeof gc.point_values === 'object' && Object.keys(gc.point_values).length > 0;

    console.log('--- ' + j.county + ' ---');
    console.log('  grading_type: ' + j.grading_type);
    if (hasTiers) {
      const tierStr = Object.entries(gc.tiers).map(([n, r]) => {
        if (Array.isArray(r)) return n + ' ' + (r[1] != null ? r[0] + '-' + r[1] : r[0] + '+');
        return n + ' ' + String(r);
      }).join(', ');
      console.log('  food_renders: tier grid — ' + tierStr);
    } else if (j.grading_type === 'calcode_default') {
      console.log('  food_renders: calcode_default baseline line');
    } else if (j.grading_type === 'none' || !hasTiers) {
      console.log('  food_renders: italic placeholder ("...once verified")');
    }
    if (hasPV) {
      const pvStr = Object.entries(gc.point_values).map(([k, v]) => k + '=' + v).join(', ');
      console.log('  point_weights: ' + pvStr);
    } else {
      console.log('  point_weights: (none)');
    }
    console.log('  agency_name: ' + (j.agency_name || '(EMPTY)'));
    console.log('  jie_audit_status: ' + (j.jie_audit_status || '(EMPTY)'));
    console.log('  fire_ahj_name: ' + (j.fire_ahj_name || '(EMPTY)'));
    console.log('  fire_code_edition: ' + (fc.cfc_edition || '(not set)'));
    console.log('  hood_cleaning_local_override: ' + (j.hood_cleaning_local_override != null ? JSON.stringify(j.hood_cleaning_local_override) : 'null'));
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
