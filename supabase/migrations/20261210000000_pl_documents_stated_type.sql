ALTER TABLE public.pl_documents ADD COLUMN IF NOT EXISTS stated_policy_type text
  CHECK (stated_policy_type IN ('property','general_liability','umbrella_excess','spoilage_contamination','bop','liquor_liability','other'));
