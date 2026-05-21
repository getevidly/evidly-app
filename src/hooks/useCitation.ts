import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Citation {
  id: string;
  code_family: string;
  section_number: string;
  short_title: string;
  full_text: string | null;
  source_url: string | null;
  applies_to_pillar: string;
  current_edition_year: number | null;
  effective_date: string | null;
  metadata: Record<string, unknown>;
}

// Module-level cache — persists across modal opens within same session
const cache = new Map<string, Citation>();

export function useCitation(citationId: string | null) {
  const [citation, setCitation] = useState<Citation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!citationId) {
      setCitation(null);
      return;
    }

    const cached = cache.get(citationId);
    if (cached) {
      setCitation(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: fetchError } = await supabase
        .from('citations')
        .select(
          'id, code_family, section_number, short_title, full_text, source_url, applies_to_pillar, current_edition_year, effective_date, metadata',
        )
        .eq('id', citationId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        const row = data as Citation;
        cache.set(citationId, row);
        setCitation(row);
      } else {
        setError('Citation not found');
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [citationId]);

  return { citation, loading, error };
}
