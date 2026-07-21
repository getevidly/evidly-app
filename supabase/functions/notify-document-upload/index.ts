/**
 * Notify Document Upload
 *
 * Sends the pending-review notification email when a user uploads
 * documents from the in-app Documents page.  Mirrors the notification
 * that vendor-secure-upload sends for vendor magic-link uploads.
 *
 * POST { document_ids: string[] }
 * Auth: Bearer JWT — uploader must belong to the org.
 * Self-notification suppression: the uploader is excluded from recipients.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enqueueUploadNotification, triggerDelayedFlush } from "../_shared/uploadEmailQueue.ts";

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

    // ── Auth ─────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── Profile / org gate ───────────────────────────────────
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, organization_id, full_name, email")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return json({ error: "No organization" }, 400);
    }

    const body = await req.json();
    const { document_ids } = body as { document_ids?: string[] };

    if (!document_ids || !document_ids.length) {
      return json({ error: "document_ids required" }, 400);
    }

    // ── Enqueue email notification (batched) ──────────────────
    const uploaderName = profile.full_name || "Team member";
    try {
      await enqueueUploadNotification(supabase, document_ids.map((docId) => ({
        organization_id: profile.organization_id,
        document_id: docId,
        uploaded_by_type: "user" as const,
        uploaded_by_name: uploaderName,
        uploaded_by_user_id: user.id,
      })));
      triggerDelayedFlush(supabaseUrl, serviceKey, profile.organization_id);
    } catch {
      console.error("[NOTIFY] Email enqueue failed — non-critical");
    }

    return json({ success: true });
  } catch (error) {
    console.error("Error in notify-document-upload:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
