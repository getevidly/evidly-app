/**
 * PL Retention Purge
 *
 * Sweeps policy_lens_intakes whose retention window has elapsed
 * (purge_due_at <= now() AND purged_at IS NULL) and strips the
 * uploaded policy PDF plus its derived extraction payloads.
 *
 * ALWAYS (every source):
 *   - delete every object under {intake_id}/ in policy-lens-uploads
 *   - policy_lens_intakes.policy_pdf_path -> NULL
 *   - pl_extraction_runs: pass_a / pass_b / reconciled -> NULL
 *   - pl_documents: file_path / original_filename / extraction -> NULL
 *
 * ADDITIONALLY for source IN ('prospect','agent'):
 *   - scrub intake identity columns -> NULL
 *     (county, carrier, policy_type are KEPT — anonymous tally fields)
 *   - pl_redact_sealed_report(intake_id)
 *   - pl_report_grants.revoked_at -> now()
 *   - pl_findings are KEPT untouched — they are the anonymous tally
 *
 * For source = 'in_app' only the ALWAYS block runs: findings, the
 * sealed report, grants and intake identity all stay.
 *
 * purged_at is stamped only after every step for that intake has
 * succeeded. A failure on one intake is logged and skipped, leaving
 * purged_at NULL so the next sweep retries it, and never aborts the
 * rest of the sweep.
 *
 * POST (no body). Auth: service_role key only.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const UPLOAD_BUCKET = "policy-lens-uploads";

/** Identity columns scrubbed on prospect/agent intakes. */
const IDENTITY_COLUMNS = [
  "business_name",
  "first_name",
  "contact_name",
  "contact_email",
  "contact_phone",
  "street_address",
  "city",
  "state",
  "zip",
  "agent_name",
  "agent_email",
  "agency_name",
  "agent_license_number",
] as const;

type PurgeOutcome = {
  intake_id: string;
  source: string;
  identity_scrubbed: boolean;
  ok: boolean;
  error?: string;
};

/** Storage remove is idempotent-by-intent: an already-absent object is not a failure. */
function isObjectMissing(err: { message?: string } | null): boolean {
  const m = err?.message?.toLowerCase() ?? "";
  return m.includes("not found") || m.includes("does not exist");
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const sweepStart = new Date().toISOString();

    // ── Claim the due set ────────────────────────────────────
    const { data: due, error: dueErr } = await supabase
      .from("policy_lens_intakes")
      .select("id, source, retention_choice, purge_due_at")
      .lte("purge_due_at", sweepStart)
      .is("purged_at", null);

    if (dueErr) {
      logger.error("[pl-retention-purge] Failed to load due intakes", dueErr);
      return json({ error: "Failed to load due intakes" }, 500);
    }

    const intakes = due ?? [];
    if (intakes.length === 0) {
      logger.info("[pl-retention-purge] Nothing due", { swept_at: sweepStart });
      return json({ ok: true, due: 0, purged: 0, failed: 0, results: [] });
    }

    logger.info("[pl-retention-purge] Sweep start", {
      due: intakes.length,
      swept_at: sweepStart,
    });

    const results: PurgeOutcome[] = [];

    for (const intake of intakes) {
      const intakeId = intake.id as string;
      const source = intake.source as string;
      const scrubIdentity = source === "prospect" || source === "agent";

      try {
        // ── 1. Remove every stored object for this intake ────
        const { data: objects, error: lsErr } = await supabase.storage
          .from(UPLOAD_BUCKET)
          .list(intakeId, { limit: 1000 });

        if (lsErr) {
          throw new Error(`storage list failed: ${lsErr.message}`);
        }

        const objectPaths = (objects ?? []).map((o) => `${intakeId}/${o.name}`);
        if (objectPaths.length > 0) {
          const { error: rmErr } = await supabase.storage
            .from(UPLOAD_BUCKET)
            .remove(objectPaths);

          if (rmErr && !isObjectMissing(rmErr)) {
            throw new Error(`storage remove failed: ${rmErr.message}`);
          }
        }

        // ── 2. Intake row: drop the path, and identity when due ──
        const intakeUpdate: Record<string, unknown> = {
          policy_pdf_path: null,
        };
        if (scrubIdentity) {
          for (const col of IDENTITY_COLUMNS) intakeUpdate[col] = null;
        }

        const { error: intakeErr } = await supabase
          .from("policy_lens_intakes")
          .update(intakeUpdate)
          .eq("id", intakeId);
        if (intakeErr) {
          throw new Error(`intake update failed: ${intakeErr.message}`);
        }

        // ── 3. Extraction runs: drop the model payloads ──────
        const { error: runsErr } = await supabase
          .from("pl_extraction_runs")
          .update({ pass_a: null, pass_b: null, reconciled: null })
          .eq("intake_id", intakeId);
        if (runsErr) {
          throw new Error(`extraction run update failed: ${runsErr.message}`);
        }

        // ── 4. Documents: drop file pointers + extraction ────
        const { error: docsErr } = await supabase
          .from("pl_documents")
          .update({
            file_path: null,
            original_filename: null,
            extraction: null,
          })
          .eq("intake_id", intakeId);
        if (docsErr) {
          throw new Error(`document update failed: ${docsErr.message}`);
        }

        // ── 5. prospect/agent only: seal redaction + grants ──
        if (scrubIdentity) {
          const { error: redactErr } = await supabase.rpc(
            "pl_redact_sealed_report",
            { p_intake_id: intakeId },
          );
          if (redactErr) {
            throw new Error(`seal redaction failed: ${redactErr.message}`);
          }

          const { error: grantErr } = await supabase
            .from("pl_report_grants")
            .update({ revoked_at: new Date().toISOString() })
            .eq("intake_id", intakeId)
            .is("revoked_at", null);
          if (grantErr) {
            throw new Error(`grant revocation failed: ${grantErr.message}`);
          }
        }

        // ── 6. Stamp purged_at — only once every step landed ──
        const { error: stampErr } = await supabase
          .from("policy_lens_intakes")
          .update({ purged_at: new Date().toISOString() })
          .eq("id", intakeId);
        if (stampErr) {
          throw new Error(`purged_at stamp failed: ${stampErr.message}`);
        }

        results.push({
          intake_id: intakeId,
          source,
          identity_scrubbed: scrubIdentity,
          ok: true,
        });
        logger.info("[pl-retention-purge] Purged", {
          intake_id: intakeId,
          source,
          identity_scrubbed: scrubIdentity,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          intake_id: intakeId,
          source,
          identity_scrubbed: scrubIdentity,
          ok: false,
          error: message,
        });
        // purged_at stays NULL — the next sweep retries this intake.
        logger.error("[pl-retention-purge] Intake purge failed — will retry", {
          intake_id: intakeId,
          source,
          error: message,
        });
      }
    }

    const purged = results.filter((r) => r.ok).length;
    const failed = results.length - purged;

    logger.info("[pl-retention-purge] Sweep complete", {
      due: intakes.length,
      purged,
      failed,
    });

    return json({ ok: true, due: intakes.length, purged, failed, results });
  } catch (error) {
    logger.error("[pl-retention-purge] Unhandled error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
