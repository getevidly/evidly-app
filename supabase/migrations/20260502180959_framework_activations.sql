-- 20260502180959_framework_activations.sql
--
-- Audit table for held-back framework activations.
-- Sprint commit 3b-3. Tier 1 schema.
--
-- Tracks when each held-back regulatory framework (state wrappers,
-- county wrappers) is activated in PROD. Records who triggered it,
-- when, and what prompted activation.
--
-- Use case: state wrappers for WA/OR/NV/AZ are committed to git
-- pre-launch but PROD apply is deferred until customer pipeline
-- triggers activation. This table records each activation event
-- for sales attribution and production-state verification.
--
-- Inserted manually or via webhook when a framework is activated
-- via Supabase MCP. Internal-use only — not customer-facing.

BEGIN;

CREATE TABLE public.framework_activations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    uuid NOT NULL REFERENCES public.regulatory_frameworks(id) ON DELETE CASCADE,
  activated_at    timestamptz NOT NULL DEFAULT now(),
  activated_by    uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  trigger_source  text NOT NULL,
  trigger_context text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT framework_activations_trigger_source_check
    CHECK (trigger_source IN (
      'demo_booking',
      'signup',
      'sales_manual',
      'admin_manual',
      'system_scheduled'
    ))
);

CREATE INDEX idx_framework_activations_framework_id
  ON public.framework_activations(framework_id);

CREATE INDEX idx_framework_activations_activated_at_desc
  ON public.framework_activations(activated_at DESC);

COMMENT ON TABLE public.framework_activations IS
  'Audit trail of held-back framework PROD apply events. Records when state and county wrappers go live in PROD, triggered by customer pipeline events. Internal-use only.';
COMMENT ON COLUMN public.framework_activations.trigger_source IS
  'Allowed values: demo_booking, signup, sales_manual, admin_manual, system_scheduled. Add new values via separate schema patch.';
COMMENT ON COLUMN public.framework_activations.trigger_context IS
  'Free-text context: prospect name, deal ID, ticket number, etc. Optional.';
COMMENT ON COLUMN public.framework_activations.activated_by IS
  'User who triggered activation. NULL allowed for system-triggered activations (webhook, scheduled batch).';

ALTER TABLE public.framework_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view framework activations"
  ON public.framework_activations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = users.id
      AND (users.raw_user_meta_data ->> 'role'::text) = ANY (
        ARRAY['admin', 'owner', 'platform_admin', 'super_admin']
      )
  ));

CREATE POLICY "Platform admins can insert framework activations"
  ON public.framework_activations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = users.id
      AND (users.raw_user_meta_data ->> 'role'::text) = ANY (
        ARRAY['admin', 'owner', 'platform_admin', 'super_admin']
      )
  ));

COMMIT;
