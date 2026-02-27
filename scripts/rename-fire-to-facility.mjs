/**
 * Bulk rename: fire_safety → facility_safety
 * Safe replacements that won't touch fire_suppression, fire_extinguisher, etc.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Directories to process
const DIRS = ['src', 'supabase/functions', 'intelligence/supabase', 'scripts/jie'];

// File extensions to process
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.sql', '.json', '.css', '.html'];

// Safe replacement pairs - these patterns are specific to the pillar name
// and won't accidentally match fire_suppression, fire_extinguisher, etc.
const REPLACEMENTS = [
  // Snake case: fire_safety → facility_safety (won't match fire_suppression, fire_extinguisher)
  [/fire_safety/g, 'facility_safety'],
  // Camel case: fireSafety → facilitySafety
  [/fireSafety/g, 'facilitySafety'],
  // Pascal case: FireSafety → FacilitySafety (component names)
  [/FireSafety/g, 'FacilitySafety'],
  // Kebab case: fire-safety → facility-safety (routes, CSS classes, permissions)
  [/fire-safety/g, 'facility-safety'],
  // Display text in single quotes
  [/'Fire Safety'/g, "'Facility Safety'"],
  // Display text in double quotes
  [/"Fire Safety"/g, '"Facility Safety"'],
  // Uppercase
  [/FIRE_SAFETY/g, 'FACILITY_SAFETY'],
  [/FIRE SAFETY/g, 'FACILITY SAFETY'],
  // Backtick template literals
  [/`Fire Safety`/g, '`Facility Safety`'],
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
  let original = content;
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

console.log('=== Fire Safety → Facility Safety Rename ===\n');

for (const dir of DIRS) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) {
    console.log(`Skipping ${dir} (not found)`);
    continue;
  }
  console.log(`Processing ${dir}/...`);
  const files = walkDir(fullDir);
  for (const file of files) {
    processFile(file);
  }
}

// Also process root-level files
const rootFiles = ['index.html', 'public/robots.txt'];
for (const rf of rootFiles) {
  const fullPath = path.join(ROOT, rf);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Files scanned: ${totalFiles}`);
console.log(`Files changed: ${changedFiles.length}`);
console.log(`Total replacements: ${totalChanges}`);
console.log(`\nChanged files:`);
for (const f of changedFiles) {
  console.log(`  ${f.path} (${f.changes})`);
}
