/**
 * DEMO-GUARD-1 — Demo Mode Write Protection
 *
 * Wraps the Supabase client in a Proxy that blocks all write operations
 * (.insert, .update, .upsert, .delete, .rpc, storage uploads) when demo
 * mode is active.  Reads, auth, and the `demo_leads` table are always
 * allowed so lead-capture still works.
 *
 * Usage:
 *   import { createDemoGuardProxy, setDemoWriteGuard } from './supabaseGuard';
 *   const supabase = createDemoGuardProxy(rawClient);
 *   setDemoWriteGuard(true);   // called by DemoContext
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Module-level flag (shared across all imports) ──────────────────
let _isDemoMode = false;

export function setDemoWriteGuard(enabled: boolean) {
  _isDemoMode = enabled;
  if (enabled) {
    console.log(
      '%c[EvidLY] Demo mode active — all Supabase writes are blocked',
      'color:#d4af37;font-weight:bold',
    );
  }
}

export function isDemoWriteGuardActive(): boolean {
  return _isDemoMode;
}

// ── Allow-listed tables that may be written even in demo mode ──────
const ALLOWED_DEMO_TABLES = new Set(['demo_leads']);

// ── Write methods on PostgrestQueryBuilder we need to block ────────
const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

// ── Storage write methods to block ─────────────────────────────────
const STORAGE_WRITE_METHODS = new Set(['upload', 'uploadToSignedUrl', 'remove', 'move', 'copy']);

// ── Blocked response that satisfies { data, error } destructuring ──
const BLOCKED_RESPONSE = Object.freeze({
  data: null,
  error: null,
  count: null,
  status: 200,
  statusText: 'demo-blocked',
});

/**
 * Returns a thenable, chainable no-op object.
 * Supports `await supabase.from('x').insert({}).select().single()` etc.
 */
function createNoOpChain(): unknown {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // Make it thenable so `await` resolves to BLOCKED_RESPONSE
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(BLOCKED_RESPONSE);
      }
      // Any chained method (`.select()`, `.eq()`, `.single()`, etc.) returns itself
      if (typeof prop === 'string') {
        return () => chain;
      }
      return undefined;
    },
  };
  const chain = new Proxy({}, handler);
  return chain;
}

// ── Main factory ───────────────────────────────────────────────────

export function createDemoGuardProxy<T extends SupabaseClient>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      // ── Guard .from() ────────────────────────────────────
      if (prop === 'from') {
        const originalFrom = Reflect.get(target, prop, receiver) as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => {
          const tableName = args[0] as string;
          const queryBuilder = originalFrom.apply(target, args);

          // If not in demo mode, or table is allow-listed, pass through
          if (!_isDemoMode || ALLOWED_DEMO_TABLES.has(tableName)) {
            return queryBuilder;
          }

          // Wrap queryBuilder so write methods are blocked
          return new Proxy(queryBuilder as object, {
            get(qbTarget, qbProp, qbReceiver) {
              if (typeof qbProp === 'string' && WRITE_METHODS.has(qbProp)) {
                return (..._writeArgs: unknown[]) => {
                  console.warn(
                    `%c[DEMO GUARD] Blocked .${qbProp}() on "${tableName}"`,
                    'color:#dc2626',
                  );
                  return createNoOpChain();
                };
              }
              return Reflect.get(qbTarget, qbProp, qbReceiver);
            },
          });
        };
      }

      // ── Guard .rpc() ─────────────────────────────────────
      if (prop === 'rpc') {
        const originalRpc = Reflect.get(target, prop, receiver) as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => {
          if (!_isDemoMode) return originalRpc.apply(target, args);
          console.warn(
            `%c[DEMO GUARD] Blocked .rpc("${args[0]}")`,
            'color:#dc2626',
          );
          return createNoOpChain();
        };
      }

      // ── Guard .storage ───────────────────────────────────
      if (prop === 'storage') {
        const storage = Reflect.get(target, prop, receiver);
        if (!_isDemoMode) return storage;

        return new Proxy(storage as object, {
          get(storageTarget, storageProp, storageReceiver) {
            if (storageProp === 'from') {
              const originalStorageFrom = Reflect.get(storageTarget, storageProp, storageReceiver) as (...args: unknown[]) => unknown;
              return (...sfArgs: unknown[]) => {
                const bucket = sfArgs[0] as string;
                const bucketRef = originalStorageFrom.apply(storageTarget, sfArgs);
                return new Proxy(bucketRef as object, {
                  get(bucketTarget, bucketProp, bucketReceiver) {
                    if (typeof bucketProp === 'string' && STORAGE_WRITE_METHODS.has(bucketProp)) {
                      return (..._uploadArgs: unknown[]) => {
                        console.warn(
                          `%c[DEMO GUARD] Blocked storage.${bucketProp}() on bucket "${bucket}"`,
                          'color:#dc2626',
                        );
                        return Promise.resolve({ data: null, error: null });
                      };
                    }
                    return Reflect.get(bucketTarget, bucketProp, bucketReceiver);
                  },
                });
              };
            }
            return Reflect.get(storageTarget, storageProp, storageReceiver);
          },
        });
      }

      // ── Everything else (auth, realtime, functions, reads) passes through
      return Reflect.get(target, prop, receiver);
    },
  });
}
