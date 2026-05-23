/**
 * UI-SWEEP-01 — Comprehensive Authenticated UI Sweep
 *
 * Logs in as verify9 (owner_operator, zero data) and walks every
 * authenticated page at 3 viewport sizes.
 *
 * Captures: screenshots, console errors, network failures, fake data
 * strings, modal positioning, branding violations, empty states.
 *
 * Run:
 *   E2E_OPERATOR_EMAIL=alhagg67+verify9@gmail.com \
 *   E2E_OPERATOR_PASSWORD=<password> \
 *   npx playwright test e2e/ui-sweep.spec.ts --project="Desktop Chrome"
 *
 * Or for all viewports:
 *   npx playwright test e2e/ui-sweep.spec.ts
 *
 * Output: test-results/ui-sweep-report.md + screenshots in test-results/ui-sweep/
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ──────────────────────────────────────────────────────
const BASE_URL = process.env.SWEEP_BASE_URL || 'https://app.getevidly.com';
const EMAIL = process.env.E2E_OPERATOR_EMAIL || 'alhagg67+verify9@gmail.com';
const PASSWORD = process.env.E2E_OPERATOR_PASSWORD || '';
const SCREENSHOT_DIR = 'test-results/ui-sweep';
const REPORT_PATH = 'test-results/ui-sweep-report.md';

// Fake data patterns to search for in rendered text
const FAKE_DATA_PATTERNS = [
  'Downtown Kitchen', 'University Dining', 'Airport Terminal', 'Airport Concourse',
  'Location 1', 'Location 2', 'Location 3',
  'Mike Johnson', 'Sarah Chen', 'Emma Davis', 'John Smith', 'Jane Doe',
  'HoodOps', 'hoodops.com',
  '(555) 123-4567', '123 Main St', '93721',
];

// Branding patterns
const BRANDING_VIOLATIONS = [
  { pattern: 'PRODUCTION', context: 'env badge' },
  { pattern: 'DEVELOPMENT', context: 'env badge' },
  { pattern: 'STAGING', context: 'env badge' },
];

// Pages to visit — path + human label
const PAGES: { path: string; label: string }[] = [
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
  { path: '/settings/team-roles', label: 'Settings - Team & Roles' },
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

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
];

// ── Types ────────────────────────────────────────────────────────
interface PageFinding {
  page: string;
  path: string;
  viewport: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  evidence?: string;
}

interface ConsoleMsg {
  page: string;
  type: string;
  text: string;
}

interface NetworkFailure {
  page: string;
  url: string;
  status: number;
  body: string;
}

// ── Shared state ─────────────────────────────────────────────────
const findings: PageFinding[] = [];
const consoleMsgs: ConsoleMsg[] = [];
const networkFailures: NetworkFailure[] = [];

// ── Helpers ──────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function loginAsVerify9(page: Page) {
  if (!PASSWORD) throw new Error('Set E2E_OPERATOR_PASSWORD env var for verify9');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('input[name="email"], input#email, input[type="email"]').first().fill(EMAIL);
  await page.locator('input[name="password"], input#password, input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
  // Wait for profile to load
  await page.waitForTimeout(2000);
}

async function searchForFakeData(page: Page, pageLabel: string, viewport: string) {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  for (const pattern of FAKE_DATA_PATTERNS) {
    if (bodyText.includes(pattern)) {
      // Check if it's in a placeholder attribute (acceptable) or in rendered text (bug)
      const isPlaceholder = await page.locator(`[placeholder*="${pattern}"]`).count() > 0;
      if (!isPlaceholder) {
        findings.push({
          page: pageLabel, path: '', viewport,
          severity: 'high',
          category: 'fake-data',
          description: `Fake data found in rendered text: "${pattern}"`,
        });
      }
    }
  }
  // Branding violations
  for (const { pattern, context } of BRANDING_VIOLATIONS) {
    const count = await page.locator(`text="${pattern}"`).count();
    if (count > 0) {
      findings.push({
        page: pageLabel, path: '', viewport,
        severity: 'medium',
        category: 'branding',
        description: `Branding violation: "${pattern}" visible (${context})`,
      });
    }
  }
}

async function checkEmptyState(page: Page, pageLabel: string, viewport: string) {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const hasEmptyState = /no .* yet|get started|no .* found|empty|add your first/i.test(bodyText);
  const hasSpinner = await page.locator('.animate-spin').count() > 0;
  const hasError = /error|failed|something went wrong/i.test(bodyText);

  if (hasError && !hasSpinner) {
    findings.push({
      page: pageLabel, path: '', viewport,
      severity: 'critical',
      category: 'error',
      description: 'Error text visible on page',
      evidence: bodyText.match(/(error|failed|something went wrong)[^\n]*/i)?.[0] || '',
    });
  }
}

async function checkModals(page: Page, pageLabel: string, viewport: string) {
  // Find buttons that might open modals
  const modalTriggers = page.locator(
    'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), ' +
    'button:has-text("Edit"), button[aria-label*="add" i], button[aria-label*="new" i]'
  );
  const count = await modalTriggers.count();

  for (let i = 0; i < Math.min(count, 5); i++) { // Cap at 5 modals per page
    const btn = modalTriggers.nth(i);
    const btnText = await btn.innerText().catch(() => '');
    const isVisible = await btn.isVisible().catch(() => false);
    if (!isVisible) continue;

    try {
      await btn.click({ timeout: 3000 });
      await page.waitForTimeout(500);

      // Check if a modal appeared
      const modal = page.locator('[class*="fixed"][class*="inset-0"], [class*="fixed inset-0"]').first();
      const modalVisible = await modal.isVisible().catch(() => false);

      if (modalVisible) {
        // Screenshot the modal
        const screenshotName = `modal-${slugify(pageLabel)}-${slugify(btnText)}-${viewport}.png`;
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName), fullPage: false });

        // Check modal positioning - get bounding box
        const box = await modal.boundingBox();
        if (box && box.y < -10) {
          findings.push({
            page: pageLabel, path: '', viewport,
            severity: 'critical',
            category: 'modal-positioning',
            description: `Modal "${btnText}" positioned above viewport (y=${box.y})`,
            evidence: screenshotName,
          });
        }

        // Check for containing block ancestors
        const containingBlockInfo = await page.evaluate(() => {
          const modals = document.querySelectorAll('[class*="fixed"]');
          const results: string[] = [];
          for (const modal of modals) {
            let el = modal.parentElement;
            while (el && el !== document.body) {
              const cs = getComputedStyle(el);
              const issues: string[] = [];
              if (cs.transform !== 'none') issues.push(`transform:${cs.transform}`);
              if (cs.willChange !== 'auto') issues.push(`will-change:${cs.willChange}`);
              if (cs.filter !== 'none') issues.push(`filter:${cs.filter}`);
              if (cs.backdropFilter && cs.backdropFilter !== 'none') issues.push(`backdrop-filter:${cs.backdropFilter}`);
              if ((cs as any).contain && (cs as any).contain !== 'none') issues.push(`contain:${(cs as any).contain}`);
              if (cs.isolation === 'isolate') issues.push('isolation:isolate');
              if (issues.length > 0) {
                results.push(`<${el.tagName.toLowerCase()} class="${el.className.substring(0, 80)}"> → ${issues.join(', ')}`);
              }
              el = el.parentElement;
            }
          }
          return results;
        });

        if (containingBlockInfo.length > 0) {
          findings.push({
            page: pageLabel, path: '', viewport,
            severity: 'critical',
            category: 'containing-block',
            description: `Modal ancestors with containing-block properties`,
            evidence: containingBlockInfo.join('\n'),
          });
        }

        // Close modal
        const closeBtn = page.locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label="Close"], [class*="fixed"] button:has(svg)').first();
        await closeBtn.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch {
      // Button click failed or modal didn't appear — skip
    }
  }
}

async function checkHorizontalOverflow(page: Page, pageLabel: string, viewport: string) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  if (hasOverflow) {
    findings.push({
      page: pageLabel, path: '', viewport,
      severity: 'medium',
      category: 'layout',
      description: 'Page has horizontal overflow (horizontal scroll)',
    });
  }
}

// ── Report generation ────────────────────────────────────────────

function generateReport(): string {
  const now = new Date().toISOString().split('T')[0];
  const critical = findings.filter(f => f.severity === 'critical');
  const high = findings.filter(f => f.severity === 'high');
  const medium = findings.filter(f => f.severity === 'medium');
  const low = findings.filter(f => f.severity === 'low');

  const uniquePages = new Set(findings.map(f => f.page));
  const pagesWithFake = new Set(findings.filter(f => f.category === 'fake-data').map(f => f.page));
  const pagesWithModalBugs = new Set(findings.filter(f => f.category.includes('modal')).map(f => f.page));
  const pagesWithErrors = new Set(findings.filter(f => f.category === 'error').map(f => f.page));

  let md = `# UI Sweep Report — verify9 — ${now}\n\n`;
  md += `## Summary\n`;
  md += `- Total pages checked: ${PAGES.length}\n`;
  md += `- Pages with critical bugs: ${pagesWithErrors.size}\n`;
  md += `- Pages with fake data: ${pagesWithFake.size}\n`;
  md += `- Modals with positioning bugs: ${pagesWithModalBugs.size}\n`;
  md += `- Console errors: ${consoleMsgs.filter(m => m.type === 'error').length}\n`;
  md += `- Network failures: ${networkFailures.length}\n`;
  md += `- Total findings: ${findings.length}\n\n`;

  md += `## Part 1: Structured Findings\n\n`;

  if (critical.length) {
    md += `### Critical (blocks user, breaks flow)\n\n`;
    for (const f of critical) {
      md += `- **${f.page}** [${f.viewport}] | ${f.category} | ${f.description}`;
      if (f.evidence) md += ` | Evidence: ${f.evidence}`;
      md += `\n`;
    }
    md += `\n`;
  }

  if (high.length) {
    md += `### High (broken feature, visible error)\n\n`;
    for (const f of high) {
      md += `- **${f.page}** [${f.viewport}] | ${f.category} | ${f.description}`;
      if (f.evidence) md += ` | Evidence: ${f.evidence}`;
      md += `\n`;
    }
    md += `\n`;
  }

  if (medium.length) {
    md += `### Medium (UX issue, workaround exists)\n\n`;
    for (const f of medium) {
      md += `- **${f.page}** [${f.viewport}] | ${f.category} | ${f.description}`;
      if (f.evidence) md += ` | Evidence: ${f.evidence}`;
      md += `\n`;
    }
    md += `\n`;
  }

  if (low.length) {
    md += `### Low (cosmetic, polish)\n\n`;
    for (const f of low) {
      md += `- **${f.page}** [${f.viewport}] | ${f.category} | ${f.description}`;
      if (f.evidence) md += ` | Evidence: ${f.evidence}`;
      md += `\n`;
    }
    md += `\n`;
  }

  // Console errors
  if (consoleMsgs.length) {
    md += `## Console Errors\n\n`;
    for (const m of consoleMsgs) {
      md += `- **${m.page}** [${m.type}]: ${m.text.substring(0, 200)}\n`;
    }
    md += `\n`;
  }

  // Network failures
  if (networkFailures.length) {
    md += `## Network Failures\n\n`;
    for (const f of networkFailures) {
      md += `- **${f.page}** | ${f.status} | ${f.url.substring(0, 120)}\n`;
      if (f.body) md += `  Response: ${f.body.substring(0, 200)}\n`;
    }
    md += `\n`;
  }

  return md;
}

// ── Main test ────────────────────────────────────────────────────

test.describe('UI Sweep — verify9', () => {
  test.describe.configure({ mode: 'serial' });
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Ensure screenshot dir exists
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    // Create context at laptop viewport (default)
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMsgs.push({ page: 'global', type: msg.type(), text: msg.text() });
      }
    });

    // Login
    await loginAsVerify9(page);
  });

  test.afterAll(async () => {
    // Write report
    const report = generateReport();
    fs.writeFileSync(REPORT_PATH, report);
    console.log(`\n✅ Report written to ${REPORT_PATH}`);
    console.log(`   Screenshots in ${SCREENSHOT_DIR}/`);
    console.log(`   Findings: ${findings.length} total`);

    await context?.close();
  });

  // Walk each page at laptop viewport
  for (const pg of PAGES) {
    test(`[laptop] ${pg.label} (${pg.path})`, async () => {
      test.setTimeout(30_000);
      const viewport = 'laptop';
      const currentConsoleStart = consoleMsgs.length;

      // Track network failures for this page
      const responseHandler = async (response: any) => {
        const status = response.status();
        if (status >= 400 && !response.url().includes('analytics') && !response.url().includes('crisp')) {
          const body = await response.text().catch(() => '');
          networkFailures.push({
            page: pg.label,
            url: response.url(),
            status,
            body: body.substring(0, 500),
          });
        }
      };
      page.on('response', responseHandler);

      // Navigate
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(2000); // Let data load

      // Tag console messages with this page
      for (let i = currentConsoleStart; i < consoleMsgs.length; i++) {
        consoleMsgs[i].page = pg.label;
      }

      // Screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `page-${slugify(pg.label)}-${viewport}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Checks
      await searchForFakeData(page, pg.label, viewport);
      await checkEmptyState(page, pg.label, viewport);
      await checkHorizontalOverflow(page, pg.label, viewport);

      // Modal check (only on laptop viewport to save time)
      await checkModals(page, pg.label, viewport);

      page.off('response', responseHandler);
    });
  }

  // Mobile viewport pass (subset of pages — check layout)
  const MOBILE_PAGES = PAGES.slice(0, 20); // First 20 pages for mobile

  test('Mobile viewport sweep', async ({ browser }) => {
    test.setTimeout(300_000);
    const mobileCtx = await browser.newContext({
      viewport: { width: 375, height: 667 },
      ignoreHTTPSErrors: true,
      isMobile: true,
    });
    const mobilePage = await mobileCtx.newPage();
    await loginAsVerify9(mobilePage);

    for (const pg of MOBILE_PAGES) {
      await mobilePage.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await mobilePage.waitForTimeout(1500);

      const screenshotPath = path.join(SCREENSHOT_DIR, `page-${slugify(pg.label)}-mobile.png`);
      await mobilePage.screenshot({ path: screenshotPath, fullPage: true });

      await checkHorizontalOverflow(mobilePage, pg.label, 'mobile');
      await searchForFakeData(mobilePage, pg.label, 'mobile');
    }

    await mobileCtx.close();
  });

  // Desktop viewport pass (subset)
  const DESKTOP_PAGES = PAGES.slice(0, 15);

  test('Desktop viewport sweep', async ({ browser }) => {
    test.setTimeout(300_000);
    const desktopCtx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    const desktopPage = await desktopCtx.newPage();
    await loginAsVerify9(desktopPage);

    for (const pg of DESKTOP_PAGES) {
      await desktopPage.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await desktopPage.waitForTimeout(1500);

      const screenshotPath = path.join(SCREENSHOT_DIR, `page-${slugify(pg.label)}-desktop.png`);
      await desktopPage.screenshot({ path: screenshotPath, fullPage: true });

      await checkHorizontalOverflow(desktopPage, pg.label, 'desktop');
    }

    await desktopCtx.close();
  });
});
