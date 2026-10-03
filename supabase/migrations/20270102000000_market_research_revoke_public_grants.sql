-- Market research tables: close TRUNCATE and anon access.
--
-- anon and authenticated held every table privilege on these four tables,
-- including TRUNCATE, which row level security does not stop. All writes go
-- through the survey-respond, county-briefing and email-unsubscribe edge
-- functions as service_role, which is untouched here.
--
-- anon: no browser code reads these tables as anon, so it keeps nothing.
-- authenticated: the admin marketing screens (useSurveyData, OverviewTab)
-- SELECT responses, answers and contacts under the platform_admin_all
-- policy, so SELECT stays on those three. No browser code reads
-- study_email_log, so authenticated keeps nothing there.
--
-- Grants nothing.

REVOKE ALL ON public.market_research_responses FROM anon;
REVOKE ALL ON public.market_research_answers   FROM anon;
REVOKE ALL ON public.market_research_contacts  FROM anon;
REVOKE ALL ON public.study_email_log           FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.market_research_responses FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.market_research_answers   FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.market_research_contacts  FROM authenticated;
REVOKE ALL ON public.study_email_log FROM authenticated;
