-- Add brief column and backfill from body for unwritten rows
ALTER TABLE public.content_schedule ADD COLUMN IF NOT EXISTS brief TEXT;

UPDATE public.content_schedule
SET brief = body
WHERE notes LIKE '%copy_state: To write%';
