/**
 * AUDIT-FIX-04 / FIX 4 — Content verification log mutation hook
 *
 * Extracted from VerificationPanel to remove direct supabase.from() calls.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface VerificationEntry {
  content_table: string;
  content_id: string;
  content_title: string;
  content_type: string;
  gate_key: string;
  gate_label: string;
  gate_result: string;
  verified_by_user_id: string | null;
  verified_by_name: string;
  verified_by_role: string;
  verification_method: string;
  source_urls: Array<{ url: string; resolved: boolean; accessed_at: string }>;
  reviewer_notes: string;
}

export function useContentVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitVerification = useCallback(async (entry: VerificationEntry) => {
    setIsLoading(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('content_verification_log')
      .insert(entry);

    setIsLoading(false);

    if (insertError) {
      setError(insertError.message);
      return false;
    }
    return true;
  }, []);

  return { submitVerification, isLoading, error };
}
