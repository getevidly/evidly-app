/*
 * Backfill organizations.primary_contact_name / primary_contact_email
 * from the best available source.
 *
 * Source 1 (preferred): earliest non-staff user_profiles row for the org,
 *   with email resolved from auth.users.
 * Source 2 (fallback):  most recent evidly_client_invites row for the org.
 *
 * Only touches orgs where primary_contact_name IS NULL so it never
 * overwrites a manually configured contact.
 */

-- Source 1: client profiles (non-staff) + auth.users email
UPDATE organizations o
SET
  primary_contact_name = sub.full_name,
  primary_contact_email = sub.email
FROM (
  SELECT DISTINCT ON (up.organization_id)
    up.organization_id,
    up.full_name,
    au.email
  FROM user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE up.evidly_staff_role IS NULL
    AND up.organization_id IS NOT NULL
    AND au.email IS NOT NULL
  ORDER BY up.organization_id, up.created_at ASC
) sub
WHERE o.id = sub.organization_id
  AND o.primary_contact_name IS NULL;

-- Source 2: most recent invite row (for orgs still without a contact)
UPDATE organizations o
SET
  primary_contact_name = sub.contact_name,
  primary_contact_email = sub.email
FROM (
  SELECT DISTINCT ON (eci.organization_id)
    eci.organization_id,
    eci.contact_name,
    eci.email
  FROM evidly_client_invites eci
  WHERE eci.organization_id IS NOT NULL
    AND eci.contact_name IS NOT NULL
    AND eci.email IS NOT NULL
  ORDER BY eci.organization_id, eci.created_at DESC
) sub
WHERE o.id = sub.organization_id
  AND o.primary_contact_name IS NULL;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20261003000000', 'backfill_org_primary_contacts')
ON CONFLICT DO NOTHING;
