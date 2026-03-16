-- SECURITY-FIX-02 M5: MFA enforcement for high-privilege operator roles
-- owner_operator, executive, compliance_officer: MFA required with 30-day grace period
-- All other roles: MFA remains optional (can enable voluntarily)

UPDATE mfa_policy
SET mfa_required = true,
    grace_period_days = 30
WHERE role IN ('owner_operator', 'executive', 'compliance_officer');
