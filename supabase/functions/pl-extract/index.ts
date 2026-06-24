import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── JSON response helper ─────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Extraction system prompt (both passes) ───────────────
const EXTRACTION_PROMPT = `You are reading a commercial kitchen insurance policy as a meticulous claims adjuster would AFTER a loss — your job is MAXIMUM EXTRACTION on the kitchen's behalf: surface EVERY requirement, safeguard, condition, sublimit, exclusion, and warranty a carrier could deny on. Exhaustive over cautious.

Read the attached policy PDF and extract a structured JSON object with these top-level keys:

  "declarations": { carrier, policy_number, named_insured, policy_period, forms_list[], total_locations,
       locations: [ { loc_no, address, scheduled_building, scheduled_bpp, bi_limit, coinsurance, occupancy,
       cooking_type, solid_fuel (bool), liquor (bool),
       sprinkler_present ("present"|"absent"|"unstated"), fire_alarm_present ("present"|"absent"|"unstated"),
       suppression_present ("present"|"absent"|"unstated"),
       spoilage_sublimit (per-loc amount, or "shared:<amount>" if a single aggregate),
       coverage_confidence: { building: <0.0-1.0>, bpp: <0.0-1.0>, bi: <0.0-1.0> } } ] },
  "protective_safeguards": [ { code (P-1/P-2/P-5/etc), description, form_reference (e.g. CP 04 11),
       paragraph_ref, suspension_wording_present (bool), impairment_notice_required (bool),
       impairment_window (text if stated), applies_to_locations (array of loc_no where REQUIRED),
       satisfied_at_locations (array of loc_no where status == "present"),
       gap_locations (array of loc_no where status == "absent"),
       unconfirmed_locations (array of loc_no where status == "unstated") } ],
  "fire_findings": [ { topic (hood_cleaning|suppression|sprinkler|extinguisher|fan|other),
       requirement_text, form_or_section_ref, named_standard (verbatim as the POLICY states it —
       do NOT correct or normalize editions; capture exactly what the document says) } ],
  "food_findings": [ { topic (foodborne_illness|spoilage|equipment_breakdown|communicable_disease|
       temperature|closure|other), requirement_or_exclusion_text, form_or_section_ref, sublimit_amount
       (if any), trigger_basis (e.g. physical_damage) } ],
  "policy_wide": [ { topic (coinsurance|application_warranty|valuation|other), text, section_ref,
       percentage_or_value (if any) } ],
  "integrity_observations": [ { type (choose the MOST SPECIFIC — use 'other' only if none fit:
       nfpa_edition_mismatch | nfpa_frequency_mismatch | no_temperature_log_requirement | impairment_procedure_gap |
       no_food_contamination_coverage | endorsement_named_not_attached | sublimit_no_scheduled_value |
       safeguard_premises_mismatch | safeguard_required_not_confirmed | safeguard_presence_not_scheduled |
       coinsurance_no_valuation | address_or_period_mismatch | location_count_mismatch |
       form_listed_not_extracted | other),
       detail } ]

RULES:
- Two regulatory pillars stay SEPARATE: fire_findings and food_findings never merge. Never invent a
  blended or composite category.
- Capture standards/citations EXACTLY as the policy states them. You are reading, not correcting.
- Every extracted item must trace to text actually in the document. If something is absent, do NOT
  invent it — omit it. Absence is itself a finding the reconciler will handle.
- LOCATION SCHEDULE: If the declarations page lists multiple premises/locations, enumerate EVERY one
  into declarations.locations[]. For each location, read the premises description / location schedule
  and classify each protection field as a TRISTATE:
    "present"  — the document AFFIRMATIVELY states the protection is installed at this premises.
    "absent"   — the document AFFIRMATIVELY states it is NOT installed, OR the location is excluded
                 from a list that names which premises have it (e.g. sprinkler schedule lists locs
                 1-4,6-10 but omits loc 5 → loc 5 sprinkler_present = "absent").
    "unstated" — the policy does not address this protection for this location.
  For single-location policies, set locations to a single-element array.
- SAFEGUARD RESOLUTION: "at each described premises" / "all premises" language defines what the
  safeguard REQUIRES, NOT where it is satisfied. For each protective safeguard:
  • applies_to_locations[] = loc_no values where the safeguard is REQUIRED (per the warranty scope).
    If the warranty says "at each described premises", list every loc_no.
  • satisfied_at_locations[] = loc_no values where the corresponding protection status == "present".
  • gap_locations[] = loc_no values where the corresponding protection status == "absent". These are
    locations where the warranty REQUIRES the protection but the schedule shows it is NOT installed.
    This is the highest-value finding — a warranted safeguard affirmatively absent at a premises.
  • unconfirmed_locations[] = loc_no values where the corresponding protection status == "unstated".
    These are informational only — the policy warrants the protection but does not confirm or deny it.
  • For EACH location in gap_locations, emit an integrity_observation with type
    "safeguard_required_not_confirmed" and detail naming the safeguard code + loc_no. One flag per
    absent location.
  • Do NOT emit safeguard_required_not_confirmed for "unstated" locations. Instead, if ANY safeguard
    has a non-empty unconfirmed_locations[], emit ONE SINGLE integrity_observation with type
    "safeguard_presence_not_scheduled" summarizing that the policy warrants these safeguards but the
    schedule does not confirm per-location installation (list the affected safeguard codes). One flag
    total across all safeguards, not per-location.
  For single-location policies, use applies_to_locations=["all"] and evaluate gap normally.
- SHARED vs PER-LOCATION SUBLIMITS: If a spoilage sublimit applies as a single aggregate across all
  locations, record it in policy_wide AND set each location's spoilage_sublimit to "shared:<amount>".
  If per-location, record the per-location amount in each location object.
- BUSINESS INTERRUPTION (BI) LIMIT: Extract the Business Income / Business Interruption limit
  per location as bi_limit. This may appear on the declarations page, a BPP schedule, or a
  Business Income coverage form. If no BI limit is stated for a location, set bi_limit to null.
- COVERAGE CONFIDENCE: For each location, emit a coverage_confidence object with three keys:
  building (float 0.0-1.0), bpp (float 0.0-1.0), bi (float 0.0-1.0). Each value represents
  your confidence that the extracted dollar figure is correct. Score 1.0 if the figure is
  clearly printed and unambiguous; reduce toward 0.0 for blurred, partially obscured, or
  ambiguous values. If the field is null (not present in the document), set confidence to null.
- FORMS COMPLETENESS: Every form in declarations.forms_list[] MUST produce substantive requirements in
  the appropriate section (fire_findings, food_findings, or protective_safeguards). If you cannot
  extract a listed form's substance, add an integrity_observation with type "form_listed_not_extracted"
  and the form identifier in detail.
- NFPA EDITION vs FREQUENCY: These are two DISTINCT integrity types — never conflate them.
  • Emit "nfpa_edition_mismatch" ONLY when the policy cites a WRONG or OUTDATED NFPA edition/year or
    section number — e.g. NFPA 96 (2017) or §11.4 when California adopts NFPA 96 (2021) / Table 12.4.
    The CITATION itself is incorrect.
  • Emit "nfpa_frequency_mismatch" ONLY for the GREASE-BUILDUP INSPECTION / CLEANING of the kitchen
    EXHAUST SYSTEM (hoods, grease removal devices, ducts, fans) when the policy cites the correct
    standard/edition but warrants an inspection/cleaning interval LESS FREQUENT than NFPA 96 (2021)
    Table 12.4 requires for the cooking type. Table 12.4 (§12.4) governs grease-buildup inspection
    ONLY. Tiers: solid-fuel = monthly; high-volume (24-hr, charbroiling, wok) = quarterly;
    moderate-volume = semi-annual; low-volume = annual.
  • DO NOT apply Table 12.4 to FIRE-SUPPRESSION / FIRE-EXTINGUISHING system SERVICE. Suppression-system
    maintenance is governed by NFPA 96 (2021) §12.2.1 = at least every 6 months (SEMI-ANNUAL) and is
    NOT volume-dependent. A policy warranting semi-annual suppression service is COMPLIANT — never flag
    it as nfpa_frequency_mismatch. (Fusible-link replacement, §12.2.4, is likewise at least semi-annual.)
    If a policy warrants suppression service LESS often than every 6 months (e.g. annual), record it as
    an "other" observation describing the §12.2.1 shortfall — do NOT label it nfpa_frequency_mismatch.
  • DECISION RULE: wrong edition or section → nfpa_edition_mismatch. Correct edition but EXHAUST grease
    inspection/cleaning interval below the Table 12.4 tier → nfpa_frequency_mismatch. Suppression service
    interval → §12.2.1 (semi-annual baseline), NOT Table 12.4. If an edition error AND a genuine
    Table 12.4 cleaning-interval error are both present → emit BOTH. NEVER use either type as a
    catch-all for any NFPA discrepancy.
- Output ONLY the JSON object. No preamble, no markdown, no commentary.`;

// ── Anthropic call helper ────────────────────────────────
async function callAnthropic(
  apiKey: string,
  model: string,
  pdfBase64: string,
): Promise<{ parsed: unknown; raw: string }> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            {
              type: "text",
              text: "Extract the policy per the system instructions. Output ONLY the JSON object.",
            },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${errText}`);
  }

  const result = await resp.json();
  const raw = result.content?.[0]?.text ?? "";

  // Strip ```json fences if present
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return { parsed, raw };
  } catch {
    // Parse failed — wrap with marker so Phase 3 reconciler can flag it
    return { parsed: { _parse_error: true, raw_text: raw }, raw };
  }
}

// ── Post-parse sanity: flag location count mismatch ──────
function patchLocationMismatch(parsed: unknown): void {
  if (!parsed || typeof parsed !== "object" || (parsed as Record<string, unknown>)._parse_error) return;
  const obj = parsed as Record<string, unknown>;
  const decl = obj.declarations as Record<string, unknown> | undefined;
  if (!decl) return;
  const total = Number(decl.total_locations ?? 0);
  const locs = Array.isArray(decl.locations) ? decl.locations : [];
  if (total > 1 && locs.length !== total) {
    const obs = Array.isArray(obj.integrity_observations) ? [...obj.integrity_observations] : [];
    obs.push({
      type: "location_count_mismatch",
      detail: `declarations.total_locations=${total} but locations[] has ${locs.length} entries`,
    });
    obj.integrity_observations = obs;
  }
}

// ── Main handler ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  let runId: string | null = null;
  let intakeId: string | null = null;
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
      console.error("[pl-extract] Auth: falling through to JWT check");
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
    const { intake_id } = await req.json();
    if (!intake_id) {
      return json({ error: "intake_id required" }, 400, headers);
    }
    intakeId = intake_id;

    // ── Step 1: load intake + document ───────────────────
    const { data: intake, error: intakeErr } = await supabase
      .from("policy_lens_intakes")
      .select("id, policy_pdf_path")
      .eq("id", intake_id)
      .single();

    if (intakeErr || !intake) {
      return json({ error: "Intake not found" }, 404, headers);
    }

    const { data: doc, error: docErr } = await supabase
      .from("pl_documents")
      .select("id, file_path")
      .eq("intake_id", intake_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Determine the storage path: prefer pl_documents row, fall back to intake.policy_pdf_path
    const storagePath = doc?.file_path ?? intake.policy_pdf_path;
    const documentId = doc?.id ?? null;

    if (!storagePath) {
      // No document anywhere — write a failed run and return 400
      await supabase.from("pl_extraction_runs").insert({
        intake_id,
        document_id: documentId,
        status: "failed",
        error: "no_document",
      });
      const { error: intakeFailErr } = await supabase
        .from("policy_lens_intakes")
        .update({ status: "failed" })
        .eq("id", intake_id)
        .select("id")
        .single();
      if (intakeFailErr) console.error("[pl-extract] intake status=failed write failed:", intakeFailErr.message);
      return json({ error: "no_document" }, 400, headers);
    }

    // ── Duplicate guard: skip if active run exists ──────────
    const { data: existingRun } = await supabase
      .from("pl_extraction_runs")
      .select("id, status")
      .eq("intake_id", intake_id)
      .neq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRun) {
      return json(
        { run_id: existingRun.id, status: existingRun.status, skipped: "active_run_exists" },
        200,
        headers,
      );
    }

    // ── Step 2: create extraction run ────────────────────
    const { data: run, error: runErr } = await supabase
      .from("pl_extraction_runs")
      .insert({
        intake_id,
        document_id: documentId,
        status: "pending",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runErr || !run) {
      return json({ error: "Failed to create extraction run" }, 500, headers);
    }
    runId = run.id;

    // ── Advance intake status to 'extracting' ─────────────
    const { error: intakeExtractingErr } = await supabase
      .from("policy_lens_intakes")
      .update({ status: "extracting" })
      .eq("id", intake_id);
    if (intakeExtractingErr) {
      console.error("[pl-extract] Failed to set intake status=extracting:", intakeExtractingErr.message);
    }

    // ── Step 3: download PDF bytes from storage ──────────
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("policy-lens-uploads")
      .download(storagePath);

    if (dlErr || !fileData) {
      await supabase
        .from("pl_extraction_runs")
        .update({ status: "failed", error: "pdf_download_failed" })
        .eq("id", run.id);
      const { error: intakeFailErr } = await supabase
        .from("policy_lens_intakes")
        .update({ status: "failed" })
        .eq("id", intake_id)
        .select("id")
        .single();
      if (intakeFailErr) console.error("[pl-extract] intake status=failed write failed:", intakeFailErr.message);
      return json({ error: "Failed to download PDF" }, 500, headers);
    }

    const arrayBuf = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    // Encode to base64 in chunks to avoid stack overflow on large PDFs
    let pdfBase64 = "";
    const CHUNK = 32768;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      pdfBase64 += btoa(String.fromCharCode(...bytes.slice(i, i + CHUNK)));
    }

    // ── Step 4: two independent Anthropic passes ─────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      await supabase
        .from("pl_extraction_runs")
        .update({ status: "failed", error: "anthropic_key_missing" })
        .eq("id", run.id);
      const { error: intakeFailErr } = await supabase
        .from("policy_lens_intakes")
        .update({ status: "failed" })
        .eq("id", intake_id)
        .select("id")
        .single();
      if (intakeFailErr) console.error("[pl-extract] intake status=failed write failed:", intakeFailErr.message);
      return json({ error: "AI service not configured" }, 503, headers);
    }

    const MODEL_A = "claude-sonnet-4-6";
    const MODEL_B = "claude-opus-4-8";

    const [passA, passB] = await Promise.all([
      callAnthropic(anthropicKey, MODEL_A, pdfBase64),
      callAnthropic(anthropicKey, MODEL_B, pdfBase64),
    ]);

    // ── Step 4.5: sanity-check location counts ───────────
    patchLocationMismatch(passA.parsed);
    patchLocationMismatch(passB.parsed);

    // ── Step 5: update run with both passes ──────────────
    const { error: updateErr } = await supabase
      .from("pl_extraction_runs")
      .update({
        pass_a: passA.parsed,
        pass_b: passB.parsed,
        model_a: MODEL_A,
        model_b: MODEL_B,
        status: "passes_complete",
      })
      .eq("id", run.id);

    if (updateErr) {
      return json({ error: "Failed to save extraction passes" }, 500, headers);
    }

    // ── Chain -> pl-reconcile (best-effort) ────────────────
    try {
      const reconcileResp = await fetch(
        `${supabaseUrl}/functions/v1/pl-reconcile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ run_id: run.id }),
        },
      );
      if (!reconcileResp.ok) {
        console.error("[pl-extract] pl-reconcile chain failed:", reconcileResp.status);
      }
    } catch (chainErr) {
      console.error("[pl-extract] pl-reconcile chain error:", chainErr);
    }

    return json({ run_id: run.id, status: "passes_complete" }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (runId) {
      const { error: runFailErr } = await sb
        .from("pl_extraction_runs")
        .update({ status: "failed", error: message })
        .eq("id", runId)
        .select("id")
        .single();
      if (runFailErr) console.error("[pl-extract] run status=failed write failed:", runFailErr.message);
    }
    if (intakeId) {
      const { error: intakeFailErr } = await sb
        .from("policy_lens_intakes")
        .update({ status: "failed" })
        .eq("id", intakeId)
        .select("id")
        .single();
      if (intakeFailErr) console.error("[pl-extract] intake status=failed write failed:", intakeFailErr.message);
    }
    return json({ error: message }, 500, headers);
  }
});
