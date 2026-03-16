/**
 * Fix functions where corsHeaders is used at module level (in helper functions)
 * but only defined inside the handler. Moves the definition to module level.
 */
const fs = require('fs');
const path = require('path');

const FUNCS_DIR = 'supabase/functions';
const dirs = fs.readdirSync(FUNCS_DIR).filter(function(d) {
  try {
    return fs.statSync(path.join(FUNCS_DIR, d)).isDirectory() && d !== '_shared';
  } catch(e) { return false; }
});

let fixed = 0;
for (const dir of dirs) {
  const fp = path.join(FUNCS_DIR, dir, 'index.ts');
  let c;
  try { c = fs.readFileSync(fp, 'utf8'); } catch(e) { continue; }

  // Only process files that have getCorsHeaders
  if (c.indexOf('getCorsHeaders') === -1) continue;

  // Find handler entry
  const handlerMatch = c.match(/(?:Deno\.serve|serve)\s*\(\s*async/);
  if (!handlerMatch) continue;
  const handlerIdx = c.indexOf(handlerMatch[0]);

  const beforeHandler = c.slice(0, handlerIdx);
  const afterHandler = c.slice(handlerIdx);

  // Check if corsHeaders is referenced at module level (outside handler)
  // Look for 'corsHeaders' in the text before the handler, excluding import lines
  const linesBeforeHandler = beforeHandler.split(/\r?\n/);
  let hasModuleLevelRef = false;
  for (const line of linesBeforeHandler) {
    if (line.indexOf('getCorsHeaders') !== -1) continue; // import line
    if (line.indexOf('corsHeaders') !== -1) {
      hasModuleLevelRef = true;
      break;
    }
  }

  if (!hasModuleLevelRef) continue;

  // This function has module-level corsHeaders usage.
  // Fix: move corsHeaders to module level (after the import), remove from handler.

  // Check if there's already a module-level const corsHeaders
  const hasModuleDef = beforeHandler.indexOf('const corsHeaders') !== -1;
  if (hasModuleDef) continue; // Already has module-level definition

  // Remove the handler-level definition
  const handlerCorsLine = /[ \t]*const corsHeaders = getCorsHeaders\(req\.headers\.get\(['"]origin['"]\)\);\r?\n/;
  let newContent = c.replace(handlerCorsLine, '');

  // Add module-level definition after the import line
  const importLine = "import { getCorsHeaders } from '../_shared/cors.ts';";
  const importIdx = newContent.indexOf(importLine);
  if (importIdx === -1) continue;

  const afterImport = importIdx + importLine.length;
  const nl = newContent.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
  const moduleDef = nl + 'const corsHeaders = getCorsHeaders(null);';
  newContent = newContent.slice(0, afterImport) + moduleDef + newContent.slice(afterImport);

  fs.writeFileSync(fp, newContent, 'utf8');
  fixed++;
  console.log('Fixed: ' + dir);
}

console.log('\nTotal fixed: ' + fixed);
