import { test, expect } from '@playwright/test';

test.describe('Operations Check — public lead magnet flow', () => {
  test('intake form → assessment → report renders', async ({ page }) => {
    await page.goto('/operations-check');

    // Fill required intake fields
    await page.getByTestId('intake-first-name').fill('E2E Test');
    await page.getByTestId('intake-email').fill('e2e@evidly-test.com');
    await page.getByTestId('intake-business').fill('E2E Kitchen');
    await page.getByTestId('intake-county').selectOption('Fresno');
    await page.getByTestId('intake-submit').click();

    // Answer all 11 questions with "Yes"
    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-yes').click();
    }

    // Report should render
    await expect(page.getByTestId('operations-check-report')).toBeVisible();
    // Posture badge should be visible
    await expect(page.getByTestId('posture-badge')).toBeVisible();
  });

  test('all-no answers produce a report with posture label', async ({ page }) => {
    await page.goto('/operations-check');

    await page.getByTestId('intake-first-name').fill('No Test');
    await page.getByTestId('intake-email').fill('no@evidly-test.com');
    await page.getByTestId('intake-county').selectOption('Los Angeles');
    await page.getByTestId('intake-submit').click();

    // Answer all 11 with "No"
    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-no').click();
    }

    await expect(page.getByTestId('operations-check-report')).toBeVisible();
    await expect(page.getByTestId('posture-badge')).toHaveText('Critical Gaps Identified');
  });

  test('report does not contain percentage or score text', async ({ page }) => {
    await page.goto('/operations-check');

    await page.getByTestId('intake-first-name').fill('Score Check');
    await page.getByTestId('intake-email').fill('score@evidly-test.com');
    await page.getByTestId('intake-county').selectOption('Orange');
    await page.getByTestId('intake-submit').click();

    for (let i = 0; i < 11; i++) {
      await page.getByTestId('answer-yes').click();
    }

    await expect(page.getByTestId('operations-check-report')).toBeVisible();
    const reportText = await page.getByTestId('operations-check-report').textContent();
    // Must never contain a percentage score (e.g. "85%")
    expect(reportText).not.toMatch(/\d+%/);
    // Must not present a "compliance score" as EvidLY's own output
    // (the disclaimer "it is not... a compliance score" is acceptable)
    expect(reportText?.toLowerCase()).not.toMatch(/your compliance score|compliance score:\s*\d/);
  });
});
