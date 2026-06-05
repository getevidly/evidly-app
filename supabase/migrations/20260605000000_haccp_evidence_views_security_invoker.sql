-- 3g: Enable security_invoker on HACCP evidence views so RLS is enforced
-- under the caller's role, not the view owner's role.
-- Already applied manually in PROD — this file is for repo record only.

ALTER VIEW vw_haccp_evidence SET (security_invoker = true);
ALTER VIEW vw_inspector_evidence SET (security_invoker = true);
