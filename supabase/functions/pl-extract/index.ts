import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── JSON response helper ─────────────────────────────────
function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// ── Multi-document limits and helpers ────────────────────
/** Hard cap on policy PDFs per intake — over this the run FAILS, never truncates. */
const MAX_POLICY_DOCUMENTS = 5;

/** One policy document on the intake, in file order. */
type PolicyDoc = { id: string | null; path: string; stated: string | null };

/** Base64 in chunks — String.fromCharCode overflows the stack on large PDFs. */
function encodeBase64(bytes: Uint8Array): string {
  let out = "";
  const CHUNK = 32768;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += btoa(String.fromCharCode(...bytes.slice(i, i + CHUNK)));
  }
  return out;
}

/** "Policy 2 — uploader labeled it: general liability" */
function attachmentLabel(index: number, stated: string | null): string {
  const base = `Policy ${index}`;
  if (!stated) return base;
  return `${base} — uploader labeled it: ${stated.replace(/_/g, " ")}`;
}

// ── Extraction system prompt (both passes) ───────────────
const EXTRACTION_PROMPT = `You are reading a commercial kitchen insurance policy as a meticulous claims adjuster would AFTER a loss — your job is MAXIMUM EXTRACTION on the kitchen's behalf: surface EVERY requirement, safeguard, condition, sublimit, exclusion, and warranty a carrier could deny on. Exhaustive over cautious.

Read the attached policy document(s) and extract ONE structured JSON object covering the whole set,
with these top-level keys:

  "declarations": { carrier, policy_number, named_insured, policy_period, forms_list[], total_locations,
       locations: [ { loc_no, address, scheduled_building, scheduled_bpp, bi_limit, coinsurance, occupancy,
       cooking_type, solid_fuel (bool), liquor (bool),
       sprinkler_present ("present"|"absent"|"unstated"), fire_alarm_present ("present"|"absent"|"unstated"),
       suppression_present ("present"|"absent"|"unstated"),
       spoilage_sublimit (per-loc amount, or "shared:<amount>" if a single aggregate),
       coverage_confidence: { building: <0.0-1.0>, bpp: <0.0-1.0>, bi: <0.0-1.0> } } ] },
  "protective_safeguards": [ { code (P-1/P-2/P-5/P-9/etc), description, form_reference (e.g. CP 04 11),
       form_edition (edition string as printed on the form, e.g. "09 17" from "CP 04 11 09 17";
       set to "unknown" if not determinable — never default to an assumed edition),
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
       stated_type_mismatch | form_listed_not_extracted | other),
       detail } ]

EVIDENCE — REQUIRED ON EVERY DETERMINATION:
Every object you emit inside protective_safeguards, fire_findings, food_findings, policy_wide and
integrity_observations MUST additionally carry an "evidence" key:

  "evidence": { "quote": <verbatim clause text from the document that this determination relied on>,
                "form":  <form number the clause sits on, e.g. "CP 04 11", if identifiable, else null>,
                "page":  <page number the clause appears on, if identifiable, else null>,
                "policy_index": <1-based number of the attached document the quote was copied from,
                                 matching its "Policy N" label> }

- "quote" is a VERBATIM span copied from the policy — never paraphrased, summarized, corrected or
  reflowed. Copy the wording exactly as printed, including its capitalization and punctuation.
- Quote the narrowest span that actually supports the determination — typically one sentence or
  clause. Do not quote a whole paragraph or section when a clause carries it.
- If a determination genuinely rests on more than one clause, quote the single most load-bearing one.
- "form" and "page" are best-effort: emit null when the document does not let you identify them.
  NEVER guess a form number or a page number, and never reuse one from a neighbouring item.
- "policy_index" is REQUIRED and is NEVER null — it is the 1-based number from the "Policy N" label
  on the attachment the quote was copied from. With a single attachment it is always 1. When a
  determination rests on clauses in more than one attachment, index the one you quoted.
- Adding evidence does NOT change what you determine. Extract exactly what you would have extracted
  without this section, then attach the clause each determination came from. If you cannot find a
  verbatim clause supporting an item, that item should not have been extracted.

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
- PSE FORM IDENTITY: Capture the PSE form number AND its edition as separate fields (form_reference
  and form_edition). ISO-standard PSE forms are CP 04 11 (commercial property) and BP 04 30 (BOP) —
  treat both as ISO-standard. If the form is neither CP 04 11 nor BP 04 30 (e.g. a carrier's
  proprietary or manuscript endorsement), note the actual form identifier in form_reference.
  Proprietary/manuscript forms often carry broader exclusions (extending beyond fire) and different
  notification windows — downstream processing will flag them. If the form number or edition cannot
  be determined from the document, set form_reference or form_edition to "unknown" — NEVER default
  to "CP 04 11" or assume ISO.
- P-5 vs P-9 SYMBOL ASSIGNMENT: P-5 ("Automatic Commercial Cooking Exhaust and Extinguishing System")
  covers BOTH the exhaust/hood leg AND the wet-chemical extinguishing/suppression leg as ONE symbol.
  P-9 ("Any Other Specifically Described Protective System") is the catch-all for carrier-customized
  systems. If the policy schedules a dry-chemical cooking suppression system (e.g. Ansul R-102 dry
  chem) or any other specifically described system that is NOT the standard wet-chemical exhaust-and-
  extinguishing combination, it may be scheduled under P-9, not P-5. Read the schedule text; use the
  symbol code printed in the policy. If the schedule says P-9 and describes an Ansul system or dry-chem
  system, code it as P-9. Do NOT reclassify it as P-5. Where a policy schedules BOTH P-1 AND P-9 (or
  any two distinct symbols), each is an independent requirement — satisfying one does NOT satisfy the
  other.
- MULTIPLE POLICY DOCUMENTS: the message attaches up to 5 policy documents, each preceded by a
  "Policy N" label (1-based, in file order) that also carries the type the UPLOADER said it was.
  Treat the attachments as ONE program of insurance, not N independent readings:
  • Emit ONE combined JSON object covering the whole set. NEVER emit one object per document.
  • Merge declarations across the set. Where two documents describe the same premises, reconcile
    them into a single locations[] entry; where they schedule different premises, enumerate every
    one. forms_list[] is the UNION of the forms listed across all attachments.
  • Every determination carries evidence.policy_index naming which attachment it came from.
  • PRESENT IN POLICY N vs ABSENT FROM EVERY POLICY: a coverage, safeguard, sublimit, exclusion or
    condition found in ANY attachment is PRESENT for this insured — record it once, with
    policy_index pointing at the document that carries it. NEVER treat something as missing because
    it is absent from one attachment while others are attached: an umbrella or liquor policy is not
    expected to restate property terms, and a property policy is not expected to carry liquor
    liability. Only when a coverage is absent from EVERY attachment may you record it as absent, and
    then the detail must say so explicitly — "absent from all N uploaded policies", never
    "absent from the policy". Do not invent an absence you did not check for across the full set.
  • STATED vs IDENTIFIED TYPE: the "uploader labeled it" text is the uploader's CLAIM, not fact.
    Read each attachment and determine what it actually is. Where the identified type contradicts
    the stated label — labeled general liability, reads as a property policy — emit an
    integrity_observation with type "stated_type_mismatch" whose detail names the attachment
    ("Policy 2"), the stated label, and the type you identified. Always extract the document for
    what it ACTUALLY is; the uploader's label never overrides the document.
- Output ONLY the JSON object. No preamble, no markdown, no commentary.`;

/** One attached policy PDF: its "Policy N" label and its base64 bytes. */
type PolicyAttachment = { label: string; base64: string };

// ── Anthropic call helper ────────────────────────────────
// Every attachment goes into EVERY pass, as multiple document blocks in one
// message, each preceded by its label. One run, two passes, all documents in
// both — never a run per document.
async function callAnthropic(
  apiKey: string,
  model: string,
  attachments: PolicyAttachment[],
): Promise<{ parsed: unknown; raw: string }> {
  const content: unknown[] = [];
  for (const doc of attachments) {
    content.push({ type: "text", text: doc.label });
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: doc.base64 },
    });
  }
  content.push({
    type: "text",
    text:
      attachments.length === 1
        ? "Extract the policy per the system instructions. Output ONLY the JSON object."
        : `Extract across all ${attachments.length} attached policy documents per the system ` +
          "instructions, as ONE combined JSON object. Output ONLY the JSON object.",
  });

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
          content,
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

    const { data: docRows, error: docErr } = await supabase
      .from("pl_documents")
      .select("id, file_path, stated_policy_type")
      .eq("intake_id", intake_id)
      .eq("doc_type", "policy")
      .order("file_path", { ascending: true });

    if (docErr) {
      // A real query error fails the run — never fall through to the legacy
      // single-path guess as though the intake simply had no documents.
      console.error("[pl-extract] pl_documents query failed:", docErr.message);
      await supabase.from("pl_extraction_runs").insert({
        intake_id,
        document_id: null,
        status: "failed",
        error: `document_query_failed: ${docErr.message}`,
      });
      const { error: intakeFailErr } = await supabase
        .from("policy_lens_intakes")
        .update({ status: "failed" })
        .eq("id", intake_id)
        .select("id")
        .single();
      if (intakeFailErr) console.error("[pl-extract] intake status=failed write failed:", intakeFailErr.message);
      return json({ error: "document_query_failed" }, 500, headers);
    }

    // file_path is nulled by pl-retention-purge — those rows carry no bytes.
    const policyDocs: PolicyDoc[] = (docRows ?? [])
      .filter((d) => typeof d.file_path === "string" && d.file_path.length > 0)
      .map((d) => ({
        id: d.id as string,
        path: d.file_path as string,
        stated: (d.stated_policy_type as string | null) ?? null,
      }));

    // Legacy fallback: an intake with no pl_documents rows still extracts from
    // the single path on the intake, exactly as before.
    if (policyDocs.length === 0 && intake.policy_pdf_path) {
      policyDocs.push({ id: null, path: intake.policy_pdf_path, stated: null });
    }

    // The run's document_id keeps pointing at the first document in file order.
    const documentId = policyDocs[0]?.id ?? null;

    if (policyDocs.length === 0) {
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

    // ── Cap: an over-large set FAILS the run, never truncates ──
    if (policyDocs.length > MAX_POLICY_DOCUMENTS) {
      const capError =
        `too_many_documents: intake has ${policyDocs.length} policy documents, ` +
        `maximum is ${MAX_POLICY_DOCUMENTS}`;
      console.error("[pl-extract]", capError);
      await supabase.from("pl_extraction_runs").insert({
        intake_id,
        document_id: documentId,
        status: "failed",
        error: capError,
      });
      const { error: intakeFailErr } = await supabase
        .from("policy_lens_intakes")
        .update({ status: "failed" })
        .eq("id", intake_id)
        .select("id")
        .single();
      if (intakeFailErr) console.error("[pl-extract] intake status=failed write failed:", intakeFailErr.message);
      return json({ error: capError }, 400, headers);
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

    // ── Step 3: download + encode EVERY policy document ──
    const attachments: PolicyAttachment[] = [];
    for (let i = 0; i < policyDocs.length; i++) {
      const policyDoc = policyDocs[i];
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("policy-lens-uploads")
        .download(policyDoc.path);

      if (dlErr || !fileData) {
        await supabase
          .from("pl_extraction_runs")
          .update({ status: "failed", error: `pdf_download_failed: ${policyDoc.path}` })
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

      const bytes = new Uint8Array(await fileData.arrayBuffer());
      attachments.push({
        label: attachmentLabel(i + 1, policyDoc.stated),
        base64: encodeBase64(bytes),
      });
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
      callAnthropic(anthropicKey, MODEL_A, attachments),
      callAnthropic(anthropicKey, MODEL_B, attachments),
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

    // back-fill carrier on the intake from parsed declarations (manual entry wins)
    const parsedCarrier =
      (passB.parsed?.declarations?.carrier ??
       passA.parsed?.declarations?.carrier ?? "").toString().trim();
    if (parsedCarrier) {
      await supabase
        .from("policy_lens_intakes")
        .update({ carrier: parsedCarrier })
        .eq("id", intake_id)
        .is("carrier", null);   // only fill when empty — don't clobber a typed value
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
