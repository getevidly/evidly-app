import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * sealed-evidence-share — the carrier-facing read of a kitchen's seal tally.
 *
 * Public: no JWT. The token in the URL is the auth, which is why it is 32+
 * bytes of crypto-random and why expiry and revocation are checked on every
 * read. Same justification as vendor-secure-upload.
 *
 * GET ?token=<token>
 *
 * What this returns is counts and hash prefixes. It NEVER returns record
 * contents — no titles, narratives, notes, photos, locations or people. A
 * carrier learns how much sealed documentation exists and when it was sealed,
 * and nothing about what any record says.
 *
 * An expired, revoked or unknown token returns HTTP 200 with
 * { ok: false, reason } so the page renders a kind message rather than an
 * error screen. The reason is deliberately coarse — it does not distinguish
 * "never existed" from "revoked" to a caller probing tokens.
 */

type Pillar = "fire_safety" | "food_safety" | "facility_services";

/** Mock order: Fire, Food, Facility. Always all three, zeros included. */
const PILLARS: readonly { key: Pillar; label: string }[] = [
  { key: "fire_safety", label: "Fire Safety" },
  { key: "food_safety", label: "Food Safety" },
  { key: "facility_services", label: "Facility Services" },
] as const;

interface Tally {
  pillar: Pillar;
  label: string;
  incidents_12mo: number;
  corrective_actions_12mo: number;
  incidents_all_time: number;
  corrective_actions_all_time: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Same shape for every unusable token, so the page renders one state and a
  // prober learns nothing from the difference.
  const unusable = () => json({ ok: false, reason: "expired_or_revoked" });

  if (req.method !== "GET") return json({ ok: false, reason: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    if (token.length < 20) return unusable();

    const { data: share, error: shareErr } = await supabase
      .from("sealed_evidence_shares")
      .select("organization_id, created_at, expires_at, revoked_at")
      .eq("token", token)
      .maybeSingle();

    if (shareErr) {
      console.error("[sealed-evidence-share] token lookup failed:", shareErr.message);
      return json({ ok: false, reason: "lookup_failed" }, 500);
    }
    if (!share) return unusable();
    if (share.revoked_at) return unusable();
    if (new Date(share.expires_at as string).getTime() <= Date.now()) return unusable();

    const orgId = share.organization_id as string;

    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const sinceIso = since.toISOString();

    // The !inner embeds are safe: incidents and corrective_actions carry the
    // same org scope as their seal tables, and this read runs as service role
    // anyway. category is the join key — it spans all three pillars, while
    // corrective_actions.pillar is null for facility_services.
    const [orgRes, locRes, incRes, caRes] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      supabase.from("locations").select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),
      supabase.from("incident_seals")
        .select("sealed_at, content_hash, incidents!inner(category)")
        .eq("organization_id", orgId)
        .order("sealed_at", { ascending: false }),
      supabase.from("corrective_action_seals")
        .select("sealed_at, content_hash, corrective_actions!inner(category)")
        .eq("organization_id", orgId)
        .order("sealed_at", { ascending: false }),
    ]);

    const tallies = new Map<Pillar, Tally>(
      PILLARS.map((p) => [p.key, {
        pillar: p.key,
        label: p.label,
        incidents_12mo: 0,
        corrective_actions_12mo: 0,
        incidents_all_time: 0,
        corrective_actions_all_time: 0,
      }]),
    );

    interface SealRow {
      sealed_at: string;
      content_hash: string | null;
      pillar: Pillar | null;
      type: "Incident" | "Corrective Action";
    }
    const recent: SealRow[] = [];

    for (const r of (incRes.data || []) as unknown as Array<
      { sealed_at: string; content_hash: string | null; incidents: { category: string } | null }
    >) {
      const key = r.incidents?.category as Pillar | undefined;
      const t = key ? tallies.get(key) : undefined;
      if (t) {
        t.incidents_all_time++;
        if (r.sealed_at >= sinceIso) t.incidents_12mo++;
      }
      recent.push({
        sealed_at: r.sealed_at,
        content_hash: r.content_hash,
        pillar: key ?? null,
        type: "Incident",
      });
    }

    for (const r of (caRes.data || []) as unknown as Array<
      { sealed_at: string; content_hash: string | null; corrective_actions: { category: string } | null }
    >) {
      const key = r.corrective_actions?.category as Pillar | undefined;
      const t = key ? tallies.get(key) : undefined;
      if (t) {
        t.corrective_actions_all_time++;
        if (r.sealed_at >= sinceIso) t.corrective_actions_12mo++;
      }
      recent.push({
        sealed_at: r.sealed_at,
        content_hash: r.content_hash,
        pillar: key ?? null,
        type: "Corrective Action",
      });
    }

    recent.sort((a, b) => (a.sealed_at < b.sealed_at ? 1 : -1));

    const pillarLabel = (p: Pillar | null) =>
      PILLARS.find((x) => x.key === p)?.label ?? "Unassigned";

    return json({
      ok: true,
      org_name: (orgRes.data?.name as string) || "This kitchen",
      location_count: locRes.count ?? 0,
      created_at: share.created_at,
      expires_at: share.expires_at,
      tallies: PILLARS.map((p) => tallies.get(p.key)!),
      // Hash PREFIX only — enough to reference a seal, never enough to
      // reconstruct one, and carrying nothing about the record's contents.
      recent_seals: recent.slice(0, 5).map((r) => ({
        sealed_at: r.sealed_at,
        type: r.type,
        pillar_label: pillarLabel(r.pillar),
        hash_prefix: (r.content_hash || "").slice(0, 6),
      })),
    });
  } catch (err) {
    console.error("[sealed-evidence-share] fatal:", err);
    return json({ ok: false, reason: "lookup_failed" }, 500);
  }
});
