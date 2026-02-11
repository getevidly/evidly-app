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

  try {
    const { device_id, actions } = (await req.json()) as SyncRequest;

    if (!device_id) {
      return jsonResponse(
        { success: false, error: "device_id is required" },
        400
      );
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return jsonResponse(
        { success: false, error: "actions array is required and must not be empty" },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify device exists in device_registrations
    const { data: device, error: deviceError } = await supabase
      .from("device_registrations")
      .select("id, is_active")
      .eq("id", device_id)
      .single();

    if (deviceError || !device) {
      return jsonResponse(
        { success: false, error: "Device not found" },
        404
      );
    }

    if (!device.is_active) {
      return jsonResponse(
        { success: false, error: "Device is deactivated" },
        403
      );
    }

    const results: ActionResult[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    // Iterate each action and perform the appropriate database operation
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      let actionError: string | null = null;

      try {
        if (action.action_type === "insert") {
          const { error } = await supabase
            .from(action.table_name)
            .insert(action.payload);
          if (error) actionError = error.message;
        } else if (action.action_type === "update") {
          if (!action.record_id) {
            actionError = "record_id is required for update actions";
          } else {
            const { error } = await supabase
              .from(action.table_name)
              .update(action.payload)
              .eq("id", action.record_id);
            if (error) actionError = error.message;
          }
        } else if (action.action_type === "delete") {
          if (!action.record_id) {
            actionError = "record_id is required for delete actions";
          } else {
            const { error } = await supabase
              .from(action.table_name)
              .delete()
              .eq("id", action.record_id);
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
    await supabase
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
