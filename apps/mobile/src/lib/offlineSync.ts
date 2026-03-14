import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export interface SyncQueueItem {
  id: string;
  entity_type: 'photo' | 'checklist' | 'deficiency' | 'voice_note' | 'time_entry' | 'report' | 'signature' | 'service_report';
  entity_local_id: string;
  action: 'create' | 'update';
  payload: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  created_at: string;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('hoodops_offline');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_local_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS local_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'status' | 'attempts' | 'created_at'>): Promise<void> {
  const database = await getDb();
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await database.runAsync(
    'INSERT INTO sync_queue (id, entity_type, entity_local_id, action, payload) VALUES (?, ?, ?, ?, ?)',
    [id, item.entity_type, item.entity_local_id, item.action, item.payload]
  );
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  const database = await getDb();
  return database.getAllAsync<SyncQueueItem>('SELECT * FROM sync_queue WHERE status = ? ORDER BY created_at ASC', ['pending']);
}

export async function syncPendingItems(): Promise<{ synced: number; failed: number }> {
  const items = await getPendingItems();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    const database = await getDb();
    await database.runAsync('UPDATE sync_queue SET status = ?, attempts = attempts + 1 WHERE id = ?', ['syncing', item.id]);

    try {
      const payload = JSON.parse(item.payload);
      const { error } = await supabase.from(getTableName(item.entity_type)).upsert(payload);
      if (error) throw error;
      await database.runAsync('UPDATE sync_queue SET status = ? WHERE id = ?', ['synced', item.id]);
      synced++;
    } catch {
      await database.runAsync('UPDATE sync_queue SET status = ? WHERE id = ?', ['failed', item.id]);
      failed++;
    }
  }

  return { synced, failed };
}

function getTableName(entityType: string): string {
  const map: Record<string, string> = {
    photo: 'job_photos',
    checklist: 'job_checklists',
    deficiency: 'deficiencies',
    voice_note: 'voice_notes',
    time_entry: 'time_entries',
    report: 'job_reports',
    signature: 'job_reports',
    service_report: 'service_reports',
  };
  return map[entityType] || entityType;
}

export async function cacheData(key: string, value: unknown): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO local_cache (key, value, updated_at) VALUES (?, ?, datetime("now"))',
    [key, JSON.stringify(value)]
  );
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM local_cache WHERE key = ?', [key]);
  return row ? JSON.parse(row.value) : null;
}

export async function clearSynced(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM sync_queue WHERE status = ?', ['synced']);
}
