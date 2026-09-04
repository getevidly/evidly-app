import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * refresh-jurisdiction — crawl a county's recent inspections, then turn
 * them into triggers. What the Refresh buttons and the nightly cron call.
 *
 * WRITES ONLY what the crawlers and regenerate-triggers already write:
 * the crawler task tables (to queue the work), facilities, inspections,
 * violations, inspection_triggers, inspection_stats,
 * facility_inspection_cadence. It sends nothing.
 *
 * WHY IT SEEDS FIRST: every crawler is queue-driven and every queue is
 * currently drained, so invoking a crawler on its own is a no-op. This
 * function queues the work, runs the crawler until the queue empties or
 * the budget runs out, then regenerates.
 *
 * NOT EVERY COUNTY CAN BE RE-CRAWLED. Five of the fourteen were bulk
 * loaded and have no callable crawler; they are skipped with a reason
 * rather than silently reported as refreshed. See CRAWLERS below.
 */

/** Nothing here may loop unbounded — a refresh must always terminate. */
const MAX_CRAWL_INVOCATIONS = 4;
/** Leave room inside the platform's request ceiling for the regenerate call. */
const CRAWL_BUDGET_MS = 95_000;
/** How many days back an MHD refresh re-crawls. */
const DEFAULT_RECENT_DAYS = 7;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CrawlerSpec {
  fn: string;
  /** 'direct' crawlers have no task queue. */
  taskTable?: string;
  /**
   * 'recent_days' seeds only the last N days; 'full' re-queues the whole
   * county; 'direct' has no queue at all — the crawler takes a dated
   * query itself and is invoked once.
   */
  mode: "recent_days" | "full" | "direct";
}

/**
 * platform_family → crawler. A family absent from this map has no
 * callable crawler and is skipped honestly.
 *
 * Deliberately absent, with reasons:
 *   arcgis_bulk        (la-county-ca)                     — bulk loaded
 *   contra_costa_webforms (contra-costa-ca)               — no crawler; the
 *                          portal is VIEWSTATE-only and robots-disallowed
 *   decade_accela      (ventura-ca) — inspection-crawl-ventura DOES exist,
 *                          but it is a whole-county zip/name-prefix crawl
 *                          with no recent mode, so it is not wired into a
 *                          per-county refresh. Run it directly for a full
 *                          re-crawl.
 */
const CRAWLERS: Record<string, CrawlerSpec> = {
  myhealthdepartment: { fn: "inspection-crawl-mhd", taskTable: "mhd_crawl_tasks", mode: "recent_days" },
  stanislaus_rest: { fn: "stan-crawl", taskTable: "stan_crawl_tasks", mode: "full" },
  sbc_webmethod: { fn: "sbc-crawl", taskTable: "sbc_crawl_tasks", mode: "full" },
  merced_aspx: { fn: "merced-crawl", taskTable: "merced_crawl_tasks", mode: "full" },
  // Socrata speaks SoQL, so recency is a dated query, not a queue.
  socrata: { fn: "socrata-crawl", mode: "direct" },
  // sdfoodinfo takes start_date/end_date on its search POST, so it is
  // dated-query too: 449 rows in ~8s against 16,872 in 62s undated.
  sdfoodinfo_custom: { fn: "sdfoodinfo-crawl", mode: "direct" },
};

const NO_CRAWLER_REASON: Record<string, string> = {
  arcgis_bulk: "bulk load, no re-crawl function — needs bulk reload",
  contra_costa_webforms: "no crawler — portal is VIEWSTATE-only and robots-disallowed",
  decade_accela: "inspection-crawl-ventura exists but is whole-county only; run it directly",
};

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ── Admin gate: @getevidly.com operator, or the service role (cron) ─
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const roleClaim = (() => {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
      return (JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))) as { role?: string }).role ?? null;
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
    } catch { /* empty body handled below */ }
  }

  const recentDays = (() => {
    const n = typeof body.recent_days === "string" ? Number(body.recent_days) : body.recent_days;
    return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : DEFAULT_RECENT_DAYS;
  })();

  /** Call another edge function with the service-role key. */
  const invoke = async (fn: string, payload: unknown) => {
    const r = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* keep raw */ }
    if (!r.ok) throw new Error(`${fn} HTTP ${r.status}: ${text.slice(0, 200)}`);
    return parsed;
  };

  const pendingCount = async (table: string, sourceIds: string[]) => {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in("source_id", sourceIds)
      .eq("status", "pending");
    if (error) throw new Error(`${table} pending count: ${error.message}`);
    return count ?? 0;
  };

  /** One jurisdiction, end to end. Never throws — returns its own error. */
  const refreshOne = async (slug: string): Promise<Record<string, unknown>> => {
    try {
      const { data: srcRows, error: srcErr } = await supabase
        .from("inspection_sources")
        .select("id, platform_family, jurisdictions!inner(slug)")
        .eq("jurisdictions.slug", slug);
      if (srcErr) throw new Error(`source lookup: ${srcErr.message}`);

      const sources = (srcRows ?? []) as Record<string, any>[];
      if (sources.length === 0) {
        return { jurisdiction: slug, skipped_reason: "no inspection_sources row for this slug" };
      }

      const family = sources[0].platform_family as string;
      const sourceIds = sources.map((s) => s.id as string);
      const spec = CRAWLERS[family];

      if (!spec) {
        return {
          jurisdiction: slug,
          platform_family: family,
          crawler_used: null,
          skipped_reason:
            NO_CRAWLER_REASON[family] ?? `no re-crawl function for ${slug} (${family}) — needs bulk reload`,
        };
      }

      // ── 'direct': no queue. The crawler takes a dated query itself,
      //    so it is invoked once and is done.
      if (spec.mode === "direct") {
        const crawlRuns: Record<string, unknown>[] = [];
        let crawlError: string | null = null;
        try {
          const res = await invoke(spec.fn, { jurisdiction: slug, since_days: recentDays });
          crawlRuns.push({
            facilitiesWritten: res?.facilitiesWritten ?? null,
            inspectionsWritten: res?.inspectionsWritten ?? null,
            violationsWritten: res?.violationsWritten ?? null,
            since: res?.since ?? null,
            errors: res?.errors ?? [],
          });
        } catch (e) {
          crawlError = e instanceof Error ? e.message : String(e);
        }

        let regenerate: unknown = null;
        let regenerateError: string | null = null;
        try {
          const reg = await invoke("regenerate-triggers", { jurisdiction: slug });
          const per = Array.isArray(reg?.per_jurisdiction) ? reg.per_jurisdiction[0] : null;
          regenerate = {
            cited: per?.cited ?? null, clean: per?.clean ?? null, due: per?.due ?? null,
            deleted: per?.deleted ?? null, preserved: per?.preserved ?? null,
            total_now: per?.total_now ?? null, recency_days_used: reg?.recency_days_used ?? null,
          };
        } catch (e) {
          regenerateError = e instanceof Error ? e.message : String(e);
        }

        return {
          jurisdiction: slug,
          platform_family: family,
          crawler_used: spec.fn,
          crawl_mode: spec.mode,
          drained: true,
          crawl_summary: crawlRuns,
          ...(crawlError ? { crawl_error: crawlError } : {}),
          regenerate_summary: regenerate,
          ...(regenerateError ? { regenerate_error: regenerateError } : {}),
        };
      }

      const taskTable = spec.taskTable!;

      // ── Queue the work. Every queue drains to zero, so without this
      //    the crawler would return immediately having done nothing.
      let queued = 0;
      if (spec.mode === "recent_days") {
        const days: string[] = [];
        for (let i = 0; i < recentDays; i++) {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - i);
          days.push(d.toISOString().slice(0, 10));
        }
        const rows = sourceIds.flatMap((sid) =>
          days.map((day) => ({
            source_id: sid,
            day,
            status: "pending",
            attempts: 0,
            claimed_at: null,
            last_error: null,
          }))
        );
        const { error } = await supabase
          .from(taskTable)
          .upsert(rows, { onConflict: "source_id,day" });
        if (error) throw new Error(`seed ${taskTable}: ${error.message}`);
        queued = rows.length;
      } else {
        // Full-list crawlers have no date filter at source; re-queueing
        // the county is their only mode. 'split' rows are left alone —
        // their children carry the real work and are re-queued here.
        const { data, error } = await supabase
          .from(taskTable)
          .update({ status: "pending", claimed_at: null, attempts: 0, last_error: null })
          .in("source_id", sourceIds)
          .in("status", ["done", "error"])
          .select("id");
        if (error) throw new Error(`requeue ${taskTable}: ${error.message}`);
        queued = (data ?? []).length;
      }

      // ── Run the crawler until drained, the budget expires, or the cap.
      const crawlRuns: Record<string, unknown>[] = [];
      let invocations = 0;
      let remaining = await pendingCount(taskTable, sourceIds);

      while (
        remaining > 0 &&
        invocations < MAX_CRAWL_INVOCATIONS &&
        Date.now() - startTime < CRAWL_BUDGET_MS
      ) {
        const res = await invoke(spec.fn, {});
        invocations++;
        crawlRuns.push({
          tasksProcessed: res?.tasksProcessed ?? null,
          tasksErrored: res?.tasksErrored ?? null,
          facilitiesWritten: res?.facilitiesWritten ?? null,
          inspectionsWritten: res?.inspectionsWritten ?? null,
          violationsWritten: res?.violationsWritten ?? null,
        });
        remaining = await pendingCount(taskTable, sourceIds);
        await sleep(200);
      }

      const drained = remaining === 0;

      // ── Fresh data → fresh triggers.
      let regenerate: unknown = null;
      let regenerateError: string | null = null;
      try {
        const reg = await invoke("regenerate-triggers", { jurisdiction: slug });
        const per = Array.isArray(reg?.per_jurisdiction) ? reg.per_jurisdiction[0] : null;
        regenerate = {
          cited: per?.cited ?? reg?.cited ?? null,
          clean: per?.clean ?? reg?.clean ?? null,
          due: per?.due ?? reg?.due ?? null,
          deleted: per?.deleted ?? reg?.deleted ?? null,
          preserved: per?.preserved ?? reg?.preserved ?? null,
          total_now: per?.total_now ?? null,
          recency_days_used: reg?.recency_days_used ?? null,
        };
      } catch (e) {
        regenerateError = e instanceof Error ? e.message : String(e);
      }

      return {
        jurisdiction: slug,
        platform_family: family,
        crawler_used: spec.fn,
        crawl_mode: spec.mode,
        tasks_queued: queued,
        crawl_invocations: invocations,
        tasks_still_pending: remaining,
        drained,
        ...(drained ? {} : { note: "did not fully drain within the budget — run again to continue" }),
        crawl_summary: crawlRuns,
        regenerate_summary: regenerate,
        ...(regenerateError ? { regenerate_error: regenerateError } : {}),
      };
    } catch (e) {
      return { jurisdiction: slug, error: e instanceof Error ? e.message : String(e) };
    }
  };

  // ── Which jurisdictions ───────────────────────────────────────────
  let slugs: string[] = [];
  if (body.all === true || body.all === "true") {
    const { data, error } = await supabase
      .from("inspection_sources")
      .select("platform_family, jurisdictions!inner(slug)");
    if (error) {
      return Response.json({ ok: false, error: `jurisdiction list: ${error.message}` }, { status: 500 });
    }
    slugs = [...new Set(
      ((data ?? []) as Record<string, any>[])
        .filter((r) => !!CRAWLERS[r.platform_family as string])
        .map((r) => r.jurisdictions?.slug as string)
        .filter(Boolean),
    )].sort();
  } else if (typeof body.jurisdiction === "string" && body.jurisdiction.trim()) {
    slugs = [(body.jurisdiction as string).trim()];
  } else {
    return Response.json(
      { ok: false, error: "Pass { jurisdiction: <slug> } or { all: true }." },
      { status: 400 },
    );
  }

  const results: Record<string, unknown>[] = [];
  for (const slug of slugs) {
    results.push(await refreshOne(slug));
  }

  return Response.json({
    ok: results.every((r) => !r.error),
    recent_days_used: recentDays,
    processed: results.length,
    results,
    elapsedMs: Date.now() - startTime,
  });
});
