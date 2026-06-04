/*
 * Add `source` column to locations table.
 *
 * Purpose: Demo/partner-demo cleanup needs a reliable marker to delete only
 * demo-created locations, not real ones. Without this column the cleanup
 * function (cleanup-demo-tour) deletes ALL org locations — data loss bug S1.
 *
 * - Nullable text, default NULL (real locations have no source tag).
 * - generate-partner-demo already writes source = 'partner_demo' (currently
 *   fails because the column didn't exist — this migration unblocks it).
 * - demo-account-create is updated to write source = 'demo_template'.
 * - cleanup-demo-tour is updated to filter .eq('source', sourceTag).
 */

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.locations.source IS
  'Origin tag for programmatic rows: demo_template, partner_demo, pos_sync. NULL = user-created.';

-- ── Migration tracker ─────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260906000000')
ON CONFLICT DO NOTHING;
