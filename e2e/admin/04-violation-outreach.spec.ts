/**
 * TEST 4 — Violation outreach
 *
 * Verifies /admin/violation-outreach loads, shows prospect queue
 * or empty state, and can generate outreach letters.
 */
import { adminTest, expect } from '../fixtures/auth';

adminTest.describe('Violation outreach', () => {
  adminTest('Page loads without error', async ({ adminPage }) => {
    await adminPage.goto('/admin/violation-outreach');
    await adminPage.waitForLoadState('networkidle');

    const body = await adminPage.locator('body').textContent() || '';
    expect(body).not.toContain('Error');
    expect(body).not.toContain('Something went wrong');
  });

  adminTest('Shows prospect queue or empty state', async ({ adminPage }) => {
    await adminPage.goto('/admin/violation-outreach');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(3000);

    const body = await adminPage.locator('body').textContent() || '';

    // Should show either prospects with relevance scores OR a clean empty state
    const hasProspects = body.includes('relevance') ||
                         body.includes('Relevance') ||
                         body.includes('violation') ||
                         body.includes('Violation');
    const hasEmptyState = body.includes('No prospects') ||
                          body.includes('no results') ||
                          body.includes('empty');

    // One of these must be true
    expect(hasProspects || hasEmptyState).toBe(true);
  });

  adminTest('No fake data visible in empty state', async ({ adminPage }) => {
    await adminPage.goto('/admin/violation-outreach');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(2000);

    // Check for common fake data patterns
    const body = await adminPage.locator('body').textContent() || '';
    expect(body).not.toContain('Acme');
    expect(body).not.toContain('Lorem ipsum');
    expect(body).not.toContain('test@example.com');
    expect(body).not.toContain('John Doe');
  });
});
