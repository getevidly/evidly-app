-- Add manual categorization tracking fields to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS categorization_source text DEFAULT 'ai' CHECK (categorization_source IN ('ai', 'manual')),
  ADD COLUMN IF NOT EXISTS manual_category_override boolean DEFAULT false;

-- Index for filtering manually categorized documents
CREATE INDEX IF NOT EXISTS idx_documents_categorization_source ON documents (categorization_source);
