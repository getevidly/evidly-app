-- ==========================================================================
-- BUILD 1: Vendor Identity Resolution
-- Run via Supabase SQL Editor (NOT as a migration file).
-- Tracker: supabase_migrations.schema_migrations version = '20260713100000'
-- ==========================================================================

-- ── 1. Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ── 2. Add columns to vendor_companies ─────────────────────
-- Table exists in prod (SQL Editor). Add matching columns.
ALTER TABLE vendor_companies ADD COLUMN IF NOT EXISTS canonical_name text;
ALTER TABLE vendor_companies ADD COLUMN IF NOT EXISTS ein text;
ALTER TABLE vendor_companies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE vendor_companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE vendor_companies ADD COLUMN IF NOT EXISTS address text;

-- Trigram index on canonical_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_vc_canonical_trgm
  ON vendor_companies USING gin (canonical_name gin_trgm_ops);

-- Unique partial index on EIN (hard key when present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vc_ein_unique
  ON vendor_companies(ein) WHERE ein IS NOT NULL;

-- ── 3. Table: vendor_match_candidates ──────────────────────
-- Admin queue for vendor-to-company matching. Arthur reviews every row.
-- RLS enabled, zero policies = deny-all for anon/authenticated.
-- Only service_role and SECURITY DEFINER RPCs can access.
CREATE TABLE IF NOT EXISTS vendor_match_candidates (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_name       text        NOT NULL,
  submitted_phone      text,
  submitted_email      text,
  submitted_address    text,
  submitted_by_org_id  uuid        REFERENCES organizations(id),
  vendor_id            uuid        REFERENCES vendors(id),
  candidate_company_id uuid        REFERENCES vendor_companies(id),
  match_score          numeric(4,3),
  match_reasons        jsonb       DEFAULT '[]'::jsonb,
  status               text        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','merged','new_company','rejected')),
  resolved_company_id  uuid        REFERENCES vendor_companies(id),
  resolved_by          uuid,
  resolved_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendor_match_candidates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vmc_status  ON vendor_match_candidates(status);
CREATE INDEX IF NOT EXISTS idx_vmc_vendor  ON vendor_match_candidates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vmc_created ON vendor_match_candidates(created_at DESC);

-- ── 4. fn_normalize_vendor_name ────────────────────────────
-- Lowercase, strip punctuation, strip legal suffixes, strip
-- leading/trailing "the", collapse whitespace.
CREATE OR REPLACE FUNCTION fn_normalize_vendor_name(p_name text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  n text;
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;

  -- Lowercase and trim
  n := lower(trim(p_name));

  -- Strip punctuation (keep alphanumeric and spaces)
  n := regexp_replace(n, '[^a-z0-9 ]', '', 'g');

  -- Strip legal suffixes (two passes for double suffixes like "Inc LLC")
  n := regexp_replace(n, '\s+(inc|llc|corp|co|ltd|company|incorporated|corporation|limited)\s*$', '');
  n := regexp_replace(n, '\s+(inc|llc|corp|co|ltd|company|incorporated|corporation|limited)\s*$', '');

  -- Strip leading "the"
  n := regexp_replace(n, '^\s*the\s+', '');

  -- Strip trailing "the"
  n := regexp_replace(n, '\s+the\s*$', '');

  -- Collapse multiple spaces
  n := regexp_replace(n, '\s+', ' ', 'g');

  RETURN trim(n);
END;
$$;

-- ── 5. fn_digits_only ──────────────────────────────────────
-- Extract digits from a string (for phone comparison).
CREATE OR REPLACE FUNCTION fn_digits_only(p_input text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(p_input, ''), '[^0-9]', '', 'g');
$$;

-- ── 6. fn_email_domain ─────────────────────────────────────
-- Extract domain from email for domain-level matching.
CREATE OR REPLACE FUNCTION fn_email_domain(p_email text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(split_part(COALESCE(p_email, ''), '@', 2));
$$;

-- ── 7. fn_match_vendor_company ─────────────────────────────
-- Given submitted vendor details, returns top 3 candidate
-- companies with scores and match reasons.
--
-- Scoring:
--   trigram similarity on normalized canonical_name  (weight 0.5)
--   exact phone match, digits only                    (weight 0.3)
--   exact email domain match                          (weight 0.2)
--
-- EIN is handled separately by fn_match_vendor_company_by_ein.
-- Caller checks EIN first; if match → skip this function.
CREATE OR REPLACE FUNCTION fn_match_vendor_company(
  p_name    text,
  p_phone   text DEFAULT NULL,
  p_email   text DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS TABLE (
  company_id   uuid,
  company_name text,
  score        numeric(4,3),
  reasons      jsonb
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_normalized   text;
  v_phone_digits text;
  v_email_domain text;
BEGIN
  v_normalized   := fn_normalize_vendor_name(p_name);
  v_phone_digits := fn_digits_only(p_phone);
  v_email_domain := fn_email_domain(p_email);

  -- Nothing to match against
  IF NOT EXISTS (SELECT 1 FROM vendor_companies WHERE canonical_name IS NOT NULL LIMIT 1) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      vc.id   AS cid,
      vc.canonical_name AS cname,
      -- trigram similarity on normalized name (weight 0.5)
      CASE
        WHEN v_normalized IS NOT NULL AND v_normalized != '' AND vc.canonical_name IS NOT NULL
        THEN similarity(v_normalized, vc.canonical_name) * 0.5
        ELSE 0
      END AS name_score,
      -- exact phone match, digits only (weight 0.3)
      CASE
        WHEN v_phone_digits != '' AND fn_digits_only(vc.phone) = v_phone_digits
        THEN 0.3
        ELSE 0
      END AS phone_score,
      -- exact email domain match (weight 0.2)
      CASE
        WHEN v_email_domain != '' AND v_email_domain != '' AND fn_email_domain(vc.email) = v_email_domain
        THEN 0.2
        ELSE 0
      END AS email_score
    FROM vendor_companies vc
    WHERE vc.canonical_name IS NOT NULL
  )
  SELECT
    s.cid,
    s.cname,
    LEAST((s.name_score + s.phone_score + s.email_score), 1.000)::numeric(4,3),
    jsonb_build_object(
      'name_similarity',    round((s.name_score / 0.5)::numeric, 3),
      'phone_match',        s.phone_score > 0,
      'email_domain_match', s.email_score > 0
    )
  FROM scored s
  WHERE (s.name_score + s.phone_score + s.email_score) > 0.15
  ORDER BY (s.name_score + s.phone_score + s.email_score) DESC
  LIMIT 3;
END;
$$;

-- ── 8. fn_match_vendor_company_by_ein ──────────────────────
-- Hard-key lookup. Returns exactly 0 or 1 row, score = 1.000.
CREATE OR REPLACE FUNCTION fn_match_vendor_company_by_ein(p_ein text)
RETURNS TABLE (
  company_id   uuid,
  company_name text,
  score        numeric(4,3),
  reasons      jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    vc.id,
    vc.canonical_name,
    1.000::numeric(4,3),
    '{"ein_match": true}'::jsonb
  FROM vendor_companies vc
  WHERE vc.ein IS NOT NULL
    AND vc.ein = p_ein
  LIMIT 1;
$$;

-- ── 9. get_vendor_match_queue (admin RPC) ──────────────────
-- SECURITY DEFINER: runs as function owner (postgres), bypasses RLS.
-- Admin UI calls via supabase.rpc('get_vendor_match_queue').
CREATE OR REPLACE FUNCTION get_vendor_match_queue()
RETURNS TABLE (
  id                     uuid,
  submitted_name         text,
  submitted_phone        text,
  submitted_email        text,
  submitted_address      text,
  submitted_by_org_id    uuid,
  org_name               text,
  vendor_id              uuid,
  vendor_company_name    text,
  candidate_company_id   uuid,
  candidate_company_name text,
  match_score            numeric(4,3),
  match_reasons          jsonb,
  status                 text,
  resolved_company_id    uuid,
  resolved_by            uuid,
  resolved_at            timestamptz,
  created_at             timestamptz,
  kitchens_blocked       bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    vmc.id,
    vmc.submitted_name,
    vmc.submitted_phone,
    vmc.submitted_email,
    vmc.submitted_address,
    vmc.submitted_by_org_id,
    o.name                    AS org_name,
    vmc.vendor_id,
    v.company_name            AS vendor_company_name,
    vmc.candidate_company_id,
    vc.canonical_name         AS candidate_company_name,
    vmc.match_score,
    vmc.match_reasons,
    vmc.status,
    vmc.resolved_company_id,
    vmc.resolved_by,
    vmc.resolved_at,
    vmc.created_at,
    (
      SELECT count(*)
      FROM vendors v2
      WHERE v2.vendor_company_id IS NULL
        AND fn_normalize_vendor_name(v2.company_name)
            = fn_normalize_vendor_name(vmc.submitted_name)
    ) AS kitchens_blocked
  FROM vendor_match_candidates vmc
  LEFT JOIN organizations o    ON o.id  = vmc.submitted_by_org_id
  LEFT JOIN vendors v          ON v.id  = vmc.vendor_id
  LEFT JOIN vendor_companies vc ON vc.id = vmc.candidate_company_id
  ORDER BY
    CASE WHEN vmc.status = 'pending' THEN 0 ELSE 1 END,
    vmc.created_at DESC;
$$;

-- ── 10. resolve_vendor_match (admin RPC) ───────────────────
-- SECURITY DEFINER. Resolves a match candidate:
--   'confirmed' → link vendor to matched company
--   'merged'    → link vendor to a different company (admin picks)
--   'new_company' → create vendor_companies row, link vendor
--   'rejected'  → mark rejected, do NOT set vendor_company_id
CREATE OR REPLACE FUNCTION resolve_vendor_match(
  p_candidate_id uuid,
  p_action       text,
  p_company_id   uuid DEFAULT NULL,
  p_resolver_id  uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_vendor_id      uuid;
  v_submitted_name text;
  v_new_company_id uuid;
BEGIN
  IF p_action NOT IN ('confirmed', 'merged', 'new_company', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  SELECT vendor_id, submitted_name
  INTO   v_vendor_id, v_submitted_name
  FROM   vendor_match_candidates
  WHERE  id = p_candidate_id
    AND  status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found or already resolved';
  END IF;

  CASE p_action
    WHEN 'confirmed' THEN
      IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id required for confirmed action';
      END IF;
      UPDATE vendors
        SET vendor_company_id = p_company_id
        WHERE id = v_vendor_id;
      UPDATE vendor_match_candidates
        SET status = 'confirmed',
            resolved_company_id = p_company_id,
            resolved_by = p_resolver_id,
            resolved_at = now()
        WHERE id = p_candidate_id;

    WHEN 'merged' THEN
      IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'company_id required for merged action';
      END IF;
      UPDATE vendors
        SET vendor_company_id = p_company_id
        WHERE id = v_vendor_id;
      UPDATE vendor_match_candidates
        SET status = 'merged',
            resolved_company_id = p_company_id,
            resolved_by = p_resolver_id,
            resolved_at = now()
        WHERE id = p_candidate_id;

    WHEN 'new_company' THEN
      INSERT INTO vendor_companies (canonical_name)
        VALUES (fn_normalize_vendor_name(v_submitted_name))
        RETURNING id INTO v_new_company_id;
      UPDATE vendors
        SET vendor_company_id = v_new_company_id
        WHERE id = v_vendor_id;
      UPDATE vendor_match_candidates
        SET status = 'new_company',
            resolved_company_id = v_new_company_id,
            resolved_by = p_resolver_id,
            resolved_at = now()
        WHERE id = p_candidate_id;

    WHEN 'rejected' THEN
      UPDATE vendor_match_candidates
        SET status = 'rejected',
            resolved_by = p_resolver_id,
            resolved_at = now()
        WHERE id = p_candidate_id;
  END CASE;
END;
$$;

-- ── 11. Migration tracker ──────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260713100000')
ON CONFLICT DO NOTHING;
