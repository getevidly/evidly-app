import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

// ── FEATURE GATE ─────────────────────────────────────────────
// Offline sync is not active — no client code path invokes this
// function (syncEngine.ts simulates sync locally with a setTimeout).
// Set to true and review ALLOWED_TABLES when the feature ships.
const OFFLINE_SYNC_ENABLED = false;

// Server-side allowlist: only these tables may be written via
// offline sync. Any table_name not in this set → 400 + logged.
const ALLOWED_TABLES: ReadonlySet<string> = new Set([
  "temperature_logs",
  "corrective_actions",
]);

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SyncAction {
  action_type: "insert" | "update" | "delete";
  table_name: string;
  record_id?: string;
  payload: Record<string, unknown>;
}

interface SyncRequest {
  device_id: string;
  actions: SyncAction[];
}

interface ActionResult {
  action_index: number;
  success: boolean;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  // ── Feature gate ───────────────────────────────────────────
  if (!OFFLINE_SYNC_ENABLED) {
    return jsonResponse(
      { success: false, error: "Offline sync is not enabled" },
      503,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth: derive caller identity + org server-side ───────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { success: false, error: "Authorization header required" },
        401,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse(
        { success: false, error: "Invalid or expired token" },
        401,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return jsonResponse(
        { success: false, error: "User has no organization" },
        403,
      );
    }

    const callerOrgId: string = profile.organization_id;

    // ── Parse + validate body ────────────────────────────────
    const { device_id, actions } = (await req.json()) as SyncRequest;

    if (!device_id) {
      return jsonResponse(
        { success: false, error: "device_id is required" },
        400,
      );
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return jsonResponse(
        { success: false, error: "actions array is required and must not be empty" },
        400,
      );
    }

    // Verify device exists and is active
    const { data: device, error: deviceError } = await adminClient
      .from("device_registrations")
      .select("id, is_active")
      .eq("id", device_id)
      .single();

    if (deviceError || !device) {
      return jsonResponse(
        { success: false, error: "Device not found" },
        404,
      );
    }

    if (!device.is_active) {
      return jsonResponse(
        { success: false, error: "Device is deactivated" },
        403,
      );
    }

    // ── Process actions ──────────────────────────────────────
    const results: ActionResult[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      let actionError: string | null = null;

      // ── Table allowlist ──────────────────────────────────
      if (!ALLOWED_TABLES.has(action.table_name)) {
        console.warn(
          `[offline-sync] BLOCKED: user ${user.id} attempted write to disallowed table "${action.table_name}"`,
        );
        actionError = `Table "${action.table_name}" is not permitted for offline sync`;
        failedCount++;
        results.push({ action_index: i, success: false, error: actionError });
        continue;
      }

      try {
        if (action.action_type === "insert") {
          // Force caller's org — never trust client-supplied organization_id
          const payload = { ...action.payload, organization_id: callerOrgId };
          const { error } = await adminClient
            .from(action.table_name)
            .insert(payload);
          if (error) actionError = error.message;

        } else if (action.action_type === "update") {
          if (!action.record_id) {
            actionError = "record_id is required for update actions";
          } else {
            // Strip organization_id from payload (immutable); scope by org
            const { organization_id: _drop, ...payload } = action.payload;
            const { error } = await adminClient
              .from(action.table_name)
              .update(payload)
              .eq("id", action.record_id)
              .eq("organization_id", callerOrgId);
            if (error) actionError = error.message;
          }

        } else if (action.action_type === "delete") {
          if (!action.record_id) {
            actionError = "record_id is required for delete actions";
          } else {
            // Scope delete to caller's org
            const { error } = await adminClient
              .from(action.table_name)
              .delete()
              .eq("id", action.record_id)
              .eq("organization_id", callerOrgId);
            if (error) actionError = error.message;
          }

        } else {
          actionError = `Unknown action_type: ${action.action_type}`;
        }
      } catch (err) {
        actionError = err instanceof Error ? err.message : "Unknown error";
      }

      const success = !actionError;
      if (success) syncedCount++;
      else failedCount++;

      results.push({
        action_index: i,
        success,
        ...(actionError ? { error: actionError } : {}),
      });
    }

    // Update device last_sync_at timestamp
    await adminClient
      .from("device_registrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", device_id);

    return jsonResponse({
      success: true,
      results,
      synced_count: syncedCount,
      failed_count: failedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
