/**
 * UI-SWEEP — Standalone Playwright script (no test runner)
 *
 * Logs in as verify9 and walks every authenticated page.
 * Captures screenshots, console errors, network failures, fake data.
 *
 * Run: node e2e/ui-sweep-run.mjs
 * Output: test-results/ui-sweep/ (screenshots) + test-results/ui-sweep-report.md
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// ── Config ──────────────────────────────────────────────────────
const BASE_URL = process.env.SWEEP_BASE_URL || 'https://app.getevidly.com';
const EMAIL = process.env.E2E_OPERATOR_EMAIL || 'alhagg67+verify9@gmail.com';
const PASSWORD = process.env.E2E_OPERATOR_PASSWORD || '';
const SCREENSHOT_DIR = 'test-results/ui-sweep';
const REPORT_PATH = 'test-results/ui-sweep-report.md';

if (!PASSWORD) {
  console.error('ERROR: Set E2E_OPERATOR_PASSWORD env var');
  process.exit(1);
}

// Fake data patterns
const FAKE_DATA_PATTERNS = [
  'Downtown Kitchen', 'University Dining', 'Airport Terminal', 'Airport Concourse',
  'Location 1', 'Location 2', 'Location 3',
  'Mike Johnson', 'Sarah Chen', 'Emma Davis', 'John Smith', 'Jane Doe',
  'Maria Garcia', 'Emily Rogers', 'David Kim', 'Michael Torres', 'Lisa Nguyen',
  'HoodOps', 'hoodops.com',
  '(555) 123-4567', '123 Main St', '93721',
  'Demo Restaurant Group',
];

// Pages to visit
const PAGES = [
  // Daily Operations
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/scoring-breakdown', label: 'Food Safety Overview' },
  { path: '/checklists', label: 'Checklists' },
  { path: '/temp-logs', label: 'Temperature Readings' },
  { path: '/haccp', label: 'HACCP Control Points' },
  { path: '/corrective-actions', label: 'Corrective Actions' },
  { path: '/tasks', label: 'Task Manager' },
  { path: '/incidents', label: 'Incidents' },

  // Compliance
  { path: '/compliance-overview', label: 'Compliance Overview' },
  { path: '/documents', label: 'Documents' },
  { path: '/deficiencies', label: 'Deficiencies' },
  { path: '/insurance-risk', label: 'Insurance Risk' },
  { path: '/workforce-risk', label: 'Workforce Risk' },
  { path: '/cic-pse', label: 'CIC / PSE' },
  { path: '/progress', label: 'Progress' },
  { path: '/jurisdiction', label: 'Know Your Inspector' },
  { path: '/regulatory-alerts', label: 'Regulatory Tracking' },
  { path: '/reports', label: 'Reporting' },
  { path: '/self-inspection', label: 'Self-Inspection' },
  { path: '/mock-inspection', label: 'Mock Inspection' },
  { path: '/services', label: 'Vendor Services' },
  { path: '/vendors/review', label: 'Document Review' },
  { path: '/marketplace', label: 'Vendor Marketplace' },
  { path: '/vendor-connect', label: 'Vendor Connect' },

  // Insights
  { path: '/ai-advisor', label: 'AI Advisor' },
  { path: '/analysis', label: 'Predictive Analytics' },
  { path: '/compliance-trends', label: 'Compliance Trends' },
  { path: '/audit-trail', label: 'Audit Log' },
  { path: '/benchmarks', label: 'Benchmarks' },
  { path: '/intelligence', label: 'Compliance Intelligence' },
  { path: '/insights/intelligence', label: 'Business Intelligence' },
  { path: '/insights/reports', label: 'Reports' },
  { path: '/insights/predictions', label: 'Predictive Analysis' },
  { path: '/iot-monitoring', label: 'IoT Dashboard' },
  { path: '/insights/inspection-forecast', label: 'Inspection Forecast' },
  { path: '/insights/violation-radar', label: 'Violation Risk Radar' },
  { path: '/insights/trajectory', label: 'Compliance Trajectory' },
  { path: '/insights/vendor-performance', label: 'Vendor Performance' },
  { path: '/insights/signals', label: 'Jurisdiction Signals' },
  { path: '/insights/leaderboard', label: 'Team Leaderboard' },
  { path: '/insights/operations-intelligence', label: 'Ops Intelligence' },

  // Tools
  { path: '/inspector-view', label: 'Inspector Arrival Mode' },
  { path: '/self-diagnosis', label: 'Self-Diagnosis' },

  // Administration
  { path: '/equipment', label: 'Equipment' },
  { path: '/integrations', label: 'Integrations' },
  { path: '/sensors', label: 'IoT Sensors' },
  { path: '/iot/platform', label: 'Connect Sensors' },
  { path: '/migrate', label: 'Import Data' },
  { path: '/org-hierarchy', label: 'Locations' },
  { path: '/settings/company', label: 'Settings - Company Profile' },
  { path: '/settings/team-roles', label: 'Settings - Team Roles' },
  { path: '/settings/service-types', label: 'Settings - Service Types' },
  { path: '/settings/notifications', label: 'Settings - Notifications' },
  { path: '/settings/billing', label: 'Settings - Billing' },
  { path: '/settings/roles-permissions', label: 'Role Permissions' },
  { path: '/team', label: 'Team' },
  { path: '/dashboard/training', label: 'Training Records' },
  { path: '/dashboard/training-catalog', label: 'Training Catalog' },
  { path: '/vendors', label: 'Vendors' },

  // Section hubs
  { path: '/food-safety', label: 'Food Safety Hub' },
  { path: '/facility-safety', label: 'Fire Safety' },
  { path: '/compliance', label: 'Compliance Hub' },
  { path: '/insights', label: 'Insights Hub' },

  // Other
  { path: '/calendar', label: 'Calendar' },
  { path: '/help', label: 'Help' },
  { path: '/upgrade', label: 'Upgrade' },
];

// ── State ──────────────────────────────────────────────────────
const findings = [];
const consoleMsgs = [];
const networkFailures = [];

function slugify(s) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

// ── Main ──────────────────────────────────────────────────────

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // ── LAPTOP VIEWPORT (1280x800) ──────────────────────────────
  console.log('\n=== LAPTOP VIEWPORT (1280x800) ===\n');
  const laptopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const laptopPage = await laptopCtx.newPage();

  // Console capture
  laptopPage.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMsgs.push({ page: 'unknown', type: msg.type(), text: msg.text() });
    }
  });

  // Login
  console.log('Logging in as verify9...');
  await laptopPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await laptopPage.locator('input[type="email"]').first().fill(EMAIL);
  await laptopPage.locator('input[type="password"]').first().fill(PASSWORD);
  await laptopPage.locator('button[type="submit"]').click();
  await laptopPage.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
  await laptopPage.waitForTimeout(2000);
  console.log('Logged in successfully.\n');

  let pageIndex = 0;
  for (const pg of PAGES) {
    pageIndex++;
    const viewport = 'laptop';
    const consoleStart = consoleMsgs.length;
    process.stdout.write(`  [${pageIndex}/${PAGES.length}] ${pg.label} ... `);

    // Track network failures
    const responseHandler = async (response) => {
      const status = response.status();
      if (status >= 400 && !response.url().includes('analytics') && !response.url().includes('crisp') && !response.url().includes('cdn-cgi')) {
        const body = await response.text().catch(() => '');
        networkFailures.push({ page: pg.label, url: response.url(), status, body: body.substring(0, 500) });
      }
    };
    laptopPage.on('response', responseHandler);

    try {
      await laptopPage.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await laptopPage.waitForTimeout(2500);

      // Tag console messages
      for (let i = consoleStart; i < consoleMsgs.length; i++) {
        consoleMsgs[i].page = pg.label;
      }

      // Screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `page-${slugify(pg.label)}-${viewport}.png`);
      await laptopPage.screenshot({ path: screenshotPath, fullPage: true });

      // Check for fake data in rendered text
      const bodyText = await laptopPage.locator('body').innerText().catch(() => '');
      for (const pattern of FAKE_DATA_PATTERNS) {
        if (bodyText.includes(pattern)) {
          const isPlaceholder = await laptopPage.locator(`[placeholder*="${pattern}"]`).count() > 0;
          if (!isPlaceholder) {
            findings.push({
              page: pg.label, path: pg.path, viewport,
              severity: 'high', category: 'fake-data',
              description: `Fake data in rendered text: "${pattern}"`,
            });
          }
        }
      }

      // Check for error text
      const hasError = /something went wrong|unexpected error|500 internal/i.test(bodyText);
      if (hasError) {
        findings.push({
          page: pg.label, path: pg.path, viewport,
          severity: 'critical', category: 'error',
          description: 'Error message visible on page',
          evidence: bodyText.match(/(something went wrong|unexpected error|500 internal)[^\n]*/i)?.[0] || '',
        });
      }

      // Check horizontal overflow
      const hasOverflow = await laptopPage.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      if (hasOverflow) {
        findings.push({
          page: pg.label, path: pg.path, viewport,
          severity: 'medium', category: 'layout',
          description: 'Horizontal overflow detected',
        });
      }

      // Check for containing-block issues on fixed elements
      const containingBlockIssues = await laptopPage.evaluate(() => {
        const fixedEls = document.querySelectorAll('[class*="fixed"]');
        const results = [];
        for (const el of fixedEls) {
          let ancestor = el.parentElement;
          while (ancestor && ancestor !== document.body) {
            const cs = getComputedStyle(ancestor);
            const issues = [];
            if (cs.transform !== 'none') issues.push(`transform:${cs.transform}`);
            if (cs.isolation === 'isolate') issues.push('isolation:isolate');
            if (cs.willChange !== 'auto') issues.push(`will-change:${cs.willChange}`);
            if (cs.filter !== 'none') issues.push(`filter:${cs.filter}`);
            if (issues.length > 0) {
              results.push(`<${ancestor.tagName.toLowerCase()} class="${(ancestor.className || '').toString().substring(0, 60)}"> → ${issues.join(', ')}`);
            }
            ancestor = ancestor.parentElement;
          }
        }
        return [...new Set(results)];
      });
      if (containingBlockIssues.length > 0) {
        findings.push({
          page: pg.label, path: pg.path, viewport,
          severity: 'critical', category: 'containing-block',
          description: 'Fixed-position ancestors with containing-block CSS',
          evidence: containingBlockIssues.join(' | '),
        });
      }

      process.stdout.write('OK\n');
    } catch (err) {
      process.stdout.write(`FAIL: ${err.message.substring(0, 80)}\n`);
      findings.push({
        page: pg.label, path: pg.path, viewport,
        severity: 'critical', category: 'navigation',
        description: `Page failed to load: ${err.message.substring(0, 200)}`,
      });
    }

    laptopPage.off('response', responseHandler);
  }

  await laptopCtx.close();

  // ── MOBILE VIEWPORT (375x667) ──────────────────────────────
  console.log('\n=== MOBILE VIEWPORT (375x667) ===\n');
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 667 },
    ignoreHTTPSErrors: true,
    isMobile: true,
  });
  const mobilePage = await mobileCtx.newPage();

  // Login on mobile
  console.log('Logging in (mobile)...');
  await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.locator('input[type="email"]').first().fill(EMAIL);
  await mobilePage.locator('input[type="password"]').first().fill(PASSWORD);
  await mobilePage.locator('button[type="submit"]').click();
  await mobilePage.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
  await mobilePage.waitForTimeout(2000);
  console.log('Logged in.\n');

  const MOBILE_PAGES = PAGES.slice(0, 25);
  pageIndex = 0;
  for (const pg of MOBILE_PAGES) {
    pageIndex++;
    process.stdout.write(`  [${pageIndex}/${MOBILE_PAGES.length}] ${pg.label} ... `);
    try {
      await mobilePage.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await mobilePage.waitForTimeout(2000);

      const screenshotPath = path.join(SCREENSHOT_DIR, `page-${slugify(pg.label)}-mobile.png`);
      await mobilePage.screenshot({ path: screenshotPath, fullPage: true });

      // Check horizontal overflow on mobile
      const hasOverflow = await mobilePage.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      if (hasOverflow) {
        findings.push({
          page: pg.label, path: pg.path, viewport: 'mobile',
          severity: 'medium', category: 'layout',
          description: 'Horizontal overflow on mobile',
        });
      }

      // Check fake data on mobile too
      const bodyText = await mobilePage.locator('body').innerText().catch(() => '');
      for (const pattern of FAKE_DATA_PATTERNS) {
        if (bodyText.includes(pattern)) {
          const isPlaceholder = await mobilePage.locator(`[placeholder*="${pattern}"]`).count() > 0;
          if (!isPlaceholder) {
            // Only add if not already found on laptop
            const already = findings.some(f => f.page === pg.label && f.category === 'fake-data' && f.description.includes(pattern));
            if (!already) {
              findings.push({
                page: pg.label, path: pg.path, viewport: 'mobile',
                severity: 'high', category: 'fake-data',
                description: `Fake data in rendered text (mobile): "${pattern}"`,
              });
            }
          }
        }
      }

      process.stdout.write('OK\n');
    } catch (err) {
      process.stdout.write(`FAIL: ${err.message.substring(0, 80)}\n`);
    }
  }

  await mobileCtx.close();

  // ── DESKTOP VIEWPORT (1920x1080) ──────────────────────────────
  console.log('\n=== DESKTOP VIEWPORT (1920x1080) ===\n');
  const desktopCtx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const desktopPage = await desktopCtx.newPage();

  console.log('Logging in (desktop)...');
  await desktopPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await desktopPage.locator('input[type="email"]').first().fill(EMAIL);
  await desktopPage.locator('input[type="password"]').first().fill(PASSWORD);
  await desktopPage.locator('button[type="submit"]').click();
  await desktopPage.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
  await desktopPage.waitForTimeout(2000);
  console.log('Logged in.\n');

  const DESKTOP_PAGES = PAGES.slice(0, 20);
  pageIndex = 0;
  for (const pg of DESKTOP_PAGES) {
    pageIndex++;
    process.stdout.write(`  [${pageIndex}/${DESKTOP_PAGES.length}] ${pg.label} ... `);
    try {
      await desktopPage.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await desktopPage.waitForTimeout(2000);

      const screenshotPath = path.join(SCREENSHOT_DIR, `page-${slugify(pg.label)}-desktop.png`);
      await desktopPage.screenshot({ path: screenshotPath, fullPage: true });

      process.stdout.write('OK\n');
    } catch (err) {
      process.stdout.write(`FAIL: ${err.message.substring(0, 80)}\n`);
    }
  }

  await desktopCtx.close();
  await browser.close();

  // ── Generate Report ──────────────────────────────────────────
  const now = new Date().toISOString().split('T')[0];
  const critical = findings.filter(f => f.severity === 'critical');
  const high = findings.filter(f => f.severity === 'high');
  const medium = findings.filter(f => f.severity === 'medium');

  let md = `# UI Sweep Report — verify9 (Playwright) — ${now}\n\n`;
  md += `**Base URL:** ${BASE_URL}\n`;
  md += `**Viewports:** Laptop (1280x800), Mobile (375x667), Desktop (1920x1080)\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n|--------|-------|\n`;
  md += `| Total pages checked | ${PAGES.length} |\n`;
  md += `| Screenshots captured | ${fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).length} |\n`;
  md += `| Critical findings | ${critical.length} |\n`;
  md += `| Fake data findings | ${findings.filter(f => f.category === 'fake-data').length} |\n`;
  md += `| Layout issues | ${findings.filter(f => f.category === 'layout').length} |\n`;
  md += `| Console errors | ${consoleMsgs.filter(m => m.type === 'error').length} |\n`;
  md += `| Network failures (4xx/5xx) | ${networkFailures.length} |\n`;
  md += `| Total findings | ${findings.length} |\n\n`;

  if (critical.length) {
    md += `## Critical\n\n`;
    for (const f of critical) {
      md += `- **${f.page}** (${f.path}) [${f.viewport}] — ${f.category}: ${f.description}\n`;
      if (f.evidence) md += `  - Evidence: \`${f.evidence.substring(0, 300)}\`\n`;
    }
    md += `\n`;
  }

  if (high.length) {
    md += `## High — Fake Data\n\n`;
    for (const f of high) {
      md += `- **${f.page}** (${f.path}) [${f.viewport}] — ${f.description}\n`;
    }
    md += `\n`;
  }

  if (medium.length) {
    md += `## Medium — Layout / Branding\n\n`;
    for (const f of medium) {
      md += `- **${f.page}** (${f.path}) [${f.viewport}] — ${f.description}\n`;
    }
    md += `\n`;
  }

  if (consoleMsgs.length) {
    md += `## Console Errors\n\n`;
    const deduped = [...new Map(consoleMsgs.map(m => [m.page + m.text.substring(0, 100), m])).values()];
    for (const m of deduped.slice(0, 50)) {
      md += `- **${m.page}** [${m.type}]: ${m.text.substring(0, 200)}\n`;
    }
    md += `\n`;
  }

  if (networkFailures.length) {
    md += `## Network Failures\n\n`;
    const deduped = [...new Map(networkFailures.map(f => [f.page + f.url, f])).values()];
    for (const f of deduped.slice(0, 50)) {
      md += `- **${f.page}** | ${f.status} | \`${f.url.substring(0, 120)}\`\n`;
    }
    md += `\n`;
  }

  // Screenshot index
  md += `## Screenshots\n\n`;
  const screenshots = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')).sort();
  for (const s of screenshots) {
    md += `- \`${s}\`\n`;
  }

  fs.writeFileSync(REPORT_PATH, md);
  console.log(`\n========================================`);
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}/ (${screenshots.length} images)`);
  console.log(`Findings: ${findings.length} total (${critical.length} critical, ${high.length} high)`);
  console.log(`========================================\n`);
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
