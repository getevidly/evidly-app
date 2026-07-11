/**
 * Shared auth helper for edge functions (H-4)
 *
 * Provides two client creation patterns:
 * 1. createUserClient(req) — uses the user's JWT from Authorization header (preferred)
 * 2. createServiceClient() — uses service role key (only for webhooks/cron/admin ops)
 *
 * Usage:
 *   import { createUserClient, createServiceClient } from '../_shared/authClient.ts';
 */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

/**
 * Create a Supabase client scoped to the calling user's JWT.
 * RLS policies are enforced. Use this for user-initiated operations.
 *
 * Returns null if no valid Authorization header is present.
 */
export function createUserClient(req: Request): SupabaseClient | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

/**
 * Create a Supabase client with service role (bypasses RLS).
 * ONLY use for:
 * - Webhook receivers (no user JWT available)
 * - Cron/scheduled functions
 * - Admin operations (user management)
 * - Cross-tenant aggregation queries
 */
export function createServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Extract vendor_id from the user's JWT claims.
 * Requires a user client created with createUserClient.
 */
export async function getVendorIdFromJWT(client: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await client.auth.getUser();
  return user?.app_metadata?.vendor_id ?? null;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
