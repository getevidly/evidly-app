import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── JSON response helper ─────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Normalization helpers ────────────────────────────────

function norm(s: unknown): string {
  return (s == null ? "" : String(s)).trim().toLowerCase();
}

function canonicalSectionRef(s: unknown): string {
  const raw = norm(s);
  if (!raw) return "";
  // Extract paragraph marker like "¶12" or "¶ 12"
  const paraMatch = raw.match(/¶\s*(\d+)/);
  if (paraMatch) return `¶${paraMatch[1]}`;
  // Extract a leading section number like "section i", "section ii", "section 1"
  const secMatch = raw.match(/section\s+([ivxlcdm\d]+)/i);
  if (secMatch) return `section ${secMatch[1].toLowerCase()}`;
  // Fall back to the full normalized string
  return raw;
}

function normEqual(a: unknown, b: unknown): boolean {
  return norm(a) === norm(b);
}

// ── Key builders per array type ──────────────────────────

function safeguardKey(item: Record<string, unknown>): string {
  return norm(item.code);
}

function fireKey(item: Record<string, unknown>): string {
  return `${norm(item.topic)}|${norm(item.named_standard)}|${norm(item.form_or_section_ref)}`;
}

function foodKey(item: Record<string, unknown>): string {
  return `${norm(item.topic)}|${norm(item.form_or_section_ref)}`;
}

function policyWideKey(item: Record<string, unknown>): string {
  return `${norm(item.topic)}|${canonicalSectionRef(item.section_ref)}`;
}

function integrityKey(item: Record<string, unknown>): string {
  const t = norm(item.type);
  if (t === "other") return `other|${norm(item.detail).slice(0, 40)}`;
  return t;
}

/**
 * Integrity-specific reconciler: match by type, do NOT compare detail strings
 * for conflict. Same type in both passes = 'agreed' (take pass_a detail).
 * 'other' items dedupe by first 40 chars of detail.
 */
function reconcileIntegrity(
  arrA: Record<string, unknown>[],
  arrB: Record<string, unknown>[],
): { items: ReconciledItem[]; agreed: number; conflict: number; single_pass: number } {
  const mapA = new Map<string, Record<string, unknown>>();
  const mapB = new Map<string, Record<string, unknown>>();
  const allKeys: string[] = [];
  const seenKeys = new Set<string>();

  for (const item of (arrA ?? [])) {
    const k = integrityKey(item);
    mapA.set(k, item);
    if (!seenKeys.has(k)) { allKeys.push(k); seenKeys.add(k); }
  }
  for (const item of (arrB ?? [])) {
    const k = integrityKey(item);
    mapB.set(k, item);
    if (!seenKeys.has(k)) { allKeys.push(k); seenKeys.add(k); }
  }

  let agreed = 0;
  let single_pass = 0;
  const items: ReconciledItem[] = [];

  for (const k of allKeys) {
    const a = mapA.get(k);
    const b = mapB.get(k);

    if (a && b) {
      // Same type in both passes = agreed; take pass_a's detail as canonical
      agreed++;
      items.push({ ...a, _status: "agreed" });
    } else if (a) {
      single_pass++;
      items.push({ ...a, _status: "single_pass", _from: "a" });
    } else if (b) {
      single_pass++;
      items.push({ ...b, _status: "single_pass", _from: "b" });
    }
  }

  // conflict is always 0 for integrity_observations
  return { items, agreed, conflict: 0, single_pass };
}

// ── Generic array reconciler ─────────────────────────────

interface ReconciledItem {
  _status: "agreed" | "conflict" | "single_pass";
  _from?: "a" | "b";
  a?: Record<string, unknown>;
  b?: Record<string, unknown>;
  [key: string]: unknown;
}

function reconcileArray(
  arrA: Record<string, unknown>[],
  arrB: Record<string, unknown>[],
  keyFn: (item: Record<string, unknown>) => string,
  substantiveFields: string[],
): { items: ReconciledItem[]; agreed: number; conflict: number; single_pass: number } {
  const mapA = new Map<string, Record<string, unknown>>();
  const mapB = new Map<string, Record<string, unknown>>();
  const allKeys: string[] = [];
  const seenKeys = new Set<string>();

  for (const item of (arrA ?? [])) {
    const k = keyFn(item);
    mapA.set(k, item);
    if (!seenKeys.has(k)) { allKeys.push(k); seenKeys.add(k); }
  }
  for (const item of (arrB ?? [])) {
    const k = keyFn(item);
    mapB.set(k, item);
    if (!seenKeys.has(k)) { allKeys.push(k); seenKeys.add(k); }
  }

  let agreed = 0;
  let conflict = 0;
  let single_pass = 0;
  const items: ReconciledItem[] = [];

  for (const k of allKeys) {
    const a = mapA.get(k);
    const b = mapB.get(k);

    if (a && b) {
      // Both present — compare substantive fields
      let hasConflict = false;
      for (const field of substantiveFields) {
        if (!normEqual(a[field], b[field])) {
          hasConflict = true;
          break;
        }
      }
      if (hasConflict) {
        conflict++;
        items.push({ ...a, _status: "conflict", a, b });
      } else {
        agreed++;
        items.push({ ...a, _status: "agreed" });
      }
    } else if (a) {
      single_pass++;
      items.push({ ...a, _status: "single_pass", _from: "a" });
    } else if (b) {
      single_pass++;
      items.push({ ...b, _status: "single_pass", _from: "b" });
    }
  }

  return { items, agreed, conflict, single_pass };
}

// ── Declarations reconciler ──────────────────────────────

interface DeclField {
  value: unknown;
  _status: "agreed" | "conflict";
  a?: unknown;
  b?: unknown;
}

function reconcileDeclarations(
  declA: Record<string, unknown> | null | undefined,
  declB: Record<string, unknown> | null | undefined,
): { merged: Record<string, DeclField>; agreed: number; conflict: number } {
  const a = declA ?? {};
  const b = declB ?? {};
  const allFields = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged: Record<string, DeclField> = {};
  let agreed = 0;
  let conflict = 0;

  for (const field of allFields) {
    const valA = a[field];
    const valB = b[field];

    if (field === "forms_list") {
      // Compare as sets (order-insensitive)
      const setA = new Set((Array.isArray(valA) ? valA : []).map(norm));
      const setB = new Set((Array.isArray(valB) ? valB : []).map(norm));
      const equal = setA.size === setB.size && [...setA].every((v) => setB.has(v));
      if (equal) {
        agreed++;
        merged[field] = { value: valA ?? valB, _status: "agreed" };
      } else {
        conflict++;
        merged[field] = { value: valA ?? valB, _status: "conflict", a: valA, b: valB };
      }
    } else {
      if (normEqual(valA, valB)) {
        agreed++;
        merged[field] = { value: valA ?? valB, _status: "agreed" };
      } else {
        conflict++;
        merged[field] = { value: valA ?? valB, _status: "conflict", a: valA, b: valB };
      }
    }
  }

  return { merged, agreed, conflict };
}

// ── Main handler ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Auth: test secret, service_role bearer, OR platform_admin JWT ──
    const testSecret = Deno.env.get("PL_TEST_SECRET");
    const testHeader = req.headers.get("x-pl-test-secret");
    const isTestAuth = testSecret && testSecret.length > 0 && testHeader === testSecret;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const isServiceRole = token !== null && token.trim() === serviceKey.trim();

    if (!isTestAuth && !isServiceRole) {
      if (!token) {
        return json({ error: "Unauthorized" }, 401, headers);
      }
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return json({ error: "Unauthorized" }, 401, headers);
      }

      let isAdmin = user.email?.endsWith("@getevidly.com") || false;
      if (!isAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role !== "platform_admin") {
          return json({ error: "Admin access required" }, 403, headers);
        }
      }
    }

    // ── Parse body ───────────────────────────────────────
    const { run_id } = await req.json();
    if (!run_id) {
      return json({ error: "run_id required" }, 400, headers);
    }

    // ── Load the extraction run ──────────────────────────
    const { data: run, error: runErr } = await supabase
      .from("pl_extraction_runs")
      .select("id, pass_a, pass_b, status")
      .eq("id", run_id)
      .single();

    if (runErr || !run) {
      return json({ error: "Run not found" }, 404, headers);
    }

    if (!run.pass_a || !run.pass_b) {
      await supabase
        .from("pl_extraction_runs")
        .update({ status: "failed", error: "passes_missing" })
        .eq("id", run_id);
      return json({ error: "passes_missing" }, 400, headers);
    }

    const passA = run.pass_a as Record<string, unknown>;
    const passB = run.pass_b as Record<string, unknown>;

    // ── Check for parse errors in either pass ────────────
    if ((passA as any)._parse_error || (passB as any)._parse_error) {
      const flags = [];
      if ((passA as any)._parse_error) flags.push("pass_a_parse_error");
      if ((passB as any)._parse_error) flags.push("pass_b_parse_error");
      await supabase
        .from("pl_extraction_runs")
        .update({
          status: "failed",
          error: "parse_error",
          integrity_flags: flags,
        })
        .eq("id", run_id);
      return json({ error: "parse_error", flags }, 400, headers);
    }

    // ── Reconcile declarations ───────────────────────────
    const declResult = reconcileDeclarations(
      passA.declarations as Record<string, unknown>,
      passB.declarations as Record<string, unknown>,
    );

    // ── Reconcile each array section ─────────────────────
    const safeguards = reconcileArray(
      (passA.protective_safeguards ?? []) as Record<string, unknown>[],
      (passB.protective_safeguards ?? []) as Record<string, unknown>[],
      safeguardKey,
      ["suspension_wording_present", "impairment_notice_required"],
    );

    const fire = reconcileArray(
      (passA.fire_findings ?? []) as Record<string, unknown>[],
      (passB.fire_findings ?? []) as Record<string, unknown>[],
      fireKey,
      [],
    );

    const food = reconcileArray(
      (passA.food_findings ?? []) as Record<string, unknown>[],
      (passB.food_findings ?? []) as Record<string, unknown>[],
      foodKey,
      ["sublimit_amount"],
    );

    const pw = reconcileArray(
      (passA.policy_wide ?? []) as Record<string, unknown>[],
      (passB.policy_wide ?? []) as Record<string, unknown>[],
      policyWideKey,
      ["percentage_or_value"],
    );

    const integrity = reconcileIntegrity(
      (passA.integrity_observations ?? []) as Record<string, unknown>[],
      (passB.integrity_observations ?? []) as Record<string, unknown>[],
    );

    // ── Build summary ────────────────────────────────────
    const agreed_count = declResult.agreed + safeguards.agreed + fire.agreed + food.agreed + pw.agreed + integrity.agreed;
    const conflict_count = declResult.conflict + safeguards.conflict + fire.conflict + food.conflict + pw.conflict + integrity.conflict;
    const single_pass_count = safeguards.single_pass + fire.single_pass + food.single_pass + pw.single_pass + integrity.single_pass;

    // Review-gating: declarations conflicts + safeguards conflicts/single_pass + fire/food/pw conflicts
    const review_trigger_count =
      declResult.conflict
      + safeguards.conflict + safeguards.single_pass
      + fire.conflict + food.conflict + pw.conflict;

    const summary = { agreed_count, conflict_count, single_pass_count, review_trigger_count };

    // ── Build reconciled object ──────────────────────────
    const reconciled = {
      summary,
      declarations: declResult.merged,
      protective_safeguards: safeguards.items,
      fire_findings: fire.items,
      food_findings: food.items,
      policy_wide: pw.items,
      integrity_observations: integrity.items,
    };

    const review_required = review_trigger_count > 0;

    // ── Collect integrity flags ──────────────────────────
    const integrityFlags: string[] = [];
    if (conflict_count > 0) integrityFlags.push(`${conflict_count}_conflicts`);
    if (single_pass_count > 0) integrityFlags.push(`${single_pass_count}_single_pass`);
    for (const obs of integrity.items) {
      if (obs._status === "agreed" && typeof obs.type === "string") {
        integrityFlags.push(obs.type);
      }
    }

    // ── Update the run ───────────────────────────────────
    const { error: updateErr } = await supabase
      .from("pl_extraction_runs")
      .update({
        reconciled,
        review_required,
        integrity_flags: integrityFlags.length > 0 ? integrityFlags : null,
        status: "reconciled",
        reconciled_at: new Date().toISOString(),
      })
      .eq("id", run_id);

    if (updateErr) {
      return json({ error: "Failed to save reconciliation" }, 500, headers);
    }

    return json({ run_id, summary, review_required }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500, headers);
  }
});
