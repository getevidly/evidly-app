import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { emailVendorQuestion, fileIntact } from "../_shared/vendorDocumentAcceptance.ts";

/**
 * partner-admin — the admin read/write behind the Marketing console's
 * Partners tab.
 *
 * ADMIN ONLY. verify_jwt stays at its default (true) — there is
 * deliberately no [functions.partner-admin] block in config.toml, unlike
 * the four public partner-* functions. On top of the platform's JWT
 * check, the caller's email must end @getevidly.com; anything else is
 * 403 { ok: false, reason: "forbidden" }. Auth shape copied from
 * generate-partner-demo.
 *
 * This is the mirror image of partner-listing. Where that function's
 * select list is a privacy boundary that strips contact details, tokens
 * and expiry dates, this one returns them — email, phone, status,
 * token_expires_at, every document's expiration_date — because the
 * reviewer needs exactly what the public page must never see.
 *
 * Actions:
 *   list          — every application, newest first, each with its six
 *                   documents and a docs_uploaded_count.
 *   set_published — flip is_published on one application.
 *
 * Inbound vendor documents (Arthur's rule, Part 4): Arthur is the
 * recipient of partner documents. He previews and accepts; he never fixes.
 *   preview     — five-minute signed URL for one sent document.
 *   accept      — re-hash the stored file; only if it is still the file the
 *                 partner's check passed on, mark it Accepted and turn on
 *                 tamper detection.
 *   question    — "Ask Vendor a Question": emails the partner.
 *   verify      — tamper detection: is the stored file unchanged?
 * Drafts (vendor_document_checks) are never read here.
 */

const BUCKET = "partner-documents";
const SIGNED_URL_TTL_SECONDS = 300;

// Ordered so every application reports its documents in the same
// sequence, regardless of row order coming back from the table.
const DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

const APPLICATION_FIELDS =
  "id, created_at, first_name, last_name, business_name, service_type, " +
  "email, phone, website, reviews_link, bio, status, is_published, token_expires_at";

interface DocRow {
  application_id: string;
  doc_type: string;
  status: string;
  expiration_date: string | null;
  uploaded_at: string | null;
  id: string;
  doc_number: string | null;
  review_status: string | null;
  check_rows: unknown;
  tamper_detection_at: string | null;
  accepted_at: string | null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  // ── Admin gate ──────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, reason: "forbidden" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();
  if (!caller?.email?.endsWith("@getevidly.com")) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const action = body.action as string | undefined;

  try {
    // ── list ──────────────────────────────────────────────────────
    if (action === "list") {
      const { data: apps, error: appsErr } = await supabase
        .from("partner_applications")
        .select(APPLICATION_FIELDS)
        .order("created_at", { ascending: false });

      if (appsErr) {
        console.error("[partner-admin] application read failed:", appsErr.message);
        return json({ ok: false, error: "Could not load partner applications." }, 500);
      }

      const rows = (apps ?? []) as Record<string, unknown>[];
      if (rows.length === 0) {
        // No applications yet is a real answer, not a failure.
        return json({ ok: true, applications: [] });
      }

      const { data: docs, error: docsErr } = await supabase
        .from("partner_documents")
        .select("id, application_id, doc_type, status, expiration_date, uploaded_at, doc_number, review_status, check_rows, tamper_detection_at, accepted_at")
        .in("application_id", rows.map((r) => r.id as string));

      if (docsErr) {
        console.error("[partner-admin] document read failed:", docsErr.message);
        return json({ ok: false, error: "Could not load partner documents." }, 500);
      }

      const docsByApp = new Map<string, Map<string, DocRow>>();
      for (const d of (docs ?? []) as DocRow[]) {
        if (!docsByApp.has(d.application_id)) docsByApp.set(d.application_id, new Map());
        docsByApp.get(d.application_id)!.set(d.doc_type, d);
      }

      const applications = rows.map((r) => {
        const have = docsByApp.get(r.id as string) ?? new Map<string, DocRow>();
        // All six every time — a doc_type with no row is still a slot the
        // reviewer needs to see as outstanding.
        const documents = DOC_TYPES.map((doc_type) => {
          const d = have.get(doc_type);
          return {
            doc_type,
            status: d?.status ?? "pending",
            uploaded: d?.status === "uploaded",
            expiration_date: d?.expiration_date ?? null,
            uploaded_at: d?.uploaded_at ?? null,
            id: d?.id ?? null,
            doc_number: d?.doc_number ?? null,
            review_status: d?.review_status ?? null,
            check_rows: d?.check_rows ?? null,
            tamper_detection_on: Boolean(d?.tamper_detection_at),
            accepted_at: d?.accepted_at ?? null,
          };
        });
        return {
          ...r,
          documents,
          docs_uploaded_count: documents.filter((d) => d.uploaded).length,
          docs_total: DOC_TYPES.length,
        };
      });

      return json({ ok: true, applications });
    }

    // ── set_published ─────────────────────────────────────────────
    if (action === "set_published") {
      const applicationId = body.application_id as string | undefined;
      const isPublished = body.is_published;

      if (!applicationId || typeof isPublished !== "boolean") {
        return json(
          { ok: false, error: "application_id and is_published (boolean) are required." },
          400,
        );
      }

      const { data: updated, error: updErr } = await supabase
        .from("partner_applications")
        .update({ is_published: isPublished })
        .eq("id", applicationId)
        .select(APPLICATION_FIELDS)
        .maybeSingle();

      if (updErr) {
        console.error("[partner-admin] publish update failed:", updErr.message);
        return json({ ok: false, error: "Could not update the publish state." }, 500);
      }
      if (!updated) {
        return json({ ok: false, error: "Application not found." }, 404);
      }

      return json({ ok: true, application: updated });
    }

    // ── inbound vendor documents: preview / accept / question / verify ──
    if (["preview", "accept", "question", "verify"].includes(action ?? "")) {
      const documentId = body.document_id as string | undefined;
      if (!documentId) return json({ ok: false, error: "document_id is required." }, 400);

      const { data: pdoc, error: pErr } = await supabase
        .from("partner_documents")
        .select("id, application_id, doc_type, file_path, review_status, content_sha256, tamper_detection_at")
        .eq("id", documentId)
        .maybeSingle();
      if (pErr || !pdoc) return json({ ok: false, error: "Document not found." }, 404);
      if (!pdoc.file_path) return json({ ok: false, error: "Nothing has been sent for this document yet." }, 409);

      if (action === "preview") {
        const { data: signed, error: sErr } = await supabase.storage
          .from(BUCKET).createSignedUrl(pdoc.file_path, SIGNED_URL_TTL_SECONDS);
        if (sErr || !signed?.signedUrl) return json({ ok: false, error: "Could not open the document." }, 500);
        return json({ ok: true, url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
      }

      if (action === "verify") {
        const intact = await fileIntact(supabase, BUCKET, pdoc.file_path, pdoc.content_sha256);
        return json({ ok: true, intact, tamper_detection_on: Boolean(pdoc.tamper_detection_at) });
      }

      if (action === "accept") {
        if (pdoc.review_status !== "waiting_for_acceptance") {
          return json({ ok: false, error: "This document is not waiting for acceptance." }, 409);
        }
        const intact = await fileIntact(supabase, BUCKET, pdoc.file_path, pdoc.content_sha256);
        if (intact !== true) {
          return json({ ok: false, error: "This file is not the one that was checked. Ask the partner to send it again." }, 409);
        }
        const now = new Date().toISOString();
        const { error: aErr } = await supabase
          .from("partner_documents")
          .update({ review_status: "accepted", accepted_at: now, accepted_by: caller.email, tamper_detection_at: now })
          .eq("id", pdoc.id);
        if (aErr) {
          console.error("[partner-admin] accept failed:", aErr.message);
          return json({ ok: false, error: "Could not accept the document." }, 500);
        }
        return json({ ok: true, review_status: "accepted", tamper_detection_on: true });
      }

      // question
      const text = String(body.question ?? "").trim().slice(0, 2000);
      if (!text) return json({ ok: false, error: "Type your question first." }, 400);
      const { data: papp } = await supabase
        .from("partner_applications").select("business_name, email").eq("id", pdoc.application_id).maybeSingle();
      if (!papp?.email) return json({ ok: false, error: "This partner has no email on file." }, 400);
      const LABELS: Record<string, string> = {
        business_license: "Business License", professional_license: "Professional License", w9: "W-9",
        liability_insurance: "Liability Insurance", workers_comp: "Workers' Comp", auto_insurance: "Auto Insurance",
      };
      const emailed = await emailVendorQuestion({
        to: papp.email,
        vendorName: papp.business_name || "there",
        documentLabel: LABELS[pdoc.doc_type] ?? pdoc.doc_type,
        askedBy: "EvidLY",
        replyTo: caller.email ?? null,
        question: text,
      });
      return json({ ok: true, emailed });
    }

    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (err) {
    console.error("[partner-admin] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Partner admin request failed." }, 500);
  }
});
