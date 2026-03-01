-- ============================================================================
-- CHECKUP-1: Kitchen Checkup — add pdf_url column to assessment_results
-- ============================================================================

-- Add pdf_url column for storing generated PDF links (used by Prompt 6B)
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS pdf_url TEXT;
