-- Reviewer verdict on a finding (human-in-the-loop). Append-only: never overwrite agent/kitchen payloads.
ALTER TABLE public.pl_findings
  ADD COLUMN IF NOT EXISTS review_state       text        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by        text,
  ADD COLUMN IF NOT EXISTS reviewed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_corrected jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conname='pl_findings_review_state_chk' AND conrelid='public.pl_findings'::regclass) THEN
    ALTER TABLE public.pl_findings
      ADD CONSTRAINT pl_findings_review_state_chk
      CHECK (review_state IN ('pending','accepted','corrected','flagged'));
  END IF;
END $$;

-- apply-time verification — fail loudly if anything is missing
DO $$
DECLARE missing text := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pl_findings' AND column_name='review_state')       THEN missing := missing||'review_state ';       END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pl_findings' AND column_name='reviewed_by')        THEN missing := missing||'reviewed_by ';        END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pl_findings' AND column_name='reviewed_at')        THEN missing := missing||'reviewed_at ';        END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pl_findings' AND column_name='reviewer_corrected') THEN missing := missing||'reviewer_corrected '; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pl_findings_review_state_chk' AND conrelid='public.pl_findings'::regclass)                  THEN missing := missing||'review_state_chk ';   END IF;
  IF missing <> '' THEN RAISE EXCEPTION 'pl_findings verdict migration failed — missing: %', missing; END IF;
END $$;

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260920000000')
ON CONFLICT DO NOTHING;
