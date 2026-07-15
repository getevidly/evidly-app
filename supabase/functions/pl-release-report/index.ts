// supabase/functions/pl-release-report/index.ts
// Admin-only: release a reviewed extraction run to the agent.
// 1. Re-checks all findings are reviewed (server-side guard).
// 2. Mints a raw token, stores SHA-256 hash in pl_report_grants.
// 3. Sets pl_extraction_runs.release_status = 'released'.
// 4. Returns BOTH the confirmed grant AND run update; fails if either misses.
// Deploy: supabase functions deploy pl-release-report --project-ref irxgmhxhmxtzfwuieblc

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { logEvent } from "../_shared/events.ts";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import {
  buildCanonicalReportJson,
  buildSealHashInput,
  canonicalTimestamp,
  sha256,
} from "../_shared/seal-canonicalization.ts";
import { shapeFindings, buildCoverageDetail } from "../_shared/pl-report-shaping.ts";
import { stampJourneyStage } from "../_shared/journeyStamp.ts";

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), { status, headers });
}

// SHA-256 hex — same algo as pl-get-findings (token verification side)
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Grant TTL: 30 days. No existing convention — flagged for Arthur.
const GRANT_TTL_DAYS = 30;

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

    // ── Auth: verify caller is platform admin ──────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, headers);
    }
    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401, headers);
    }

    const isAdmin = user.email?.endsWith("@getevidly.com") || false;

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

    // ── Parse body ─────────────────────────────────────────
    const body = await req.json();
    const { run_id, intake_id, recipient_party_id } = body as {
      run_id?: string;
      intake_id?: string;
      recipient_party_id?: string;
    };

    if (!run_id || !intake_id) {
      return json({ error: "run_id and intake_id required" }, 400, headers);
    }
    // recipient_party_id is optional — resolved from intake.broker_party_id when absent

    // ── Resolve the authorizing org (insured) from the intake ───────
    const { data: intakeCheck, error: intakeErr } = await supabase
      .from("policy_lens_intakes")
      .select("organization_id, broker_party_id, source, business_name, contact_email, contact_name, contact_phone, state, county")
      .eq("id", intake_id)
      .single();

    if (intakeErr || !intakeCheck) {
      return json({ error: "Intake not found" }, 404, headers);
    }
    const grantedByOrgId = intakeCheck.organization_id; // may be null for prospect intakes
    const effectiveRecipient = recipient_party_id || intakeCheck.broker_party_id || null;

    // ── Verify recipient broker exists (broker path only) ────────
    if (effectiveRecipient) {
      const { data: recipientCheck, error: recipientErr } = await supabase
        .from("external_parties")
        .select("id, party_type")
        .eq("id", effectiveRecipient)
        .single();

      if (recipientErr || !recipientCheck) {
        return json({ error: "Recipient party not found" }, 404, headers);
      }
    }

    // ── Guard: verify the run exists and is not already released ────
    const { data: runCheck, error: runCheckErr } = await supabase
      .from("pl_extraction_runs")
      .select("id, status, release_status")
      .eq("id", run_id)
      .eq("intake_id", intake_id)
      .single();

    if (runCheckErr || !runCheck) {
      return json({ error: "Run not found" }, 404, headers);
    }
    if (runCheck.release_status === "released") {
      return json({ error: "Run already released" }, 409, headers);
    }

    // ── Guard: re-check ALL findings GENUINELY reviewed (server-side) ──
    //    Provenance-tightened (B4c): a finding counts as reviewed ONLY if
    //    review_state != 'pending' AND reviewed_by IS NOT NULL AND
    //    reviewed_at IS NOT NULL. This closes the forgeable-status hole —
    //    raw SQL setting review_state='accepted' leaves reviewed_by null and
    //    must now fail. A released report is always a genuinely-reviewed one.
    const { data: allFindings, error: pendErr } = await supabase
      .from("pl_findings")
      .select("id, review_state, reviewed_by, reviewed_at")
      .eq("run_id", run_id);

    if (pendErr) {
      logger.error("[pl-release-report] Review check failed", pendErr);
      return json({ error: "Failed to verify findings" }, 500, headers);
    }
    if (!allFindings || allFindings.length === 0) {
      return json({ error: "No findings to release" }, 422, headers);
    }
    const unreviewed = allFindings.filter(
      (f: any) =>
        f.review_state === "pending" ||
        f.review_state === "flagged" ||
        f.reviewed_by === null ||
        f.reviewed_at === null,
    );
    if (unreviewed.length > 0) {
      return json(
        {
          error: `${unreviewed.length} finding(s) not releasable (must be accepted or corrected — flagged or unreviewed findings block release)`,
          unreviewed_count: unreviewed.length,
        },
        422,
        headers,
      );
    }

    // Single release timestamp — shared by seal (sealed_at) and grant/release.
    const now = new Date();

    // ════════════════════════════════════════════════════════════════
    // B4c: COMPOSE + SEAL  (atomic with release — abort-on-failure below)
    //   A released report is ALWAYS a sealed report. If compose or the
    //   seal-insert throws, we return an error and DO NOT mint the grant
    //   or flip release_status. One seal per run (run_id UNIQUE).
    // ════════════════════════════════════════════════════════════════
    try {
      // 1. Load findings with ALL shaping columns, ordered (part, finding_key)
      //    — SAME order the live reads use, so sealed render == read render.
      const { data: sealRows, error: sealRowsErr } = await supabase
        .from("pl_findings")
        .select(
          "finding_key, part, flag, agent_payload, kitchen_payload, correlation, reviewer_corrected",
        )
        .eq("run_id", run_id)
        .order("part", { ascending: true })
        .order("finding_key", { ascending: true });
      if (sealRowsErr || !sealRows) {
        throw new Error(`finding load failed: ${sealRowsErr?.message ?? "no rows"}`);
      }

      // 2. render  = shaped findings, BOTH voices per element (shared helper —
      //    identical to what pl-get-findings returns to the reader).
      const render = shapeFindings(sealRows);

      // 3. findings = raw corrected source records (the underlying truth),
      //    same stable order. Sealed alongside render for full reconstruction.
      const findingsSource = sealRows.map((r: any) => ({
        finding_key: r.finding_key,
        part: r.part,
        flag: r.flag,
        agent_payload: r.agent_payload ?? null,
        kitchen_payload: r.kitchen_payload ?? null,
        correlation: r.correlation ?? null,
        reviewer_corrected: r.reviewer_corrected ?? null,
      }));

      // 4. Load run.reconciled for coverage (shared helper, §1731 read-only).
      const { data: sealRun, error: sealRunErr } = await supabase
        .from("pl_extraction_runs")
        .select("reconciled")
        .eq("id", run_id)
        .single();
      if (sealRunErr || !sealRun) {
        throw new Error(`run load failed: ${sealRunErr?.message ?? "not found"}`);
      }
      const coverage = buildCoverageDetail(
        sealRun.reconciled as Record<string, unknown> | null,
      );

      // 5. Resolve broker display_name (seal key 4) — null on insured path.
      let brokerDisplayName: string | null = null;
      if (effectiveRecipient) {
        const { data: party } = await supabase
          .from("external_parties")
          .select("display_name")
          .eq("id", effectiveRecipient)
          .single();
        brokerDisplayName = party?.display_name ?? null;
      }

      // 6. Build the 7-key canonical payload (fixed key order in builder).
      const reportPayload = {
        run_id,
        intake_id,
        recipient_party_id: effectiveRecipient,
        broker_display_name: brokerDisplayName,
        coverage,
        findings: findingsSource,
        render,
      };

      // 7. Canonicalize → hash. Reports have NO doc bytes (empty ArrayBuffer);
      //    predecessor = "" (one seal per run, no chain). sealed_by = user.id
      //    (UUID — NOT user.email, which is what released_by uses).
      const canonicalJson = buildCanonicalReportJson(reportPayload);
      const sealedAtCanonical = canonicalTimestamp(now);
      const hashInput = buildSealHashInput(
        new ArrayBuffer(0),
        canonicalJson,
        sealedAtCanonical,
        user.id,
        "",
      );
      const contentHash = await sha256(hashInput.buffer);

      // 8. INSERT the sealed row. run_id UNIQUE enforces one seal per run;
      //    a duplicate (re-release attempt) surfaces as an insert error and
      //    aborts — correct, since release already guarded not-already-released.
      const { error: sealErr } = await supabase.from("pl_sealed_reports").insert({
        run_id,
        intake_id,
        report_jsonb: reportPayload,
        content_hash: contentHash,
        sealed_at: now.toISOString(),
        sealed_by: user.id,
      });
      if (sealErr) {
        throw new Error(`seal insert failed: ${sealErr.message}`);
      }

      logger.info("[pl-release-report] Sealed", {
        run_id,
        content_hash: contentHash,
        finding_count: render.length,
      });

      // Journey stage: policies_read (fire-and-forget, never blocks release)
      await stampJourneyStage(supabase, grantedByOrgId, "policies_read");
    } catch (sealCatch) {
      // ABORT: no grant, no release flip. Release is atomic with sealing.
      logger.error("[pl-release-report] Compose/seal FAILED — aborting release", sealCatch);
      return json(
        {
          error: "Failed to seal report — release aborted",
          detail: sealCatch instanceof Error ? sealCatch.message : String(sealCatch),
        },
        500,
        headers,
      );
    }
    // ════════════ end COMPOSE + SEAL ════════════

    // ── Conditionally mint token + grant (broker path only) ──
    let grant: Record<string, unknown> | null = null;
    let rawToken: string | null = null;

    if (effectiveRecipient) {
      rawToken = crypto.randomUUID();
      const tokenHash = await sha256Hex(rawToken);
      const expiresAt = new Date(
        now.getTime() + GRANT_TTL_DAYS * 24 * 60 * 60 * 1000,
      );

      const { data: grantData, error: grantErr } = await supabase
        .from("pl_report_grants")
        .insert({
          intake_id,
          run_id,
          token_hash: tokenHash,
          door: "agent",
          expires_at: expiresAt.toISOString(),
          granted_by_org_id: grantedByOrgId,
          recipient_party_id: effectiveRecipient,
          consent_type: "per_report",
          business_name: intakeCheck.business_name,
        })
        .select("id, intake_id, run_id, door, expires_at, granted_by_org_id, recipient_party_id, consent_type, created_at")
        .single();

      if (grantErr || !grantData) {
        logger.error("[pl-release-report] Grant insert failed", grantErr);
        return json(
          { error: "Failed to create report grant", detail: grantErr?.message },
          500,
          headers,
        );
      }
      grant = grantData;
    }

    // ── Update run release_status ──────────────────────────
    const { data: runUpdate, error: runUpErr } = await supabase
      .from("pl_extraction_runs")
      .update({
        release_status: "released",
        released_at: now.toISOString(),
        released_by: user.email,
      })
      .eq("id", run_id)
      .select("id, release_status, released_at, released_by")
      .single();

    if (runUpErr || !runUpdate) {
      logger.error("[pl-release-report] Run update failed", runUpErr);
      return json(
        { error: "Release failed — run update error", detail: runUpErr?.message },
        500,
        headers,
      );
    }

    // ── Insured path: account creation + reading-ready email ──────────
    // §5: On the insured path, create an account (or link an existing one),
    // then email the contact so they can see their reading.
    // NEVER abort the release on failure — the report is already sealed.
    let notificationError: string | null = null;

    if (!effectiveRecipient && intakeCheck.contact_email) {
      const contactEmail = intakeCheck.contact_email.toLowerCase().trim();
      const contactName = intakeCheck.contact_name || "there";
      const contactPhone = intakeCheck.contact_phone || null;
      const businessName = intakeCheck.business_name;
      const appUrl = Deno.env.get("PL_PUBLIC_BASE") || "https://app.getevidly.com";

      try {
        // ── 5b. Does this email already have an account? ──────────
        let isExistingUser = false;
        let existingOrgId: string | null = null;

        const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });
        const existingUser = (authList?.users ?? []).find(
          (u: any) => u.email?.toLowerCase() === contactEmail,
        );

        if (existingUser) {
          isExistingUser = true;
          const { data: existingProfile } = await supabase
            .from("user_profiles")
            .select("organization_id")
            .eq("id", existingUser.id)
            .maybeSingle();

          existingOrgId = existingProfile?.organization_id || null;

          // Link intake to their existing org immediately
          if (existingOrgId) {
            await supabase
              .from("policy_lens_intakes")
              .update({ organization_id: existingOrgId })
              .eq("id", intake_id);
          }
        }

        // ── 5c / 5d. Create account (new) or send login email (existing) ──
        let ctaUrl: string;
        let ctaText: string;

        if (isExistingUser) {
          ctaUrl = `${appUrl}/login`;
          ctaText = "See my reading";
        } else {
          // Mint invite — creates the auth user with metadata that
          // EmailConfirmed.tsx → provisionNewUser() reads to build the org.
          const { data: linkData, error: inviteErr } = await supabase.auth.admin.generateLink({
            type: "invite",
            email: contactEmail,
            options: {
              data: {
                full_name: contactName !== "there" ? contactName : "",
                phone: contactPhone || "",
                org_name: businessName,
                state: intakeCheck.state ?? "",
                jurisdiction: intakeCheck.county ?? null,
                kitchen_type: null,
                pl_intake_id: intake_id,
              },
              redirectTo: `${appUrl}/email-confirmed`,
            },
          });

          if (inviteErr || !linkData?.properties?.action_link) {
            throw new Error(
              `Invite generation failed: ${inviteErr?.message ?? "no action_link returned"}`,
            );
          }

          ctaUrl = linkData.properties.action_link;
          ctaText = "See my reading";
        }

        // ── 5d. Send the email ──────────────────────────────────────
        const emailResult = await sendEmail({
          to: contactEmail,
          subject: "Your Policy Lens reading is ready",
          replyTo: "founders@getevidly.com",
          html: buildEmailHtml({
            recipientName: contactName,
            bodyHtml: `
              <p><strong>Your Policy Lens reading is ready.</strong></p>
              <p>Policy Lens read your insurance policy and identified the provisions that govern your kitchen — what your coverage requires of you, and where your record can't yet answer it.</p>
              <p>Your reading is waiting in your EvidLY account.</p>`,
            ctaText,
            ctaUrl,
            footerNote:
              "A person on our team checked every line of it before it went out.<br><br><em>Policy Lens reads the policy. Your agent evaluates the coverage — it identifies and flags, it never advises.</em><br><br>— Arthur Haggerty<br>Founder, EvidLY<br>(855) 384-3591 · founders@getevidly.com",
          }),
        });

        if (!emailResult) {
          notificationError = "Email send failed via Resend";
          logger.error("[pl-release-report] Reading-ready email failed", { intake_id, contactEmail });
        } else {
          logger.info("[pl-release-report] Reading-ready email sent", {
            intake_id,
            to: contactEmail,
            existing_user: isExistingUser,
          });
        }
      } catch (notifErr) {
        notificationError = notifErr instanceof Error ? notifErr.message : String(notifErr);
        logger.error("[pl-release-report] Insured notification failed — release intact", notifErr);
      }
    }

    // ── Log event and return ─────────────────────────────────
    const eventMeta: Record<string, unknown> = {
      run_id,
      released_by: user.email,
      source: intakeCheck.source,
    };
    if (grant) {
      eventMeta.door = "agent";
      eventMeta.grant_id = grant.id;
      eventMeta.recipient_party_id = effectiveRecipient;
      eventMeta.consent_type = "per_report";
    }

    await logEvent(supabase, {
      event_type: "report_released",
      intake_id,
      metadata: eventMeta,
    });

    logger.info("[pl-release-report] Released", {
      run_id,
      intake_id,
      grant_id: grant?.id ?? null,
      path: grant ? "broker" : "insured",
    });

    return json(
      {
        ok: true,
        grant: grant ?? null,
        run: runUpdate,
        raw_token: rawToken,
        ...(notificationError ? { notification_error: notificationError } : {}),
      },
      200,
      headers,
    );
  } catch (err) {
    logger.error("[pl-release-report] Unhandled error", err);
    return json({ error: "Internal server error" }, 500, headers);
  }
});
