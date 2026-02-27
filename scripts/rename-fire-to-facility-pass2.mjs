/**
 * Pass 2: Replace remaining unquoted "Fire Safety" / "fire safety" text
 * that was missed by the first pass (which only matched quoted strings).
 *
 * Uses word-boundary matching to avoid touching "fire suppression", "fire extinguisher" etc.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DIRS = ['src', 'supabase/functions', 'intelligence/supabase'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.sql', '.html'];

// Match "Fire Safety" or "fire safety" as standalone words
// This won't match "fire suppression", "fire extinguisher", "fire code" etc.
const REPLACEMENTS = [
  // "Fire Safety" as two words (title case) - replace with "Facility Safety"
  [/\bFire Safety\b/g, 'Facility Safety'],
  // "fire safety" as two words (lower case) - replace with "facility safety"
  [/\bfire safety\b/g, 'facility safety'],
  // "FIRE SAFETY" (upper case, already done but just in case)
  [/\bFIRE SAFETY\b/g, 'FACILITY SAFETY'],
];

let totalFiles = 0;
let totalChanges = 0;
const changedFiles = [];

function walkDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      files.push(...walkDir(fullPath));
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanges = 0;

  for (const [pattern, replacement] of REPLACEMENTS) {
    const matches = content.match(pattern);
    if (matches) {
      fileChanges += matches.length;
      content = content.replace(pattern, replacement);
    }
  }

  if (fileChanges > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    const relPath = path.relative(ROOT, filePath);
    changedFiles.push({ path: relPath, changes: fileChanges });
    totalChanges += fileChanges;
    console.log(`  ✓ ${relPath} (${fileChanges} replacements)`);
  }
  totalFiles++;
}

console.log('=== Pass 2: Unquoted Fire Safety → Facility Safety ===\n');

for (const dir of DIRS) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  console.log(`Processing ${dir}/...`);
  const files = walkDir(fullDir);
  for (const file of files) {
    processFile(file);
  }
}

// Root files
['index.html'].forEach(rf => {
  const fp = path.join(ROOT, rf);
  if (fs.existsSync(fp)) processFile(fp);
});

console.log(`\n=== Summary ===`);
console.log(`Files scanned: ${totalFiles}`);
console.log(`Files changed: ${changedFiles.length}`);
console.log(`Total replacements: ${totalChanges}`);
for (const f of changedFiles) {
  console.log(`  ${f.path} (${f.changes})`);
}
