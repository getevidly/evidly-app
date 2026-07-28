-- =============================================================================
-- Migration: platform_admin_rls_all_tables
-- Purpose:   Close the RLS gap for platform_admin users whose email is NOT
--            @getevidly.com. Adds a permissive FOR ALL policy using the
--            existing is_platform_admin() SECURITY DEFINER helper.
--
-- Approach:  Additive only — does NOT modify or drop existing policies.
--            Postgres OR-combines permissive policies, so a user matching
--            EITHER the existing @getevidly.com policy OR this new
--            platform_admin policy will be granted access.
--
-- Idempotent: Skips any table where "platform_admin_all" already exists.
--
-- Tables (40):
--   admin_api_keys, admin_backups, admin_event_log, admin_security_config,
--   assessment_leads, client_notifications, content_schedule,
--   corrective_actions, crawl_execution_log, crawl_health, crawl_runs,
--   demo_leads, demo_sessions, edge_function_invocations,
--   edge_function_registry, entity_correlations, guided_tour_templates,
--   incidents, intelligence_game_plans, intelligence_sources, k2c_donations,
--   market_research_responses, marketing_campaigns, marketing_channel_actuals,
--   marketing_channels, marketing_influencers, marketing_relationship_types,
--   marketing_sends, platform_settings, platform_update_log,
--   platform_updates, regulatory_changes, regulatory_updates,
--   remote_connect_sessions, rfp_listings, signal_review_log,
--   support_ticket_activity, support_ticket_replies, support_tickets,
--   system_messages
--
-- Already covered (skipped):
--   client_advisories  → ca_platform_admin
--   intelligence_signals → sig_platform_admin_all
-- =============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'admin_api_keys',
    'admin_backups',
    'admin_event_log',
    'admin_security_config',
    'assessment_leads',
    'client_notifications',
    'content_schedule',
    'corrective_actions',
    'crawl_execution_log',
    'crawl_health',
    'crawl_runs',
    'demo_leads',
    'demo_sessions',
    'edge_function_invocations',
    'edge_function_registry',
    'entity_correlations',
    'guided_tour_templates',
    'incidents',
    'intelligence_game_plans',
    'intelligence_sources',
    'k2c_donations',
    'market_research_responses',
    'marketing_campaigns',
    'marketing_channel_actuals',
    'marketing_channels',
    'marketing_influencers',
    'marketing_relationship_types',
    'marketing_sends',
    'platform_settings',
    'platform_update_log',
    'platform_updates',
    'regulatory_changes',
    'regulatory_updates',
    'remote_connect_sessions',
    'rfp_listings',
    'signal_review_log',
    'support_ticket_activity',
    'support_ticket_replies',
    'support_tickets',
    'system_messages'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Skip if this policy already exists on the table
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = t
        AND policyname = 'platform_admin_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY platform_admin_all ON public.%I '
        'FOR ALL '
        'USING (public.is_platform_admin()) '
        'WITH CHECK (public.is_platform_admin())',
        t
      );
      RAISE NOTICE 'Created platform_admin_all on %', t;
    ELSE
      RAISE NOTICE 'Skipped % — platform_admin_all already exists', t;
    END IF;
  END LOOP;
END;
$$;
