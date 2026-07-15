import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getSignedUrl, BUCKETS } from '../../lib/storage';

export interface ChecklistDoc {
  type: string;
  name: string;
  storagePath: string;
  createdAt: string;
  expiryDate: string | null;
  vendorName: string | null;
}

/**
 * Fetches compliance_documents for the org, keyed by `type` (not category).
 * Returns the latest doc per type + a function to get a signed view URL.
 */
export function useChecklistDocuments(orgId: string | undefined) {
  const [docMap, setDocMap] = useState<Record<string, ChecklistDoc>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function fetch() {
      setLoading(true);

      const { data } = await supabase
        .from('compliance_documents')
        .select('type, name, storage_path, created_at, expiry_date')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      const map: Record<string, ChecklistDoc> = {};
      for (const d of (data || [])) {
        if (d.type && !map[d.type]) {
          map[d.type] = {
            type: d.type,
            name: d.name,
            storagePath: d.storage_path || '',
            createdAt: d.created_at,
            expiryDate: d.expiry_date || null,
            vendorName: null,
          };
        }
      }
      setDocMap(map);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  async function viewDocument(storagePath: string) {
    if (!storagePath) return;
    const url = await getSignedUrl(BUCKETS.DOCUMENTS, storagePath);
    window.open(url, '_blank');
  }

  return { docMap, loading, viewDocument };
}
