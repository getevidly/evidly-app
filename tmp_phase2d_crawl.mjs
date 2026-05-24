/**
 * Phase 2d batch crawl — Firecrawl API contact extractor
 * Reads tmp_list_a.json (EHD) and tmp_list_b.json (Fire AHJ)
 * Crawls each agency website via hosted Firecrawl API
 * Extracts contact info from markdown
 * Writes results to docs/phase2d_results.json
 */

import { readFileSync, writeFileSync } from 'fs';

const API_KEY = 'fc-4a861bef82214d4bbcfe1ec668cb5510';
const DELAY_MS = 2500;

// Already touched — DO NOT re-crawl
const SKIP_SLUGS = new Set([
  'pasadena-ca', 'monterey-ca', 'san-luis-obispo-ca', 'contra-costa-ca',
  'placer-ca', 'sacramento-ca', 'berkeley-ca', // Phase 2 batch 1
  'santa-barbara-ca', 'ventura-ca', 'vernon-ca', // Phase 2b
  // Phase 2c (19 slugs) — already have contact_verified_by set, won't appear in list
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Firecrawl scrape ───────────────────────────────────────
async function scrapeUrl(url) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { success: false, status: res.status, markdown: '' };
    const data = await res.json();
    return {
      success: data.success === true,
      status: res.status,
      markdown: data.data?.markdown || '',
    };
  } catch (err) {
    return { success: false, status: 0, markdown: '', error: err.message };
  }
}

// ── Contact extraction from markdown ────────────────────────
function extractEmails(md, agencyHost) {
  const re = /[\w.+-]+@[\w.-]+\.\w{2,}/g;
  const matches = [...new Set((md.match(re) || []))];
  // Filter to .gov/.us/agency domain, reject noreply/webmaster
  const hostBase = agencyHost?.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || '';
  return matches.filter(e => {
    const dom = e.split('@')[1]?.toLowerCase() || '';
    const reject = /noreply|webmaster|donotreply|spam/i.test(e);
    return !reject && (dom.endsWith('.gov') || dom.endsWith('.us') || dom.includes(hostBase.split('.')[0]));
  });
}

function extractFax(md) {
  // Look for "fax" label near a phone number
  const faxRe = /fax[:\s]*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/gi;
  const matches = md.match(faxRe) || [];
  if (matches.length > 0) {
    const numRe = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
    const m = matches[0].match(numRe);
    return m ? m[0] : null;
  }
  return null;
}

function extractAddress(md) {
  // Look for CA addresses with ZIP
  const addrRe = /\d{1,5}\s+[\w\s.]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Way|Lane|Ln|Court|Ct|Circle|Cir|Place|Pl|Parkway|Pkwy)[.,]*\s*(?:Suite|Ste|Room|Rm|Floor|Bldg|Building|#)?[\s\w.,#-]*,?\s*[\w\s]+,?\s*CA\s+\d{5}(?:-\d{4})?/gi;
  const matches = md.match(addrRe) || [];
  if (matches.length > 0) {
    return matches[0].replace(/\s+/g, ' ').trim();
  }
  return null;
}

function extractPOC(md) {
  // Look for Director/Manager/Chief with name
  const patterns = [
    /(?:Director|Chief|Manager|Supervisor|Administrator)[:\s]*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]*(?:Director|Chief|Manager|Supervisor|Administrator)/g,
  ];

  for (const re of patterns) {
    const m = re.exec(md);
    if (m) {
      const name = m[1]?.trim();
      if (name && name.length > 4 && name.length < 60) {
        // Try to extract title from surrounding context
        const titleRe = /(?:Director|Chief|Manager|Supervisor|Administrator)\s+(?:of\s+)?(?:Environmental\s+Health|Public\s+Health|Community\s+Health|Health\s+Services|Environmental\s+Resources|Environmental\s+Protection|Environmental\s+Services)/i;
        const titleMatch = md.match(titleRe);
        return {
          name,
          title: titleMatch ? titleMatch[0].trim() : null,
        };
      }
    }
  }
  return { name: null, title: null };
}

// ── Process single jurisdiction ────────────────────────────
async function processJurisdiction(row, type) {
  const slug = row.slug;
  const website = type === 'food' ? row.agency_website : (row.fire_ahj_website || null);

  const result = {
    slug,
    type,
    status: 'skipped',
    urls_crawled: [],
    fills: {},
    notes: [],
  };

  if (SKIP_SLUGS.has(slug)) {
    result.status = 'skipped_already_touched';
    result.notes.push('Already processed in Phase 2/2b/2c');
    return result;
  }

  if (!website) {
    result.status = 'no_website';
    result.notes.push('No website URL available');
    return result;
  }

  // Determine which fields are NULL and need filling
  const nullFields = [];
  if (type === 'food') {
    if (!row.poc_name) nullFields.push('poc_name');
    if (!row.agency_email) nullFields.push('agency_email');
    if (!row.agency_fax) nullFields.push('agency_fax');
    if (!row.agency_address) nullFields.push('agency_address');
  } else {
    if (!row.fire_ahj_poc_name) nullFields.push('fire_ahj_poc_name');
    if (!row.fire_ahj_email) nullFields.push('fire_ahj_email');
    if (!row.fire_ahj_fax) nullFields.push('fire_ahj_fax');
    if (!row.fire_ahj_address) nullFields.push('fire_ahj_address');
  }

  if (nullFields.length === 0) {
    result.status = 'no_gaps';
    result.notes.push('All target fields already filled');
    return result;
  }

  result.notes.push(`NULL fields: ${nullFields.join(', ')}`);

  // Build candidate URLs
  const base = website.replace(/\/+$/, '');
  const candidatePaths = type === 'food'
    ? ['/contact', '/contact-us', '/staff', '/about', '']
    : ['', '/contact', '/fire-marshal', '/fire-prevention', '/staff', '/about'];

  let allMarkdown = '';

  for (const path of candidatePaths) {
    const url = base + path;
    console.log(`  [${slug}] Crawling: ${url}`);
    const scrapeResult = await scrapeUrl(url);

    if (scrapeResult.success && scrapeResult.markdown.length > 100) {
      result.urls_crawled.push(url);
      allMarkdown += '\n\n' + scrapeResult.markdown;
      // If we got good content from the base URL, don't crawl subpaths
      if (path === '' && scrapeResult.markdown.length > 500) {
        break;
      }
    } else if (scrapeResult.status === 403) {
      result.notes.push(`403 on ${url}`);
    }

    await sleep(DELAY_MS);

    // Stop if we have enough content
    if (allMarkdown.length > 5000) break;
  }

  if (allMarkdown.length < 50) {
    result.status = 'no_content';
    result.notes.push('No usable content extracted');
    return result;
  }

  // Extract fields from combined markdown
  const emailPrefix = type === 'food' ? 'agency_email' : 'fire_ahj_email';
  const faxPrefix = type === 'food' ? 'agency_fax' : 'fire_ahj_fax';
  const addrPrefix = type === 'food' ? 'agency_address' : 'fire_ahj_address';
  const pocPrefix = type === 'food' ? 'poc_name' : 'fire_ahj_poc_name';
  const titlePrefix = type === 'food' ? 'poc_title' : 'fire_ahj_poc_title';

  // Email
  if (nullFields.includes(emailPrefix)) {
    const emails = extractEmails(allMarkdown, website);
    if (emails.length > 0) {
      result.fills[emailPrefix] = { value: emails[0], confidence: 'HIGH', source: result.urls_crawled[0] };
      if (emails.length > 1) result.notes.push(`Alt emails: ${emails.slice(1).join(', ')}`);
    }
  }

  // Fax
  if (nullFields.includes(faxPrefix)) {
    const fax = extractFax(allMarkdown);
    if (fax) {
      result.fills[faxPrefix] = { value: fax, confidence: 'HIGH', source: result.urls_crawled[0] };
    }
  }

  // Address
  if (nullFields.includes(addrPrefix)) {
    const addr = extractAddress(allMarkdown);
    if (addr) {
      const hasZip = /\b\d{5}(-\d{4})?\b/.test(addr);
      result.fills[addrPrefix] = { value: addr, confidence: hasZip ? 'HIGH' : 'MEDIUM', source: result.urls_crawled[0] };
    }
  }

  // POC
  if (nullFields.includes(pocPrefix)) {
    const poc = extractPOC(allMarkdown);
    if (poc.name) {
      result.fills[pocPrefix] = { value: poc.name, confidence: 'MEDIUM', source: result.urls_crawled[0] };
      if (poc.title) {
        result.fills[titlePrefix] = { value: poc.title, confidence: 'MEDIUM', source: result.urls_crawled[0] };
      }
    }
  }

  const fillCount = Object.keys(result.fills).length;
  result.status = fillCount > 0 ? 'completed' : 'no_extractions';
  result.notes.push(`Extracted ${fillCount} fill(s)`);

  return result;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('Phase 2d crawl starting...');

  const listA = JSON.parse(readFileSync('tmp_list_a.json', 'utf8'));
  const listB = JSON.parse(readFileSync('tmp_list_b.json', 'utf8'));

  console.log(`LIST A (EHD): ${listA.length} rows`);
  console.log(`LIST B (Fire): ${listB.length} rows`);

  const results = { food: [], fire: [], summary: {} };

  // Process LIST A (EHD)
  console.log('\n=== Processing LIST A (EHD) ===');
  for (const row of listA) {
    const r = await processJurisdiction(row, 'food');
    results.food.push(r);
    console.log(`  [${r.slug}] ${r.status} — ${Object.keys(r.fills).length} fills`);
  }

  // Process LIST B (Fire AHJ)
  console.log('\n=== Processing LIST B (Fire AHJ) ===');
  for (const row of listB) {
    const r = await processJurisdiction(row, 'fire');
    results.fire.push(r);
    console.log(`  [${r.slug}] ${r.status} — ${Object.keys(r.fills).length} fills`);
  }

  // Summary
  const foodFills = results.food.reduce((s, r) => s + Object.keys(r.fills).length, 0);
  const fireFills = results.fire.reduce((s, r) => s + Object.keys(r.fills).length, 0);
  const foodCompleted = results.food.filter(r => r.status === 'completed').length;
  const fireCompleted = results.fire.filter(r => r.status === 'completed').length;
  const foodDeferred = results.food.filter(r => ['no_website','no_content','no_extractions'].includes(r.status)).length;
  const fireDeferred = results.fire.filter(r => ['no_website','no_content','no_extractions'].includes(r.status)).length;
  const highFills = [...results.food, ...results.fire].reduce((s, r) => {
    return s + Object.values(r.fills).filter(f => f.confidence === 'HIGH').length;
  }, 0);
  const medFills = [...results.food, ...results.fire].reduce((s, r) => {
    return s + Object.values(r.fills).filter(f => f.confidence === 'MEDIUM').length;
  }, 0);

  results.summary = {
    list_a_total: listA.length,
    list_a_completed: foodCompleted,
    list_a_fills: foodFills,
    list_a_deferred: foodDeferred,
    list_b_total: listB.length,
    list_b_completed: fireCompleted,
    list_b_fills: fireFills,
    list_b_deferred: fireDeferred,
    total_fills: foodFills + fireFills,
    high_confidence: highFills,
    medium_confidence: medFills,
  };

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(results.summary, null, 2));

  writeFileSync('docs/phase2d_results.json', JSON.stringify(results, null, 2));
  console.log('\nResults written to docs/phase2d_results.json');
  console.log('CRAWL COMPLETE');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
