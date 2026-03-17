import { test, expect } from '@playwright/test';

/**
 * UX Quality tests — validate emotional arc, no dead ends,
 * no EvidLY-generated scores, and brand consistency.
 *
 * Note: 404 page uses multi-segment URL to bypass /:slug county catch-all.
 */

test.describe('UX — No Dead Ends', () => {
  test('404 page has navigation back to dashboard', async ({ page }) => {
    // Multi-segment URL bypasses /:slug county route
    await page.goto('/not/a/real/page');
    await page.waitForLoadState('networkidle');

    // Should show 404 heading
    await expect(page.locator('h1')).toContainText('404');

    // Should have a link back to dashboard
    const dashLink = page.locator('a:has-text("Go to Dashboard")');
    await expect(dashLink).toBeVisible();

    // Clicking should navigate
    await dashLink.click();
    await expect(page).toHaveURL(/dashboard|login/);
  });
});

test.describe('UX — No EvidLY-Generated Scores', () => {
  test('Operations Check report shows posture, never "Compliance Score"', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    // Fill form
    await page.getByTestId('intake-first-name').fill('UX Test');
    await page.getByTestId('intake-email').fill('ux@test.com');
    await page.getByTestId('intake-county').selectOption('Fresno');
    await page.getByTestId('intake-submit').click();

    // Answer all 11 with Yes
    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-yes').click();
    }

    // Report should show posture label
    await expect(page.getByTestId('operations-check-report')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('posture-badge')).toContainText('Well Positioned', { timeout: 10000 });

    // Must never display a generated score value or letter grade.
    // The disclaimer mentioning "compliance score" in context of "this is NOT a compliance score" is fine.
    const reportText = await page.getByTestId('operations-check-report').textContent();
    expect(reportText).not.toMatch(/Your Compliance Score/i);
    expect(reportText).not.toMatch(/Compliance Score:\s*\d/i);
    expect(reportText).not.toMatch(/Grade:\s*[A-F]/i);
    expect(reportText).not.toMatch(/EvidLY Score/i);
  });

  test('All-no answers show "Critical Gaps Identified"', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('intake-first-name').fill('Critical Test');
    await page.getByTestId('intake-email').fill('critical@test.com');
    await page.getByTestId('intake-county').selectOption('Los Angeles');
    await page.getByTestId('intake-submit').click();

    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-no').click();
    }

    await expect(page.getByTestId('posture-badge')).toContainText('Critical Gaps Identified', { timeout: 10000 });
  });
});

test.describe('UX — Emotional Arc', () => {
  test('all-yes report has CTAs (Book Tour + Start Trial)', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('intake-first-name').fill('CTA Test');
    await page.getByTestId('intake-email').fill('cta@test.com');
    await page.getByTestId('intake-business').fill('CTA Kitchen');
    await page.getByTestId('intake-county').selectOption('Orange');
    await page.getByTestId('intake-submit').click();

    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-yes').click();
    }

    await expect(page.getByTestId('operations-check-report')).toBeVisible({ timeout: 15000 });

    // Should have CTA buttons
    await expect(page.locator('text=/Book.*Tour|Schedule Now/i').first()).toBeVisible();
    await expect(page.locator('text=/Start.*Free|Get Started/i').first()).toBeVisible();
  });

  test('all-no report has Priority Action Items', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('intake-first-name').fill('Priority Test');
    await page.getByTestId('intake-email').fill('priority@test.com');
    await page.getByTestId('intake-county').selectOption('San Diego');
    await page.getByTestId('intake-submit').click();

    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-no').click();
    }

    await expect(page.getByTestId('operations-check-report')).toBeVisible({ timeout: 15000 });

    // Should show priority action items
    await expect(page.locator('text=/Priority Action Items/i')).toBeVisible();
  });

  test('report includes executive summary with business name', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('intake-first-name').fill('Summary Test');
    await page.getByTestId('intake-email').fill('summary@test.com');
    await page.getByTestId('intake-business').fill('Acme Kitchen Co');
    await page.getByTestId('intake-county').selectOption('Alameda');
    await page.getByTestId('intake-submit').click();

    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-yes').click();
    }

    await expect(page.getByTestId('operations-check-report')).toBeVisible({ timeout: 15000 });

    // Executive summary should mention the business name
    await expect(page.locator('text=/Executive Summary/i')).toBeVisible();
    await expect(page.locator('text=/Acme Kitchen Co/i').first()).toBeVisible();
  });
});

test.describe('UX — Brand Consistency', () => {
  test('Operations Check uses gold (#A08C5A) on submit button', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByTestId('intake-submit');
    await expect(submitBtn).toBeVisible();
    const bgColor = await submitBtn.evaluate(
      el => window.getComputedStyle(el).backgroundColor
    );

    // Gold #A08C5A = rgb(160, 140, 90)
    expect(bgColor).toBe('rgb(160, 140, 90)');
  });

  test('404 page uses navy (#1E2D4D) for heading', async ({ page }) => {
    // Multi-segment URL bypasses /:slug county route
    await page.goto('/not/a/real/page');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1');
    await expect(heading).toContainText('404');
    const color = await heading.evaluate(
      el => window.getComputedStyle(el).color
    );

    // Navy #1E2D4D = rgb(30, 45, 77)
    expect(color).toBe('rgb(30, 45, 77)');
  });
});
