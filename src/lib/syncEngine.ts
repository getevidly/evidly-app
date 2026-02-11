// Sync Engine — Queue management for offline-first sync
// Manages pending actions, processes sync queue, handles photos

import {
  addPendingAction,
  getPendingActions,
  removePendingAction,
  getPendingActionCount,
  getOfflinePhotos,
  clearAll as clearOfflineDb,
  type PendingAction,
} from './offlineDb';

const LAST_SYNC_KEY = 'evidly_last_sync_time';
const DEVICE_ID_KEY = 'evidly_device_id';

type SyncStatusCallback = (status: 'idle' | 'syncing' | 'error' | 'complete') => void;

class SyncEngineClass {
  private static instance: SyncEngineClass;
  private _isSyncing = false;
  private statusListeners: Set<SyncStatusCallback> = new Set();

  private constructor() {}

  static getInstance(): SyncEngineClass {
    if (!SyncEngineClass.instance) {
      SyncEngineClass.instance = new SyncEngineClass();
    }
    return SyncEngineClass.instance;
  }

  get isSyncing(): boolean {
    return this._isSyncing;
  }

  // --- Device ID ---

  getDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  // --- Last Sync ---

  getLastSyncTime(): Date | null {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? new Date(stored) : null;
  }

  private setLastSyncTime(time: Date): void {
    localStorage.setItem(LAST_SYNC_KEY, time.toISOString());
  }

  // --- Queue Management ---

  async enqueue(action: Omit<PendingAction, 'id' | 'timestamp' | 'status' | 'retries'>): Promise<void> {
    const pendingAction: PendingAction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
      ...action,
    };
    await addPendingAction(pendingAction);
  }

  async getQueueSize(): Promise<number> {
    return getPendingActionCount();
  }

  // --- Status Listeners ---

  onStatusChange(callback: SyncStatusCallback): void {
    this.statusListeners.add(callback);
  }

  offStatusChange(callback: SyncStatusCallback): void {
    this.statusListeners.delete(callback);
  }

  private notifyStatus(status: 'idle' | 'syncing' | 'error' | 'complete') {
    this.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch {
        // ignore
      }
    });
  }

  // --- Process Queue ---

  async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this._isSyncing) return { synced: 0, failed: 0 };

    this._isSyncing = true;
    this.notifyStatus('syncing');

    try {
      const actions = await getPendingActions();
      if (actions.length === 0) {
        this.setLastSyncTime(new Date());
        this._isSyncing = false;
        this.notifyStatus('complete');
        return { synced: 0, failed: 0 };
      }

      // Demo mode: simulate sync with delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let synced = 0;
      let failed = 0;

      for (const action of actions) {
        try {
          // In production: POST to /functions/v1/offline-sync-handler
          // For demo: simulate success
          await removePendingAction(action.id);
          synced++;
        } catch {
          failed++;
        }
      }

      // Process offline photos
      const photos = await getOfflinePhotos();
      if (photos.length > 0) {
        // Demo: simulate photo upload delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        // In production: POST to /functions/v1/offline-photo-batch-upload
      }

      this.setLastSyncTime(new Date());
      this._isSyncing = false;

      if (failed > 0) {
        this.notifyStatus('error');
      } else {
        this.notifyStatus('complete');
      }

      return { synced, failed };
    } catch {
      this._isSyncing = false;
      this.notifyStatus('error');
      return { synced: 0, failed: 0 };
    }
  }

  // --- Clear ---

  async clearAll(): Promise<void> {
    await clearOfflineDb();
    localStorage.removeItem(LAST_SYNC_KEY);
  }
}

export const syncEngine = SyncEngineClass.getInstance();
