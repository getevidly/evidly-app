import { test, expect } from '@playwright/test';

/**
 * Visual Regression — Screenshot diffs on public pages.
 *
 * First run: `npx playwright test e2e/visual/ --update-snapshots` to create baselines.
 * Subsequent runs diff against baselines.
 *
 * Note: 404 page uses multi-segment URL to bypass /:slug county catch-all.
 */

test.describe('Visual Regression — Public Pages', () => {
  test('Operations Check intake form', async ({ page }) => {
    await page.goto('/operations-check');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('operations-check-intake.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });

  test('Login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('404 page', async ({ page }) => {
    // Multi-segment URL bypasses /:slug county route
    await page.goto('/not/a/real/page');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('404-page.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Terms of Service', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('terms-page.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Privacy Policy', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('privacy-page.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
