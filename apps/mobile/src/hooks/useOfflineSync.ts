/**
 * Offline sync hooks for technician app
 *
 * Manages sync queue for offline-first operation.
 * Queries return stubbed empty data.
 * Mutations throw "Not implemented" until wired to local storage + Supabase.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncQueueItem {
  id: string;
  entityType: 'photo' | 'checklist_response' | 'deficiency' | 'voice_note' | 'clock_event' | 'report';
  entityLocalId: string;
  action: 'create' | 'update' | 'delete';
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Primary offline sync status and controls.
 *
 * TODO: Wire to NetInfo for real connectivity detection.
 * TODO: Wire to local queue (AsyncStorage or SQLite) for pending items.
 * TODO: Implement syncNow to process queue items against Supabase.
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    // TODO: Subscribe to NetInfo for connectivity changes
    //       NetInfo.addEventListener(state => setIsOnline(state.isConnected))
    // TODO: Load pending count from local queue
    setIsOnline(true);
    setPendingCount(0);
    setLastSyncedAt(null);
  }, []);

  const syncNow = useCallback(async () => {
    // TODO: Process all pending queue items:
    //       1. Set syncStatus to 'syncing'
    //       2. Iterate queue items, attempt Supabase upload for each
    //       3. Mark synced items, increment attempt count on failures
    //       4. Update pendingCount and lastSyncedAt
    //       5. Set syncStatus to 'idle' or 'error'
    throw new Error('Not implemented');
  }, []);

  return { isOnline, pendingCount, lastSyncedAt, syncNow, syncStatus };
}

/**
 * Access and manage individual sync queue items.
 *
 * TODO: Wire to local storage (AsyncStorage or SQLite) for queue persistence.
 */
export function useSyncQueue() {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);

  useEffect(() => {
    // TODO: Load queue from local storage
    setQueue([]);
  }, []);

  const retryItem = useCallback(async (itemId: string) => {
    // TODO: Reset item status to 'pending' and attempt sync
    throw new Error('Not implemented');
  }, []);

  const clearItem = useCallback(async (itemId: string) => {
    // TODO: Remove item from local queue
    throw new Error('Not implemented');
  }, []);

  return { queue, retryItem, clearItem };
}

/**
 * Quick accessor for the number of pending sync items.
 *
 * TODO: Wire to local storage count query for efficiency.
 */
export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // TODO: Query local storage for count of items where status = 'pending' or 'failed'
    setCount(0);
  }, []);

  return count;
}
