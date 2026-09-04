import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshInspectionStats } from "../_shared/refreshInspectionStats.ts";

/**
 * regenerate-triggers — rebuilds inspection_triggers from the crawled
 * record. The keystone of the daily loop: crawl → regenerate → the
 * freshest citations sit at the top of the queue.
 *
 * WRITES ONLY inspection_triggers (via the SQL function), and
 * inspection_stats (via the shared refresher). Reads inspection_settings.
 * It does not crawl and it sends nothing.
 *
 * Body:
 *   { jurisdiction: "san-diego-ca" }  one jurisdiction
 *   { all: true }                     every jurisdiction
 *   { recency_days: 30 }              override the stored window
 *
 * THE WINDOW IS OPERATOR-SETTABLE. W is taken from the request body if
 * present, else from inspection_settings.recency_days, and is never a
 * literal in this file. Same for the due overdue cap.
 *
 * WHY A SQL FUNCTION: the whole rebuild has to be one transaction, and
 * the DELETE of status='new' must be a SEPARATE STATEMENT from the
 * INSERTs. Folding them into one data-modifying CTE makes both read the
 * same snapshot, so the re-inserted rows collide with the not-yet-
 * invisible deleted ones on (facility_id, trigger_type, trigger_date).
 * supabase-js cannot express a multi-statement transaction, so the logic
 * lives in public.regenerate_triggers_for_slug and this function calls
 * it once per jurisdiction.
 *
 * OPERATOR DECISIONS SURVIVE. Only status='new' rows are deleted.
 * Anything the operator touched — approved, ready, held, skipped,
 * client, email_exported, call_queued, postcard_staged, contacted —
 * is left exactly where it is, and its facility is skipped so the
 * rebuild cannot give that facility a second trigger.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ── Admin gate ──────────────────────────────────────────────────
  // Two legitimate callers: an operator on a @getevidly.com session,
  // and the service role (the future cron). verify_jwt alone is not
  // enough — it would let any authenticated user rebuild the queue.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // The project carries both legacy JWT keys and new-style secret keys,
  // so an exact match against SUPABASE_SERVICE_ROLE_KEY is not reliable
  // on its own. Read the role claim when the token is a JWT (verify_jwt
  // has already validated the signature), and fall back to the exact
  // key for a non-JWT secret.
  const roleClaim = (() => {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      return (JSON.parse(atob(padded)) as { role?: string }).role ?? null;
    } catch {
      return null;
    }
  })();
  const isServiceRole = roleClaim === "service_role" || token === serviceKey;

  if (!isServiceRole) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller?.email?.endsWith("@getevidly.com")) {
      return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = ((await req.json()) ?? {}) as Record<string, unknown>;
    } catch {
      // An empty body is a valid "use the stored settings" request.
    }
  }

  // ── Settings: body wins, then the stored row. Never a literal. ────
  const { data: settings, error: setErr } = await supabase
    .from("inspection_settings")
    .select("recency_days, due_overdue_cap_days")
    .eq("id", 1)
    .maybeSingle();

  if (setErr) {
    return Response.json(
      { ok: false, error: `settings read failed: ${setErr.message}` },
      { status: 500 },
    );
  }
  if (!settings) {
    return Response.json(
      { ok: false, error: "inspection_settings has no row id=1." },
      { status: 500 },
    );
  }

  const asPositiveInt = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
  };

  const s = settings as { recency_days: number; due_overdue_cap_days: number };
  const recencyDays = asPositiveInt(body.recency_days) ?? s.recency_days;
  const capDays = asPositiveInt(body.due_overdue_cap_days) ?? s.due_overdue_cap_days;

  // ── Which jurisdictions ───────────────────────────────────────────
  let slugs: string[] = [];
  if (body.all === true || body.all === "true") {
    const { data: jRows, error: jErr } = await supabase
      .from("inspection_sources")
      .select("jurisdiction_id, jurisdictions!inner(slug)");
    if (jErr) {
      return Response.json({ ok: false, error: `jurisdiction list failed: ${jErr.message}` }, { status: 500 });
    }
    slugs = [...new Set(
      ((jRows ?? []) as Record<string, any>[])
        .map((r) => r.jurisdictions?.slug as string | undefined)
        .filter(Boolean) as string[],
    )].sort();
  } else if (typeof body.jurisdiction === "string" && body.jurisdiction.trim()) {
    slugs = [(body.jurisdiction as string).trim()];
  } else {
    return Response.json(
      { ok: false, error: "Pass { jurisdiction: <slug> } or { all: true }." },
      { status: 400 },
    );
  }

  // ── Regenerate, one jurisdiction per transaction ──────────────────
  const perJurisdiction: Record<string, unknown>[] = [];
  const errors: string[] = [];
  let processed = 0;

  for (const slug of slugs) {
    try {
      const { data, error } = await supabase.rpc("regenerate_triggers_for_slug", {
        p_slug: slug,
        p_recency_days: recencyDays,
        p_cap_days: capDays,
      });
      if (error) throw new Error(error.message);
      perJurisdiction.push(data as Record<string, unknown>);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      perJurisdiction.push({ slug, error: msg });
      if (errors.length < 5) errors.push(`${slug}: ${msg}`);
    }
    // A rebuild per jurisdiction is heavy; don't stampede the pooler.
    await sleep(100);
  }

  // ── Totals across everything just rebuilt ─────────────────────────
  const sum = (k: string) =>
    perJurisdiction.reduce((acc, r) => acc + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);

  const { count: totalNow } = await supabase
    .from("inspection_triggers")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  const statsRefreshed = await refreshInspectionStats(supabase);

  return Response.json({
    ok: errors.length === 0,
    processed,
    recency_days_used: recencyDays,
    due_overdue_cap_days_used: capDays,
    deleted: sum("deleted"),
    preserved: sum("preserved"),
    cited: sum("cited"),
    clean: sum("clean"),
    due: sum("due"),
    total_now: totalNow ?? null,
    stats_refreshed: statsRefreshed,
    per_jurisdiction: perJurisdiction,
    elapsedMs: Date.now() - startTime,
    errors,
  });
});
