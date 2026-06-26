// supabase/functions/pl-get-findings/index.ts
// Token-gated read: validates a signed report token, confirms the run is
// released / not expired / not revoked, returns findings shaped to the v3
// report component's contract. Public-callable (no auth header) — the TOKEN
// is the authorization, exactly like the intake's other public pl- calls.
// Deploy: supabase functions deploy pl-get-findings --project-ref irxgmhxhmxtzfwuieblc

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shapeFindings, buildCoverageDetail } from "../_shared/pl-report-shaping.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// SHA-256 hex — must match how the grant's token_hash was stored
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { token?: string; accessor_party_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const { token, accessor_party_id } = body;
  if (!token) return json({ error: "token required" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Resolve the token -> grant (by hash; raw token never stored)
  const tokenHash = await sha256Hex(token);
  const { data: grant, error: grantErr } = await admin
    .from("pl_report_grants")
    .select("id, run_id, intake_id, door, expires_at, revoked_at, recipient_party_id, granted_by_org_id, consent_type")
    .eq("token_hash", tokenHash)
    .single();

  // Generic message on any miss — don't leak whether a token exists
  if (grantErr || !grant) return json({ error: "report not available" }, 404);

  // 2. Gate: not revoked, not expired
  if (grant.revoked_at) return json({ error: "report access revoked", status: "revoked" }, 403);
  if (new Date(grant.expires_at).getTime() < Date.now()) {
    return json({ error: "report link expired", status: "expired" }, 410);
  }

  // 3. Gate: consent check — verify requesting broker matches the grant's recipient.
  //    If recipient_party_id is set on the grant, accessor_party_id must match.
  //    This prevents cross-broker leakage: a token addressed to Broker A
  //    cannot be used by Broker B, even if Broker B possesses the raw token.
  let resolvedAccessorPartyId: string | null = accessor_party_id ?? null;
  if (grant.recipient_party_id) {
    if (!accessor_party_id) {
      return json({ error: "accessor_party_id required for this report" }, 400);
    }
    if (accessor_party_id !== grant.recipient_party_id) {
      // Do not leak the intended recipient — generic denial
      return json({ error: "report not available" }, 404);
    }
  }

  // 4. Gate: run must be released
  const { data: run, error: runErr } = await admin
    .from("pl_extraction_runs")
    .select("id, release_status, coverage, reconciled, released_at")
    .eq("id", grant.run_id)
    .single();
  if (runErr || !run) return json({ error: "report not available" }, 404);
  if (run.release_status !== "released") {
    return json({ error: "report not yet finalized", status: "pending" }, 409);
  }

  // ── SEALED-FIRST (B4d): if a seal exists, serve the FROZEN report. ──
  //    The sealed render/coverage are returned VERBATIM (corrections already
  //    baked in at seal time) — NOT recomputed. Presentation wrappers
  //    (edition, door, scope, freshness) are read-time, attached fresh.
  //    Falls through to live shaping for pre-seal releases (backward-compat).
  const { data: sealed } = await admin
    .from("pl_sealed_reports")
    .select("report_jsonb")
    .eq("run_id", grant.run_id)
    .maybeSingle();

  if (sealed?.report_jsonb) {
    const sealedPayload = sealed.report_jsonb as Record<string, any>;
    const edition = grant.door === "agent" ? "agent" : "kitchen";
    const statusAsOf = run.released_at ?? run.id;

    // Telemetry + disclosure still fire — they track ACCESS, not source.
    await admin
      .from("pl_report_grants")
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: (await (async () => {
          const { data } = await admin
            .from("pl_report_grants")
            .select("access_count")
            .eq("id", grant.id)
            .single();
          return (data?.access_count ?? 0) + 1;
        })()),
      })
      .eq("id", grant.id);
    await admin.from("pl_disclosure_events").insert({
      grant_id: grant.id,
      grant_type: grant.consent_type ?? "per_report",
      accessor_user_id: null,
      accessor_party_id: resolvedAccessorPartyId,
      accessed_at: new Date().toISOString(),
      ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return json({
      ok: true,
      edition,
      door: grant.door,
      findings: sealedPayload.render ?? [],          // SEALED render, verbatim
      scope: { coverage: run.coverage ?? null },
      coverage_detail: sealedPayload.coverage ?? null, // SEALED coverage, verbatim
      sealed: true,                                    // signal: served from seal
      freshness: {
        status_as_of: statusAsOf,
        label: `Condition status as of ${typeof statusAsOf === "string" ? new Date(statusAsOf).toLocaleDateString("en-US") : "report release"}`,
        note: "Condition status is a point-in-time snapshot from the evaluation date, not a live feed.",
      },
    });
  }
  // ── end sealed-first; below is the live path (pre-seal backward-compat) ──

  // 4. Load findings for the run
  const { data: rows, error: fErr } = await admin
    .from("pl_findings")
    .select("finding_key, part, flag, agent_payload, kitchen_payload, correlation, reviewer_corrected")
    .eq("run_id", grant.run_id)
    .order("part", { ascending: true })
    .order("finding_key", { ascending: true });
  if (fErr) return json({ error: "failed to load findings" }, 500);

  // 5. Shape to the v3 report contract via the shared helper (single source
  //    of truth — same code the seal runs, so sealed == read by construction).
  const findings = shapeFindings(rows);

  // 6. Map grant door -> report edition. company => kitchen brief, agent => agent brief.
  const edition = grant.door === "agent" ? "agent" : "kitchen";

  // 7. Optionally update access telemetry (best-effort; don't fail the read)
  await admin
    .from("pl_report_grants")
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (await (async () => {
        const { data } = await admin
          .from("pl_report_grants")
          .select("access_count")
          .eq("id", grant.id)
          .single();
        return (data?.access_count ?? 0) + 1;
      })()),
    })
    .eq("id", grant.id);

  // 8. Write disclosure event — defensibility record (best-effort; don't fail the read).
  //    One row per access, append-only. This replaces the scalar access_count
  //    as the authoritative audit trail.
  await admin
    .from("pl_disclosure_events")
    .insert({
      grant_id: grant.id,
      grant_type: grant.consent_type ?? "per_report",
      accessor_user_id: null, // token-gated reads are unauthenticated
      accessor_party_id: resolvedAccessorPartyId,
      accessed_at: new Date().toISOString(),
      ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

  // ── Build coverage_detail via the shared helper (§1731 read-only) ──
  const coverage_detail = buildCoverageDetail(
    run.reconciled as Record<string, unknown> | null,
  );

  // Freshness label: condition status is point-in-time (baked at pl-build-findings time).
  // Do NOT represent baked status as live/continuous.
  const statusAsOf = run.released_at ?? run.id; // released_at is the authoritative build timestamp

  return json({
    ok: true,
    edition,                    // which brief to render by default
    door: grant.door,
    findings,                   // shaped to v3 contract (body as string; no corr)
    scope: {
      // declared scope from coverage — turns incompleteness into honest disclosure
      coverage: run.coverage ?? null,
    },
    coverage_detail,
    freshness: {
      status_as_of: statusAsOf,
      label: `Condition status as of ${typeof statusAsOf === "string" ? new Date(statusAsOf).toLocaleDateString("en-US") : "report release"}`,
      note: "Condition status is a point-in-time snapshot from the evaluation date, not a live feed.",
    },
  });
});
