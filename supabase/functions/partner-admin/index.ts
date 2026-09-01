import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
 *   set_published — flip is_published on one application. The only write.
 */

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
        .select("application_id, doc_type, status, expiration_date, uploaded_at")
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

    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (err) {
    console.error("[partner-admin] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Partner admin request failed." }, 500);
  }
});
