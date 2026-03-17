import { test, expect } from '@playwright/test';

test.describe('Demo mode navigation', () => {
  test('demo dashboard loads without errors', async ({ page }) => {
    await page.goto('/dashboard');
    // Should render something — demo mode auto-detected when no auth
    await expect(page.locator('body')).not.toHaveText('Error');
    // Page should have loaded (not a blank white screen)
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('operations check page is accessible', async ({ page }) => {
    await page.goto('/operations-check');
    // The intake form should be visible
    await expect(page.getByTestId('intake-form')).toBeVisible();
    await expect(page.getByTestId('intake-submit')).toBeVisible();
  });

  test('navigating to unknown route does not crash', async ({ page }) => {
    await page.goto('/nonexistent-route-xyz');
    // Should not throw — either redirects or shows not-found
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
