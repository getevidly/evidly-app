-- M1: Update compliance_documents.category CHECK to 4-value set
-- Pre-condition: 0 rows, no data migration needed
-- Replaces: kitchen_employee → split into kitchen + employee
--           vendor_service → service
--           vendor_business → business

BEGIN;

ALTER TABLE compliance_documents
  DROP CONSTRAINT compliance_documents_category_check;

ALTER TABLE compliance_documents
  ADD CONSTRAINT compliance_documents_category_check
    CHECK (category IN ('kitchen', 'employee', 'service', 'business'));

COMMIT;
