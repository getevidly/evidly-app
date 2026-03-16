/**
 * Batch CORS update script
 * Replaces inline wildcard CORS headers in edge functions with imports from _shared/cors.ts
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'supabase', 'functions');

// Public functions that keep wildcard CORS
const PUBLIC = new Set(['landing-chat', 'evidly-referral-signup', 'assessment-notify']);

// Skip these (already handled via shared imports or special)
const SKIP = new Set([
  '_shared',
  'get-jurisdictions', // already uses getCorsOrigin
  'pos-connect', 'pos-sync-locations', 'pos-sync-employees', 'pos-sync-all', // use posUtils
  'api-v1-locations-schedule', 'api-v1-locations-compliance',
  'api-v1-locations-services', 'api-v1-locations-certificates',
  'api-v1-services-photos', // use auth.ts
]);

const dirs = fs.readdirSync(BASE).filter(d => {
  try {
    return fs.statSync(path.join(BASE, d)).isDirectory() && !SKIP.has(d);
  } catch { return false; }
});

let updated = 0, skipped = 0;
const errors = [];

for (const dir of dirs) {
  const indexPath = path.join(BASE, dir, 'index.ts');
  if (!fs.existsSync(indexPath)) { skipped++; continue; }

  let content = fs.readFileSync(indexPath, 'utf8');

  // Skip if already imports from cors.ts
  if (content.includes("from '../_shared/cors.ts'")) { skipped++; continue; }

  // Skip if no CORS wildcard
  if (!content.includes('Access-Control-Allow-Origin')) { skipped++; continue; }

  const isPublic = PUBLIC.has(dir);

  // Match the corsHeaders block: handles double/single quotes, optional type annotation,
  // optional preceding comment line, and varied keys/values
  const corsBlockRegex = /(?:\/\/[^\n]*\n)?const corsHeaders\s*(?::\s*Record<string,\s*string>)?\s*=\s*\{[^}]+\};\s*\n?/;

  if (!corsBlockRegex.test(content)) {
    errors.push(`${dir}: no matching corsHeaders block`);
    continue;
  }

  if (isPublic) {
    // Replace block with PUBLIC_CORS_HEADERS
    content = content.replace(corsBlockRegex, 'const corsHeaders = PUBLIC_CORS_HEADERS;\n\n');
    content = addImportLine(content, "import { PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';");
  } else {
    // Remove the module-level block
    content = content.replace(corsBlockRegex, '');
    // Add import
    content = addImportLine(content, "import { getCorsHeaders } from '../_shared/cors.ts';");
    // Add corsHeaders inside Deno.serve handler
    // Handle both (req: Request) and (req) patterns
    const serveRegex = /Deno\.serve\(async\s*\((req)(?:\s*:\s*Request)?\)\s*=>\s*\{/;
    if (serveRegex.test(content)) {
      content = content.replace(
        serveRegex,
        (match) => `${match}\n  const corsHeaders = getCorsHeaders(req.headers.get('origin'));`
      );
    } else {
      errors.push(`${dir}: no matching Deno.serve pattern`);
      continue;
    }
  }

  fs.writeFileSync(indexPath, content);
  updated++;
  console.log(`${isPublic ? 'PUBLIC' : 'RESTRICTED'}: ${dir}`);
}

function addImportLine(content, importLine) {
  // Find the last import statement and add after it
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s/)) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }
  return lines.join('\n');
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
if (errors.length) {
  console.log('\nErrors (need manual fix):');
  errors.forEach(e => console.log(`  - ${e}`));
}
