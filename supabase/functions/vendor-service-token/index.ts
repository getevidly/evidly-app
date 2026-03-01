import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop(); // "validate" or "update"

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();

    // ── Validate token ──────────────────────────────────────────
    if (action === "validate") {
      const { token } = body;
      if (!token) {
        return jsonResponse({ valid: false, error: "Token is required" }, 400);
      }

      const { data: tokenRow, error } = await supabase
        .from("vendor_service_tokens")
        .select(
          `
          *,
          vendor_service_records(*, vendors(name, contact_email), organizations(name)),
          vendors(name, contact_email)
        `
        )
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !tokenRow) {
        return jsonResponse({
          valid: false,
          error: "Invalid or expired link",
        });
      }

      const record = tokenRow.vendor_service_records;
      return jsonResponse({
        valid: true,
        serviceRecordId: record.id,
        vendorName: tokenRow.vendors?.name || "Unknown Vendor",
        vendorEmail: tokenRow.vendors?.contact_email || "",
        serviceType: record.service_type,
        serviceName: record.service_type, // could map via vendorCategories
        locationName: record.location_id, // could join locations table
        dueDate: record.service_due_date,
        organizationName: record.organizations?.name || "Unknown",
        tokenType: tokenRow.token_type,
        expiresAt: tokenRow.expires_at,
      });
    }

    // ── Submit update ───────────────────────────────────────────
    if (action === "update") {
      const { token, updateType, technicianName, completionDate, rescheduleDate, rescheduleReason, cancelReason, notes } = body;

      if (!token || !updateType) {
        return jsonResponse({ success: false, error: "Token and updateType are required" }, 400);
      }

      // Validate token
      const { data: tokenRow, error: tokenError } = await supabase
        .from("vendor_service_tokens")
        .select("*, vendor_service_records(*)")
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tokenError || !tokenRow) {
        return jsonResponse({ success: false, error: "Invalid or expired token" }, 400);
      }

      // Insert update record
      const { data: updateRow, error: insertError } = await supabase
        .from("vendor_service_updates")
        .insert({
          service_record_id: tokenRow.service_record_id,
          token_id: tokenRow.id,
          organization_id: tokenRow.organization_id,
          vendor_id: tokenRow.vendor_id,
          update_type: updateType,
          technician_name: technicianName || null,
          completion_date: completionDate || null,
          reschedule_date: rescheduleDate || null,
          reschedule_reason: rescheduleReason || null,
          cancel_reason: cancelReason || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) {
        return jsonResponse({ success: false, error: "Failed to save update" }, 500);
      }

      // Mark token as used
      await supabase
        .from("vendor_service_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenRow.id);

      // Update service record status
      const statusMap: Record<string, string> = {
        completed: "completed",
        canceled: "cancelled",
      };
      if (statusMap[updateType]) {
        await supabase
          .from("vendor_service_records")
          .update({
            status: statusMap[updateType],
            completed_at: updateType === "completed" ? (completionDate || new Date().toISOString()) : null,
            completion_notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tokenRow.service_record_id);
      }

      // Create pending verification record
      await supabase.from("vendor_service_verifications").insert({
        service_record_id: tokenRow.service_record_id,
        update_id: updateRow.id,
        organization_id: tokenRow.organization_id,
        verification_status: "pending",
      });

      return jsonResponse({ success: true, updateId: updateRow.id });
    }

    return jsonResponse({ error: "Unknown action" }, 404);
  } catch (err) {
    console.error("vendor-service-token error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
