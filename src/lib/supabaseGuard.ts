/**
 * DEMO-GUARD-2 — Three-Tier Demo Mode Write Protection
 *
 * Wraps the Supabase client in a Proxy that blocks write operations based
 * on the current guard mode:
 *
 *   'live'               — everything passes through (default)
 *   'anonymous_demo'     — blocks ALL writes except ALWAYS_ALLOWED tables
 *   'authenticated_demo' — allows PROFILE_TABLES + ALWAYS_ALLOWED,
 *                          blocks operational/compliance writes
 *
 * Reads, auth, realtime, and edge-function invocations always pass through.
 *
 * Usage:
 *   import { createDemoGuardProxy, setDemoGuardMode } from './supabaseGuard';
 *   const supabase = createDemoGuardProxy(rawClient);
 *   setDemoGuardMode('authenticated_demo'); // called by DemoContext
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Guard mode ──────────────────────────────────────────────
export type DemoGuardMode = 'live' | 'anonymous_demo' | 'authenticated_demo';

let _guardMode: DemoGuardMode = 'live';

export function setDemoGuardMode(mode: DemoGuardMode) {
  _guardMode = mode;
  if (mode === 'anonymous_demo') {
    console.log(
      '%c[EvidLY] Anonymous demo mode — all Supabase writes are blocked',
      'color:#d4af37;font-weight:bold',
    );
  } else if (mode === 'authenticated_demo') {
    console.log(
      '%c[EvidLY] Authenticated demo mode — profile writes allowed, operational writes blocked',
      'color:#d4af37;font-weight:bold',
    );
  }
}

/** @deprecated — use setDemoGuardMode instead. Kept for backward compat. */
export function setDemoWriteGuard(enabled: boolean) {
  setDemoGuardMode(enabled ? 'anonymous_demo' : 'live');
}

export function getDemoGuardMode(): DemoGuardMode {
  return _guardMode;
}

export function isDemoWriteGuardActive(): boolean {
  return _guardMode !== 'live';
}

// ── Table classification ────────────────────────────────────

/** Tables that can ALWAYS be written, in any mode */
const ALWAYS_ALLOWED = new Set([
  'demo_leads',
  'assessment_leads',
  'assessment_responses',
  'assessment_results',
  'kitchen_checkups',
  'kitchen_checkup_responses',
]);

/**
 * PROFILE DATA — tables that store customer-entered configuration.
 * Allowed in authenticated_demo mode because this data persists
 * through conversion. Blocked in anonymous_demo mode.
 */
const PROFILE_TABLES = new Set([
  'organizations',
  'locations',
  'user_profiles',
  'user_location_access',
  'jurisdiction_configs',
  'team_invitations',
  'notification_settings',
  'demo_sessions',
  'demo_generated_data',
  'location_risk_predictions',
]);

// ── Write methods on PostgrestQueryBuilder we need to block ──
const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

// ── Storage write methods to block ──────────────────────────
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
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(BLOCKED_RESPONSE);
      }
      if (typeof prop === 'string') {
        return () => chain;
      }
      return undefined;
    },
  };
  const chain = new Proxy({}, handler);
  return chain;
}

/**
 * Determines if a write to the given table should be blocked
 * under the current guard mode.
 */
function shouldBlockWrite(tableName: string): boolean {
  if (_guardMode === 'live') return false;

  // Always-allowed tables pass through in any mode
  if (ALWAYS_ALLOWED.has(tableName)) return false;

  if (_guardMode === 'anonymous_demo') {
    // Anonymous demo: block everything except ALWAYS_ALLOWED
    return true;
  }

  // authenticated_demo: allow profile tables, block operational
  if (PROFILE_TABLES.has(tableName)) return false;

  // Everything else = operational data = blocked
  return true;
}

// ── Main factory ────────────────────────────────────────────

export function createDemoGuardProxy<T extends SupabaseClient>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      // ── Guard .from() ──────────────────────────────────
      if (prop === 'from') {
        const originalFrom = Reflect.get(target, prop, receiver) as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => {
          const tableName = args[0] as string;
          const queryBuilder = originalFrom.apply(target, args);

          // If live mode, or table is always allowed, pass through
          if (_guardMode === 'live' || ALWAYS_ALLOWED.has(tableName)) {
            return queryBuilder;
          }

          // Wrap queryBuilder so write methods are conditionally blocked
          return new Proxy(queryBuilder as object, {
            get(qbTarget, qbProp, qbReceiver) {
              if (typeof qbProp === 'string' && WRITE_METHODS.has(qbProp)) {
                if (shouldBlockWrite(tableName)) {
                  return (..._writeArgs: unknown[]) => {
                    console.warn(
                      `%c[DEMO GUARD] Blocked .${qbProp}() on "${tableName}" (mode: ${_guardMode})`,
                      'color:#dc2626',
                    );
                    return createNoOpChain();
                  };
                }
              }
              return Reflect.get(qbTarget, qbProp, qbReceiver);
            },
          });
        };
      }

      // ── Guard .rpc() ───────────────────────────────────
      if (prop === 'rpc') {
        const originalRpc = Reflect.get(target, prop, receiver) as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => {
          if (_guardMode === 'live') return originalRpc.apply(target, args);
          // In authenticated_demo, allow RPC calls (needed for conversion, etc.)
          if (_guardMode === 'authenticated_demo') return originalRpc.apply(target, args);
          console.warn(
            `%c[DEMO GUARD] Blocked .rpc("${args[0]}")`,
            'color:#dc2626',
          );
          return createNoOpChain();
        };
      }

      // ── Guard .storage ─────────────────────────────────
      if (prop === 'storage') {
        const storage = Reflect.get(target, prop, receiver);
        if (_guardMode === 'live') return storage;

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
