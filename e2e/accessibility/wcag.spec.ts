import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 AA compliance tests on public pages.
 * All rules enabled — violations are BLOCKING.
 *
 * Note: 404 page uses multi-segment URL to bypass /:slug county catch-all.
 * Note: EvidLY logotype text is excluded per WCAG 1.4.3 (logotype exemption).
 */

const PUBLIC_PAGES = [
  { name: 'Operations Check',  url: '/operations-check', excludeSelectors: ['a[href="/"] span'] },
  { name: 'Login',             url: '/login' },
  { name: 'Terms of Service',  url: '/terms' },
  { name: 'Privacy Policy',    url: '/privacy' },
];

test.describe('WCAG 2.1 AA — Public Pages', () => {
  for (const pageDef of PUBLIC_PAGES) {
    test(`${pageDef.name} passes axe-core WCAG 2.1 AA`, async ({ page }) => {
      await page.goto(pageDef.url);
      await page.waitForLoadState('networkidle');

      let builder = new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);

      // Exclude logotype elements (WCAG 1.4.3 exemption)
      if (pageDef.excludeSelectors) {
        for (const sel of pageDef.excludeSelectors) {
          builder = builder.exclude(sel);
        }
      }

      const results = await builder.analyze();

      if (results.violations.length > 0) {
        console.log(`\n${pageDef.name} violations:`);
        results.violations.forEach(v => {
          console.log(`  [${v.impact}] ${v.description}`);
          v.nodes.slice(0, 3).forEach(n => console.log(`    -> ${n.target}`));
        });
      }

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('WCAG 2.1 AA — 404 Page', () => {
  test('404 page passes axe-core WCAG 2.1 AA', async ({ page }) => {
    // Multi-segment URL bypasses /:slug county route
    await page.goto('/not/a/real/page');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .disableRules(['region'])  // 404 is a minimal page without landmark regions
      .analyze();

    if (results.violations.length > 0) {
      console.log('\n404 page violations:');
      results.violations.forEach(v => {
        console.log(`  [${v.impact}] ${v.description}`);
        v.nodes.slice(0, 3).forEach(n => console.log(`    -> ${n.target}`));
      });
    }

    expect(results.violations).toEqual([]);
  });
});

test.describe('Accessibility — Focused Tests', () => {
  test('Operations Check form — keyboard navigable', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    // Tab into the form area
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Active element should be an interactive element
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'A']).toContain(focused);
  });

  test('Operations Check — form inputs have labels', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
