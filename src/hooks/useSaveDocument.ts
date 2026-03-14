/**
 * AUDIT-FIX-04 / FIX 4 — Save document mutation hook
 *
 * Extracted from HACCPAICreate to remove direct supabase.from() calls.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface DocumentInsert {
  organization_id: string;
  title: string;
  category: string;
  status: string;
  tags: string[];
  file_type: string;
  notes: string;
}

export function useSaveDocument() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDocument = useCallback(async (doc: DocumentInsert) => {
    setIsLoading(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('documents')
      .insert(doc);

    setIsLoading(false);

    if (insertError) {
      setError(insertError.message);
      return false;
    }
    return true;
  }, []);

  return { saveDocument, isLoading, error };
}
