-- 20260502174902_seed_fda_food_code_legacy_editions.sql
--
-- Seed skeleton framework rows for FDA Food Code 1999, 2009, 2013, 2022.
-- Sprint commit 3c-1b. Tier 2 (regulatory copy).
--
-- These rows exist as parent_framework_id targets for state and county
-- wrappers in 3c-2 / 3c-3. They carry edition metadata only — no risk
-- factors, process categories, CCPs, specialized processes, allergens,
-- or evidence definitions. Operational content lives on the state /
-- county wrappers that point at these as parents.
--
-- Inspector report cites the operative state/county code as the law,
-- with these editions referenced as lineage:
--   "incorporates FDA Food Code 2009 with state amendments"
--
-- FDA 2017 (already seeded with full operational content in 3c-1a) and
-- CalCode (no FDA parent — independently codified) are not in scope here.

BEGIN;

INSERT INTO public.regulatory_frameworks
  (code, name, region_scope, version, effective_date, parent_framework_id, notes)
VALUES
  ('FDA_FOOD_CODE_1999',
   'FDA Food Code 1999',
   'national',
   '3rd edition',
   '1999-09-01',
   NULL,
   'Federal model code published by U.S. FDA. Skeleton framework only — operational content lives on state and county wrappers that reference this edition. Hot holding 140°F predates the 2009 revision to 135°F. Pre-FALCPA, no formal allergen list. Active wrappers: AZ A.A.C. Title 9 Ch 8 default and seven AZ counties (Apache, Coconino, Graham, Greenlee, La Paz, Navajo, Santa Cruz).'),
  ('FDA_FOOD_CODE_2009',
   'FDA Food Code 2009',
   'national',
   '7th edition',
   '2009-11-01',
   NULL,
   'Federal model code published by U.S. FDA. Skeleton framework only. Codified hot holding at 135°F (revised from 140°F) and removed legacy 45°F cold holding allowance. Active wrappers: Oregon OAR 333-150 Food Sanitation Rules, Nevada NAC 446, AZ Mohave County.'),
  ('FDA_FOOD_CODE_2013',
   'FDA Food Code 2013',
   'national',
   '8th edition',
   '2013-11-13',
   NULL,
   'Federal model code published by U.S. FDA. Skeleton framework only. Added Priority / Priority Foundation / Core risk classifications to inspection form, extended ROP shelf life to 30 days, added mechanically tenderized meats to 155°F cooking category. Active wrappers: AZ Cochise, Gila, Pima, Pinal counties.'),
  ('FDA_FOOD_CODE_2022',
   'FDA Food Code 2022',
   'national',
   '10th edition',
   '2022-12-28',
   NULL,
   'Federal model code published by U.S. FDA. Skeleton framework only. Integrated FASTER Act 2021 sesame as 9th major allergen, added §3-401.15 Manufacturer Cooking Instructions, revised handsink hot water temperature minimum from 100°F to 85°F. No active wrappers at launch; held for jurisdictions adopting latest standards post-launch.');

COMMIT;
