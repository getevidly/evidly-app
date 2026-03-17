/**
 * TEST 9 — Role gates
 *
 * Verifies that non-admin roles cannot access admin routes,
 * admin nav items are hidden, and role-specific content is gated.
 */
import { kitchenTest, operatorTest, adminTest, expect } from '../fixtures/auth';
import { test } from '@playwright/test';

kitchenTest.describe('Kitchen Staff role gates', () => {
  kitchenTest('Admin nav items NOT visible', async ({ kitchenPage }) => {
    await kitchenPage.waitForLoadState('networkidle');
    await kitchenPage.waitForTimeout(2000);

    const body = await kitchenPage.locator('body').textContent() || '';

    // These admin-only items should NOT appear
    expect(body).not.toContain('Sales Pipeline');
    expect(body).not.toContain('Demo Generator');
    expect(body).not.toContain('Demo Launcher');
    expect(body).not.toContain('Demo Pipeline');
  });

  kitchenTest('/admin/* routes redirect to /dashboard', async ({ kitchenPage }) => {
    await kitchenPage.goto('/admin/users');
    await kitchenPage.waitForTimeout(3000);

    const url = kitchenPage.url();
    // Should NOT be on an admin page
    expect(url).not.toContain('/admin/users');
  });

  kitchenTest('CIC scores NOT visible', async ({ kitchenPage }) => {
    await kitchenPage.goto('/dashboard');
    await kitchenPage.waitForLoadState('networkidle');

    const body = await kitchenPage.locator('body').textContent() || '';
    expect(body).not.toMatch(/CIC Score/i);
  });
});

operatorTest.describe('Owner/Operator role gates', () => {
  operatorTest('Full dashboard visible', async ({ operatorPage }) => {
    await operatorPage.goto('/dashboard');
    await operatorPage.waitForLoadState('networkidle');

    const body = await operatorPage.locator('body').textContent() || '';
    expect(body).not.toContain('Error');
    // Dashboard should have content
    await expect(operatorPage.locator('body')).not.toBeEmpty();
  });

  operatorTest('Admin nav NOT visible for operator', async ({ operatorPage }) => {
    await operatorPage.goto('/dashboard');
    await operatorPage.waitForLoadState('networkidle');
    await operatorPage.waitForTimeout(2000);

    const body = await operatorPage.locator('body').textContent() || '';
    expect(body).not.toContain('Sales Pipeline');
    expect(body).not.toContain('Demo Generator');
  });

  operatorTest('/admin/* redirects for operator', async ({ operatorPage }) => {
    await operatorPage.goto('/admin/users');
    await operatorPage.waitForTimeout(3000);

    const url = operatorPage.url();
    expect(url).not.toContain('/admin/users');
  });

  operatorTest('CIC scores NOT visible for operator', async ({ operatorPage }) => {
    await operatorPage.goto('/dashboard');
    await operatorPage.waitForLoadState('networkidle');

    const body = await operatorPage.locator('body').textContent() || '';
    expect(body).not.toMatch(/CIC Score/i);
  });
});

test.describe('Unauthenticated admin access', () => {
  test('/admin routes redirect when not logged in', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForTimeout(3000);

    const url = page.url();
    // Should redirect to login or dashboard
    const redirected = url.includes('/login') ||
                       url.includes('/dashboard') ||
                       url.includes('/admin-login') ||
                       !url.includes('/admin/users');
    expect(redirected).toBe(true);
  });
});
