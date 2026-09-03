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

  // section arrives on the query string for a GET and in the body for
  // the POST that supabase.functions.invoke sends. Accept both.
  let section = new URL(req.url).searchParams.get("section") ?? undefined;
  if (!section && req.method === "POST") {
    try {
      const body = await req.json();
      section = (body as Record<string, unknown>)?.section as string | undefined;
    } catch {
      // An empty or unparseable body is not fatal; the unknown-section
      // branch below reports it properly.
    }
  }

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

    return json(
      { ok: false, error: "Unknown section. Expected sources, match or summary." },
      400,
    );
  } catch (err) {
    console.error("[inspections-admin] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "Inspections admin request failed." }, 500);
  }
});
