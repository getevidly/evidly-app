// supabase/functions/pl-get-findings-insured/index.ts
// Session-authed, org-scoped read for the IN-APP insured Policy Lens view.
// Sibling to pl-get-findings (token-gated, external shares). Auth model:
// auth header -> user -> user_profiles.organization_id -> that org's intakes
// -> documents -> latest RELEASED extraction run. Shaping lifted verbatim
// from pl-get-findings; only the front gate differs.
// Deploy: supabase functions deploy pl-get-findings-insured --project-ref irxgmhxhmxtzfwuieblc

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shapeFindings } from "../_shared/pl-report-shaping.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "not authenticated" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "not authenticated" }, 401);
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: profile, error: profErr } = await admin
    .from("user_profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  if (profErr || !profile?.organization_id) {
    return json({ error: "no organization for user", status: "no_org" }, 404);
  }
  const orgId = profile.organization_id;

  const { data: intakes, error: inErr } = await admin
    .from("policy_lens_intakes")
    .select("id")
    .eq("organization_id", orgId);
  if (inErr) return json({ error: "failed to resolve intakes" }, 500);
  const intakeIds = (intakes ?? []).map((i: any) => i.id);
  if (intakeIds.length === 0) {
    return json({ ok: true, status: "no_policy", findings: [], coverage_detail: null }, 200);
  }

  // Runs link to intakes directly via intake_id. Documents are optional (extract runs off
  // intake.policy_pdf_path when no pl_documents row exists), so resolve released runs by
  // intake_id — works whether or not a document row was ever created.
  const { data: run, error: runErr } = await admin
    .from("pl_extraction_runs")
    .select("id, release_status, coverage, reconciled, released_at")
    .in("intake_id", intakeIds)
    .eq("release_status", "released")
    .order("released_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (runErr) return json({ error: "failed to resolve run" }, 500);

  if (!run) {
    // No released run. Check intake status to distinguish in-flight from never-submitted.
    const { data: latestIntake } = await admin
      .from("policy_lens_intakes")
      .select("status, created_at")
      .in("id", intakeIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestIntake && latestIntake.status === "failed") {
      return json({ ok: true, status: "failed", findings: [], coverage_detail: null }, 200);
    }
    if (latestIntake) {
      return json({
        ok: true,
        status: "in_review",
        intake_status: latestIntake.status,
        submitted_at: latestIntake.created_at,
        findings: [],
        coverage_detail: null,
      }, 200);
    }
    return json({ ok: true, status: "no_policy", findings: [], coverage_detail: null }, 200);
  }

  // ── SEALED-FIRST (B4d): serve the FROZEN report if a seal exists. ──
  //    Sealed render/coverage returned verbatim (corrections baked in).
  //    policy header is presentation — recomputed live from reconciled.
  //    Falls through to live shaping for pre-seal releases.
  const { data: sealedIns } = await admin
    .from("pl_sealed_reports")
    .select("report_jsonb")
    .eq("run_id", run.id)
    .maybeSingle();

  if (sealedIns?.report_jsonb) {
    const sp = sealedIns.report_jsonb as Record<string, any>;
    // policy header (presentation only) from reconciled — not the frozen record
    const rec = run.reconciled as Record<string, unknown> | null;
    let policyHeader: any = null;
    if (rec) {
      const decl = rec.declarations as Record<string, unknown> | undefined;
      const declVal = (key: string): string | null => {
        const node = decl?.[key] as { value?: unknown } | undefined;
        return (node && node.value != null) ? String(node.value) : null;
      };
      const firstLoc = (() => {
        const lw = decl?.locations as { value?: any[] } | undefined;
        const arr = Array.isArray(lw?.value) ? lw!.value : [];
        return arr[0] ?? null;
      })();
      policyHeader = {
        insured: declVal("named_insured"),
        carrier: declVal("carrier"),
        policyNo: declVal("policy_number"),
        period: declVal("policy_period"),
        address: firstLoc?.address ?? null,
      };
    }
    return json({
      ok: true,
      edition: "kitchen",
      findings: sp.render ?? [],            // SEALED render, verbatim
      scope: { coverage: run.coverage ?? null },
      coverage_detail: sp.coverage ?? null, // SEALED coverage, verbatim
      policy: policyHeader,
      sealed: true,                          // signal: served from seal
    });
  }
  // ── end sealed-first; live path below (pre-seal backward-compat) ──

  const { data: rows, error: fErr } = await admin
    .from("pl_findings")
    .select("finding_key, part, flag, agent_payload, kitchen_payload, correlation, reviewer_corrected")
    .eq("run_id", run.id)
    .order("part", { ascending: true })
    .order("finding_key", { ascending: true });
  if (fErr) return json({ error: "failed to load findings" }, 500);

  // Shape findings via the shared helper — same code the agent read and the
  // seal run, so the insured sees byte-identical render to what was sealed.
  const findings = shapeFindings(rows);

  const reconciled = run.reconciled as Record<string, unknown> | null;
  let coverage_detail: Record<string, unknown>;

  let policy: any = null;
  if (!reconciled) {
    coverage_detail = {
      framing: "Coverage figures as stated in your policy",
      locations: [],
      policy_wide: [],
      food_sublimits: [],
    };
  } else {
    const decl = reconciled.declarations as Record<string, unknown> | undefined;

    // Unwrap a {value,_status} declaration field → its value, or null
    const declVal = (key: string): string | null => {
      const node = decl?.[key] as { value?: unknown } | undefined;
      return (node && node.value != null) ? String(node.value) : null;
    };
    const firstLoc = (() => {
      const lw = decl?.locations as { value?: any[] } | undefined;
      const arr = Array.isArray(lw?.value) ? lw!.value : [];
      return arr[0] ?? null;
    })();
    policy = {
      insured: declVal("named_insured"),
      carrier: declVal("carrier"),
      policyNo: declVal("policy_number"),
      period: declVal("policy_period"),
      address: firstLoc?.address ?? null,
    };

    const locsWrapper = decl?.locations as { value?: unknown[]; _status?: string } | undefined;

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

    const rawPw = Array.isArray(reconciled.policy_wide) ? reconciled.policy_wide : [];
    const policy_wide = rawPw
      .filter((item: any) => item.percentage_or_value != null)
      .map((item: any) => ({
        label: item.topic ?? null,
        value: (item._status === "agreed" || item._status === "single_pass") ? item.percentage_or_value : "Refer to policy",
        section_ref: item.section_ref ?? null,
      }));

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

  return json({
    ok: true,
    edition: "kitchen",
    findings,
    scope: { coverage: run.coverage ?? null },
    coverage_detail,
    policy: reconciled ? policy : null,
  });
});
