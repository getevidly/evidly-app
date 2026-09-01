import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * partner-listing — the public Trusted Partner Alliance directory.
 *
 * Public: no JWT, no input. getevidly.com/trusted-partner-alliance calls this
 * on load to render the partner cards.
 *
 * Returns ONLY applications with is_published = true. Submitting an
 * application does not put a business on the page; Arthur flips the gate
 * after review.
 *
 * What crosses this boundary is the card and nothing else — business name,
 * service type, website, reviews link, bio, and which documents are on file.
 * Deliberately absent, and it should stay that way: the application id,
 * email, phone, upload_token, token_expires_at, file_path, and every
 * expiration date. A visitor learns that a partner's insurance is on file,
 * never when it lapses or where the file lives.
 */

const DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
] as const;

interface AppRow {
  id: string;
  business_name: string | null;
  service_type: string | null;
  website: string | null;
  reviews_link: string | null;
  bio: string | null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "GET" && req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // The select list IS the privacy boundary — it names every field that may
    // leave. id is read to join the documents and is dropped before returning.
    const { data: apps, error: appsErr } = await supabase
      .from("partner_applications")
      .select("id, business_name, service_type, website, reviews_link, bio")
      .eq("is_published", true)
      .order("business_name", { ascending: true });

    if (appsErr) {
      console.error("[partner-listing] application read failed:", appsErr.message);
      return json({ ok: false, error: "Could not load the partner directory." }, 500);
    }

    const rows = (apps ?? []) as AppRow[];
    if (rows.length === 0) {
      // Nobody published yet is a real answer, not a failure.
      return json({ ok: true, partners: [] });
    }

    const { data: docs, error: docsErr } = await supabase
      .from("partner_documents")
      .select("application_id, doc_type")
      .eq("status", "uploaded")
      .in("application_id", rows.map((r) => r.id));

    if (docsErr) {
      console.error("[partner-listing] document read failed:", docsErr.message);
      return json({ ok: false, error: "Could not load the partner directory." }, 500);
    }

    const uploadedByApp = new Map<string, Set<string>>();
    for (const d of docs ?? []) {
      const appId = d.application_id as string;
      if (!uploadedByApp.has(appId)) uploadedByApp.set(appId, new Set());
      uploadedByApp.get(appId)!.add(d.doc_type as string);
    }

    const partners = rows.map((r) => {
      const have = uploadedByApp.get(r.id) ?? new Set<string>();
      // Ordered by DOC_TYPES, not by row order, so the cards list the same
      // documents in the same sequence every render.
      const uploaded = DOC_TYPES.filter((t) => have.has(t));
      return {
        business_name: r.business_name,
        service_type: r.service_type,
        website: r.website,
        reviews_link: r.reviews_link,
        bio: r.bio,
        docs_uploaded: uploaded,
        docs_uploaded_count: uploaded.length,
        docs_total: DOC_TYPES.length,
      };
    });

    return json({ ok: true, partners });
  } catch (err) {
    console.error("[partner-listing] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Could not load the partner directory." }, 500);
  }
});
