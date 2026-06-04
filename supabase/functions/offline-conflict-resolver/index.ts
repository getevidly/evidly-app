import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

// ── FEATURE GATE ─────────────────────────────────────────────
// Offline sync is not active — no client code path invokes this
// function. Set to true and review allowlists when feature ships.
const OFFLINE_SYNC_ENABLED = false;

// Server-side allowlist: only these tables may be targets of a
// conflict resolution upsert. Reject anything else with 400.
const ALLOWED_TABLES: ReadonlySet<string> = new Set([
  "temperature_logs",
  "corrective_actions",
]);

// Per-table column allowlist — only these columns may appear in
// client_data for an upsert. Unlisted columns are stripped.
const ALLOWED_COLUMNS: Readonly<Record<string, ReadonlySet<string>>> = {
  temperature_logs: new Set([
    "id", "organization_id", "facility_id", "equipment_id",
    "input_method", "temperature", "required_min", "required_max",
    "temp_pass", "reading_time", "shift", "log_type",
    "logged_by", "corrective_action",
  ]),
  corrective_actions: new Set([
    "id", "organization_id", "location_id", "title",
    "category", "description", "severity", "status",
    "source", "created_by",
  ]),
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Strip client_data to only allowed columns for the target table. */
function filterColumns(
  tableName: string,
  data: Record<string, unknown>,
): Record<string, unknown> | null {
  const allowed = ALLOWED_COLUMNS[tableName];
  if (!allowed) return null;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (allowed.has(key)) out[key] = data[key];
  }
  return out;
}

interface ConflictResolutionRequest {
  conflict_id: string;
  resolution: "client_wins" | "server_wins" | "manual";
  resolved_by?: string;
  resolution_notes?: string;
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
    const { conflict_id, resolution, resolved_by, resolution_notes } =
      (await req.json()) as ConflictResolutionRequest;

    if (!conflict_id) {
      return jsonResponse(
        { success: false, error: "conflict_id is required" },
        400,
      );
    }

    const validResolutions = ["client_wins", "server_wins", "manual"];
    if (!resolution || !validResolutions.includes(resolution)) {
      return jsonResponse(
        { success: false, error: "resolution must be one of: client_wins, server_wins, manual" },
        400,
      );
    }

    // Fetch the conflict record — scoped to caller's org
    const { data: conflict, error: conflictError } = await adminClient
      .from("sync_conflicts")
      .select("*")
      .eq("id", conflict_id)
      .eq("organization_id", callerOrgId)
      .single();

    if (conflictError || !conflict) {
      return jsonResponse(
        { success: false, error: "Conflict not found" },
        404,
      );
    }

    if (conflict.resolved_at) {
      return jsonResponse(
        { success: false, error: "Conflict has already been resolved" },
        409,
      );
    }

    // Apply resolution based on strategy
    if (resolution === "client_wins") {
      // ── Table allowlist ──────────────────────────────────
      if (!ALLOWED_TABLES.has(conflict.table_name)) {
        console.warn(
          `[offline-conflict] BLOCKED: user ${user.id} conflict resolution targets disallowed table "${conflict.table_name}"`,
        );
        return jsonResponse(
          { success: false, error: `Table "${conflict.table_name}" is not permitted for offline sync` },
          400,
        );
      }

      // ── Column allowlist — strip unlisted columns ────────
      const clientData = conflict.client_data as Record<string, unknown> | null;
      if (!clientData || typeof clientData !== "object") {
        return jsonResponse(
          { success: false, error: "Conflict has no valid client_data" },
          400,
        );
      }

      const filtered = filterColumns(conflict.table_name, clientData);
      if (!filtered) {
        return jsonResponse(
          { success: false, error: `No column allowlist configured for table "${conflict.table_name}"` },
          400,
        );
      }

      // Force caller's org — never trust client-supplied organization_id
      filtered.organization_id = callerOrgId;

      const { error: upsertError } = await adminClient
        .from(conflict.table_name)
        .upsert(filtered, { onConflict: "id" });

      if (upsertError) {
        return jsonResponse(
          { success: false, error: `Failed to apply client data: ${upsertError.message}` },
          500,
        );
      }
    } else if (resolution === "server_wins") {
      // Server data is already current, no data changes needed
    } else if (resolution === "manual") {
      if (!resolution_notes) {
        return jsonResponse(
          { success: false, error: "resolution_notes are required for manual resolution" },
          400,
        );
      }
    }

    // Update the sync_conflicts record
    const { error: updateError } = await adminClient
      .from("sync_conflicts")
      .update({
        resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: resolved_by || null,
        resolution_notes: resolution_notes || null,
      })
      .eq("id", conflict_id);

    if (updateError) {
      return jsonResponse(
        { success: false, error: `Failed to update conflict record: ${updateError.message}` },
        500,
      );
    }

    return jsonResponse({
      success: true,
      conflict_id,
      resolution,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
