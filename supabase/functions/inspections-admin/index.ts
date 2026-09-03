import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * inspections-admin — the admin read behind the Marketing console's
 * Inspections tab.
 *
 * READ ONLY. There is no write action here, by design. Trigger
 * generation, queueing and the send sequence are a later step and are
 * deliberately not built.
 *
 * Why this exists at all: inspection_sources, facilities, inspections
 * and violations each carry an RLS policy of the shape
 *   USING (auth.jwt() ->> 'email' LIKE '%@getevidly.com')
 * so a browser-side supabase.from() returns zero rows — silently, with
 * no error — for any session outside that domain. Reading through the
 * service-role client here makes the tab's data path explicit rather
 * than dependent on whose token happens to be in the browser.
 *
 * ADMIN ONLY. verify_jwt stays at its default (true) — there is
 * deliberately no [functions.inspections-admin] block in config.toml.
 * On top of the platform's JWT check the caller's email must end
 * @getevidly.com; anything else is 403 { ok: false, reason: "forbidden" }.
 * Auth shape copied from partner-admin.
 *
 * Sections (GET ?section=, or POST { "section": ... }):
 *   sources  — one row per inspection_source joined to its jurisdiction,
 *              with facility / inspection / violation counts and the
 *              newest inspection_date that source has posted.
 *   match    — facilities held for identity review (cap 100).
 *   summary  — platform totals for the KPI strip.
 */

const MATCH_CAP = 100;
const QUEUE_CAP = 200;

/** The four operator actions, and the status each one lands the trigger in. */
const ACTION_STATUS: Record<string, string> = {
  approve: "ready", // staged for a send that does not exist yet — NOT sent
  hold: "held",
  skip: "skipped",
  client: "client",
};

/** Statuses that still represent an unworked trigger. */
const OPEN_STATUSES = ["new", "ready", "held"];

interface SourceRow {
  id: string;
  jurisdiction_id: string;
  platform_family: string | null;
  is_active: boolean | null;
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

  if (req.method !== "GET" && req.method !== "POST") {
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

  // The body is read once and kept: `act` needs trigger_id/action/reason
  // out of the same payload that carries `section`, and a Request body
  // can only be consumed once.
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = ((await req.json()) ?? {}) as Record<string, unknown>;
    } catch {
      // An empty or unparseable body is not fatal; the unknown-section
      // branch below reports it properly.
    }
  }

  // section arrives on the query string for a GET and in the body for
  // the POST that supabase.functions.invoke sends. Accept both.
  const section = new URL(req.url).searchParams.get("section") ??
    (body.section as string | undefined);

  /** exact row count, no rows transferred */
  const countOf = async (
    table: string,
    apply?: (q: any) => any,
  ): Promise<number> => {
    let q: any = supabase.from(table).select("*", { count: "exact", head: true });
    if (apply) q = apply(q);
    const { count, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  };

  try {
    // ── summary ───────────────────────────────────────────────────
    if (section === "summary") {
      const [sourceCount, activeSourceCount, facilityCount, inspectionCount, violationCount] =
        await Promise.all([
          countOf("inspection_sources"),
          countOf("inspection_sources", (q) => q.eq("is_active", true)),
          countOf("facilities"),
          countOf("inspections"),
          countOf("violations"),
        ]);

      return json({
        ok: true,
        summary: {
          source_count: sourceCount,
          active_source_count: activeSourceCount,
          facility_count: facilityCount,
          inspection_count: inspectionCount,
          violation_count: violationCount,
        },
      });
    }

    // ── sources ───────────────────────────────────────────────────
    if (section === "sources") {
      const { data: srcData, error: srcErr } = await supabase
        .from("inspection_sources")
        .select("id, jurisdiction_id, platform_family, is_active");

      if (srcErr) {
        console.error("[inspections-admin] source read failed:", srcErr.message);
        return json({ ok: false, error: "Could not load inspection sources." }, 500);
      }

      const srcRows = (srcData ?? []) as SourceRow[];
      if (srcRows.length === 0) return json({ ok: true, sources: [] });

      const { data: jurData, error: jurErr } = await supabase
        .from("jurisdictions")
        .select("id, slug")
        .in("id", srcRows.map((s) => s.jurisdiction_id));

      if (jurErr) {
        console.error("[inspections-admin] jurisdiction read failed:", jurErr.message);
        return json({ ok: false, error: "Could not load jurisdictions." }, 500);
      }

      const slugById = new Map<string, string>();
      for (const j of (jurData ?? []) as { id: string; slug: string }[]) {
        slugById.set(j.id, j.slug);
      }

      // One source's counts. Never throws: a source whose counts fail
      // comes back with nulls and an `error` string so the tab can still
      // render the other four rows, and so the failure is legible from
      // the response rather than collapsing the whole section into a 500.
      const buildSource = async (s: SourceRow) => {
        const base = {
          id: s.id,
          slug: slugById.get(s.jurisdiction_id) ?? null,
          platform_family: s.platform_family,
          is_active: s.is_active,
          facility_count: null as number | null,
          inspection_count: null as number | null,
          violation_count: null as number | null,
          newest_inspection_date: null as string | null,
          error: null as string | null,
        };

        const attempt = async <T>(label: string, run: () => Promise<T>): Promise<T | null> => {
          try {
            return await run();
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            base.error = base.error ? `${base.error}; ${label}: ${m}` : `${label}: ${m}`;
            return null;
          }
        };

        base.facility_count = await attempt("facilities", () =>
          countOf("facilities", (q) => q.eq("source_id", s.id)));
        base.inspection_count = await attempt("inspections", () =>
          countOf("inspections", (q) => q.eq("source_id", s.id)));

        base.newest_inspection_date = await attempt("newest", async () => {
          const { data, error } = await supabase
            .from("inspections")
            .select("inspection_date")
            .eq("source_id", s.id)
            .not("inspection_date", "is", null)
            .order("inspection_date", { ascending: false })
            .limit(1);
          if (error) throw new Error(error.message);
          const row = (data ?? [])[0] as { inspection_date: string } | undefined;
          return row?.inspection_date ?? null;
        });

        // violations carries no source_id of its own; it reaches the
        // source through its inspection. !inner makes the embedded
        // filter a join condition rather than a null-tolerant one. This
        // is the heaviest count of the four — nearly a million rows
        // platform-wide — so it runs last and on its own.
        base.violation_count = await attempt("violations", async () => {
          const { count, error } = await supabase
            .from("violations")
            .select("inspections!inner(source_id)", { count: "exact", head: true })
            .eq("inspections.source_id", s.id);
          if (error) throw new Error(error.message);
          return count ?? 0;
        });

        return base;
      };

      // Two sources at a time. A 20-way fan-out from inside the isolate
      // was what made this section fail; the same queries are fine at
      // this width.
      const sources: Awaited<ReturnType<typeof buildSource>>[] = [];
      for (let i = 0; i < srcRows.length; i += 2) {
        const batch = await Promise.all(srcRows.slice(i, i + 2).map(buildSource));
        sources.push(...batch);
      }

      sources.sort((a, b) => (a.slug ?? "").localeCompare(b.slug ?? ""));
      return json({ ok: true, sources });
    }

    // ── match ─────────────────────────────────────────────────────
    if (section === "match") {
      const { data: facData, error: facErr } = await supabase
        .from("facilities")
        .select("id, name, address, city, resolved_pipeline_id, source_id")
        .eq("identity_status", "held")
        .order("name", { ascending: true })
        .limit(MATCH_CAP);

      if (facErr) {
        console.error("[inspections-admin] held-facility read failed:", facErr.message);
        return json({ ok: false, error: "Could not load held facilities." }, 500);
      }

      const facRows = (facData ?? []) as Record<string, unknown>[];
      // Nothing held for review is a real answer, not a failure.
      if (facRows.length === 0) return json({ ok: true, facilities: [] });

      const { data: srcData, error: srcErr } = await supabase
        .from("inspection_sources")
        .select("id, jurisdiction_id")
        .in("id", [...new Set(facRows.map((f) => f.source_id as string))]);

      if (srcErr) {
        console.error("[inspections-admin] source read failed:", srcErr.message);
        return json({ ok: false, error: "Could not load inspection sources." }, 500);
      }

      const srcRows = (srcData ?? []) as { id: string; jurisdiction_id: string }[];
      const { data: jurData, error: jurErr } = await supabase
        .from("jurisdictions")
        .select("id, slug")
        .in("id", srcRows.map((s) => s.jurisdiction_id));

      if (jurErr) {
        console.error("[inspections-admin] jurisdiction read failed:", jurErr.message);
        return json({ ok: false, error: "Could not load jurisdictions." }, 500);
      }

      const slugByJur = new Map<string, string>();
      for (const j of (jurData ?? []) as { id: string; slug: string }[]) {
        slugByJur.set(j.id, j.slug);
      }
      const slugBySource = new Map<string, string | null>();
      for (const s of srcRows) slugBySource.set(s.id, slugByJur.get(s.jurisdiction_id) ?? null);

      const facilities = facRows.map((f) => ({
        id: f.id,
        name: f.name,
        address: f.address,
        city: f.city,
        resolved_pipeline_id: f.resolved_pipeline_id,
        slug: slugBySource.get(f.source_id as string) ?? null,
      }));

      return json({ ok: true, facilities, capped: facilities.length === MATCH_CAP });
    }

    // ── queue ─────────────────────────────────────────────────────
    if (section === "queue") {
      const openCount = await countOf("inspection_triggers", (q) => q.eq("status", "new"));

      const { data: trigData, error: trigErr } = await supabase
        .from("inspection_triggers")
        .select("id, facility_id, source_id, inspection_id, trigger_type, trigger_date, mapped_record, rank")
        .eq("status", "new")
        // rank is the intended order; trigger_date breaks the tie while
        // every rank is still 0, so paging is at least deterministic.
        .order("rank", { ascending: false })
        .order("trigger_date", { ascending: false })
        .order("id", { ascending: true })
        .limit(QUEUE_CAP);

      if (trigErr) {
        console.error("[inspections-admin] queue read failed:", trigErr.message);
        return json({ ok: false, error: "Could not load the trigger queue." }, 500);
      }

      const trigRows = (trigData ?? []) as Record<string, unknown>[];
      if (trigRows.length === 0) return json({ ok: true, triggers: [], total: openCount });

      const { data: facData, error: facErr } = await supabase
        .from("facilities")
        .select("id, name, address, city, zip, source_id")
        .in("id", [...new Set(trigRows.map((t) => t.facility_id as string))]);

      if (facErr) {
        console.error("[inspections-admin] queue facility read failed:", facErr.message);
        return json({ ok: false, error: "Could not load queue facilities." }, 500);
      }

      const facById = new Map<string, Record<string, unknown>>();
      for (const f of (facData ?? []) as Record<string, unknown>[]) {
        facById.set(f.id as string, f);
      }

      const { data: srcData, error: srcErr } = await supabase
        .from("inspection_sources")
        .select("id, jurisdiction_id")
        .in("id", [...new Set(trigRows.map((t) => t.source_id as string))]);

      if (srcErr) {
        console.error("[inspections-admin] queue source read failed:", srcErr.message);
        return json({ ok: false, error: "Could not load inspection sources." }, 500);
      }

      const srcRows = (srcData ?? []) as { id: string; jurisdiction_id: string }[];
      const { data: jurData, error: jurErr } = await supabase
        .from("jurisdictions")
        .select("id, slug")
        .in("id", srcRows.map((s) => s.jurisdiction_id));

      if (jurErr) {
        console.error("[inspections-admin] queue jurisdiction read failed:", jurErr.message);
        return json({ ok: false, error: "Could not load jurisdictions." }, 500);
      }

      const slugByJur = new Map<string, string>();
      for (const j of (jurData ?? []) as { id: string; slug: string }[]) {
        slugByJur.set(j.id, j.slug);
      }
      const slugBySource = new Map<string, string | null>();
      for (const s of srcRows) slugBySource.set(s.id, slugByJur.get(s.jurisdiction_id) ?? null);

      const triggers = trigRows.map((t) => {
        const f = facById.get(t.facility_id as string);
        return {
          id: t.id,
          facility_id: t.facility_id,
          facility_name: (f?.name as string) ?? null,
          address: (f?.address as string) ?? null,
          city: (f?.city as string) ?? null,
          zip: (f?.zip as string) ?? null,
          slug: slugBySource.get(t.source_id as string) ?? null,
          trigger_type: t.trigger_type,
          trigger_date: t.trigger_date,
          mapped_record: t.mapped_record,
          rank: t.rank,
        };
      });

      return json({ ok: true, triggers, total: openCount, capped: triggers.length === QUEUE_CAP });
    }

    // ── act ───────────────────────────────────────────────────────
    // The only write path in this function. It touches
    // inspection_triggers and, for 'client', facilities.is_client and
    // facilities.identity_status. Nothing else, and it never deletes.
    if (section === "act") {
      const triggerId = body.trigger_id as string | undefined;
      const action = body.action as string | undefined;
      const reason = typeof body.reason === "string" && body.reason.trim()
        ? (body.reason as string).trim()
        : null;

      if (!triggerId) return json({ ok: false, error: "trigger_id is required." }, 400);
      if (!action || !(action in ACTION_STATUS)) {
        return json(
          { ok: false, error: "action must be one of approve, hold, skip, client." },
          400,
        );
      }

      const stamp = {
        status_at: new Date().toISOString(),
        status_by: caller?.email ?? null,
        updated_at: new Date().toISOString(),
      };

      // 'client' is three writes with no transaction available — an RPC
      // would need a migration, which is out of scope here. Ordered so a
      // failure leaves the trigger still in the queue and every step
      // safely repeatable: flag the facility, close its siblings, then
      // close the trigger itself last.
      if (action === "client") {
        const { data: target, error: readErr } = await supabase
          .from("inspection_triggers")
          .select("id, facility_id")
          .eq("id", triggerId)
          .maybeSingle();

        if (readErr) {
          console.error("[inspections-admin] act read failed:", readErr.message);
          return json({ ok: false, error: "Could not read the trigger." }, 500);
        }
        if (!target) return json({ ok: false, error: "Trigger not found." }, 404);

        const facilityId = (target as { facility_id: string }).facility_id;

        const { error: facErr } = await supabase
          .from("facilities")
          .update({ is_client: true, identity_status: "resolved" })
          .eq("id", facilityId);

        if (facErr) {
          console.error("[inspections-admin] act facility update failed:", facErr.message);
          return json({ ok: false, error: "Could not mark the facility as a client." }, 500);
        }

        const { error: sibErr } = await supabase
          .from("inspection_triggers")
          .update({ status: "skipped", status_reason: "facility marked client", ...stamp })
          .eq("facility_id", facilityId)
          .neq("id", triggerId)
          .in("status", OPEN_STATUSES);

        if (sibErr) {
          console.error("[inspections-admin] act sibling skip failed:", sibErr.message);
          return json({ ok: false, error: "Could not close the facility's other triggers." }, 500);
        }
      }

      const { data: updated, error: updErr } = await supabase
        .from("inspection_triggers")
        .update({ status: ACTION_STATUS[action], status_reason: reason, ...stamp })
        .eq("id", triggerId)
        .select("id, facility_id, source_id, inspection_id, trigger_type, trigger_date, mapped_record, rank, status, status_reason, status_at, status_by")
        .maybeSingle();

      if (updErr) {
        console.error("[inspections-admin] act update failed:", updErr.message);
        return json({ ok: false, error: "Could not update the trigger." }, 500);
      }
      if (!updated) return json({ ok: false, error: "Trigger not found." }, 404);

      return json({ ok: true, trigger: updated });
    }

    return json(
      { ok: false, error: "Unknown section. Expected sources, match, summary, queue or act." },
      400,
    );
  } catch (err) {
    console.error("[inspections-admin] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Inspections admin request failed." }, 500);
  }
});
