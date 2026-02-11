import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Query credentials expiring within 30 days that are currently verified
    const { data: expiringCreds, error: credError } = await supabase
      .from("marketplace_credentials")
      .select("*, marketplace_vendors(id, vendor_id, company_name, email)")
      .eq("verified", true)
      .gte("expiration_date", now.toISOString().split("T")[0])
      .lte("expiration_date", in30Days);

    if (credError) {
      throw new Error(`Failed to query credentials: ${credError.message}`);
    }

    if (!expiringCreds || expiringCreds.length === 0) {
      return jsonResponse({ success: true, vendors_alerted: 0, credentials_expiring: 0 });
    }

    // Group credentials by vendor and classify into urgency windows
    const vendorAlerts: Record<string, { vendor: any; alerts: { credential_id: string; type: string; expiration: string; window: string }[] }> = {};

    for (const cred of expiringCreds) {
      const vendor = cred.marketplace_vendors;
      if (!vendor?.vendor_id) continue;

      const vendorId = vendor.vendor_id;
      const daysUntilExpiry = Math.ceil(
        (new Date(cred.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let window = "30-day";
      if (daysUntilExpiry <= 7) window = "7-day";
      else if (daysUntilExpiry <= 14) window = "14-day";

      if (!vendorAlerts[vendorId]) {
        vendorAlerts[vendorId] = { vendor, alerts: [] };
      }

      vendorAlerts[vendorId].alerts.push({
        credential_id: cred.id,
        type: cred.credential_type,
        expiration: cred.expiration_date,
        window,
      });
    }

    // Insert a contact log entry for each vendor with expiring credentials
    let vendorsAlerted = 0;
    const totalExpiring = expiringCreds.length;

    for (const [vendorId, { vendor, alerts }] of Object.entries(vendorAlerts)) {
      const urgentCount = alerts.filter((a) => a.window === "7-day").length;
      const warningCount = alerts.filter((a) => a.window === "14-day").length;
      const noticeCount = alerts.filter((a) => a.window === "30-day").length;

      const summary = [
        urgentCount > 0 ? `${urgentCount} expiring within 7 days` : null,
        warningCount > 0 ? `${warningCount} expiring within 14 days` : null,
        noticeCount > 0 ? `${noticeCount} expiring within 30 days` : null,
      ].filter(Boolean).join(", ");

      const { error: logError } = await supabase
        .from("vendor_contact_log")
        .insert({
          organization_id: vendorId,
          vendor_id: vendorId,
          contact_type: "email",
          subject: `credential_reminder: ${alerts.length} credential(s) expiring soon`,
          body: `Credential expiration alert for ${vendor.company_name}: ${summary}. Credentials: ${alerts.map((a) => `${a.type} (${a.expiration}, ${a.window})`).join("; ")}`,
          status: "sent",
        });

      if (!logError) vendorsAlerted++;
    }

    return jsonResponse({
      success: true,
      vendors_alerted: vendorsAlerted,
      credentials_expiring: totalExpiring,
    });
  } catch (error) {
    console.error("Error in vendor-credential-check:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
