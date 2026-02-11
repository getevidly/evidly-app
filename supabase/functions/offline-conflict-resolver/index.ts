import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  try {
    const { conflict_id, resolution, resolved_by, resolution_notes } =
      (await req.json()) as ConflictResolutionRequest;

    if (!conflict_id) {
      return jsonResponse(
        { success: false, error: "conflict_id is required" },
        400
      );
    }

    const validResolutions = ["client_wins", "server_wins", "manual"];
    if (!resolution || !validResolutions.includes(resolution)) {
      return jsonResponse(
        { success: false, error: "resolution must be one of: client_wins, server_wins, manual" },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the conflict record
    const { data: conflict, error: conflictError } = await supabase
      .from("sync_conflicts")
      .select("*")
      .eq("id", conflict_id)
      .single();

    if (conflictError || !conflict) {
      return jsonResponse(
        { success: false, error: "Conflict not found" },
        404
      );
    }

    if (conflict.resolved_at) {
      return jsonResponse(
        { success: false, error: "Conflict has already been resolved" },
        409
      );
    }

    // Apply resolution based on strategy
    if (resolution === "client_wins") {
      // Upsert the client_data to the target table
      const { error: upsertError } = await supabase
        .from(conflict.table_name)
        .upsert(conflict.client_data, { onConflict: "id" });

      if (upsertError) {
        return jsonResponse(
          { success: false, error: `Failed to apply client data: ${upsertError.message}` },
          500
        );
      }
    } else if (resolution === "server_wins") {
      // Server data is already current, no data changes needed
    } else if (resolution === "manual") {
      // Manual resolution: just mark as manual and store notes
      if (!resolution_notes) {
        return jsonResponse(
          { success: false, error: "resolution_notes are required for manual resolution" },
          400
        );
      }
    }

    // Update the sync_conflicts record
    const { error: updateError } = await supabase
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
        500
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
