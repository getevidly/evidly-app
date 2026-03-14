import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  getPendingCount,
  initDatabase,
  processQueue,
  clearSynced,
} from '../lib/offlineSync';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OfflineContextValue {
  /** Whether the device currently has network connectivity. */
  isOnline: boolean;
  /** Number of mutations waiting to be synced. */
  pendingSyncCount: number;
  /** ISO timestamp of the last successful sync pass, or null. */
  lastSyncedAt: string | null;
  /** Manually trigger a sync pass. */
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(
  undefined,
);

/* ------------------------------------------------------------------ */
/*  Simple connectivity check (no external dependency)                 */
/* ------------------------------------------------------------------ */

/**
 * Lightweight connectivity probe.
 *
 * We intentionally avoid pulling in `@react-native-community/netinfo`
 * as a hard dependency so the scaffold stays lean.  Instead we do a
 * tiny HEAD request against a known-good endpoint.  This can be
 * swapped for NetInfo later with zero API changes.
 */
async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------- initialise offline DB ---------- */
  useEffect(() => {
    initDatabase().catch((err) =>
      console.warn('[OfflineContext] DB init error:', err),
    );
  }, []);

  /* ---------- refresh pending count ---------- */
  const refreshPending = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingSyncCount(count);
    } catch {
      // Ignore -- DB might not be ready yet
    }
  }, []);

  /* ---------- sync pass ---------- */
  const syncNow = useCallback(async () => {
    const online = await checkConnectivity();
    setIsOnline(online);

    if (!online) {
      await refreshPending();
      return;
    }

    try {
      const synced = await processQueue();
      if (synced > 0) {
        setLastSyncedAt(new Date().toISOString());
        await clearSynced();
      }
    } catch (err) {
      console.warn('[OfflineContext] sync error:', err);
    }

    await refreshPending();
  }, [refreshPending]);

  /* ---------- periodic polling ---------- */
  useEffect(() => {
    // Initial check
    syncNow();

    intervalRef.current = setInterval(syncNow, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncNow]);

  /* ---------- sync when app comes to foreground ---------- */
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncNow();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [syncNow]);

  /* ---------- value ---------- */
  const value = useMemo<OfflineContextValue>(
    () => ({ isOnline, pendingSyncCount, lastSyncedAt, syncNow }),
    [isOnline, pendingSyncCount, lastSyncedAt, syncNow],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error('useOffline must be used within an <OfflineProvider>');
  }
  return ctx;
}
