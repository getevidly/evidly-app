-- market_research_contacts.name
--
-- The Risk Assessment findings email opens "Hi <first name>,". The contact
-- row had no name to read, so the greeting always fell back to "Hi,".
--
-- Nullable by design: the contact action stores whatever it is sent as
-- `name`, and the Risk Assessment page does not ask for one yet. Every
-- existing row stays NULL and every existing caller is unaffected.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.market_research_contacts
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.market_research_contacts.name IS
  'Respondent name as supplied to the contact action. Nullable. Read by survey-respond for the Risk Assessment findings greeting.';
