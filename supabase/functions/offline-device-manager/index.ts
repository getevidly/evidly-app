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

interface RegisterRequest {
  user_id: string;
  device_name: string;
  device_type: string;
  platform?: string;
  app_version?: string;
}

interface DeregisterRequest {
  device_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // POST: Register a new device
    if (req.method === "POST") {
      const { user_id, device_name, device_type, platform, app_version } =
        (await req.json()) as RegisterRequest;

      if (!user_id || !device_name || !device_type) {
        return jsonResponse(
          { success: false, error: "user_id, device_name, and device_type are required" },
          400
        );
      }

      const { data: device, error: insertError } = await supabase
        .from("device_registrations")
        .insert({
          user_id,
          device_name,
          device_type,
          platform: platform || null,
          app_version: app_version || null,
          is_active: true,
          registered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        return jsonResponse(
          { success: false, error: `Failed to register device: ${insertError.message}` },
          500
        );
      }

      return jsonResponse({ success: true, device }, 201);
    }

    // GET: Fetch device info
    if (req.method === "GET") {
      const url = new URL(req.url);
      const deviceId = url.searchParams.get("device_id");

      if (!deviceId) {
        return jsonResponse(
          { success: false, error: "device_id query parameter is required" },
          400
        );
      }

      const { data: device, error: fetchError } = await supabase
        .from("device_registrations")
        .select("*")
        .eq("id", deviceId)
        .single();

      if (fetchError || !device) {
        return jsonResponse(
          { success: false, error: "Device not found" },
          404
        );
      }

      // Get count of pending sync_queue items for this device
      const { count: pendingCount, error: countError } = await supabase
        .from("sync_queue")
        .select("*", { count: "exact", head: true })
        .eq("device_id", deviceId)
        .eq("status", "pending");

      return jsonResponse({
        success: true,
        device,
        sync_stats: {
          pending_items: pendingCount || 0,
          last_sync_at: device.last_sync_at,
        },
      });
    }

    // DELETE: Deregister a device
    if (req.method === "DELETE") {
      const { device_id } = (await req.json()) as DeregisterRequest;

      if (!device_id) {
        return jsonResponse(
          { success: false, error: "device_id is required" },
          400
        );
      }

      // Set device as inactive
      const { error: deactivateError } = await supabase
        .from("device_registrations")
        .update({ is_active: false })
        .eq("id", device_id);

      if (deactivateError) {
        return jsonResponse(
          { success: false, error: `Failed to deregister device: ${deactivateError.message}` },
          500
        );
      }

      // Cancel pending sync_queue items for this device
      await supabase
        .from("sync_queue")
        .update({ status: "cancelled" })
        .eq("device_id", device_id)
        .eq("status", "pending");

      return jsonResponse({
        success: true,
        message: "Device deregistered successfully",
      });
    }

    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
