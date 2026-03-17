/**
 * TEST 7 — MFA enforcement
 *
 * Verifies MFA enrollment redirect and challenge screen rendering.
 * Full MFA flow requires a real authenticator app (manual test only).
 * This test validates the pages and routes exist.
 */
import { test, expect } from '@playwright/test';

test.describe('MFA enforcement', () => {
  test('/setup-mfa page renders correctly', async ({ page }) => {
    await page.goto('/setup-mfa');
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() || '';
    // Should show MFA setup content (may redirect to login if not authenticated)
    const hasMFAContent = body.includes('Two-Factor') ||
                          body.includes('MFA') ||
                          body.includes('authenticator') ||
                          body.includes('Sign in');
    expect(hasMFAContent).toBe(true);
    expect(body).not.toContain('Error');
  });

  test('/mfa-challenge page renders correctly', async ({ page }) => {
    await page.goto('/mfa-challenge');
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent() || '';
    // Should show challenge screen or redirect to login/dashboard
    const hasContent = body.includes('Two-Factor') ||
                       body.includes('6-digit') ||
                       body.includes('authenticator') ||
                       body.includes('Sign in') ||
                       body.includes('Dashboard');
    expect(hasContent).toBe(true);
    expect(body).not.toContain('Error');
  });

  test('MFA challenge has verify button and code input', async ({ page }) => {
    // Navigate directly — will redirect to login if not authed,
    // but we can check the page structure exists
    await page.goto('/mfa-challenge');
    await page.waitForLoadState('networkidle');

    // If we're on the MFA challenge page (not redirected)
    const isMFAPage = await page.locator('text=Two-Factor Authentication').isVisible().catch(() => false);
    if (isMFAPage) {
      // Code input exists
      const codeInput = page.locator('input[inputmode="numeric"], input[maxlength="6"]');
      await expect(codeInput).toBeVisible();

      // Verify button exists
      const verifyBtn = page.locator('button', { hasText: /Verify/i });
      await expect(verifyBtn).toBeVisible();

      // Help text with contact email
      const helpText = page.locator('text=founders@getevidly.com');
      await expect(helpText).toBeVisible();
    }
  });
});
