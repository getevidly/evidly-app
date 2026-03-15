/**
 * useIRRSubmission — Fetch the user's most recent Operations Check (IRR) submission
 *
 * Demo mode returns DEMO_IRR_SUBMISSION.
 * Production queries irr_submissions by user email (RLS policy matches JWT email).
 * Read-only — never writes to irr_submissions.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_IRR_SUBMISSION, type IRRSubmission } from '../data/workforceRiskDemoData';

export function useIRRSubmission() {
  const { isDemoMode } = useDemo();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<IRRSubmission | null>(
    isDemoMode ? DEMO_IRR_SUBMISSION : null,
  );
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (isDemoMode) return;
    const email = user?.email;
    if (!email) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('irr_submissions')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
    } else if (data) {
      setSubmission(data as IRRSubmission);
    }
    setIsLoading(false);
  }, [isDemoMode, user?.email]);

  useEffect(() => { fetch(); }, [fetch]);

  return { submission, isLoading, error };
}
