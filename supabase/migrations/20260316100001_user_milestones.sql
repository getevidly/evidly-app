-- AMBASSADOR-SCRIPT-01: Milestone Celebrations
-- Tracks emotional reward moments per user (never fires twice)

CREATE TABLE IF NOT EXISTS public.user_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL CHECK (milestone_key IN (
    'first_temp_log', 'first_checklist', 'seven_day_streak',
    'first_service_logged', 'zero_open_cas', 'thirty_day_mark',
    'first_inspection_passed'
  )),
  achieved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  shared        BOOLEAN DEFAULT false,
  UNIQUE(user_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user
  ON public.user_milestones(user_id);

CREATE INDEX IF NOT EXISTS idx_user_milestones_org
  ON public.user_milestones(org_id);

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones"
  ON public.user_milestones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own milestones"
  ON public.user_milestones FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own milestones"
  ON public.user_milestones FOR UPDATE
  USING (user_id = auth.uid());
