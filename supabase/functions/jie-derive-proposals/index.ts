// supabase/functions/jie-derive-proposals/index.ts
//
// JIE change detector → proposal emitter.
//
// Reads a JIE-tagged crawl_source (crawl_type='api'), gets the current upstream
// section text (fetches Open Legal Codes and lands it in crawl_results, OR reads
// the latest landed crawl_results row when extract_config.prefer_landed=true),
// hashes it, and diffs against crawl_sources.last_source_hash. On change it
// supersedes any pending proposal for (jurisdiction_id, pillar) and inserts a new
// one into jurisdiction_change_proposals.
//
// It does NOT extract grading methodology from statute text (that data isn't in
// the text — it stays a human decision at review) and it does NOT route to the
// editorial signal queue (routed_to_signal_queue is a different lane).
//
// Invoke:
//   POST { "sourceId": "<uuid>" }   → run one source
//   POST {}                          → run all active JIE api sources
//
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (standard in Supabase edge fns).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OLC_BASE = "https://openlegalcodes.org/api/v1";
const OLC_POLL_MAX_ATTEMPTS = 6;      // 202 cache-warm polling ceiling
const OLC_POLL_DEFAULT_WAIT = 30;     // seconds, if retryAfter absent

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- helpers ----------

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

// Defensive parse: OLC's /code/:path returns section text + permalink, but the
// exact key names aren't documented. Try known-plausible shapes, fall back to the
// raw payload, and surface the top-level keys on first run so the real shape is
// confirmed rather than guessed.
function parseOlcSection(payload: any, requestUrl: string): { text: string; permalink: string; keysSeen: string[] } {
  const d = payload?.data ?? payload ?? {};
  const text =
    d.text ?? d.content ?? d.markdown ?? d.body ?? d.sectionText ??
    (typeof payload === "string" ? payload : JSON.stringify(payload));
  const permalink =
    d.permalink ?? d.url ?? d.canonicalUrl ?? d.link ?? requestUrl;
  return { text: String(text), permalink: String(permalink), keysSeen: Object.keys(d) };
}

// Fetch a section from OLC, handling the async 202 cache-warm (poll on retryAfter).
async function fetchOlcSection(jurisdiction: string, path: string) {
  const url = `${OLC_BASE}/jurisdictions/${jurisdiction}/code/${path}`;
  for (let attempt = 0; attempt < OLC_POLL_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 200) {
      const json = await res.json();
      return { statusCode: 200, url, ...parseOlcSection(json, url) };
    }
    if (res.status === 202) {
      let wait = OLC_POLL_DEFAULT_WAIT;
      try { wait = (await res.json())?.retryAfter ?? OLC_POLL_DEFAULT_WAIT; } catch { /* keep default */ }
      await sleep(wait);
      continue;
    }
    // any other status: surface it, don't pretend success
    throw new Error(`OLC ${res.status} for ${url}`);
  }
  throw new Error(`OLC still warming after ${OLC_POLL_MAX_ATTEMPTS} polls: ${url}`);
}

// ---------- core ----------

interface SourceResult {
  sourceId: string;
  jurisdictionId: string | null;
  pillar: string | null;
  outcome: "baseline_set" | "no_change" | "proposal_created" | "skipped" | "error";
  detail?: string;
  proposalId?: string;
  olcKeysSeen?: string[];
}

async function processSource(source: any): Promise<SourceResult> {
  const cfg = source.extract_config ?? {};
  const pillar: string | undefined = cfg.pillar;
  const jurisdictionId: string | null = source.jurisdiction_id ?? null;
  const olcJurisdiction: string | undefined = cfg.olc_jurisdiction;
  const olcPath: string | undefined = cfg.olc_path;

  const base: SourceResult = { sourceId: source.id, jurisdictionId, pillar: pillar ?? null, outcome: "skipped" };

  // guard: config completeness (fail loud, don't invent)
  if (!jurisdictionId) return { ...base, detail: "crawl_sources.jurisdiction_id is null" };
  if (pillar !== "food" && pillar !== "fire")
    return { ...base, detail: `extract_config.pillar must be 'food'|'fire', got ${JSON.stringify(pillar)}` };
  if (!olcJurisdiction || !olcPath)
    return { ...base, detail: "extract_config needs olc_jurisdiction + olc_path (discover path via /toc first)" };

  // --- get current upstream section text ---
  let sectionText: string;
  let sourceUrl: string;
  let olcKeysSeen: string[] | undefined;

  if (cfg.prefer_landed === true) {
    // read the latest landed crawl_results row (crawler is confirmed to handle 'api')
    const { data: latest, error } = await sb
      .from("crawl_results")
      .select("markdown_content, url, metadata, created_at")
      .eq("source_id", source.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ...base, outcome: "error", detail: `crawl_results read: ${error.message}` };
    if (!latest?.markdown_content) return { ...base, detail: "prefer_landed set but no landed content yet" };
    sectionText = latest.markdown_content;
    sourceUrl = latest.metadata?.permalink ?? latest.url ?? source.url;
  } else {
    // default: fetch OLC and land the result into the existing crawl_results table
    let fetched;
    try { fetched = await fetchOlcSection(olcJurisdiction, olcPath); }
    catch (e) { return { ...base, outcome: "error", detail: String(e) }; }

    sectionText = fetched.text;
    sourceUrl = fetched.permalink;
    olcKeysSeen = fetched.keysSeen;

    // land into crawl_results (single landing table; no parallel store)
    await sb.from("crawl_results").insert({
      source_id: source.id,
      url: fetched.url,
      status_code: fetched.statusCode,
      markdown_content: sectionText,
      metadata: { permalink: fetched.permalink, olc_keys_seen: fetched.keysSeen, derived_by: "jie-derive-proposals" },
    });
  }

  // --- diff against last-seen upstream hash ---
  const hash = await sha256(sectionText);
  await sb.from("crawl_sources")
    .update({ last_crawl_at: new Date().toISOString(), crawl_status: "success", consecutive_failures: 0 })
    .eq("id", source.id);

  // First observation is a baseline, not a change. Store the hash silently and emit
  // nothing — a drift detector alerts on deltas from a known state, not on first sight.
  if (!source.last_source_hash) {
    await sb.from("crawl_sources")
      .update({ last_source_hash: hash })
      .eq("id", source.id);
    return { ...base, outcome: "baseline_set", olcKeysSeen };
  }

  if (hash === source.last_source_hash) {
    return { ...base, outcome: "no_change", olcKeysSeen };
  }

  // --- change detected: build an HONEST, minimal proposal ---
  // Snapshot the pillar-relevant columns a human would weigh (for the diff view),
  // WITHOUT claiming to derive new methodology values from the text.
  const foodCols = "has_local_amendments, local_amendment_notes, hood_cleaning_default, scoring_type, grading_type, grading_config";
  const fireCols = "has_local_amendments, local_amendment_notes, fire_code_edition, nfpa96_edition, fire_jurisdiction_config";
  const { data: jrow, error: jErr } = await sb
    .from("jurisdictions")
    .select(pillar === "food" ? foodCols : fireCols)
    .eq("id", jurisdictionId)
    .maybeSingle();
  if (jErr) return { ...base, outcome: "error", detail: `jurisdiction read: ${jErr.message}` };

  const detectedAt = new Date().toISOString();

  // proposed_values stays EMPTY from the detector. Detecting a text change does not
  // tell us WHICH columns move or how — asserting e.g. has_local_amendments=true on a
  // text diff would be a false signal (most counties adopt state code by reference).
  // The proposal is a review trigger: the source pointer (source_url + source_hash) and
  // the current snapshot below carry the signal; a human fills proposed_values at review.
  const proposed_values: Record<string, unknown> = {};

  // supersede any open proposal for this (jurisdiction, pillar) — partial unique index
  // allows only one 'pending', so clear it before inserting.
  await sb.from("jurisdiction_change_proposals")
    .update({ status: "superseded", updated_at: detectedAt })
    .eq("jurisdiction_id", jurisdictionId)
    .eq("pillar", pillar)
    .eq("status", "pending");

  const { data: inserted, error: insErr } = await sb
    .from("jurisdiction_change_proposals")
    .insert({
      jurisdiction_id: jurisdictionId,
      source_id: source.id,
      source_url: sourceUrl,
      source_hash: hash,
      pillar,
      proposed_values,
      current_values: jrow ?? {},
      change_summary: `Tracked ${pillar} ordinance text changed at ${sourceUrl} (detected ${detectedAt}). Review the diff and set which methodology columns move.`,
      confidence: "unverified",
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr) return { ...base, outcome: "error", detail: `proposal insert: ${insErr.message}` };

  // record the new baseline hash so the same change isn't re-proposed next run
  await sb.from("crawl_sources")
    .update({ last_source_hash: hash, last_change_detected_at: detectedAt })
    .eq("id", source.id);

  return { ...base, outcome: "proposal_created", proposalId: inserted.id, olcKeysSeen };
}

// ---------- entrypoint ----------

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const sourceId: string | undefined = body?.sourceId;

    let query = sb.from("crawl_sources")
      .select("*")
      .eq("crawl_type", "api")
      .eq("is_active", true)
      .contains("tags", ["jie-methodology"]);
    if (sourceId) query = query.eq("id", sourceId);

    const { data: sources, error } = await query;
    if (error) throw error;
    if (!sources?.length) {
      return Response.json({ ok: true, processed: 0, note: "no active jie-methodology api sources matched" });
    }

    const results: SourceResult[] = [];
    for (const s of sources) results.push(await processSource(s));

    return Response.json({ ok: true, processed: results.length, results });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
