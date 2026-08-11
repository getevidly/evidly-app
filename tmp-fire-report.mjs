import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  'https://irxgmhxhmxtzfwuieblc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA'
);

const counties = ['Merced','Stanislaus','San Joaquin','Madera','Alameda','Mariposa',
  'Santa Cruz','Santa Clara','Tulare','Fresno','El Dorado','San Francisco'];

async function main() {
  for (const county of counties) {
    const { data: j, error } = await admin
      .from('jurisdictions')
      .select('county, grading_type, grading_config, agency_name, jie_audit_status, fire_ahj_name, fire_jurisdiction_config, hood_cleaning_default')
      .eq('county', county).eq('state', 'CA').eq('is_active', true).limit(1).single();
    if (error || !j) { console.log(county + ': ERROR ' + (error?.message || 'NOT FOUND')); continue; }

    const gc = j.grading_config || {};
    const fc = j.fire_jurisdiction_config || {};

    // Food tiers
    const hasTiers = gc.tiers && typeof gc.tiers === 'object' && !Array.isArray(gc.tiers) && Object.keys(gc.tiers).length > 0;
    const hasPV = gc.point_values && typeof gc.point_values === 'object' && Object.keys(gc.point_values).length > 0;

    console.log('========================================');
    console.log('COUNTY:', j.county);
    console.log('--- FOOD ---');
    console.log('  grading_type:', j.grading_type);
    console.log('  agency_name:', j.agency_name || '(EMPTY)');
    console.log('  jie_audit_status:', j.jie_audit_status || '(EMPTY)');
    if (hasTiers) {
      console.log('  tiers:');
      for (const [name, range] of Object.entries(gc.tiers)) {
        if (Array.isArray(range)) {
          console.log('    ' + name + ': ' + (range[1] != null ? range[0] + '-' + range[1] : range[0] + '+'));
        } else {
          console.log('    ' + name + ': ' + String(range));
        }
      }
    } else {
      console.log('  tiers: (none)');
    }
    if (hasPV) {
      console.log('  point_values:');
      for (const [cat, pts] of Object.entries(gc.point_values)) {
        console.log('    ' + cat + ': ' + pts);
      }
    } else {
      console.log('  point_values: (none)');
    }

    console.log('--- FIRE / AHJ ---');
    console.log('  fire_ahj_name:', j.fire_ahj_name || '(EMPTY)');
    console.log('  hood_cleaning_default:', j.hood_cleaning_default || '(EMPTY)');

    // Fire config details
    console.log('  fire_jurisdiction_config keys:', Object.keys(fc).length > 0 ? Object.keys(fc).join(', ') : '(EMPTY object)');
    if (fc.fire_code_edition) console.log('  fire_code_edition:', fc.fire_code_edition);
    if (fc.base_code) console.log('  base_code:', fc.base_code);
    if (fc.hood_cleaning_frequency) console.log('  hood_cleaning_frequency:', JSON.stringify(fc.hood_cleaning_frequency));
    if (fc.hood_cleaning_override) console.log('  hood_cleaning_override:', JSON.stringify(fc.hood_cleaning_override));
    if (fc.local_amendments) console.log('  local_amendments:', JSON.stringify(fc.local_amendments));
    if (fc.local_fire_amendments) console.log('  local_fire_amendments:', JSON.stringify(fc.local_fire_amendments));
    if (fc.amendments) console.log('  amendments:', JSON.stringify(fc.amendments));

    // Check for any hood override field by scanning all keys
    const hoodKeys = Object.keys(fc).filter(k => /hood|clean|frequency|override/i.test(k));
    console.log('  hood-related keys:', hoodKeys.length > 0 ? hoodKeys.join(', ') : '(NONE)');

    // Check for amendment keys
    const amendKeys = Object.keys(fc).filter(k => /amend|local|ordinance/i.test(k));
    console.log('  amendment-related keys:', amendKeys.length > 0 ? amendKeys.join(', ') : '(NONE)');

    // Dump full fc if small
    if (Object.keys(fc).length > 0 && Object.keys(fc).length <= 20) {
      console.log('  fire_jurisdiction_config (full):');
      console.log('    ' + JSON.stringify(fc, null, 2).replace(/\n/g, '\n    '));
    }
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
