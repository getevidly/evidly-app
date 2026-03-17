/**
 * TEST 5 — HoodOps webhook (KEC service completion)
 *
 * This test requires HOODOPS_WEBHOOK_SECRET and valid UUIDs which are
 * only available at runtime. The test validates the webhook edge function
 * code path exists and the endpoint URL is reachable.
 *
 * Full webhook testing requires manual curl with real secrets.
 * See the manual checklist for step-by-step instructions.
 */
import { test, expect } from '@playwright/test';

test.describe('HoodOps webhook', () => {
  const WEBHOOK_URL = process.env.E2E_SUPABASE_URL
    ? `${process.env.E2E_SUPABASE_URL}/functions/v1/hoodops-webhook`
    : null;

  test('Webhook endpoint rejects unauthorized requests', async ({ request }) => {
    test.skip(!WEBHOOK_URL, 'E2E_SUPABASE_URL not set — skipping webhook test');

    // Fire without secret — should get 401
    const res = await request.post(WEBHOOK_URL!, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        event_type: 'service.completed',
        event_id: 'e2e-unauth-test',
        service_type_code: 'KEC',
      },
    });

    expect(res.status()).toBe(401);
  });

  test('Webhook endpoint rejects invalid event types', async ({ request }) => {
    test.skip(!WEBHOOK_URL || !process.env.E2E_HOODOPS_WEBHOOK_SECRET,
      'Webhook URL or secret not set — skipping');

    const res = await request.post(WEBHOOK_URL!, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.E2E_HOODOPS_WEBHOOK_SECRET!,
      },
      data: {
        event_type: 'invalid.event',
        event_id: 'e2e-invalid-test',
      },
    });

    // Should return 400 for unrecognized event type
    expect([400, 422]).toContain(res.status());
  });
});
