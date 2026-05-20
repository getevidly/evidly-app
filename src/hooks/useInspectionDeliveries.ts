import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Delivery {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  message_body: string | null;
  delivery_status: 'sent' | 'delivered' | 'failed' | 'bounced';
  failure_reason: string | null;
  sent_at: string;
  delivered_at: string | null;
}

interface InspectionDeliveries {
  deliveries: Delivery[];
  loading: boolean;
  error: Error | null;
}

export function useInspectionDeliveries(): InspectionDeliveries {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function fetch() {
      try {
        const { data, error: qErr } = await supabase
          .from('inspection_package_deliveries')
          .select('id, recipient_email, recipient_name, message_body, delivery_status, failure_reason, sent_at, delivered_at')
          .eq('org_id', orgId)
          .order('sent_at', { ascending: false })
          .limit(5);

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        setDeliveries((data || []) as Delivery[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  return { deliveries, loading, error };
}
