import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { connectivityManager } from '../lib/connectivityManager';
import { syncEngine } from '../lib/syncEngine';
import { clearAll as clearOfflineDb } from '../lib/offlineDb';
import type { PendingAction } from '../lib/offlineDb';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface OfflineContextType {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncTime: Date | null;
  deviceId: string;
  triggerSync: () => Promise<void>;
  enqueueAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'status' | 'retries'>) => Promise<void>;
  clearOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(connectivityManager.isOnline);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    connectivityManager.isOnline ? 'idle' : 'offline'
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(syncEngine.getLastSyncTime());
  const [deviceId] = useState(syncEngine.getDeviceId());

  const wasOffline = useRef(!connectivityManager.isOnline);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to connectivity changes
  useEffect(() => {
    const handleConnectivity = (online: boolean) => {
      setIsOnline(online);
      if (!online) {
        setSyncStatus('offline');
        wasOffline.current = true;
      } else if (wasOffline.current) {
        // Came back online — auto-sync after 2s debounce
        wasOffline.current = false;
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          triggerSync();
        }, 2000);
      }
    };

    connectivityManager.subscribe(handleConnectivity);
    return () => {
      connectivityManager.unsubscribe(handleConnectivity);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (hideCompleteTimeoutRef.current) clearTimeout(hideCompleteTimeoutRef.current);
    };
  }, []);

  // Subscribe to sync engine status changes
  useEffect(() => {
    const handleSyncStatus = (status: 'idle' | 'syncing' | 'error' | 'complete') => {
      if (status === 'complete') {
        setSyncStatus('idle');
        setLastSyncTime(new Date());
        // Show "synced" briefly by keeping idle (banner reads lastSyncTime)
      } else if (status === 'syncing') {
        setSyncStatus('syncing');
      } else if (status === 'error') {
        setSyncStatus('error');
      } else {
        setSyncStatus(isOnline ? 'idle' : 'offline');
      }
    };

    syncEngine.onStatusChange(handleSyncStatus);
    return () => syncEngine.offStatusChange(handleSyncStatus);
  }, [isOnline]);

  // Periodic pending count refresh
  useEffect(() => {
    const refreshCount = async () => {
      const count = await syncEngine.getQueueSize();
      setPendingCount(count);
    };

    refreshCount();
    const interval = setInterval(refreshCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOnline || syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    const result = await syncEngine.processQueue();
    const count = await syncEngine.getQueueSize();
    setPendingCount(count);
    setLastSyncTime(syncEngine.getLastSyncTime());
    if (result.failed > 0) {
      setSyncStatus('error');
    } else {
      setSyncStatus('idle');
    }
  }, [isOnline, syncStatus]);

  const enqueueAction = useCallback(async (action: Omit<PendingAction, 'id' | 'timestamp' | 'status' | 'retries'>) => {
    await syncEngine.enqueue(action);
    const count = await syncEngine.getQueueSize();
    setPendingCount(count);
  }, []);

  const clearOfflineData = useCallback(async () => {
    await clearOfflineDb();
    await syncEngine.clearAll();
    setPendingCount(0);
    setLastSyncTime(null);
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        syncStatus,
        pendingCount,
        lastSyncTime,
        deviceId,
        triggerSync,
        enqueueAction,
        clearOfflineData,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
