/**
 * E2E-TEST-ADMIN-01 — Auth fixtures for Playwright
 *
 * Provides authenticated page contexts for different roles.
 * Credentials come from environment variables:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD
 *   E2E_KITCHEN_EMAIL / E2E_KITCHEN_PASSWORD
 *
 * Usage in tests:
 *   import { adminTest, operatorTest } from '../fixtures/auth';
 *   adminTest('my test', async ({ adminPage }) => { ... });
 */
import { test as base, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAs(page: Page, email: string, password: string, loginPath = '/login') {
  await page.goto(loginPath);
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.locator('input[name="email"], input#email').fill(email);
  await page.locator('input[name="password"], input#password').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env vars required');
  await loginAs(page, email, password, '/admin-login');
}

async function loginAsOperator(page: Page) {
  const email = process.env.E2E_OPERATOR_EMAIL;
  const password = process.env.E2E_OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD env vars required');
  await loginAs(page, email, password);
}

async function loginAsKitchenStaff(page: Page) {
  const email = process.env.E2E_KITCHEN_EMAIL;
  const password = process.env.E2E_KITCHEN_PASSWORD;
  if (!email || !password) throw new Error('E2E_KITCHEN_EMAIL / E2E_KITCHEN_PASSWORD env vars required');
  await loginAs(page, email, password);
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

type AdminFixtures = {
  adminPage: Page;
};

type OperatorFixtures = {
  operatorPage: Page;
};

type KitchenFixtures = {
  kitchenPage: Page;
};

type DualFixtures = {
  adminPage: Page;
  operatorPage: Page;
};

/** Test with an authenticated admin page */
export const adminTest = base.extend<AdminFixtures>({
  adminPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
});

/** Test with an authenticated operator page */
export const operatorTest = base.extend<OperatorFixtures>({
  operatorPage: async ({ page }, use) => {
    await loginAsOperator(page);
    await use(page);
  },
});

/** Test with an authenticated kitchen staff page */
export const kitchenTest = base.extend<KitchenFixtures>({
  kitchenPage: async ({ page }, use) => {
    await loginAsKitchenStaff(page);
    await use(page);
  },
});

/** Test with BOTH admin and operator pages (two browser contexts) */
export const dualTest = base.extend<DualFixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await use(page);
    await ctx.close();
  },
  operatorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsOperator(page);
    await use(page);
    await ctx.close();
  },
});

export { expect };
