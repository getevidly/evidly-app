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

  // 4. Load findings for the run
  const { data: rows, error: fErr } = await admin
    .from("pl_findings")
    .select("finding_key, part, flag, agent_payload, kitchen_payload, correlation, reviewer_corrected")
    .eq("run_id", grant.run_id)
    .order("part", { ascending: true })
    .order("finding_key", { ascending: true });
  if (fErr) return json({ error: "failed to load findings" }, 500);

  // 5. Shape to the v3 report contract.
  //    When reviewer_corrected is present, override KITCHEN-voice correlation
  //    paths only. Agent-voice paths are never touched — corrections are
  //    authored against kitchen text and were not reviewed for agent voice.
  const findings = (rows ?? []).map((r: any) => {
    const a = r.agent_payload ?? {};
    const k = r.kitchen_payload ?? {};
    const rc = r.reviewer_corrected as { body?: string; risk?: string } | null;
    const raw = r.correlation ?? null;

    let corr = raw;
    if (raw && rc) {
      const overrideExpects = typeof rc.body === "string" && rc.body !== "";
      const overrideGap = typeof rc.risk === "string" && rc.risk !== "";
      if (overrideExpects || overrideGap) {
        corr = {
          ...raw,
          ...(overrideExpects
            ? { expects: { ...raw.expects, kitchen: rc.body } }
            : {}),
          ...(overrideGap
            ? { gap: { ...raw.gap, prospect: { ...raw.gap?.prospect, kitchen: rc.risk } } }
            : {}),
        };
      }
    }
    // If correlation is null but reviewer_corrected exists, skip override —
    // cannot construct a meaningful correlation from corrections alone.

    return {
      id: r.finding_key,
      part: r.part,         // 'fire' | 'food' | 'general'
      flag: r.flag,         // 'high' | 'elevated' | 'satisfied' | 'low'
      correlation: corr,
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

  // ── Build coverage_detail from reconciled (verbatim, §1731 read-only) ──
  const reconciled = run.reconciled as Record<string, unknown> | null;
  let coverage_detail: Record<string, unknown>;

  if (!reconciled) {
    coverage_detail = {
      framing: "Coverage figures as stated in your policy",
      locations: [],
      policy_wide: [],
      food_sublimits: [],
    };
  } else {
    const decl = reconciled.declarations as Record<string, unknown> | undefined;
    const locsWrapper = decl?.locations as { value?: unknown[]; _status?: string } | undefined;

    // ── Locations: array-level conflict → omit all figures ──
    let locations: unknown[];
    let locations_note: string | undefined;

    if (locsWrapper?._status === "conflict") {
      locations = [];
      locations_note = "Location coverage figures could not be confirmed — refer to policy.";
    } else {
      const rawLocs = Array.isArray(locsWrapper?.value) ? locsWrapper.value : [];
      locations = rawLocs.map((loc: any) => ({
        loc_no: loc.loc_no ?? null,
        address: loc.address ?? null,
        scheduled_building: loc.scheduled_building ?? null,
        scheduled_bpp: loc.scheduled_bpp ?? null,
        bi_limit: loc.bi_limit ?? null,
        coinsurance: loc.coinsurance ?? null,
        spoilage_sublimit: loc.spoilage_sublimit ?? null,
      }));
    }

    // ── Policy-wide: per-item conflict → "Refer to policy" ──
    const rawPw = Array.isArray(reconciled.policy_wide) ? reconciled.policy_wide : [];
    const policy_wide = rawPw
      .filter((item: any) => item.percentage_or_value != null)
      .map((item: any) => ({
        label: item.topic ?? null,
        value: (item._status === "agreed" || item._status === "single_pass") ? item.percentage_or_value : "Refer to policy",
        section_ref: item.section_ref ?? null,
      }));

    // ── Food sublimits: per-item conflict → "Refer to policy" ──
    const rawFood = Array.isArray(reconciled.food_findings) ? reconciled.food_findings : [];
    const food_sublimits = rawFood
      .filter((item: any) => item.sublimit_amount != null)
      .map((item: any) => ({
        label: item.topic ?? null,
        value: (item._status === "agreed" || item._status === "single_pass") ? item.sublimit_amount : "Refer to policy",
      }));

    coverage_detail = {
      framing: "Coverage figures as stated in your policy",
      locations,
      ...(locations_note ? { locations_note } : {}),
      policy_wide,
      food_sublimits,
    };
  }

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
