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

const READY_CAP = 500;
const BATCH_LIST_CAP = 10;

/**
 * The three channels, and what staging one does to the batch and to the
 * triggers it covers. Nothing here transmits: 'email' produces a CSV the
 * operator downloads, 'call' fills a queue a person works, and 'postcard'
 * parks a batch until a postcard account exists.
 */
const CHANNEL_PLAN: Record<
  string,
  { batchStatus: string; triggerStatus: string; note: string | null }
> = {
  email: { batchStatus: "exported", triggerStatus: "email_exported", note: null },
  call: { batchStatus: "worked", triggerStatus: "call_queued", note: null },
  postcard: {
    batchStatus: "staged",
    triggerStatus: "postcard_staged",
    note: "awaiting postcard account",
  },
};

/**
 * facilities carries no phone and no email column — the crawl records a
 * business and its address, never a contact. Both are surfaced as null so
 * the export keeps its shape, and has_phone is therefore always 0. The
 * email CSV is company-level data for ListKit to enrich.
 */
const FACILITY_PHONE: string | null = null;
const FACILITY_EMAIL: string | null = null;

/** Every source is Californian; the slug's suffix is the only state we hold. */
function stateFromSlug(slug: string | null): string {
  const m = (slug ?? "").match(/-([a-z]{2})$/);
  return m ? m[1].toUpperCase() : "";
}

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

        // NO per-source violation count. violations carries no source_id
        // of its own, so counting it per source meant hash-joining the
        // whole ~957k-row violations table through inspections, once for
        // every source: 5.65s each, and the single reason this section
        // took 56s and intermittently timed the tab out. It is left null
        // deliberately — a cached counter or a source_id column would be
        // needed to bring it back cheaply.
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

    // Triggers decorated with their facility and jurisdiction. Shared by
    // `ready` (by status) and `export_email` (by explicit id list).
    const loadTriggerRows = async (opts: { status?: string; ids?: string[]; cap?: number }) => {
      let q: any = supabase
        .from("inspection_triggers")
        .select("id, facility_id, source_id, trigger_type, trigger_date, mapped_record, rank, status");
      if (opts.status) q = q.eq("status", opts.status);
      if (opts.ids) q = q.in("id", opts.ids);
      q = q.order("rank", { ascending: false }).order("id", { ascending: true });
      if (opts.cap) q = q.limit(opts.cap);

      const { data, error } = await q;
      if (error) throw new Error(`triggers: ${error.message}`);
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) return [];

      const { data: facData, error: facErr } = await supabase
        .from("facilities")
        .select("id, name, address, city, zip")
        .in("id", [...new Set(rows.map((r) => r.facility_id as string))]);
      if (facErr) throw new Error(`facilities: ${facErr.message}`);
      const facById = new Map<string, Record<string, unknown>>();
      for (const f of (facData ?? []) as Record<string, unknown>[]) facById.set(f.id as string, f);

      const { data: srcData, error: srcErr } = await supabase
        .from("inspection_sources")
        .select("id, jurisdiction_id")
        .in("id", [...new Set(rows.map((r) => r.source_id as string))]);
      if (srcErr) throw new Error(`inspection_sources: ${srcErr.message}`);
      const srcRows = (srcData ?? []) as { id: string; jurisdiction_id: string }[];

      const { data: jurData, error: jurErr } = await supabase
        .from("jurisdictions")
        .select("id, slug")
        .in("id", srcRows.map((s) => s.jurisdiction_id));
      if (jurErr) throw new Error(`jurisdictions: ${jurErr.message}`);
      const slugByJur = new Map<string, string>();
      for (const j of (jurData ?? []) as { id: string; slug: string }[]) slugByJur.set(j.id, j.slug);
      const slugBySource = new Map<string, string | null>();
      for (const s of srcRows) slugBySource.set(s.id, slugByJur.get(s.jurisdiction_id) ?? null);

      return rows.map((t) => {
        const f = facById.get(t.facility_id as string);
        const address = (f?.address as string) ?? null;
        return {
          id: t.id as string,
          facility_id: t.facility_id as string,
          facility_name: (f?.name as string) ?? null,
          address,
          city: (f?.city as string) ?? null,
          zip: (f?.zip as string) ?? null,
          slug: slugBySource.get(t.source_id as string) ?? null,
          trigger_type: t.trigger_type as string,
          trigger_date: t.trigger_date as string | null,
          mapped_record: (t.mapped_record as string) ?? null,
          rank: t.rank as number,
          phone: FACILITY_PHONE,
          email: FACILITY_EMAIL,
          has_address: !!(address && String(address).trim()),
          has_phone: !!FACILITY_PHONE,
        };
      });
    };

    // ── ready ─────────────────────────────────────────────────────
    if (section === "ready") {
      const rows = await loadTriggerRows({ status: "ready", cap: READY_CAP });
      const total = await countOf("inspection_triggers", (q) => q.eq("status", "ready"));

      return json({
        ok: true,
        triggers: rows,
        total,
        capped: rows.length === READY_CAP,
        eligible: {
          // Postcard needs a deliverable address; call needs a phone the
          // crawl does not carry; email exports company-level rows for
          // enrichment, so every ready row qualifies.
          postcard: rows.filter((r) => r.has_address).length,
          call: rows.filter((r) => r.has_phone).length,
          email: rows.length,
        },
      });
    }

    // ── send ──────────────────────────────────────────────────────
    // Stages a batch. Nothing transmits: email writes a CSV the operator
    // downloads, call fills a queue a person works, postcard parks.
    if (section === "send") {
      const channel = body.channel as string | undefined;
      const requested = Array.isArray(body.trigger_ids) ? (body.trigger_ids as unknown[]) : null;

      if (!channel || !(channel in CHANNEL_PLAN)) {
        return json({ ok: false, error: "channel must be one of email, call, postcard." }, 400);
      }
      if (!requested || requested.length === 0) {
        return json({ ok: false, error: "trigger_ids must be a non-empty array." }, 400);
      }
      const ids = requested.filter((v): v is string => typeof v === "string");
      if (ids.length === 0) {
        return json({ ok: false, error: "trigger_ids must contain trigger id strings." }, 400);
      }

      const plan = CHANNEL_PLAN[channel];

      // Only rows genuinely sitting in 'ready' are staged, so a double
      // click cannot send the same trigger down two channels.
      const { data: eligible, error: eligErr } = await supabase
        .from("inspection_triggers")
        .select("id")
        .in("id", ids)
        .eq("status", "ready");

      if (eligErr) {
        console.error("[inspections-admin] send eligibility read failed:", eligErr.message);
        return json({ ok: false, error: "Could not read the triggers to stage." }, 500);
      }

      const stageIds = ((eligible ?? []) as { id: string }[]).map((r) => r.id);
      if (stageIds.length === 0) {
        return json({ ok: false, error: "None of those triggers are ready to stage." }, 400);
      }

      const nowIso = new Date().toISOString();
      const { data: batch, error: batchErr } = await supabase
        .from("inspection_send_batches")
        .insert({
          channel,
          trigger_ids: stageIds,
          row_count: stageIds.length,
          status: plan.batchStatus,
          exported_at: nowIso,
          exported_by: caller?.email ?? null,
          note: plan.note,
        })
        .select("id, channel, trigger_ids, row_count, status, exported_at, exported_by, note, created_at")
        .maybeSingle();

      if (batchErr || !batch) {
        console.error("[inspections-admin] batch insert failed:", batchErr?.message);
        return json({ ok: false, error: "Could not create the send batch." }, 500);
      }

      const { error: moveErr } = await supabase
        .from("inspection_triggers")
        .update({
          status: plan.triggerStatus,
          status_at: nowIso,
          status_by: caller?.email ?? null,
          updated_at: nowIso,
        })
        .in("id", stageIds);

      if (moveErr) {
        console.error("[inspections-admin] trigger status move failed:", moveErr.message);
        return json(
          { ok: false, error: "The batch was created but the triggers did not move.", batch_id: batch.id },
          500,
        );
      }

      return json({ ok: true, batch, batch_id: batch.id, staged: stageIds.length });
    }

    // ── export_email ──────────────────────────────────────────────
    if (section === "export_email") {
      const batchId = body.batch_id as string | undefined;
      if (!batchId) return json({ ok: false, error: "batch_id is required." }, 400);

      const { data: batch, error: batchErr } = await supabase
        .from("inspection_send_batches")
        .select("id, channel, trigger_ids, row_count")
        .eq("id", batchId)
        .maybeSingle();

      if (batchErr) {
        console.error("[inspections-admin] export batch read failed:", batchErr.message);
        return json({ ok: false, error: "Could not read the batch." }, 500);
      }
      if (!batch) return json({ ok: false, error: "Batch not found." }, 404);
      if ((batch as { channel: string }).channel !== "email") {
        return json({ ok: false, error: "That batch is not an email batch." }, 400);
      }

      const ids = ((batch as { trigger_ids: string[] }).trigger_ids ?? []);
      const rows = ids.length ? await loadTriggerRows({ ids }) : [];

      // The crawl records a business, never a person: company carries the
      // facility name and the name columns stay blank for enrichment.
      const csv = rows.map((r) => ({
        email: r.email ?? "",
        first_name: "",
        last_name: "",
        company: r.facility_name ?? "",
        address: r.address ?? "",
        city: r.city ?? "",
        state: stateFromSlug(r.slug),
        zip: r.zip ?? "",
        phone: r.phone ?? "",
        trigger_type: r.trigger_type,
        mapped_record: r.mapped_record ?? "",
        source_tag: "inspection",
      }));

      return json({ ok: true, batch_id: batchId, rows: csv, row_count: csv.length });
    }

    // ── batches ───────────────────────────────────────────────────
    if (section === "batches") {
      const { data, error } = await supabase
        .from("inspection_send_batches")
        .select("id, channel, row_count, status, note, exported_by, exported_at, created_at")
        .order("created_at", { ascending: false })
        .limit(BATCH_LIST_CAP);

      if (error) {
        console.error("[inspections-admin] batch list failed:", error.message);
        return json({ ok: false, error: "Could not load recent batches." }, 500);
      }
      return json({ ok: true, batches: data ?? [] });
    }

    return json(
      {
        ok: false,
        error:
          "Unknown section. Expected sources, match, summary, queue, act, ready, send, export_email or batches.",
      },
      400,
    );
  } catch (err) {
    console.error("[inspections-admin] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Inspections admin request failed." }, 500);
  }
});
