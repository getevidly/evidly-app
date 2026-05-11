-- M12: Additional indexes for compliance_documents
-- Existing indexes (8) already cover: PK, org_category_status, org_vendor_category,
-- org_employee_category, expiry_date, org_pending, parent, search (GIN)

-- 1. Composite filter index for Documents page queries (category + status + location + vendor)
-- The existing idx_compliance_documents_org_category_status covers (org, category, status)
-- but not location_id or vendor_id. This broader index supports the full filter pipeline.
CREATE INDEX IF NOT EXISTS idx_cd_org_cat_status_loc_vendor
  ON compliance_documents (organization_id, category, status, location_id, vendor_id);

-- 2. Expiry date index for cron sweeps (broader than existing which is filtered to current/expiring)
CREATE INDEX IF NOT EXISTS idx_cd_expiry_not_null
  ON compliance_documents (organization_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- 3. subject_user_id index (already created in M3, this is a safety re-check)
CREATE INDEX IF NOT EXISTS idx_cd_subject_user_id
  ON compliance_documents (subject_user_id)
  WHERE subject_user_id IS NOT NULL;
