#!/usr/bin/env node
/**
 * dump_content.mjs — Dump all content_schedule rows to CSV.
 * Paginates in batches of 1000 to avoid Supabase client row cap.
 * Throwaway script — do not commit.
 *
 * Usage:
 *   node scripts/dump_content.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=ey... node scripts/dump_content.mjs
 *
 * If SUPABASE_SERVICE_ROLE_KEY is set, uses it (bypasses RLS).
 * Otherwise falls back to the anon key (requires permissive RLS).
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://irxgmhxhmxtzfwuieblc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyeGdtaHhobXh0emZ3dWllYmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDY5MTIsImV4cCI6MjA4NDQyMjkxMn0.fkYm3v1dJ8AeFJfr3wsYB3W52OyTEnbtdQa422rqOyY';

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;
const keyLabel = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon';
console.log(`Using ${keyLabel} key`);

const supabase = createClient(SUPABASE_URL, key);

const COLUMNS = 'id,brand,channel_label,title,scheduled_date';
const BATCH = 1000;
const OUTPUT = join(__dirname, '..', 'content_dump.csv');

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  const allRows = [];
  let from = 0;

  while (true) {
    const to = from + BATCH - 1;
    const { data, error } = await supabase
      .from('content_schedule')
      .select(COLUMNS)
      .order('brand', { ascending: true })
      .order('channel_label', { ascending: true })
      .order('title', { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`Error at range ${from}-${to}:`, error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);
    console.log(`  Fetched ${data.length} rows (${allRows.length} total so far)`);

    if (data.length < BATCH) break; // last page
    from += BATCH;
  }

  console.log(`\nTotal rows fetched: ${allRows.length}`);

  // Write CSV
  const header = 'id,brand,channel_label,title,scheduled_date';
  const lines = [header];
  for (const r of allRows) {
    lines.push([
      csvEscape(r.id),
      csvEscape(r.brand),
      csvEscape(r.channel_label),
      csvEscape(r.title),
      csvEscape(r.scheduled_date),
    ].join(','));
  }

  writeFileSync(OUTPUT, lines.join('\n') + '\n');
  console.log(`Written: ${OUTPUT}`);
  console.log(`CSV lines: ${lines.length} (1 header + ${lines.length - 1} data rows)`);
}

main().catch(err => { console.error(err); process.exit(1); });
