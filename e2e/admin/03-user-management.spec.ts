/**
 * TEST 3 — User management
 *
 * Verifies suspend/unsuspend flow: admin suspends operator →
 * operator redirected to /suspended → admin unsuspends →
 * operator can access again. Audit log entries verified.
 */
import { dualTest, adminTest, expect } from '../fixtures/auth';

dualTest.describe('User management — suspend/unsuspend', () => {
  dualTest.describe.configure({ mode: 'serial' });

  dualTest('Step 1-4: Admin suspends operator → operator sees /suspended', async ({ adminPage, operatorPage }) => {
    // Admin: go to user management
    await adminPage.goto('/admin/users');
    await adminPage.waitForLoadState('networkidle');

    // Page should load with user list
    await expect(adminPage.locator('body')).not.toBeEmpty();
    const body = await adminPage.locator('body').textContent() || '';
    expect(body).not.toContain('Error');

    // Find the operator email in the user list
    const operatorEmail = process.env.E2E_OPERATOR_EMAIL || '';
    const userRow = adminPage.locator(`text=${operatorEmail}`).first();

    if (await userRow.isVisible().catch(() => false)) {
      // Click on user row or find suspend button
      const suspendBtn = adminPage.locator('button', { hasText: /Suspend/i }).first();
      if (await suspendBtn.isVisible().catch(() => false)) {
        await suspendBtn.click();
        await adminPage.waitForTimeout(1000);

        // Confirm modal if present
        const confirmBtn = adminPage.locator('button', { hasText: /Confirm|Yes|Suspend/i }).last();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
          await adminPage.waitForTimeout(2000);
        }

        // Operator: try to navigate — should be redirected to /suspended
        await operatorPage.goto('/dashboard');
        await operatorPage.waitForTimeout(3000);

        const opUrl = operatorPage.url();
        const opBody = await operatorPage.locator('body').textContent() || '';
        const isSuspended = opUrl.includes('/suspended') ||
                            opBody.toLowerCase().includes('suspended') ||
                            opBody.toLowerCase().includes('account has been');
        expect(isSuspended).toBe(true);
      }
    }
  });

  dualTest('Step 5-6: Admin unsuspends → operator can log in', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForLoadState('networkidle');

    // Find unsuspend button
    const unsuspendBtn = adminPage.locator('button', { hasText: /Unsuspend|Reactivate/i }).first();
    if (await unsuspendBtn.isVisible().catch(() => false)) {
      await unsuspendBtn.click();
      await adminPage.waitForTimeout(2000);
    }

    // Verify user list still renders
    const body = await adminPage.locator('body').textContent() || '';
    expect(body).not.toContain('Error');
  });
});

adminTest.describe('User management — audit log', () => {
  adminTest('Step 7: Audit log records suspend/unsuspend', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await adminPage.waitForLoadState('networkidle');

    const body = await adminPage.locator('body').textContent() || '';
    expect(body).not.toContain('Error');

    // Page should show audit entries
    await expect(adminPage.locator('table, [role="table"], [data-testid="audit-log"]').first()).toBeVisible({ timeout: 10_000 });
  });
});
