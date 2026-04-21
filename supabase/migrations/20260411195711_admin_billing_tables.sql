-- Admin billing tables for /admin/billing page
-- Tracks subscription and invoice data synced from Stripe

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  plan_name              text NOT NULL DEFAULT 'trial',
  status                 text NOT NULL DEFAULT 'active',
  mrr_cents              integer NOT NULL DEFAULT 0,
  locations_count        integer NOT NULL DEFAULT 1,
  billing_cycle          text DEFAULT 'monthly',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id  text,
  amount_cents       integer NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'draft',
  plan               text,
  invoice_date       timestamptz NOT NULL DEFAULT now(),
  paid_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_billing_subscriptions" ON billing_subscriptions;
CREATE POLICY "admin_read_billing_subscriptions"
  ON billing_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin'
  ));

DROP POLICY IF EXISTS "admin_read_billing_invoices" ON billing_invoices;
CREATE POLICY "admin_read_billing_invoices"
  ON billing_invoices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'platform_admin'
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_subs_org ON billing_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_subs_status ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_inv_org ON billing_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_inv_date ON billing_invoices(invoice_date DESC);
