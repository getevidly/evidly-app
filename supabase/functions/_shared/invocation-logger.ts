/**
 * EDGE-FN-MONITOR-1 — Shared Invocation Logger
 *
 * Drop-in utility for Edge Functions to log invocations to
 * the `edge_function_invocations` table. Wrap your handler:
 *
 *   import { withInvocationLog } from '../_shared/invocation-logger.ts';
 *
 *   Deno.serve(withInvocationLog('my-function', async (req) => {
 *     // ... your logic ...
 *     return new Response(JSON.stringify({ ok: true }));
 *   }));
 *
 * On success: logs status='success', duration, response payload.
 * On error:   logs status='error', error type/message/stack.
 * On timeout: caller must catch and set status='timeout' manually.
 *
 * Uses the service_role key so it bypasses RLS.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface InvocationRow {
  function_name: string;
  invoked_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'running' | 'success' | 'error' | 'timeout';
  trigger_source: 'cron' | 'manual' | 'event' | 'chained';
  triggered_by?: string;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  error_type?: string;
  error_message?: string;
  error_stack?: string;
  metadata?: Record<string, unknown>;
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

function detectTriggerSource(req: Request): 'cron' | 'manual' | 'event' | 'chained' {
  const auth = req.headers.get('authorization') || '';
  const userAgent = req.headers.get('user-agent') || '';

  // pg_cron calls via pg_net typically have no user-agent
  if (userAgent === '' || userAgent.includes('pg_net')) return 'cron';

  // Manual calls from the dashboard include a bearer token
  if (auth.includes('Bearer')) return 'manual';

  // Chained calls from other edge functions
  if (req.headers.get('x-trigger-source') === 'chained') return 'chained';

  return 'event';
}

/**
 * Higher-order function that wraps a Deno.serve handler with
 * automatic invocation logging.
 */
export function withInvocationLog(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const startedAt = new Date();
    const triggerSource = detectTriggerSource(req);

    let requestPayload: Record<string, unknown> = {};
    try {
      const cloned = req.clone();
      const body = await cloned.text();
      if (body) requestPayload = JSON.parse(body);
    } catch {
      // Not JSON or empty body — that's fine
    }

    const supabase = getSupabaseAdmin();

    // Insert 'running' row
    const { data: inserted } = await supabase
      .from('edge_function_invocations')
      .insert({
        function_name: functionName,
        invoked_at: startedAt.toISOString(),
        status: 'running',
        trigger_source: triggerSource,
        triggered_by: requestPayload.triggered_by || null,
        request_payload: requestPayload,
      } satisfies Partial<InvocationRow>)
      .select('id')
      .single();

    const invocationId = inserted?.id;

    try {
      const response = await handler(req);
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      let responsePayload: Record<string, unknown> = {};
      try {
        const cloned = response.clone();
        const body = await cloned.text();
        if (body) responsePayload = JSON.parse(body);
      } catch {
        // Non-JSON response
      }

      // Update to 'success'
      if (invocationId) {
        await supabase
          .from('edge_function_invocations')
          .update({
            completed_at: completedAt.toISOString(),
            duration_ms: durationMs,
            status: response.ok ? 'success' : 'error',
            response_payload: responsePayload,
            error_type: response.ok ? null : `HTTP ${response.status}`,
            error_message: response.ok ? null : (responsePayload.error as string) || `Status ${response.status}`,
          })
          .eq('id', invocationId);
      }

      return response;
    } catch (err: unknown) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const error = err instanceof Error ? err : new Error(String(err));

      // Update to 'error'
      if (invocationId) {
        await supabase
          .from('edge_function_invocations')
          .update({
            completed_at: completedAt.toISOString(),
            duration_ms: durationMs,
            status: 'error',
            error_type: error.name || 'Error',
            error_message: error.message,
            error_stack: error.stack || null,
          })
          .eq('id', invocationId);
      }

      // Re-throw so the edge function returns a proper error response
      throw err;
    }
  };
}

/**
 * Standalone function for manual invocation logging without the
 * handler wrapper (useful for pg_cron-triggered functions that
 * handle their own request lifecycle).
 */
export async function logInvocation(row: InvocationRow): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('edge_function_invocations')
    .insert(row)
    .select('id')
    .single();
  return data?.id ?? null;
}

export async function completeInvocation(
  invocationId: string,
  update: Partial<InvocationRow>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('edge_function_invocations')
    .update(update)
    .eq('id', invocationId);
}
