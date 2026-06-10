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

  "declarations": { carrier, policy_number, named_insured, policy_period, forms_list[], total_locations },
  "protective_safeguards": [ { code (P-1/P-2/P-5/etc), description, form_reference (e.g. CP 04 11),
       paragraph_ref, suspension_wording_present (bool), impairment_notice_required (bool),
       impairment_window (text if stated) } ],
  "fire_findings": [ { topic (hood_cleaning|suppression|sprinkler|extinguisher|fan|other),
       requirement_text, form_or_section_ref, named_standard (verbatim as the POLICY states it —
       do NOT correct or normalize editions; capture exactly what the document says) } ],
  "food_findings": [ { topic (foodborne_illness|spoilage|equipment_breakdown|communicable_disease|
       temperature|closure|other), requirement_or_exclusion_text, form_or_section_ref, sublimit_amount
       (if any), trigger_basis (e.g. physical_damage) } ],
  "policy_wide": [ { topic (coinsurance|application_warranty|valuation|other), text, section_ref,
       percentage_or_value (if any) } ],
  "integrity_observations": [ { type (endorsement_named_not_attached | sublimit_no_scheduled_value |
       address_mismatch | period_mismatch | safeguard_no_description | other), detail } ]

RULES:
- Two regulatory pillars stay SEPARATE: fire_findings and food_findings never merge. Never invent a
  blended or composite category.
- Capture standards/citations EXACTLY as the policy states them. You are reading, not correcting.
- Every extracted item must trace to text actually in the document. If something is absent, do NOT
  invent it — omit it. Absence is itself a finding the reconciler will handle.
- Output ONLY the JSON object. No preamble, no markdown, no commentary.`;

// ── Anthropic call helper ────────────────────────────────
async function callAnthropic(
  apiKey: string,
  model: string,
  temperature: number,
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
      max_tokens: 8000,
      temperature,
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
    const { intake_id } = await req.json();
    if (!intake_id) {
      return json({ error: "intake_id required" }, 400, headers);
    }

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
      return json({ error: "no_document" }, 400, headers);
    }

    // ── Step 2: create extraction run ────────────────────
    const { data: run, error: runErr } = await supabase
      .from("pl_extraction_runs")
      .insert({
        intake_id,
        document_id: documentId,
        status: "pending",
      })
      .select("id")
      .single();

    if (runErr || !run) {
      return json({ error: "Failed to create extraction run" }, 500, headers);
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
      return json({ error: "AI service not configured" }, 503, headers);
    }

    const MODEL_A = "claude-sonnet-4-20250514";
    const MODEL_B = "claude-sonnet-4-20250514";

    const [passA, passB] = await Promise.all([
      callAnthropic(anthropicKey, MODEL_A, 0, pdfBase64),
      callAnthropic(anthropicKey, MODEL_B, 0.4, pdfBase64),
    ]);

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

    return json({ run_id: run.id, status: "passes_complete" }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500, headers);
  }
});
