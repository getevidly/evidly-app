-- M14: Brand-language enforcement via table/column comments
-- "Vendor Network" is canonical — never "Marketplace" or "Connect"
-- "HACCP" is a plan/system/category — never paired with "training"

COMMENT ON TABLE compliance_documents IS
  'Canonical document store for all three categories: kitchen (org-owned compliance docs), employee (staff certifications — food handler cards, ServSafe), service (vendor work records — hood cleaning, suppression tests), business (vendor credentials — COI, W-9, IKECA). Status lifecycle: requested → pending_review → current → expiring → expired (+ overdue for service-category token timeout). Brand rules: HACCP is always "HACCP plan" or "HACCP" — never "HACCP training." Vendor identity: vendors.id via vendor_id FK. Vendor Network is the canonical name for the vendor ecosystem (never "Marketplace" or "Connect").';

COMMENT ON TABLE compliance_document_requests IS
  'Canonical token table for document upload requests. Supports three contexts: (1) service-category post-service record requests via cron, (2) business-category vendor credential requests, (3) employee-category staff certification requests. Token timing: 5 business days post-expected-service trigger, 5 calendar days token validity. Vendor identity: vendors.id via vendor_id FK.';

COMMENT ON TABLE share_recommendation_rules IS
  'Lookup table: (recipient_type, purpose) → required/recommended document types for Send to Third Party wizard. Recipient types: ehd, ahj, insurance_broker, insurance_carrier, auditor, client_legal.';

COMMENT ON COLUMN compliance_documents.category IS
  'Document category: kitchen (org compliance), employee (staff certs), service (vendor work records), business (vendor credentials).';

COMMENT ON COLUMN compliance_documents.status IS
  'Document status: current (valid, expiry > 30d), expiring (0-30d to expiry), expired (past expiry), pending_review (vendor uploaded, awaiting accept/reject), requested (service-category: token sent, awaiting upload), overdue (service-category: token expired without upload). Status precedence: workflow states (requested → pending_review → current) take precedence over expiration states.';

COMMENT ON COLUMN compliance_documents.subject_user_id IS
  'Required when category=employee. The staff member this document belongs to (food handler card, ServSafe cert). FK to user_profiles.id.';

COMMENT ON COLUMN compliance_documents.expiry_date IS
  'Nullable. NULL means no expiration (HACCP plans, one-time training records). For service category: computed from location_service_schedules.frequency at accept time.';

COMMENT ON COLUMN vendor_service_records.vendor_name IS
  'Legacy text field. Use vendor_id FK for joins. vendor_name retained for display and audit trail.';
