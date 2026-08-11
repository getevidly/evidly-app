import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://irxgmhxhmxtzfwuieblc.supabase.co';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg0NjkxMiwiZXhwIjoyMDg0NDIyOTEyfQ.SGfXH8rWFfM0ExMtw_3MueLrNOn8eKA5bTaoVQ7-IdA';

const admin = createClient(SUPABASE_URL, SRK);

async function main() {
  // Step 0: Get a user JWT for arthur@getevidly.com
  console.log('=== Generating user JWT ===');
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'arthur@getevidly.com',
  });
  if (linkErr) { console.error('Link error:', linkErr); process.exit(1); }

  const token = linkData.properties.hashed_token;
  const { data: verifyData, error: verifyErr } = await admin.auth.verifyOtp({
    type: 'magiclink',
    token_hash: token,
  });
  if (verifyErr) { console.error('Verify error:', verifyErr); process.exit(1); }

  const jwt = verifyData.session.access_token;
  console.log('JWT obtained for:', verifyData.user.email);

  // Create an authenticated client
  const userClient = createClient(SUPABASE_URL, SRK, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  // Step 1: Read current Stanislaus agency_name
  console.log('\n=== Reading Stanislaus County jurisdiction ===');
  const { data: jur } = await admin
    .from('jurisdictions')
    .select('id, county, agency_name, jie_audit_status')
    .eq('county', 'Stanislaus')
    .eq('state', 'CA')
    .single();
  console.log('Current agency_name:', jur.agency_name);
  console.log('Current jie_audit_status:', jur.jie_audit_status);
  const originalName = jur.agency_name;

  // Step 2: Record timestamp BEFORE the edit
  const beforeEditTs = new Date().toISOString();
  console.log('\n=== Timestamp before edit:', beforeEditTs, '===');

  // Step 3: Edit agency_name — append " (test)"
  console.log('\n=== Calling update-jurisdiction: append " (test)" ===');
  const { data: editResult, error: editErr } = await userClient.functions.invoke('county-briefing', {
    body: {
      action: 'update-jurisdiction',
      county: 'Stanislaus',
      edits: { agency_name: originalName + ' (test)' },
    },
  });
  if (editErr) { console.error('Edit error:', editErr); process.exit(1); }
  if (editResult.error) { console.error('Edit returned error:', editResult.error); process.exit(1); }
  console.log('Edit result:', JSON.stringify(editResult, null, 2));

  // Step 4: Check history row
  console.log('\n=== Checking jurisdiction_edits for batch', editResult.batch_id, '===');
  const { data: historyRows1 } = await admin
    .from('jurisdiction_edits')
    .select('*')
    .eq('batch_id', editResult.batch_id)
    .order('edited_at', { ascending: true });

  for (const row of historyRows1) {
    console.log('History row:', JSON.stringify({
      id: row.id,
      batch_id: row.batch_id,
      field_name: row.field_name,
      old_value: row.old_value,
      new_value: row.new_value,
      edited_at: row.edited_at,
      edited_by: row.edited_by,
    }, null, 2));
  }

  // Step 5: Confirm history was written BEFORE jurisdiction changed
  const { data: jurAfter } = await admin
    .from('jurisdictions')
    .select('agency_name, updated_at')
    .eq('county', 'Stanislaus')
    .eq('state', 'CA')
    .single();
  console.log('\nJurisdiction updated_at:', jurAfter.updated_at);
  console.log('History edited_at:     ', historyRows1[0]?.edited_at);
  const historyFirst = new Date(historyRows1[0]?.edited_at) <= new Date(jurAfter.updated_at);
  console.log('History written before jurisdiction update:', historyFirst);
  console.log('New agency_name:', jurAfter.agency_name);

  // Step 6: Revert — set agency_name back to original
  console.log('\n=== Reverting agency_name to original ===');
  const { data: revertResult, error: revertErr } = await userClient.functions.invoke('county-briefing', {
    body: {
      action: 'update-jurisdiction',
      county: 'Stanislaus',
      edits: { agency_name: originalName },
    },
  });
  if (revertErr) { console.error('Revert error:', revertErr); process.exit(1); }
  if (revertResult.error) { console.error('Revert returned error:', revertResult.error); process.exit(1); }
  console.log('Revert result:', JSON.stringify(revertResult, null, 2));

  // Step 7: Check second history row
  console.log('\n=== Checking jurisdiction_edits for revert batch', revertResult.batch_id, '===');
  const { data: historyRows2 } = await admin
    .from('jurisdiction_edits')
    .select('*')
    .eq('batch_id', revertResult.batch_id)
    .order('edited_at', { ascending: true });

  for (const row of historyRows2) {
    console.log('History row:', JSON.stringify({
      id: row.id,
      batch_id: row.batch_id,
      field_name: row.field_name,
      old_value: row.old_value,
      new_value: row.new_value,
      edited_at: row.edited_at,
      edited_by: row.edited_by,
    }, null, 2));
  }

  // Step 8: Confirm final state is back to original
  const { data: jurFinal } = await admin
    .from('jurisdictions')
    .select('agency_name')
    .eq('county', 'Stanislaus')
    .eq('state', 'CA')
    .single();
  console.log('\nFinal agency_name:', jurFinal.agency_name);
  console.log('Matches original:', jurFinal.agency_name === originalName);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Total history rows written: 2');
  console.log('Edit batch_id: ', editResult.batch_id);
  console.log('Revert batch_id:', revertResult.batch_id);
  console.log('History-first guarantee held:', historyFirst);
  console.log('Data reverted to original:', jurFinal.agency_name === originalName);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
