import * as SQLite from 'expo-sqlite';
import { supabase } from './supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SyncAction = 'insert' | 'update' | 'delete';

export interface SyncQueueItem {
  id: number;
  entity_type: string;
  action: SyncAction;
  payload: string; // JSON-serialised
  created_at: string;
  synced: number; // 0 = pending, 1 = synced
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Database handle                                                    */
/* ------------------------------------------------------------------ */

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('hoodops_offline.db');
  }
  return db;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create the local sync-queue table if it doesn't exist yet.
 * Call once at app startup.
 */
export async function initDatabase(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type  TEXT    NOT NULL,
      action       TEXT    NOT NULL CHECK (action IN ('insert','update','delete')),
      payload      TEXT    NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      synced       INTEGER NOT NULL DEFAULT 0,
      error        TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_synced
      ON sync_queue (synced);
  `);
}

/**
 * Enqueue a mutation to be synced to Supabase when connectivity returns.
 */
export async function queueForSync(
  entityType: string,
  action: SyncAction,
  payload: Record<string, unknown>,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO sync_queue (entity_type, action, payload) VALUES (?, ?, ?)`,
    [entityType, action, JSON.stringify(payload)],
  );
}

/**
 * Process all unsynced items in FIFO order.
 * Returns the number of successfully synced items.
 */
export async function processQueue(): Promise<number> {
  const database = await getDb();
  const pending = await database.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC`,
  );

  let syncedCount = 0;

  for (const item of pending) {
    try {
      const payload = JSON.parse(item.payload);

      switch (item.action) {
        case 'insert': {
          const { error } = await supabase
            .from(item.entity_type)
            .insert(payload);
          if (error) throw error;
          break;
        }
        case 'update': {
          const { id: rowId, ...rest } = payload;
          const { error } = await supabase
            .from(item.entity_type)
            .update(rest)
            .eq('id', rowId);
          if (error) throw error;
          break;
        }
        case 'delete': {
          const { error } = await supabase
            .from(item.entity_type)
            .delete()
            .eq('id', payload.id);
          if (error) throw error;
          break;
        }
      }

      await database.runAsync(
        `UPDATE sync_queue SET synced = 1, error = NULL WHERE id = ?`,
        [item.id],
      );
      syncedCount++;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown sync error';
      await database.runAsync(
        `UPDATE sync_queue SET error = ? WHERE id = ?`,
        [message, item.id],
      );
    }
  }

  return syncedCount;
}

/**
 * Returns the number of items waiting to be synced.
 */
export async function getPendingCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0`,
  );
  return result?.count ?? 0;
}

/**
 * Remove all successfully-synced rows from the queue to reclaim space.
 */
export async function clearSynced(): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM sync_queue WHERE synced = 1`);
}
