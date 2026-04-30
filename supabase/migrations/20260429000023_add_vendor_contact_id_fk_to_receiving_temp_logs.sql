-- Migration: Add vendor_contact_id FK on receiving_temp_logs
-- Why: Closes a data-quality gap surfaced during commit 4 inspection.
--      The existing vendor_name (text, free-text) column allowed silent
--      string mismatches ("Sysco" vs "sysco" vs "Sysco Foods") that would
--      bypass the dedupe rule landing in commit 4. The proper FK to
--      vendor_contacts gives canonical vendor identity.
-- Design notes:
--   - Nullable: post-launch rows may not yet have a registered vendor;
--     application enforces FK presence on new captures.
--   - ON DELETE SET NULL: preserves the receiving log if a vendor_contact
--     is deleted; free-text vendor_name survives for display.
--   - vendor_name column kept for backward compatibility and as the
--     display string captured at log time.
-- Cross-references:
--   - Original schema sprint commit 6 (vendor_contacts table)
--   - Phase 1 Schema Sprint commit 3 (step + ccp_number on receiving_temp_logs)
--   - Phase 1 Schema Sprint commit 4 (dedupe index will USE vendor_contact_id)
-- Pre-launch context: receiving_temp_logs has 0 rows.

ALTER TABLE receiving_temp_logs
  ADD COLUMN vendor_contact_id UUID NULL;

ALTER TABLE receiving_temp_logs
  ADD CONSTRAINT receiving_temp_logs_vendor_contact_id_fkey
    FOREIGN KEY (vendor_contact_id) REFERENCES vendor_contacts(id) ON DELETE SET NULL;

CREATE INDEX idx_receiving_temp_logs_vendor_contact_id
  ON receiving_temp_logs(vendor_contact_id)
  WHERE vendor_contact_id IS NOT NULL;
