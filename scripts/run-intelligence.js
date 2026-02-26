#!/usr/bin/env node
/**
 * run-intelligence.js — Trigger the intelligence-collect edge function
 *
 * Usage:  npm run intelligence
 *
 * Reads VITE_SUPABASE_URL and CRON_SECRET from .env.local,
 * POSTs to the edge function with x-cron-secret auth,
 * and prints the results.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Read .env.local ─────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  let raw;
  try {
    raw = readFileSync(envPath, 'utf-8');
  } catch {
    console.error('ERROR: .env.local not found. Copy .env.example to .env.local and add CRON_SECRET.');
    process.exit(1);
  }
  const vars = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const CRON_SECRET = env.CRON_SECRET;

if (!SUPABASE_URL) {
  console.error('ERROR: VITE_SUPABASE_URL not set in .env.local');
  process.exit(1);
}
if (!CRON_SECRET) {
  console.error('ERROR: CRON_SECRET not set in .env.local');
  console.error('  1. Generate a secret:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('  2. Set it in Supabase: npx supabase secrets set CRON_SECRET=<secret>');
  console.error('  3. Add to .env.local:  CRON_SECRET=<secret>');
  process.exit(1);
}

// ── Call the edge function ──────────────────────────────────

const url = `${SUPABASE_URL}/functions/v1/intelligence-collect`;
console.log(`\n  Calling intelligence-collect...`);
console.log(`  ${url}\n`);

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': CRON_SECRET,
    },
    body: JSON.stringify({}),
  });

  const body = await res.text();
  let data;
  try { data = JSON.parse(body); } catch { data = null; }

  if (!res.ok) {
    console.error(`  FAILED — HTTP ${res.status}`);
    console.error(`  ${body}\n`);
    process.exit(1);
  }

  // ── Pretty-print results ────────────────────────────────

  const newCount = data?.new ?? 0;
  const processed = data?.processed ?? 0;
  const errors = data?.errors ?? [];
  const duration = data?.duration_ms ?? 0;
  const sources = data?.sources ?? {};

  console.log(`  Done in ${(duration / 1000).toFixed(1)}s`);
  console.log(`  Processed: ${processed}  |  New insights: ${newCount}  |  Errors: ${errors.length}\n`);

  for (const [srcId, src] of Object.entries(sources)) {
    const s = src;
    console.log(`  [${srcId}]  fetched=${s.fetched}  new=${s.new}  skipped=${s.skipped}${s.error ? '  error=' + s.error : ''}`);
  }

  if (errors.length > 0) {
    console.log('\n  Errors:');
    for (const e of errors) console.log(`    - ${e}`);
  }

  if (newCount > 0) {
    console.log(`\n  ${newCount} new insight(s) are now in Pending Review.`);
    console.log('  Review at: https://evidly-app.vercel.app/admin/intelligence\n');
  } else {
    console.log('\n  No new insights (all items were duplicates or sources were empty).\n');
  }
} catch (err) {
  console.error(`  FAILED — ${err.message}\n`);
  process.exit(1);
}
