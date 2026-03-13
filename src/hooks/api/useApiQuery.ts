/**
 * useApiQuery — lightweight data-fetching primitive.
 *
 * In demo mode it returns the supplied fallback data instantly.
 * In authenticated mode it calls the queryFn (Supabase query) and
 * exposes standard { data, isLoading, error, refetch } state.
 *
 * When Supabase tables are ready, swap the queryFn implementation
 * in each domain hook — the consumer API stays identical.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDemo } from '../../contexts/DemoContext';

export interface ApiQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface ApiMutationResult<TArgs, TResult = void> {
  mutate: (args: TArgs) => Promise<TResult>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Query hook — returns demo data immediately when in demo mode,
 * otherwise executes queryFn against Supabase.
 */
export function useApiQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  demoData: T,
): ApiQueryResult<T> {
  const { isDemoMode } = useDemo();
  const [data, setData] = useState<T | null>(isDemoMode ? demoData : null);
  const [isLoading, setIsLoading] = useState(!isDemoMode);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (isDemoMode) {
      setData(demoData);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      if (mountedRef.current) {
        setData(result);
        setIsLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    }
  }, [isDemoMode, demoData, queryFn]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Mutation hook — in demo mode it updates local state only;
 * in authenticated mode it calls mutationFn (Supabase write).
 */
export function useApiMutation<TArgs, TResult = void>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  demoFn?: (args: TArgs) => TResult,
): ApiMutationResult<TArgs, TResult> {
  const { isDemoMode } = useDemo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (args: TArgs): Promise<TResult> => {
    if (isDemoMode && demoFn) {
      return demoFn(args);
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutationFn(args);
      setIsLoading(false);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setIsLoading(false);
      throw e;
    }
  }, [isDemoMode, mutationFn, demoFn]);

  return { mutate, isLoading, error };
}
