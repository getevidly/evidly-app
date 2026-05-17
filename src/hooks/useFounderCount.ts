import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const FOUNDER_CAP = 250;

interface FounderCountState {
  founderCount: number;
  spotsRemaining: number;
  loading: boolean;
}

export function useFounderCount(): FounderCountState {
  const [founderCount, setFounderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      const { data, error } = await supabase.rpc('get_founder_count');
      if (!cancelled) {
        if (!error && data !== null) {
          setFounderCount(data as number);
        }
        setLoading(false);
      }
    }

    fetchCount();
    return () => { cancelled = true; };
  }, []);

  return {
    founderCount,
    spotsRemaining: Math.max(0, FOUNDER_CAP - founderCount),
    loading,
  };
}
