import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface EnrichedDocument {
  id: string;
  organization_id: string;
  location_id: string | null;
  category: string;
  type: string | null;
  name: string;
  status: string;
  storage_path: string | null;
  expiry_date: string | null;
  vendor_id: string | null;
  subject_user_id: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  issued_date: string | null;
  mime_type: string | null;
  vendor_name: string | null;
  subject_user_name: string | null;
  request_stage: string | null;
  request_token_days_remaining: number | null;
  days_until_expiry: number | null;
  request_id: string | null;
  requested_at: string | null;
  request_token_expires_at: string | null;
  request_viewed_at: string | null;
  request_resend_count: number | null;
  request_recipient_email: string | null;
  request_recipient_name: string | null;
  location_name?: string | null;
}

export function useDocumentsByTab(orgId: string | undefined) {
  const [documents, setDocuments] = useState<EnrichedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!orgId) { setDocuments([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('v_documents_enriched')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
      setDocuments([]);
    } else {
      setDocuments((data as EnrichedDocument[]) || []);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { documents, loading, error, refetch: fetch };
}
