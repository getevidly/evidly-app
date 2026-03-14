import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingItems, getPendingItems } from '../lib/offlineSync';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  sync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true, pendingCount: 0, isSyncing: false, sync: async () => {},
});

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });
    refreshPendingCount();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      sync();
    }
  }, [isOnline]);

  const refreshPendingCount = async () => {
    const items = await getPendingItems();
    setPendingCount(items.length);
  };

  const sync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncPendingItems();
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing, sync }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
