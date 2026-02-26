import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://irxgmhxhmxtzfwuieblc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDY5MTIsImV4cCI6MjA4NDQyMjkxMn0.fkYm3v1dJ8AeFJfr3wsYB3W52OyTEnbtdQa422rqOyY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('='.repeat(70));
  console.log('INTELLIGENCE DATA AUDIT');
  console.log('='.repeat(70));

  // ── 1. intelligence_insights: total count ──
  console.log('\n--- 1. intelligence_insights ---');
  const { count: totalCount, error: countErr } = await supabase
    .from('intelligence_insights')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.log('ERROR querying intelligence_insights:', countErr.message);
  } else {
    console.log(`Total rows: ${totalCount}`);
  }

  // ── Sample row (first row) to discover columns ──
  const { data: sampleRows, error: sampleErr } = await supabase
    .from('intelligence_insights')
    .select('*')
    .limit(1);

  if (sampleErr) {
    console.log('ERROR fetching sample row:', sampleErr.message);
  } else if (sampleRows && sampleRows.length > 0) {
    const sample = sampleRows[0];
    const columns = Object.keys(sample);
    console.log(`\nColumn names (${columns.length} columns):`);
    columns.forEach(c => {
      const val = sample[c];
      const type = val === null ? 'null' : typeof val;
      console.log(`  - ${c}  (JS type: ${type}, sample: ${JSON.stringify(val)?.substring(0, 120)})`);
    });

    console.log('\n--- 5. Full sample row (first row) ---');
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log('No rows found in intelligence_insights.');
  }

  // ── Count by status ──
  console.log('\n--- Count by status ---');
  const { data: allRows, error: allErr } = await supabase
    .from('intelligence_insights')
    .select('status, category, source_name');

  if (allErr) {
    console.log('ERROR:', allErr.message);
  } else if (allRows) {
    // status breakdown
    const statusCounts = {};
    const categoryCounts = {};
    const sourceCounts = {};

    for (const row of allRows) {
      statusCounts[row.status ?? '(null)'] = (statusCounts[row.status ?? '(null)'] || 0) + 1;
      categoryCounts[row.category ?? '(null)'] = (categoryCounts[row.category ?? '(null)'] || 0) + 1;
      sourceCounts[row.source_name ?? '(null)'] = (sourceCounts[row.source_name ?? '(null)'] || 0) + 1;
    }

    console.log('By status:');
    for (const [k, v] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`);
    }

    console.log('\nBy category:');
    for (const [k, v] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`);
    }

    console.log('\nBy source_name:');
    for (const [k, v] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${v}`);
    }
  }

  // ── 2. executive_snapshots ──
  console.log('\n--- 2. executive_snapshots ---');
  const { data: execData, count: execCount, error: execErr } = await supabase
    .from('executive_snapshots')
    .select('*', { count: 'exact' })
    .limit(1);

  if (execErr) {
    console.log('Table check result:', execErr.message);
    console.log('(Table likely does not exist or RLS blocks access)');
  } else {
    console.log(`Table exists! Row count: ${execCount}`);
    if (execData && execData.length > 0) {
      console.log('Columns:', Object.keys(execData[0]).join(', '));
      console.log('Sample row:', JSON.stringify(execData[0], null, 2));
    } else {
      console.log('(empty table)');
    }
  }

  // ── 3. intelligence_subscriptions ──
  console.log('\n--- 3. intelligence_subscriptions ---');
  const { data: subData, count: subCount, error: subErr } = await supabase
    .from('intelligence_subscriptions')
    .select('*', { count: 'exact' })
    .limit(1);

  if (subErr) {
    console.log('Table check result:', subErr.message);
    console.log('(Table likely does not exist or RLS blocks access)');
  } else {
    console.log(`Table exists! Row count: ${subCount}`);
    if (subData && subData.length > 0) {
      console.log('Columns:', Object.keys(subData[0]).join(', '));
      console.log('Sample row:', JSON.stringify(subData[0], null, 2));
    } else {
      console.log('(empty table)');
    }
  }

  // ── 4. Schema via information_schema (may be blocked by RLS) ──
  console.log('\n--- 4. Schema from information_schema (if accessible) ---');
  const { data: schemaData, error: schemaErr } = await supabase
    .rpc('get_table_columns', { table_name_param: 'intelligence_insights' })
    .limit(50);

  if (schemaErr) {
    // Fallback: try raw SQL via rpc or just note it
    console.log('RPC get_table_columns not available:', schemaErr.message);
    console.log('(Schema inferred from sample row above instead)');
  } else {
    console.log('Column schema:');
    for (const col of schemaData) {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('AUDIT COMPLETE');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
