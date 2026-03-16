/**
 * SECURITY-FIX-01: Replace inline wildcard CORS with getCorsHeaders() import.
 * Run: node scripts/fix-cors.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FUNCTIONS_DIR = 'supabase/functions';
const IMPORT_LINE = `import { getCorsHeaders } from '../_shared/cors.ts';`;
const CORS_CALL = `  const corsHeaders = getCorsHeaders(req.headers.get('origin'));`;

// Public endpoints keep wildcard CORS — skip these
const SKIP = new Set([
  'landing-chat',
  'evidly-referral-signup',
  'assessment-notify',
  'resend-webhook',
  'intelligence-bridge-proxy',
  '_shared',
]);

// Regex to match the inline corsHeaders block (multiline)
const CORS_BLOCK_RE = /^const corsHeaders\s*=\s*\{[^}]*?['"]Access-Control-Allow-Origin['"]\s*:\s*['"][*]['"][^}]*?\};\s*\n/ms;

// Handler entry patterns
const HANDLER_ENTRY_RE = /((?:Deno\.serve|serve)\s*\(\s*async\s*\(\s*req(?:\s*:\s*Request)?\s*\)\s*(?::\s*\w+(?:<\w+>)?)?\s*=>\s*\{)\n/;

let updated = 0;
let skipped = 0;
let errors = [];

const dirs = readdirSync(FUNCTIONS_DIR).filter(d => {
  if (SKIP.has(d)) return false;
  try {
    return statSync(join(FUNCTIONS_DIR, d)).isDirectory();
  } catch { return false; }
});

for (const dir of dirs) {
  const filePath = join(FUNCTIONS_DIR, dir, 'index.ts');
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    continue; // no index.ts
  }

  // Skip if no wildcard CORS
  if (!content.includes("Access-Control-Allow-Origin") || !content.includes("*")) {
    skipped++;
    continue;
  }

  // Skip if already using getCorsHeaders
  if (content.includes('getCorsHeaders')) {
    skipped++;
    continue;
  }

  let modified = content;

  // 1. Remove the inline corsHeaders block
  const corsMatch = modified.match(CORS_BLOCK_RE);
  if (!corsMatch) {
    // Try single-quote variant
    const altRe = /^const corsHeaders\s*=\s*\{[^}]*?Access-Control[^}]*?\};\s*\n/ms;
    const altMatch = modified.match(altRe);
    if (altMatch) {
      modified = modified.replace(altMatch[0], '');
    } else {
      errors.push(`${dir}: Could not find corsHeaders block`);
      continue;
    }
  } else {
    modified = modified.replace(corsMatch[0], '');
  }

  // 2. Add import statement after the last existing import or at the top
  const lastImportIdx = modified.lastIndexOf('\nimport ');
  if (lastImportIdx !== -1) {
    const lineEnd = modified.indexOf('\n', lastImportIdx + 1);
    modified = modified.slice(0, lineEnd + 1) + IMPORT_LINE + '\n' + modified.slice(lineEnd + 1);
  } else {
    // No imports — add after first comment block or at the very top
    const firstNewline = modified.indexOf('\n');
    if (firstNewline !== -1) {
      modified = modified.slice(0, firstNewline + 1) + IMPORT_LINE + '\n' + modified.slice(firstNewline + 1);
    } else {
      modified = IMPORT_LINE + '\n' + modified;
    }
  }

  // 3. Add corsHeaders assignment inside the handler
  const handlerMatch = modified.match(HANDLER_ENTRY_RE);
  if (handlerMatch) {
    const idx = modified.indexOf(handlerMatch[0]);
    const insertPoint = idx + handlerMatch[0].length;
    modified = modified.slice(0, insertPoint) + CORS_CALL + '\n' + modified.slice(insertPoint);
  } else {
    errors.push(`${dir}: Could not find handler entry point`);
    // Still write the file with the import and removed block
  }

  writeFileSync(filePath, modified, 'utf8');
  updated++;
}

console.log(`\nCORS Update Results:`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Errors:  ${errors.length}`);
if (errors.length > 0) {
  console.log(`\nErrors:`);
  errors.forEach(e => console.log(`  - ${e}`));
}
