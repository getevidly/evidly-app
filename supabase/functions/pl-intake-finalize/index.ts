import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { logEvent } from "../_shared/events.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

const UPLOAD_BUCKET = "policy-lens-uploads";
const MAX_BYTES = 26214400; // 25 MB

/** Declared policy types — the same set pl-intake-start-inapp accepts. */
const POLICY_TYPES: readonly string[] = [
  "property",
  "general_liability",
  "umbrella_excess",
  "spoilage_contamination",
  "bop",
  "liquor_liability",
  "other",
];

/**
 * Objects the intake folder may hold: policy-1.pdf … policy-5.pdf, plus the
 * legacy single-file object policy.pdf, which counts as policy-1.
 */
const POLICY_OBJECT = /^policy(?:-([1-5]))?\.pdf$/i;

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { intake_id } = body;
    if (!intake_id) {
      return json({ error: "intake_id required" }, 400, headers);
    }

    // Optional per-slot declared types. When supplied they replace the types
    // stashed at intake start; a slot the caller omits resolves to NULL.
    let bodyStatedTypes: string[] | null = null;
    const rawStated = (body as { stated_policy_types?: unknown }).stated_policy_types;
    if (rawStated !== undefined && rawStated !== null) {
      if (!Array.isArray(rawStated)) {
        return json({ error: "stated_policy_types must be an array" }, 400, headers);
      }
      for (const t of rawStated) {
        if (typeof t !== "string" || !POLICY_TYPES.includes(t)) {
          return json({ error: `unknown stated_policy_type: ${String(t)}` }, 400, headers);
        }
      }
      bodyStatedTypes = rawStated as string[];
    }

    // Fetch intake
    const { data: intake, error: fetchErr } = await supabase
      .from("policy_lens_intakes")
      .select("source, phone_verified_at, agent_email_verified_at, policy_pdf_path, referral_code, business_name, contact_name, contact_email, contact_phone, zip, created_at, agent_email, agent_name, extracted_fields")
      .eq("id", intake_id)
      .single();

    if (fetchErr || !intake) {
      return json({ error: "Intake not found" }, 400, headers);
    }

    // Reject if verification timestamp is null
    const verified =
      intake.source === "in_app"
        ? true
        : intake.source === "prospect"
        ? intake.phone_verified_at
        : intake.agent_email_verified_at;

    if (!verified) {
      return json({ error: "Verification required" }, 403, headers);
    }

    // ── Authorization gate (agent door) ───────────────────────
    if (intake.source === "agent") {
      const { data: auth } = await supabase
        .from("policy_lens_authorizations")
        .select("status")
        .eq("intake_id", intake_id)
        .in("status", ["signed", "attested"])
        .limit(1)
        .single();

      if (!auth) {
        return json({ error: "Client authorization required" }, 403, headers);
      }
    }

    // ── Enumerate every policy object in the intake folder ────
    const { data: files, error: listErr } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .list(intake_id);

    if (listErr) {
      logger.error("[pl-intake-finalize] Storage list failed", listErr);
      return json({ error: "No PDF uploaded" }, 400, headers);
    }

    type PolicyObject = {
      name: string;
      slot: number;
      legacy: boolean;
      mimetype?: string;
      size?: number;
    };

    const policyFiles: PolicyObject[] = (files ?? [])
      .map((f: { name: string; metadata?: Record<string, unknown> }) => {
        const match = POLICY_OBJECT.exec(f.name);
        if (!match) return null;
        return {
          name: f.name,
          slot: match[1] ? Number(match[1]) : 1,
          legacy: !match[1],
          mimetype: f.metadata?.mimetype as string | undefined,
          size: f.metadata?.size as number | undefined,
        };
      })
      .filter((f): f is PolicyObject => f !== null)
      // Slot order; the legacy policy.pdf leads its slot so it stays the
      // canonical policy_pdf_path when both forms are present.
      .sort((a, b) => a.slot - b.slot || Number(b.legacy) - Number(a.legacy));

    if (policyFiles.length === 0) {
      return json({ error: "No PDF uploaded" }, 400, headers);
    }

    // Verify file constraints on every object
    for (const f of policyFiles) {
      if (f.mimetype && f.mimetype !== "application/pdf") {
        return json({ error: `${f.name} must be a PDF` }, 400, headers);
      }
      if (f.size && f.size > MAX_BYTES) {
        return json({ error: `${f.name} must be 25 MB or smaller` }, 400, headers);
      }
    }

    // ── Declared types by slot: request body wins over the stash ──
    const stash = (intake.extracted_fields as Record<string, unknown> | null)
      ?.stated_policy_types;
    const statedTypes = bodyStatedTypes ?? (Array.isArray(stash) ? stash : []);
    const statedTypeFor = (slot: number): string | null => {
      const value = statedTypes[slot - 1];
      return typeof value === "string" && value !== "other" ? value : null;
    };

    // ── Re-entry guard: rebuild this intake's policy rows ─────
    // Only doc_type 'policy' is cleared — capture-flow compliance
    // documents on the same intake are left untouched. Extraction
    // runs hold an FK to pl_documents with no cascade, so pointers
    // at the outgoing rows are released before the delete.
    const { data: priorDocs, error: priorErr } = await supabase
      .from("pl_documents")
      .select("id")
      .eq("intake_id", intake_id)
      .eq("doc_type", "policy");

    if (priorErr) {
      logger.error("[pl-intake-finalize] Prior document lookup failed", priorErr);
      return json({ error: "Failed to record policy documents" }, 500, headers);
    }

    if (priorDocs && priorDocs.length > 0) {
      const priorIds = priorDocs.map((d: { id: string }) => d.id);

      const { error: unlinkErr } = await supabase
        .from("pl_extraction_runs")
        .update({ document_id: null })
        .in("document_id", priorIds);

      const { error: clearErr } = await supabase
        .from("pl_documents")
        .delete()
        .in("id", priorIds);

      if (unlinkErr || clearErr) {
        logger.error("[pl-intake-finalize] Document clear failed", unlinkErr ?? clearErr);
        return json({ error: "Failed to record policy documents" }, 500, headers);
      }
    }

    // ── One pl_documents row per uploaded policy PDF ──────────
    const { error: docsErr } = await supabase.from("pl_documents").insert(
      policyFiles.map((f) => ({
        intake_id,
        doc_type: "policy",
        file_path: `${intake_id}/${f.name}`,
        original_filename: f.name,
        mime_type: f.mimetype ?? "application/pdf",
        file_size_bytes: f.size ?? null,
        stated_policy_type: statedTypeFor(f.slot),
      })),
    );

    if (docsErr) {
      logger.error("[pl-intake-finalize] Document insert failed", docsErr);
      return json({ error: "Failed to record policy documents" }, 500, headers);
    }

    // Set policy_pdf_path (first object, legacy) + count, advance to 'review'
    const pdfPath = `${intake_id}/${policyFiles[0].name}`;
    const pdfCount = policyFiles.length;
    const { error: updateErr } = await supabase
      .from("policy_lens_intakes")
      .update({
        policy_pdf_path: pdfPath,
        policy_pdf_count: pdfCount,
        status: "review",
      })
      .eq("id", intake_id);

    if (updateErr) {
      logger.error("[pl-intake-finalize] Update failed", updateErr);
      return json({ error: "Failed to finalize intake" }, 500, headers);
    }

    // ── Fire pl-extract chain once (async, non-blocking) ─────
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/pl-extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ intake_id }),
    }).catch((e) => logger.error("[pl-intake-finalize] pl-extract fire failed", e));

    // ── Log uploaded event ───────────────────────────────────
    await logEvent(supabase, {
      event_type: "uploaded",
      intake_id,
      referral_code: intake.referral_code || undefined,
      metadata: { status_advanced: "review", pdf_path: pdfPath, pdf_count: pdfCount },
    });

    // ── Conversion event: read_started (best-effort) ─────────
    // Tracking must never fail the finalize — the product action is
    // done by this point and the reader is owed their confirmation.
    try {
      const { data: priorRead } = await supabase
        .from("pl_send_events")
        .select("id")
        .eq("intake_id", intake_id)
        .eq("kind", "read_started")
        .limit(1);

      if (!priorRead || priorRead.length === 0) {
        // LEFT-join semantics: a referral code that matches no agent, or
        // no code at all, still emits the event with a null agent_id.
        let agentId: string | null = null;
        if (intake.referral_code) {
          const { data: agentRow } = await supabase
            .from("pl_agents")
            .select("id")
            .eq("ref_code", intake.referral_code)
            .maybeSingle();
          agentId = agentRow?.id ?? null;
        }

        const { error: readEvErr } = await supabase.from("pl_send_events").insert({
          agent_id: agentId,
          intake_id,
          kind: "read_started",
          meta: { policy_count: pdfCount },
        });
        if (readEvErr) {
          console.error("[pl-intake-finalize] read_started insert FAILED", JSON.stringify({
            intake_id,
            agent_id: agentId,
            code: readEvErr.code ?? null,
            message: readEvErr.message ?? String(readEvErr),
          }));
        }
      }
    } catch (readEvErr) {
      console.error("[pl-intake-finalize] read_started emit threw", readEvErr);
    }

    // ── After-finalize confirmation email (non-blocking) ────
    const userEmail = intake.contact_email || intake.agent_email;
    const userName = intake.contact_name || intake.agent_name || "there";
    if (userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: "Your policy is in — Policy Lens is reading it",
          html: buildEmailHtml({
            recipientName: userName,
            bodyHtml: `
              <p>Your policy is uploaded and Policy Lens is reading it now — identifying the provisions that govern your kitchen, and flagging anything missing or overdue.</p>
              <p>We'll send your results when the reading is complete. Need to add anything in the meantime? Just reply.</p>
              <p><em>Policy Lens reads the policy. Your agent evaluates the coverage — it identifies and flags, it never advises.</em></p>
              <p>— Arthur Haggerty, Founder &amp; CEO<br>EvidLY</p>`,
          }),
        });
      } catch (confirmErr) {
        logger.error("[pl-intake-finalize] Confirmation email failed", confirmErr);
      }
    }

    // ── Fetch authorization status for notification ────────
    let authStatus = "none";
    if (intake.source === "agent") {
      const { data: authRow } = await supabase
        .from("policy_lens_authorizations")
        .select("status")
        .eq("intake_id", intake_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (authRow) authStatus = authRow.status;
    }

    // ── Notification email to founders (non-blocking) ─────
    try {
      const contactLabel = intake.contact_name || intake.business_name || "Unknown";
      const door = intake.source === "prospect" ? "Prospect" : intake.source === "in_app" ? "In-App Upload" : "Agent";
      const createdDate = intake.created_at
        ? new Date(intake.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";

      const lines = [
        `<p><strong>Contact:</strong> ${contactLabel}</p>`,
        `<p><strong>Company:</strong> ${intake.business_name || "—"}</p>`,
        `<p><strong>Email:</strong> ${intake.contact_email || "—"}</p>`,
        `<p><strong>Phone:</strong> ${intake.contact_phone || "—"}</p>`,
        `<p><strong>ZIP:</strong> ${intake.zip || "—"}</p>`,
        `<p><strong>Door:</strong> ${door}</p>`,
        `<p><strong>Authorization:</strong> ${authStatus}</p>`,
        `<p><strong>Intake created:</strong> ${createdDate}</p>`,
        `<p><strong>Policy PDFs:</strong> ${pdfCount}</p>`,
      ].join("\n");

      await sendEmail({
        to: "founders@getevidly.com",
        subject: `Policy Lens intake — ${contactLabel} (${door})`,
        html: `<div style="font-family:sans-serif;font-size:14px;color:#1E2D4D;">\n${lines}\n</div>`,
      });
    } catch (emailErr) {
      logger.error("[pl-intake-finalize] Notification email failed", emailErr);
    }

    return json({ success: true, policy_pdf_count: pdfCount, referral_code: intake.referral_code || null }, 200, headers);
  } catch (err) {
    logger.error("[pl-intake-finalize] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
