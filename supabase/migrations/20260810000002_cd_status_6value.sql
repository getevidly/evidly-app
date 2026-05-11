-- M2: Update compliance_documents.status CHECK to 6-value locked set
-- Removes: pending (→ pending_review), rejected, archived, cancelled
-- Adds: pending_review, overdue
-- Also rebuilds idx_compliance_documents_org_pending which references 'pending'

BEGIN;

-- 1. Drop the partial index that references 'pending'
DROP INDEX IF EXISTS idx_compliance_documents_org_pending;

-- 2. Replace the CHECK constraint
ALTER TABLE compliance_documents
  DROP CONSTRAINT compliance_documents_status_check;

ALTER TABLE compliance_documents
  ADD CONSTRAINT compliance_documents_status_check
    CHECK (status IN ('current', 'expiring', 'expired', 'pending_review', 'requested', 'overdue'));

-- 3. Update the column default from 'current' (remains correct, no change needed)
-- Default is already 'current' per migration 20260807000000

-- 4. Rebuild partial index with corrected status values
CREATE INDEX idx_compliance_documents_org_pending
  ON compliance_documents (organization_id, status)
  WHERE status IN ('pending_review', 'requested');

COMMIT;
