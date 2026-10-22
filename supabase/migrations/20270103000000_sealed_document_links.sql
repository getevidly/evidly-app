-- Sealed documents: one non-expiring public link per sealed document.
--
-- HoodOps needs a link to each sealed report and certificate that the kitchen
-- can open without an EvidLY login and that never expires. vendor_service_records
-- is write-once (vsr_immutable_no_update, 20260618000600), so the token lives
-- here, keyed by vendor_service_records.id, the stable document id.
--
-- Tokens are 32 random bytes, base64url (43 characters, 256 bits), minted by
-- hoodops-webhook. revoked_at kills a link; a new one can then be minted.
--
-- No anon or authenticated table access. /sealed/:token reads its display
-- fields through get_sealed_document(token), and its PDF through the
-- portal-access sealed_pdf action, which signs only this row's file.

BEGIN;

CREATE TABLE IF NOT EXISTS public.sealed_document_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sealed_record_id uuid NOT NULL REFERENCES public.vendor_service_records(id),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token            text NOT NULL UNIQUE CHECK (char_length(token) >= 43),
  created_at       timestamptz NOT NULL DEFAULT now(),
  revoked_at       timestamptz
);

-- One live link per sealed document.
CREATE UNIQUE INDEX IF NOT EXISTS sealed_document_links_live_uidx
  ON public.sealed_document_links (sealed_record_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.sealed_document_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sealed_document_links FROM anon;
REVOKE ALL ON public.sealed_document_links FROM authenticated;

COMMENT ON TABLE public.sealed_document_links IS
  'Non-expiring public /sealed/<token> link per sealed HoodOps document. Keyed by vendor_service_records.id. Service role only; the page reads through get_sealed_document().';

-- Display fields for ONE sealed document. An unknown, short or revoked token
-- returns no row, the same as a token that never existed.
CREATE OR REPLACE FUNCTION public.get_sealed_document(p_token text)
RETURNS TABLE (
  document_type    text,
  kitchen_name     text,
  location_name    text,
  location_address text,
  service_date     date,
  sealed_at        timestamptz,
  cert_number      text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    CASE v.webhook_payload->>'event'
      WHEN 'document.report' THEN 'report'
      ELSE 'cert'
    END,
    o.name,
    l.name,
    NULLIF(concat_ws(', ',
      NULLIF(l.address, ''),
      NULLIF(l.city, ''),
      NULLIF(concat_ws(' ', NULLIF(l.state, ''), NULLIF(l.zip, '')), '')
    ), ''),
    v.service_date,
    v.sealed_at,
    NULLIF(NULLIF(v.cert_number, ''), 'NONE')
  FROM public.sealed_document_links s
  JOIN public.vendor_service_records v ON v.id = s.sealed_record_id
  JOIN public.organizations o ON o.id = v.organization_id
  LEFT JOIN public.locations l ON l.id = v.location_id
  WHERE p_token IS NOT NULL
    AND char_length(p_token) >= 43
    AND s.token = p_token
    AND s.revoked_at IS NULL
    AND v.sealed_at IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_sealed_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sealed_document(text) TO anon, authenticated, service_role;

COMMIT;
