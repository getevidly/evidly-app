// supabase/functions/verify-pl-report/index.ts
// B4c+: Independently recompute a sealed Policy Lens report's hash from the
// stored report_jsonb and report whether the record is unaltered. READ-ONLY —
// never writes to pl_sealed_reports.
//
// Mirrors verify-inspection-report, but the report seal has NO document bytes
// (empty ArrayBuffer) and NO predecessor (one seal per run, no chain). The
// stored report_jsonb IS the canonical payload compose sealed, so verify feeds
// it straight back through buildCanonicalReportJson — no column reassembly.
//
// Determinism guarantee: same report_jsonb -> same canonical string (fixed
// 7-key order) -> same hash. A mismatch means report_jsonb (or sealed_at /
// sealed_by) was altered after sealing.
//
// Two outcomes:
//   "verified" — recomputed hash == stored content_hash, record genuine
//   "tampered" — mismatch, the sealed row was altered after sealing
//
// Input: { run_id: uuid }   (one seal per run; run_id is the natural key)
// Auth:  admin JWT (same model as pl-release-report).
// Deploy: supabase functions deploy verify-pl-report --project-ref irxgmhxhmxtzfwuieblc

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  buildCanonicalReportJson,
  buildSealHashInput,
  canonicalTimestamp,
  sha256,
} from "../_shared/seal-canonicalization.ts";

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // ── STEP 1: AUTHENTICATE (admin — same model as pl-release-report) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }
    const supabaseAuth = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized — valid JWT required" }, 401, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const isAdmin = user.email?.endsWith("@getevidly.com") || false;
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "platform_admin") {
        return jsonResponse({ error: "Admin access required" }, 403, corsHeaders);
      }
    }

    // ── Parse body ──────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }
    const { run_id } = body as Record<string, any>;
    if (!run_id) {
      return jsonResponse({ error: "Missing required field: run_id" }, 400, corsHeaders);
    }

    // ── STEP 2: FETCH THE SEALED ROW ────────────────────────────────────
    const { data: row, error: rowErr } = await supabase
      .from("pl_sealed_reports")
      .select("id, run_id, intake_id, report_jsonb, content_hash, sealed_at, sealed_by")
      .eq("run_id", run_id)
      .single();

    if (rowErr || !row) {
      return jsonResponse({ error: "No sealed report for this run" }, 404, corsHeaders);
    }
    if (!row.content_hash || !row.sealed_at || !row.sealed_by) {
      return jsonResponse(
        { error: "Record is not fully sealed — nothing to verify" },
        422,
        corsHeaders,
      );
    }

    // ── STEP 3: RECOMPUTE HASH FROM STORED report_jsonb ─────────────────
    //    The stored report_jsonb IS the canonical payload compose sealed.
    //    Feed it back through the SAME builder (fixed 7-key order). No doc
    //    bytes (empty ArrayBuffer), no predecessor ("").
    const sealedAtCanonical = canonicalTimestamp(new Date(row.sealed_at));
    const canonicalJson = buildCanonicalReportJson(
      row.report_jsonb as Record<string, unknown>,
    );
    const hashInput = buildSealHashInput(
      new ArrayBuffer(0),
      canonicalJson,
      sealedAtCanonical,
      row.sealed_by,
      "",
    );
    const recomputedHash = await sha256(hashInput.buffer as ArrayBuffer);
    const hashMatch = recomputedHash === row.content_hash;
    const sealStatus = hashMatch ? "verified" : "tampered";

    // ── STEP 4: RETURN VERIFICATION REPORT ──────────────────────────────
    return jsonResponse(
      {
        run_id: row.run_id,
        intake_id: row.intake_id,
        sealed_report_id: row.id,
        seal_status: sealStatus,
        hash_match: hashMatch,
        stored_hash: row.content_hash,
        recomputed_hash: recomputedHash,
        sealed_at: row.sealed_at,
        sealed_by: row.sealed_by,
        sealed_at_to_the_second: true,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("verify-pl-report unhandled error:", err);
    return jsonResponse(
      { error: "Internal error", detail: (err as Error).message },
      500,
      corsHeaders,
    );
  }
});
