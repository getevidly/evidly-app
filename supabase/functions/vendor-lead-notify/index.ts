import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(null);

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

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const { service_request_id } = await req.json();

    if (!service_request_id) {
      return jsonResponse({ error: "Missing required field: service_request_id" }, 400);
    }

    // Look up the service request
    const { data: serviceRequest, error: srError } = await supabase
      .from("marketplace_service_requests")
      .select("*, marketplace_vendors(id, vendor_id, company_name)")
      .eq("id", service_request_id)
      .single();

    if (srError || !serviceRequest) {
      return jsonResponse({ error: "Service request not found" }, 404);
    }

    const serviceType = serviceRequest.service_type;
    const locationDetails = serviceRequest.location_details;

    // Find matching vendors based on service_type and service_area overlap
    const { data: matchingVendors, error: vendorError } = await supabase
      .from("marketplace_vendors")
      .select("id, vendor_id, company_name, service_area")
      .eq("is_active", true);

    if (vendorError) {
      throw new Error(`Failed to query vendors: ${vendorError.message}`);
    }

    // Filter vendors whose services match the requested service_type
    const { data: vendorServices } = await supabase
      .from("marketplace_services")
      .select("marketplace_vendor_id, category, subcategory")
      .eq("is_active", true);

    const serviceVendorIds = new Set(
      (vendorServices || [])
        .filter((s) => s.category === serviceType || s.subcategory === serviceType)
        .map((s) => s.marketplace_vendor_id)
    );

    // Filter vendors by service match and service_area overlap with location
    const qualified = (matchingVendors || []).filter((v) => {
      if (!serviceVendorIds.has(v.id)) return false;
      if (locationDetails && Array.isArray(v.service_area) && v.service_area.length > 0) {
        const areaMatch = v.service_area.some(
          (area: string) => locationDetails.toLowerCase().includes(area.toLowerCase())
        );
        return areaMatch;
      }
      return true;
    });

    // Insert lead records for each matching vendor
    const leadInserts = qualified.map((v) => ({
      vendor_id: v.vendor_id,
      service_request_id,
      lead_type: "quote_request" as const,
      fee_amount: 0,
      fee_status: "pending" as const,
    }));

    if (leadInserts.length > 0) {
      const { error: leadError } = await supabase
        .from("vendor_leads")
        .insert(leadInserts);

      if (leadError) {
        throw new Error(`Failed to insert leads: ${leadError.message}`);
      }
    }

    // Send email notification + log for each qualified vendor
    let loggedCount = 0;
    let emailsSent = 0;
    for (const v of qualified) {
      if (!v.vendor_id) continue;

      // Look up vendor email
      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("email, primary_contact_email, company_name")
        .eq("id", v.vendor_id)
        .maybeSingle();

      const vendorEmail = vendorProfile?.email || vendorProfile?.primary_contact_email;
      let sendStatus: "sent" | "failed" = "failed";

      if (vendorEmail) {
        const html = buildEmailHtml({
          recipientName: vendorProfile?.company_name || v.company_name || "there",
          bodyHtml: `
            <p>A new <strong>${serviceType}</strong> service request has been submitted${locationDetails ? ` for a location in <strong>${locationDetails}</strong>` : ""}.</p>
            <p>Log in to your EvidLY vendor portal to view the request details and submit a quote.</p>
          `,
          ctaText: "View Request",
          ctaUrl: "https://app.getevidly.com/vendor/leads",
          footerNote: "You received this because you are a registered service provider on EvidLY.",
        });

        const result = await sendEmail({
          to: vendorEmail,
          subject: `New ${serviceType} service request on EvidLY`,
          html,
        });

        sendStatus = result ? "sent" : "failed";
        if (result) emailsSent++;
      }

      const { error: logError } = await supabase
        .from("vendor_contact_log")
        .insert({
          organization_id: serviceRequest.requesting_org_id,
          vendor_id: v.vendor_id,
          contact_type: "email",
          subject: `lead_notification: New ${serviceType} service request`,
          body: `New lead for service request ${service_request_id}. Service type: ${serviceType}.`,
          status: sendStatus,
        });

      if (!logError) loggedCount++;
    }

    return jsonResponse({
      success: true,
      vendors_notified: qualified.length,
      leads_created: leadInserts.length,
      contact_logs: loggedCount,
      emails_sent: emailsSent,
    });
  } catch (error) {
    console.error("Error in vendor-lead-notify:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
