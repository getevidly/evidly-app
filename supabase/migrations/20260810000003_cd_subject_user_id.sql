-- M3: Add subject_user_id for employee-category documents
-- When category='employee', this identifies which staff member the document belongs to

BEGIN;

ALTER TABLE compliance_documents
  ADD COLUMN IF NOT EXISTS subject_user_id uuid
    REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Enforce: employee-category docs MUST have a subject
ALTER TABLE compliance_documents
  ADD CONSTRAINT cd_employee_requires_subject
    CHECK (category <> 'employee' OR subject_user_id IS NOT NULL);

-- Index for employee-scoped queries
CREATE INDEX IF NOT EXISTS idx_cd_subject_user_id
  ON compliance_documents (subject_user_id)
  WHERE subject_user_id IS NOT NULL;

COMMIT;
