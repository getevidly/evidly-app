// supabase/functions/pl-get-findings/index.ts
// Token-gated read: validates a signed report token, confirms the run is
// released / not expired / not revoked, returns findings shaped to the v3
// report component's contract. Public-callable (no auth header) — the TOKEN
// is the authorization, exactly like the intake's other public pl- calls.
// Deploy: supabase functions deploy pl-get-findings --project-ref irxgmhxhmxtzfwuieblc

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const { token } = body;
  if (!token) return json({ error: "token required" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Resolve the token -> grant (by hash; raw token never stored)
  const tokenHash = await sha256Hex(token);
  const { data: grant, error: grantErr } = await admin
    .from("pl_report_grants")
    .select("id, run_id, intake_id, door, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .single();

  // Generic message on any miss — don't leak whether a token exists
  if (grantErr || !grant) return json({ error: "report not available" }, 404);

  // 2. Gate: not revoked, not expired
  if (grant.revoked_at) return json({ error: "report access revoked", status: "revoked" }, 403);
  if (new Date(grant.expires_at).getTime() < Date.now()) {
    return json({ error: "report link expired", status: "expired" }, 410);
  }

  // 3. Gate: run must be released
  const { data: run, error: runErr } = await admin
    .from("pl_extraction_runs")
    .select("id, release_status, coverage")
    .eq("id", grant.run_id)
    .single();
  if (runErr || !run) return json({ error: "report not available" }, 404);
  if (run.release_status !== "released") {
    return json({ error: "report not yet finalized", status: "pending" }, 409);
  }

  // 4. Load findings for the run
  const { data: rows, error: fErr } = await admin
    .from("pl_findings")
    .select("finding_key, part, flag, agent_payload, kitchen_payload, correlation")
    .eq("run_id", grant.run_id)
    .order("part", { ascending: true })
    .order("finding_key", { ascending: true });
  if (fErr) return json({ error: "failed to load findings" }, 500);

  // 5. Shape to the v3 report contract.
  //    body is returned as a STRING (DB stores prose). correlation passed
  //    through from DB untouched. Roll-up (per-location state) also omitted —
  //    no per-location data computed yet.
  const findings = (rows ?? []).map((r: any) => {
    const a = r.agent_payload ?? {};
    const k = r.kitchen_payload ?? {};
    return {
      id: r.finding_key,
      part: r.part,         // 'fire' | 'food' | 'general'
      flag: r.flag,         // 'high' | 'elevated' | 'satisfied' | 'low'
      correlation: r.correlation ?? null,
      agent: {
        title: a.title ?? "",
        body: a.body ?? "",
        refs: a.refs ?? null,
      },
      kitchen: {
        title: k.title ?? "",
        body: k.body ?? "",
      },
    };
  });

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

  return json({
    ok: true,
    edition,                    // which brief to render by default
    door: grant.door,
    findings,                   // shaped to v3 contract (body as string; no corr)
    scope: {
      // declared scope from coverage — turns incompleteness into honest disclosure
      coverage: run.coverage ?? null,
    },
  });
});
