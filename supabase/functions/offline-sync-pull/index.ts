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

interface PullRequest {
  device_id: string;
  last_sync_at: string;
  tables: string[];
}

interface TableChanges {
  records: Record<string, unknown>[];
  count: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const { device_id, last_sync_at, tables } = (await req.json()) as PullRequest;

    if (!device_id) {
      return jsonResponse(
        { success: false, error: "device_id is required" },
        400
      );
    }

    if (!last_sync_at) {
      return jsonResponse(
        { success: false, error: "last_sync_at is required" },
        400
      );
    }

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return jsonResponse(
        { success: false, error: "tables array is required and must not be empty" },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify device exists
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

    const changes: Record<string, TableChanges> = {};

    // For each table, query records updated after last_sync_at
    for (const tableName of tables) {
      try {
        const { data: records, error: queryError } = await supabase
          .from(tableName)
          .select("*")
          .gt("updated_at", last_sync_at)
          .order("updated_at", { ascending: true })
          .limit(500);

        if (queryError) {
          changes[tableName] = { records: [], count: 0 };
          console.error(`Error querying ${tableName}: ${queryError.message}`);
          continue;
        }

        changes[tableName] = {
          records: records || [],
          count: (records || []).length,
        };
      } catch (err) {
        changes[tableName] = { records: [], count: 0 };
        console.error(`Exception querying ${tableName}: ${err}`);
      }
    }

    const syncTimestamp = new Date().toISOString();

    // Update device last_sync_at
    await supabase
      .from("device_registrations")
      .update({ last_sync_at: syncTimestamp })
      .eq("id", device_id);

    return jsonResponse({
      success: true,
      changes,
      sync_timestamp: syncTimestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
