/**
 * CPP-VENDOR-CONNECT-01 — Vendor Connect Application Handler
 *
 * Receives application from public form, inserts into vendor_connect_applications,
 * sends notification email to admin.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      company_name,
      contact_name,
      email,
      phone,
      service_types,
      service_areas,
      ikeca_certified,
      years_in_business,
      why_apply,
      referred_by,
    } = body;

    // Validate required fields
    if (!company_name || !contact_name || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_name, contact_name, email" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!service_types || service_types.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one service type is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!service_areas || service_areas.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one service area is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check for duplicate applications (same email, pending/waitlisted)
    const { data: existing } = await supabase
      .from("vendor_connect_applications")
      .select("id, status")
      .eq("email", email)
      .in("status", ["pending", "waitlisted"])
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({
          error: "An application with this email is already pending review.",
          existing_status: existing[0].status,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert application
    const { data: application, error: insertErr } = await supabase
      .from("vendor_connect_applications")
      .insert({
        company_name,
        contact_name,
        email,
        phone: phone || null,
        service_types: service_types || [],
        service_areas: service_areas || [],
        ikeca_certified: ikeca_certified || false,
        years_in_business: years_in_business || null,
        why_apply: why_apply || null,
        referred_by: referred_by || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to submit application" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send notification email to admin
    try {
      const { sendEmail, buildEmailHtml } = await import("../_shared/email.ts");
      await sendEmail({
        to: "arthur@getevidly.com",
        subject: `New Vendor Connect Application — ${company_name}`,
        html: buildEmailHtml({
          preheader: `${contact_name} from ${company_name} applied to Vendor Connect`,
          blocks: [
            { type: "heading", text: "New Vendor Connect Application" },
            { type: "text", text: `<strong>${company_name}</strong> has applied to join Vendor Connect.` },
            { type: "text", text: `<strong>Contact:</strong> ${contact_name} (${email}${phone ? `, ${phone}` : ""})` },
            { type: "text", text: `<strong>Services:</strong> ${(service_types || []).join(", ")}` },
            { type: "text", text: `<strong>Counties:</strong> ${(service_areas || []).join(", ")}` },
            { type: "text", text: `<strong>IKECA:</strong> ${ikeca_certified ? "Yes" : "No"}` },
            { type: "text", text: `<strong>Years:</strong> ${years_in_business || "Not specified"}` },
            ...(why_apply ? [{ type: "text", text: `<strong>Why:</strong> ${why_apply}` }] : []),
            { type: "button", text: "Review in Admin Console", url: "https://app.getevidly.com/admin/vendor-connect" },
          ],
        }),
      });
    } catch (emailErr) {
      // Fire-and-forget — don't fail the submission if email fails
      console.error("Email notification failed:", emailErr);
    }

    return new Response(
      JSON.stringify({ id: application.id, success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
