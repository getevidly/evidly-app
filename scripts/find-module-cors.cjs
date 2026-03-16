const fs = require('fs');
const path = require('path');

const dirs = fs.readdirSync('supabase/functions').filter(function(d) {
  try {
    return fs.statSync(path.join('supabase/functions', d)).isDirectory() && d !== '_shared';
  } catch(e) { return false; }
});

const issues = [];
for (const dir of dirs) {
  const fp = path.join('supabase/functions', dir, 'index.ts');
  let c;
  try { c = fs.readFileSync(fp, 'utf8'); } catch(e) { continue; }
  if (c.indexOf('getCorsHeaders') === -1) continue;
  const hi = c.search(/(?:Deno\.serve|serve)\s*\(/);
  if (hi === -1) continue;
  const bh = c.slice(0, hi);
  if (bh.indexOf('corsHeaders') !== -1 && bh.indexOf('getCorsHeaders') === -1) {
    issues.push(dir);
  }
}
console.log('Count: ' + issues.length);
issues.forEach(function(d) { console.log('  ' + d); });
