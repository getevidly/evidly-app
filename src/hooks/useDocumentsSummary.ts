import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface NextRenewal {
  name: string;
  daysUntilExpiry: number;
}

interface DocumentsSummary {
  current: number;
  total: number;
  expiringWithin30Days: number;
  nextRenewals: NextRenewal[];
  loading: boolean;
  error: Error | null;
}

export function useDocumentsSummary(): DocumentsSummary {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [state, setState] = useState<Omit<DocumentsSummary, 'loading' | 'error'>>({
    current: 0,
    total: 0,
    expiringWithin30Days: 0,
    nextRenewals: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function fetch() {
      try {
        const { data, error: qErr } = await supabase
          .from('documents')
          .select('id, title, expiration_date, status')
          .eq('organization_id', orgId);

        if (cancelled) return;
        if (qErr) throw new Error(qErr.message);

        const docs = data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in30 = new Date(today);
        in30.setDate(in30.getDate() + 30);

        const total = docs.length;
        let currentCount = 0;
        let expiring30 = 0;
        const renewals: NextRenewal[] = [];

        for (const doc of docs) {
          const isExpired = doc.expiration_date && new Date(doc.expiration_date) < today;
          if (!isExpired) currentCount++;

          if (doc.expiration_date) {
            const expDate = new Date(doc.expiration_date);
            if (expDate >= today && expDate <= in30) {
              expiring30++;
              const diffMs = expDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              renewals.push({ name: doc.title, daysUntilExpiry: diffDays });
            }
          }
        }

        renewals.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

        setState({
          current: currentCount,
          total,
          expiringWithin30Days: expiring30,
          nextRenewals: renewals.slice(0, 2),
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [orgId]);

  return { ...state, loading, error };
}
