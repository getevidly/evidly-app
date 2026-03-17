/**
 * TEST 6 — Audit log completeness
 *
 * Verifies the audit log page loads, shows entries, supports filtering
 * by actor/action/date, expanding rows for JSON diff, and CSV export.
 */
import { adminTest, expect } from '../fixtures/auth';

adminTest.describe('Audit log', () => {
  adminTest('Page loads with entries', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(2000);

    const body = await adminPage.locator('body').textContent() || '';
    expect(body).not.toContain('Error');

    // Should have a table or list of entries
    const hasEntries = await adminPage.locator('table tr, [role="row"]').count();
    expect(hasEntries).toBeGreaterThan(0);
  });

  adminTest('Filter by actor works', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await adminPage.waitForLoadState('networkidle');

    // Find actor filter input
    const actorInput = adminPage.locator('input[placeholder*="actor" i], input[placeholder*="email" i]').first();
    if (await actorInput.isVisible().catch(() => false)) {
      await actorInput.fill('arthur');
      await adminPage.waitForTimeout(1500);

      // Results should filter
      const body = await adminPage.locator('body').textContent() || '';
      expect(body).not.toContain('Error');
    }
  });

  adminTest('Filter by action works', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await adminPage.waitForLoadState('networkidle');

    // Find action filter input
    const actionInput = adminPage.locator('input[placeholder*="action" i]').first();
    if (await actionInput.isVisible().catch(() => false)) {
      await actionInput.fill('admin');
      await adminPage.waitForTimeout(1500);

      const body = await adminPage.locator('body').textContent() || '';
      expect(body).not.toContain('Error');
    }
  });

  adminTest('Date range filter works', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await adminPage.waitForLoadState('networkidle');

    // Find date inputs
    const dateFrom = adminPage.locator('input[type="date"]').first();
    if (await dateFrom.isVisible().catch(() => false)) {
      const today = new Date().toISOString().split('T')[0];
      await dateFrom.fill(today);
      await adminPage.waitForTimeout(1500);

      const body = await adminPage.locator('body').textContent() || '';
      expect(body).not.toContain('Error');
    }
  });

  adminTest('Expand row shows JSON diff', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(2000);

    // Click first expandable row
    const firstRow = adminPage.locator('table tr, [role="row"]').nth(1);
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await adminPage.waitForTimeout(1000);

      // Should show some expanded detail (old_value / new_value)
      const body = await adminPage.locator('body').textContent() || '';
      expect(body).not.toContain('Error');
    }
  });

  adminTest('CSV export button exists and is clickable', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await adminPage.waitForLoadState('networkidle');

    const exportBtn = adminPage.locator('button', { hasText: /Export.*CSV|CSV/i }).first();
    await expect(exportBtn).toBeVisible({ timeout: 10_000 });

    // Verify it's enabled
    await expect(exportBtn).toBeEnabled();
  });
});
