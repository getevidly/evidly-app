import { useState } from 'react';

export function useOfflineSync() {
  const [pendingCount] = useState<number>(0);
  const [isSyncing] = useState<boolean>(false);
  const [lastSyncAt] = useState<string | null>('2026-03-15T07:00:00Z');

  return {
    pendingCount,
    isSyncing,
    sync: async () => {
      throw new Error('Not implemented in demo mode');
    },
    lastSyncAt,
  };
}
