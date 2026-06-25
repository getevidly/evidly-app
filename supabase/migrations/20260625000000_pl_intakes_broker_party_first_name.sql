-- 20260625000000 — Add broker_party_id + first_name to policy_lens_intakes
-- broker_party_id: FK to external_parties, links agent-submitted intakes to the broker org
-- first_name: split from contact_name for personalization (email greeting, report header)

ALTER TABLE public.policy_lens_intakes
  ADD COLUMN IF NOT EXISTS broker_party_id uuid REFERENCES public.external_parties(id),
  ADD COLUMN IF NOT EXISTS first_name text;

UPDATE public.policy_lens_intakes
  SET first_name = split_part(contact_name, ' ', 1)
  WHERE first_name IS NULL AND contact_name IS NOT NULL AND contact_name <> '';

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260625000000')
ON CONFLICT DO NOTHING;
