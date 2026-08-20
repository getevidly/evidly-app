-- outreach_steps.email_kind — tells the sender which email builder to use.
-- Existing step 1 keeps 'briefing' via the default; a later step 2 will be 'invite'.

ALTER TABLE public.outreach_steps
  ADD COLUMN IF NOT EXISTS email_kind TEXT NOT NULL DEFAULT 'briefing';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outreach_steps_email_kind_valid'
  ) THEN
    ALTER TABLE public.outreach_steps
      ADD CONSTRAINT outreach_steps_email_kind_valid
      CHECK (email_kind IN ('briefing', 'invite'));
  END IF;
END
$$;
