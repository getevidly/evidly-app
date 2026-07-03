import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * confirm-seal-service — VENDOR-SERVICE-SEAL-2c
 *
 * Operator-driven seal for a PSE service record the AI could not read cleanly.
 * The accept bridge (document-review-action) left it accepted (status='current')
 * with metadata.seal_pending. This endpoint takes the operator's CONFIRMED
 * service_date + cert_number, seals via seal-service-record, and clears the flag.
 *
 * Auth mirrors document-review-action: service-role client for DB, operator JWT
 * for identity, org-membership check. Called from the logged-in review screen.
 *
 * cert: caller passes either a real cert_number, OR cert_absent=true (=> "NONE").
 * Never seals a blank/guessed number — the operator asserts absence explicitly.
 */

let corsHeaders = getCorsHeaders(null);

const PSE_SAFEGUARD: Record<string, string> = {
  KEC: "hood_cleaning",
  FS: "fire_suppression",
  FA: "fire_alarm",
  SP: "sprinklers",
};

interface ConfirmPayload {
  documentId: string;
  serviceDate: string;
  certNumber?: string;
  certAbsent?: boolean;
}

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization header" }, 401);
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { documentId, serviceDate, certNumber, certAbsent }: ConfirmPayload = await req.json();
    if (!documentId) return jsonResponse({ error: "documentId is required" }, 400);
    if (!serviceDate || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      return jsonResponse({ error: "A valid service_date (YYYY-MM-DD) is required" }, 400);
    }
    const cert = certAbsent === true ? "NONE" : (certNumber || "").trim();
    if (!cert) {
      return jsonResponse(
        { error: "Enter the certificate number, or mark that the document has none." },
        400,
      );
    }

    const { data: doc, error: docError } = await supabase
      .from("compliance_documents")
      .select("id, organization_id, status, storage_path, vendor_id, service_type_code, location_id, category, metadata")
      .eq("id", documentId)
      .single();
    if (docError || !doc) return jsonResponse({ error: "Document not found" }, 404);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    if (!profile || profile.organization_id !== doc.organization_id) {
      return jsonResponse({ error: "You do not have access to this document" }, 403);
    }

    if (doc.category !== "vendor_service") {
      return jsonResponse({ error: "Not a service record" }, 400);
    }
    const safeguard = doc.service_type_code ? PSE_SAFEGUARD[doc.service_type_code] : undefined;
    if (!safeguard) {
      return jsonResponse({ error: "This service does not seal (not a PSE line)" }, 400);
    }
    if (!doc.location_id) {
      return jsonResponse({ error: "Record has no location; cannot seal" }, 400);
    }
    if (!doc.storage_path) {
      return jsonResponse({ error: "Record has no uploaded file; cannot seal" }, 400);
    }
    if (doc.metadata?.seal_record_id) {
      return jsonResponse({ error: "This record is already sealed", already: true }, 409);
    }

    let vendorName = "Vendor";
    if (doc.vendor_id) {
      const { data: v } = await supabase.from("vendors").select("company_name").eq("id", doc.vendor_id).maybeSingle();
      if (v?.company_name) vendorName = v.company_name;
    }

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    let sealBody: any = null;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/seal-service-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          organization_id: doc.organization_id,
          location_id: doc.location_id,
          safeguard_type: safeguard,
          service_type_code: doc.service_type_code,
          vendor_name: vendorName,
          service_date: serviceDate,
          cert_number: cert,
          source_file_bucket: "documents",
          source_file_path: doc.storage_path,
        }),
        signal: controller.signal,
      });
      sealBody = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("[CONFIRM-SEAL] seal failed:", res.status, sealBody);
        return jsonResponse({ error: "Seal failed. Please retry.", detail: sealBody }, 502);
      }
    } catch (e) {
      console.error("[CONFIRM-SEAL] seal call threw:", e);
      return jsonResponse({ error: "Seal service unreachable. Please retry." }, 502);
    }

    const sealRecordId = sealBody?.id || sealBody?.record_id || sealBody?.seal_id || null;
    const meta = { ...(doc.metadata || {}) };
    delete meta.seal_pending;
    meta.seal_confirmed = {
      by: user.id,
      at: new Date().toISOString(),
      service_date: serviceDate,
      cert_number: cert,
    };
    if (sealRecordId) meta.seal_record_id = sealRecordId;
    await supabase.from("compliance_documents").update({ metadata: meta }).eq("id", doc.id);

    let schedule = "no_schedule";
    if (doc.service_type_code && doc.location_id) {
      const { data: sched } = await supabase
        .from("location_service_schedules")
        .select("id, frequency_interval_days")
        .eq("organization_id", doc.organization_id)
        .eq("location_id", doc.location_id)
        .eq("service_type_code", doc.service_type_code)
        .eq("is_active", true)
        .maybeSingle();
      if (sched) {
        const interval = sched.frequency_interval_days;
        let nextDue: string | null = null;
        if (interval && Number.isFinite(interval)) {
          const d = new Date(serviceDate + "T00:00:00Z");
          d.setUTCDate(d.getUTCDate() + interval);
          nextDue = d.toISOString().slice(0, 10);
        }
        await supabase
          .from("location_service_schedules")
          .update({ last_service_date: serviceDate, next_due_date: nextDue })
          .eq("id", sched.id);
        schedule = "advanced";
      }
    }

    try {
      await supabase.from("compliance_document_activity_log").insert({
        organization_id: doc.organization_id,
        document_id: doc.id,
        event_type: "sealed",
        actor_user_id: user.id,
        actor_label: "Operator confirmed",
        metadata: { service_date: serviceDate, cert_number: cert },
      });
    } catch {
      console.error("[CONFIRM-SEAL] activity log failed — non-critical");
    }

    return jsonResponse({ success: true, sealed: true, schedule });
  } catch (error) {
    console.error("Error in confirm-seal-service:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
