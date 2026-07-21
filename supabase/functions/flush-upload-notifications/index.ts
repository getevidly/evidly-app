/**
 * Flush Upload Notifications
 *
 * Queue processor for batched document-upload email notifications.
 * Called by vendor-secure-upload and notify-document-upload via a
 * delayed fire-and-forget (EdgeRuntime.waitUntil).
 *
 * POST { organization_id?: string }
 *   - If organization_id provided, flush that org only.
 *   - If omitted, flush ALL orgs with queued items (cron mode).
 *
 * Auth: service_role key only.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { flushUploadQueue } from "../_shared/uploadEmailQueue.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { organization_id } = body as { organization_id?: string };

    if (organization_id) {
      // Flush a single org
      const result = await flushUploadQueue(
        supabase,
        organization_id,
        supabaseUrl,
        serviceKey,
      );
      return json({ success: true, ...result });
    }

    // Cron mode: find all orgs with queued items and flush each
    const { data: orgs } = await supabase
      .from("document_upload_email_queue")
      .select("organization_id")
      .eq("status", "queued");

    const uniqueOrgs = [...new Set((orgs || []).map((r: any) => r.organization_id))];

    let totalEmails = 0;
    for (const orgId of uniqueOrgs) {
      const result = await flushUploadQueue(supabase, orgId, supabaseUrl, serviceKey);
      totalEmails += result.emailCount;
    }

    return json({ success: true, orgs_processed: uniqueOrgs.length, totalEmails });
  } catch (error) {
    console.error("Error in flush-upload-notifications:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
