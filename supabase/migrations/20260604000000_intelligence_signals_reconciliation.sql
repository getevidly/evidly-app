/*
 * intelligence_signals schema reconciliation
 *
 * PROD has 26 columns. The React admin surfaces (EvidLYIntelligence.tsx,
 * IntelligenceAdmin.tsx) and edge functions (intelligence-collect,
 * intelligence-deliver, intelligence-auto-publish) write to ~45 additional
 * columns that were defined in migration files but never applied.
 *
 * This migration adds every column the running code writes to or reads from.
 * Plain ADD COLUMN IF NOT EXISTS — no DO blocks (DO blocks roll back the
 * entire block on any duplicate_column exception).
 *
 * PROD 26 columns (already exist, NOT touched):
 *   id, source_id, source_name, category, signal_type, title,
 *   content_summary, original_url, counties_affected, is_correlated,
 *   orgs_affected, published_at, created_at, routing_tier, is_published,
 *   revenue_risk_level, liability_risk_level, cost_risk_level,
 *   operational_risk_level, recommended_action, target_counties,
 *   source_key, source_url, confidence_score, severity_score,
 *   affected_org_count
 */

-- ── Write-path columns (PostgREST 42703 if absent) ────────────────

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS reviewed_by text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS revenue_risk_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS liability_risk_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS cost_risk_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS operational_risk_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_revenue text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_liability text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_cost text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_operational text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_revenue_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_liability_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_cost_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS opp_operational_note text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS target_industries text[];

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS target_all_industries boolean DEFAULT true;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS signal_scope text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS action_deadline date;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS published_by text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS cic_pillar text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS workforce_risk_level text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS arthur_notes text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS preview_sent boolean DEFAULT false;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS detail_markdown text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS affected_jurisdictions text[];

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS delivery_status text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS delivery_error text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS delivery_attempt_count integer DEFAULT 0;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS target_org_ids uuid[];

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS dismissed_reason text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS dismissed_by text;

-- ── Read-path columns (select('*') interface fields) ──────────────

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS scope text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS ai_summary text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS ai_impact_score integer;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS ai_urgency text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS ai_client_impact text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS ai_platform_impact text;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS ai_confidence integer;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS auto_published boolean DEFAULT false;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS auto_publish_at timestamptz;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS review_deadline timestamptz;

ALTER TABLE public.intelligence_signals
  ADD COLUMN IF NOT EXISTS routing_reason text;

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260604000000')
ON CONFLICT DO NOTHING;
