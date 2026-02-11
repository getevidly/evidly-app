// Offline Database — IndexedDB storage layer using idb
// Stores pending sync actions, cached data, and offline photos

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'evidly-offline';
const DB_VERSION = 1;

export interface PendingAction {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'processing' | 'failed';
  retries: number;
}

export interface CachedDataEntry {
  key: string;
  data: unknown;
  cachedAt: number;
  expiresAt: number;
}

export interface OfflinePhoto {
  id: string;
  blob: string; // base64 data URL
  activationId: string;
  stepNumber: number;
  caption: string;
  timestamp: number;
}

// In-memory fallback when IndexedDB is unavailable
const memoryStore = {
  pendingActions: new Map<string, PendingAction>(),
  cachedData: new Map<string, CachedDataEntry>(),
  offlinePhotos: new Map<string, OfflinePhoto>(),
};

let db: IDBPDatabase | null = null;
let useMemoryFallback = false;

async function getDb(): Promise<IDBPDatabase | null> {
  if (db) return db;
  if (useMemoryFallback) return null;

  try {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('pendingActions')) {
          database.createObjectStore('pendingActions', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('cachedData')) {
          database.createObjectStore('cachedData', { keyPath: 'key' });
        }
        if (!database.objectStoreNames.contains('offlinePhotos')) {
          database.createObjectStore('offlinePhotos', { keyPath: 'id' });
        }
      },
    });
    return db;
  } catch {
    console.warn('IndexedDB unavailable, using in-memory fallback');
    useMemoryFallback = true;
    return null;
  }
}

// --- Pending Actions ---

export async function addPendingAction(action: PendingAction): Promise<void> {
  const database = await getDb();
  if (database) {
    await database.put('pendingActions', action);
  } else {
    memoryStore.pendingActions.set(action.id, action);
  }
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const database = await getDb();
  if (database) {
    return database.getAll('pendingActions');
  }
  return Array.from(memoryStore.pendingActions.values());
}

export async function removePendingAction(id: string): Promise<void> {
  const database = await getDb();
  if (database) {
    await database.delete('pendingActions', id);
  } else {
    memoryStore.pendingActions.delete(id);
  }
}

export async function getPendingActionCount(): Promise<number> {
  const database = await getDb();
  if (database) {
    return database.count('pendingActions');
  }
  return memoryStore.pendingActions.size;
}

// --- Cached Data ---

export async function cacheData(key: string, data: unknown, ttlMs: number = 3600000): Promise<void> {
  const now = Date.now();
  const entry: CachedDataEntry = { key, data, cachedAt: now, expiresAt: now + ttlMs };
  const database = await getDb();
  if (database) {
    await database.put('cachedData', entry);
  } else {
    memoryStore.cachedData.set(key, entry);
  }
}

export async function getCachedData<T = unknown>(key: string): Promise<T | null> {
  const database = await getDb();
  let entry: CachedDataEntry | undefined;
  if (database) {
    entry = await database.get('cachedData', key);
  } else {
    entry = memoryStore.cachedData.get(key);
  }
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    // Expired — remove it
    if (database) {
      await database.delete('cachedData', key);
    } else {
      memoryStore.cachedData.delete(key);
    }
    return null;
  }
  return entry.data as T;
}

// --- Offline Photos ---

export async function addOfflinePhoto(photo: OfflinePhoto): Promise<void> {
  const database = await getDb();
  if (database) {
    await database.put('offlinePhotos', photo);
  } else {
    memoryStore.offlinePhotos.set(photo.id, photo);
  }
}

export async function getOfflinePhotos(): Promise<OfflinePhoto[]> {
  const database = await getDb();
  if (database) {
    return database.getAll('offlinePhotos');
  }
  return Array.from(memoryStore.offlinePhotos.values());
}

// --- Clear All ---

export async function clearAll(): Promise<void> {
  const database = await getDb();
  if (database) {
    await database.clear('pendingActions');
    await database.clear('cachedData');
    await database.clear('offlinePhotos');
  } else {
    memoryStore.pendingActions.clear();
    memoryStore.cachedData.clear();
    memoryStore.offlinePhotos.clear();
  }
}
