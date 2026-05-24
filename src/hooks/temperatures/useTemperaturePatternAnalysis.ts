import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface TemperaturePattern {
  detector: string;
  prp: 'predict' | 'reduce' | 'prove';
  title: string;
  evidence_summary: string;
  suggested_action: string;
  confidence_pct: number;
  equipment_name?: string;
  filter_for_history?: Record<string, string>;
}

export interface PatternAnalysisResult {
  loading: boolean;
  error: string | null;
  patterns: TemperaturePattern[];
  tier: number;
  readingsCount: number;
  aiDisclaimer: string;
  aiSummarized: boolean;
  refresh: () => void;
}

interface CachedResult {
  windowDays: number;
  patterns: TemperaturePattern[];
  tier: number;
  readingsCount: number;
  aiDisclaimer: string;
  aiSummarized: boolean;
}

export function useTemperaturePatternAnalysis(
  windowDays: number,
  isDemoMode: boolean,
): PatternAnalysisResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<TemperaturePattern[]>([]);
  const [tier, setTier] = useState(0);
  const [readingsCount, setReadingsCount] = useState(0);
  const [aiDisclaimer, setAiDisclaimer] = useState('');
  const [aiSummarized, setAiSummarized] = useState(false);

  const cacheRef = useRef<CachedResult | null>(null);
  const fetchingRef = useRef(false);

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    if (isDemoMode) {
      setTier(0);
      setPatterns([]);
      setReadingsCount(0);
      setAiDisclaimer('Pattern analysis is not available in guided tour mode.');
      setLoading(false);
      return;
    }

    // Check session cache
    if (!forceRefresh && cacheRef.current?.windowDays === windowDays) {
      setPatterns(cacheRef.current.patterns);
      setTier(cacheRef.current.tier);
      setReadingsCount(cacheRef.current.readingsCount);
      setAiDisclaimer(cacheRef.current.aiDisclaimer);
      setAiSummarized(cacheRef.current.aiSummarized);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'analyze-temperature-patterns',
        { body: { window_days: windowDays, force_refresh: forceRefresh } },
      );

      if (fnError) throw new Error(fnError.message);

      const result = {
        windowDays,
        patterns: data?.patterns || [],
        tier: data?.tier ?? 0,
        readingsCount: data?.readings_count ?? 0,
        aiDisclaimer: data?.ai_disclaimer || '',
        aiSummarized: data?.ai_summarized ?? false,
      };

      cacheRef.current = result;
      setPatterns(result.patterns);
      setTier(result.tier);
      setReadingsCount(result.readingsCount);
      setAiDisclaimer(result.aiDisclaimer);
      setAiSummarized(result.aiSummarized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
      setPatterns([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [windowDays, isDemoMode]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const refresh = useCallback(() => {
    cacheRef.current = null;
    fetchAnalysis(true);
  }, [fetchAnalysis]);

  return {
    loading,
    error,
    patterns,
    tier,
    readingsCount,
    aiDisclaimer,
    aiSummarized,
    refresh,
  };
}
