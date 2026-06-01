-- ============================================================================
-- D1-DEPLOY-1: log_audit_event RPC
--
-- Fixes C8 (CRITICAL): admin audit trail was non-functional.
-- Live table = 10-column slim schema from 20260804000000_create_audit_logs.sql.
-- This RPC is SECURITY DEFINER so it bypasses RLS default-deny on the table,
-- giving a single schema-correct choke point for all audit writes.
-- ============================================================================

-- 1. RPC: log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action          text,
  p_organization_id uuid    DEFAULT NULL,
  p_actor_id        uuid    DEFAULT NULL,
  p_resource_type   text    DEFAULT NULL,
  p_resource_id     text    DEFAULT NULL,
  p_success         boolean DEFAULT true,
  p_error_message   text    DEFAULT NULL,
  p_metadata        jsonb   DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.platform_audit_log
    (action, organization_id, actor_id, resource_type, resource_id,
     success, error_message, metadata)
  VALUES
    (p_action,
     p_organization_id,
     COALESCE(p_actor_id, auth.uid()),
     p_resource_type,
     p_resource_id,
     p_success,
     p_error_message,
     COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 2. Grant to both authenticated (frontend) and service_role (edge functions)
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, uuid, uuid, text, text, boolean, text, jsonb)
  TO authenticated, service_role;

-- 3. Self-maintaining migration tracker
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260902000000',
  'log_audit_event_rpc',
  ARRAY[
    'CREATE OR REPLACE FUNCTION public.log_audit_event(...) SECURITY DEFINER',
    'GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated, service_role'
  ]
);
