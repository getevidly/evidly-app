-- ROLE-PERMS-1 — Granular role permissions management
--
-- Three tables:
--   role_permissions          – org-level customizations of role defaults
--   user_permission_overrides – per-user exceptions
--   permission_audit_log      – immutable change history

-- ── Role Permissions (org-level defaults) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            varchar(50) NOT NULL,
  permission_key  varchar(255) NOT NULL,
  granted         boolean NOT NULL DEFAULT true,
  modified_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_permissions UNIQUE (organization_id, role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_org_role
  ON public.role_permissions(organization_id, role);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org role_permissions"
  ON public.role_permissions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owner/exec can manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('owner_operator', 'executive', 'admin', 'owner', 'platform_admin')
    )
  );

-- ── User Permission Overrides ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key  varchar(255) NOT NULL,
  granted         boolean NOT NULL,
  reason          text,
  granted_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_permission_overrides UNIQUE (organization_id, user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_overrides_org_user
  ON public.user_permission_overrides(organization_id, user_id);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org user_permission_overrides"
  ON public.user_permission_overrides FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owner/exec can manage user_permission_overrides"
  ON public.user_permission_overrides FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('owner_operator', 'executive', 'admin', 'owner', 'platform_admin')
    )
  );

-- ── Permission Audit Log ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  changed_by      uuid REFERENCES auth.users(id),
  change_type     varchar(50) NOT NULL,
  target_role     varchar(50),
  target_user_id  uuid,
  permission_key  varchar(255) NOT NULL,
  old_value       boolean,
  new_value       boolean,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_org_time
  ON public.permission_audit_log(organization_id, created_at DESC);

ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org permission_audit_log"
  ON public.permission_audit_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owner/exec can insert permission_audit_log"
  ON public.permission_audit_log FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('owner_operator', 'executive', 'admin', 'owner', 'platform_admin')
    )
  );
