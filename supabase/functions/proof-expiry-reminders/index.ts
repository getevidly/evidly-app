// ═══════════════════════════════════════════════════════════
// proof-expiry-reminders — Estimate Proof via EvidLY.
//
// Daily (cron 11:30 UTC, migration 20270104000000). For every company,
// every certification and insurance policy that has reached one of the
// company's reminder days (setting, default 60 and 30) gets one reminder,
// once per stage per expiration date, in ONE email per company to the
// address on its records set. The email carries a fresh link to the
// company's Estimate Proof area to upload the renewal.
//
// reminder_stage_sent is stamped only after the email is confirmed sent
// (partner-expiry-scan's rule), so a failed send is retried tomorrow.
// Saving a new expiration date clears the stamp.
//
// Cron only. Default verify_jwt = true; the cron's service-role bearer
// satisfies it, and the function also checks it is the service role.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildEmailHtml, sendEmail } from "../_shared/email.ts";
import { daysUntil, dueReminderStage, monthYear, todayUtcMs } from "../_shared/estimateProof.ts";
import { esc, loadOptions, mintCompanyAreaLink } from "../_shared/companyProof.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function isServiceRole(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

interface Due {
  table: "company_certifications" | "company_insurance_policies";
  id: string;
  stage: number;
  text: string;
  days: number;
}

function when(days: number): string {
  if (days === 0) return "expires today";
  if (days === 1) return "expires tomorrow";
  return `expires in ${days} days`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isServiceRole(req)) return json({ error: "Unauthorized" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const todayMs = todayUtcMs();
  const horizon = new Date(todayMs + 180 * 86400000).toISOString().slice(0, 10);
  const today = new Date(todayMs).toISOString().slice(0, 10);

  try {
    const [{ data: certs, error: cErr }, { data: pols, error: pErr }, { data: settings, error: sErr }] =
      await Promise.all([
        db.from("company_certifications")
          .select("id, company_id, name, cert_number, holder, expiration_date, reminder_stage_sent")
          .is("archived_at", null).gte("expiration_date", today).lte("expiration_date", horizon),
        db.from("company_insurance_policies")
          .select("id, company_id, coverage_code, carrier, policy_number, expiration_date, reminder_stage_sent")
          .is("archived_at", null).gte("expiration_date", today).lte("expiration_date", horizon),
        db.from("company_proof_settings").select("company_id, reminder_days"),
      ]);
    if (cErr || pErr || sErr) {
      console.error("[proof-expiry-reminders] scan failed", cErr?.message, pErr?.message, sErr?.message);
      return json({ ok: false, error: "scan_failed" }, 500);
    }

    const daysFor = new Map<string, number[]>(
      (settings ?? []).map((s: { company_id: string; reminder_days: number[] }) => [s.company_id, s.reminder_days]),
    );
    const byCompany = new Map<string, Due[]>();
    const push = (companyId: string, d: Due) => {
      if (!byCompany.has(companyId)) byCompany.set(companyId, []);
      byCompany.get(companyId)!.push(d);
    };

    for (const c of certs ?? []) {
      const stage = dueReminderStage(c.expiration_date, daysFor.get(c.company_id) ?? [60, 30], c.reminder_stage_sent, todayMs);
      if (stage === null) continue;
      const bits = [c.name, c.cert_number ? `#${c.cert_number}` : null, c.holder].filter(Boolean).join(" · ");
      push(c.company_id, {
        table: "company_certifications", id: c.id, stage,
        days: daysUntil(c.expiration_date, todayMs),
        text: `${bits} — ${monthYear(c.expiration_date)}`,
      });
    }

    const optionsCache = new Map<string, Awaited<ReturnType<typeof loadOptions>>>();
    for (const p of pols ?? []) {
      const stage = dueReminderStage(p.expiration_date, daysFor.get(p.company_id) ?? [60, 30], p.reminder_stage_sent, todayMs);
      if (stage === null) continue;
      if (!optionsCache.has(p.company_id)) optionsCache.set(p.company_id, await loadOptions(db, p.company_id));
      const label = optionsCache.get(p.company_id)!.find((o) => o.kind === "coverage" && o.code === p.coverage_code)?.label ?? p.coverage_code;
      const bits = [label, p.carrier, p.policy_number ? `Policy ${p.policy_number}` : null].filter(Boolean).join(" · ");
      push(p.company_id, {
        table: "company_insurance_policies", id: p.id, stage,
        days: daysUntil(p.expiration_date, todayMs),
        text: `${bits} — ${monthYear(p.expiration_date)}`,
      });
    }

    let sent = 0;
    let failed = 0;
    for (const [companyId, items] of byCompany) {
      const { data: company } = await db
        .from("partner_applications").select("business_name, email").eq("id", companyId).maybeSingle();
      if (!company?.email) {
        console.error(`[proof-expiry-reminders] no email on records set ${companyId}`);
        failed++;
        continue;
      }
      items.sort((a, b) => a.days - b.days);
      const area = await mintCompanyAreaLink(db, companyId);
      const list = items.map((i) => `<li style="margin:0 0 6px">${esc(i.text)} (${when(i.days)})</li>`).join("");
      const html = buildEmailHtml({
        recipientName: company.business_name || "there",
        bodyHtml: `<p>These certifications and insurance policies are coming up for renewal. Clients see them on your estimates in EvidLY, and an expired one never shows as Current.</p><ul style="padding-left:20px">${list}</ul><p>Upload the renewed certificate and new expiration date and your estimate links update on their own.</p>`,
        ctaText: "Update Your Certificates",
        ctaUrl: area.url,
        footerNote: `This link to your records works for 7 days. Reminders go out ${[...new Set(items.map((i) => i.stage))].join(" and ")} days before anything expires.`,
      });
      const result = await sendEmail({
        to: company.email,
        subject: items.length === 1 ? "A Certificate Expires Soon" : `${items.length} Certificates Expire Soon`,
        html,
      });
      if (!result) {
        failed++;
        continue;
      }
      sent++;
      for (const i of items) {
        await db.from(i.table).update({ reminder_stage_sent: i.stage }).eq("id", i.id).eq("company_id", companyId);
      }
    }

    return json({ ok: true, companies_emailed: sent, companies_failed: failed });
  } catch (err) {
    console.error("[proof-expiry-reminders] failed:", err instanceof Error ? err.message : String(err));
    return json({ ok: false, error: "internal" }, 500);
  }
});
