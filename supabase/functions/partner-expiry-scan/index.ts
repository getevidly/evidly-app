import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";

/**
 * partner-expiry-scan — daily digest of partner documents that are expiring
 * or already expired.
 *
 * Cron only (11:00 UTC, migration 20261221000000). No external input, no
 * config.toml entry — it keeps the default verify_jwt = true, and the cron's
 * service-role bearer satisfies it. Same posture as pl-retention-purge and
 * intelligence-digest.
 *
 * One email per vendor per run, never one per document. A vendor with four
 * lapsing documents gets one list, not four notes.
 *
 * Two writes:
 *   1. A dead upload_token is replaced before the email is composed, so the
 *      link in the email always works.
 *   2. last_expiry_notified_at is stamped on every document named in a digest
 *      the vendor actually received — the send-dedup, without which this
 *      would mail the same vendor the same list every morning for a month.
 */

const WINDOW_DAYS = 30;
const RENOTIFY_AFTER_DAYS = 7;
const TOKEN_TTL_DAYS = 30;
const ADMIN_EMAIL = "arthur@getevidly.com";
const UPLOAD_BASE = "https://getevidly.com/partners/upload";

const DOC_LABELS: Record<string, string> = {
  business_license: "Business License",
  professional_license: "Professional License",
  w9: "W-9",
  liability_insurance: "Liability Insurance",
  workers_comp: "Workers' Comp",
  auto_insurance: "Auto Insurance",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const label = (t: string) => DOC_LABELS[t] ?? t.replace(/_/g, " ");

/** Whole days from today (UTC) to a YYYY-MM-DD. Negative = already past. */
function daysUntil(dateOnly: string, todayMs: number): number {
  const then = new Date(`${dateOnly}T00:00:00Z`).getTime();
  return Math.round((then - todayMs) / 86400000);
}

/** "expires in 12 days" / "expired 3 days ago" / "expires today". */
function phrase(days: number): string {
  if (days > 1) return `expires in ${days} days`;
  if (days === 1) return "expires tomorrow";
  if (days === 0) return "expires today";
  if (days === -1) return "expired yesterday";
  return `expired ${Math.abs(days)} days ago`;
}

interface DocRow {
  id: string;
  doc_type: string;
  expiration_date: string;
  last_expiry_notified_at: string | null;
}

interface AppRow {
  id: string;
  business_name: string | null;
  email: string | null;
  upload_token: string | null;
  token_expires_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const now = new Date();
    const todayMs = Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    );
    const cutoff = new Date(todayMs + WINDOW_DAYS * 86400000)
      .toISOString().slice(0, 10);

    // Every document at or inside the 30-day edge, past due included.
    const { data: docs, error: docsErr } = await supabase
      .from("partner_documents")
      .select("id, application_id, doc_type, expiration_date, last_expiry_notified_at")
      .not("expiration_date", "is", null)
      .lte("expiration_date", cutoff);

    if (docsErr) {
      console.error("[partner-expiry-scan] document scan failed:", docsErr.message);
      return json({ ok: false, error: "scan_failed" }, 500);
    }

    const scanned = docs?.length ?? 0;
    if (scanned === 0) {
      return json({ ok: true, scanned: 0, applications_notified: 0, docs_flagged: 0 });
    }

    // Group by application — one digest per vendor.
    const byApp = new Map<string, DocRow[]>();
    for (const d of docs ?? []) {
      const appId = d.application_id as string;
      if (!byApp.has(appId)) byApp.set(appId, []);
      byApp.get(appId)!.push(d as unknown as DocRow);
    }

    const { data: apps, error: appsErr } = await supabase
      .from("partner_applications")
      .select("id, business_name, email, upload_token, token_expires_at")
      .in("id", [...byApp.keys()]);

    if (appsErr) {
      console.error("[partner-expiry-scan] application lookup failed:", appsErr.message);
      return json({ ok: false, error: "scan_failed" }, 500);
    }

    const appById = new Map<string, AppRow>(
      ((apps ?? []) as AppRow[]).map((a) => [a.id, a]),
    );

    const renotifyBefore = now.getTime() - RENOTIFY_AFTER_DAYS * 86400000;

    let applicationsNotified = 0;
    let docsFlagged = 0;

    for (const [appId, appDocs] of byApp) {
      const app = appById.get(appId);
      if (!app || !app.email) {
        console.warn(`[partner-expiry-scan] application ${appId} has no email — skipped`);
        continue;
      }

      // The digest fires only if something in it is actually due to be said.
      // A document stamped inside the last 7 days is not, on its own, a reason
      // to mail anyone.
      const dueForNotice = appDocs.filter((d) =>
        !d.last_expiry_notified_at ||
        new Date(d.last_expiry_notified_at).getTime() < renotifyBefore
      );
      if (dueForNotice.length === 0) continue;

      // But once it fires, it lists everything currently lapsing. Naming only
      // the newly-due ones would send a vendor "your liability insurance
      // expires in 3 days" while silently omitting the W-9 that expired last
      // week, purely because that one was mentioned six days ago.
      const listed = [...appDocs].sort((a, b) =>
        a.expiration_date.localeCompare(b.expiration_date)
      );
      docsFlagged += listed.length;

      // ── Keep the link usable ────────────────────────────────
      let token = app.upload_token;
      const tokenDead = !token ||
        !app.token_expires_at ||
        new Date(app.token_expires_at).getTime() <= now.getTime();

      if (tokenDead) {
        const fresh = crypto.randomUUID();
        const { error: tokErr } = await supabase
          .from("partner_applications")
          .update({
            upload_token: fresh,
            token_expires_at: new Date(
              now.getTime() + TOKEN_TTL_DAYS * 86400000,
            ).toISOString(),
          })
          .eq("id", appId);

        if (tokErr) {
          // Mailing a link that cannot be opened is worse than not mailing.
          console.error(
            `[partner-expiry-scan] token refresh failed for ${appId} — skipped:`,
            tokErr.message,
          );
          docsFlagged -= listed.length;
          continue;
        }
        token = fresh;
        console.info(`[partner-expiry-scan] refreshed dead upload token for ${appId}`);
      }

      const uploadUrl = `${UPLOAD_BASE}?token=${token}`;
      const businessName = app.business_name || "your business";
      const anyExpired = listed.some((d) => daysUntil(d.expiration_date, todayMs) < 0);

      const rows = listed.map((d) => {
        const days = daysUntil(d.expiration_date, todayMs);
        const color = days < 0 ? "#b91c1c" : days <= 7 ? "#b45309" : "#334155";
        return `<tr>
          <td style="padding: 6px 16px 6px 0; color: #334155;">${esc(label(d.doc_type))}</td>
          <td style="padding: 6px 16px 6px 0; color: #64748b;">${esc(d.expiration_date)}</td>
          <td style="padding: 6px 0; color: ${color}; font-weight: 600;">${esc(phrase(days))}</td>
        </tr>`;
      }).join("");

      const table =
        `<table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">${rows}</table>`;

      // ── The vendor's copy ───────────────────────────────────
      const vendorSent = await sendEmail({
        to: app.email,
        subject: anyExpired
          ? `Action needed — expired documents on file for ${businessName}`
          : `Documents expiring soon for ${businessName}`,
        html: buildEmailHtml({
          recipientName: businessName,
          skipGreeting: true,
          urgencyBanner: anyExpired
            ? { text: "One or more documents have expired", color: "#b91c1c" }
            : undefined,
          bodyHtml: `
            <p>Hi ${esc(businessName)},</p>
            <p>${anyExpired
              ? "Some of the paperwork we hold for you is out of date."
              : "Some of the paperwork we hold for you is coming up for renewal."}</p>
            ${table}
            <p>Use your private link below to upload the replacements. There is
            no login, and replacing a document swaps it in place &mdash; you do
            not need to re-send anything else.</p>`,
          ctaText: "Replace your documents",
          ctaUrl: uploadUrl,
          footerNote: "You are receiving this because you are an EvidLY Trusted Partner.",
        }),
      });

      if (!vendorSent) {
        // Nothing is stamped, so tomorrow's run picks this vendor up again.
        console.error(
          `[partner-expiry-scan] vendor email failed for ${appId} — not stamped, will retry`,
        );
        docsFlagged -= listed.length;
        continue;
      }

      // ── Arthur's copy — never gates the stamp ───────────────
      const adminSent = await sendEmail({
        to: ADMIN_EMAIL,
        subject: anyExpired
          ? `Partner docs expired — ${businessName}`
          : `Partner docs expiring — ${businessName}`,
        html: buildEmailHtml({
          recipientName: "Arthur",
          bodyHtml: `
            <p><strong>${esc(businessName)}</strong> (${esc(app.email)}) has
            ${listed.length} document${listed.length === 1 ? "" : "s"} lapsing.</p>
            ${table}
            <p style="font-size: 13px; color: #64748b;">They have been emailed the
            same list with their upload link.</p>`,
        }),
      });
      if (!adminSent) {
        console.error(`[partner-expiry-scan] admin copy failed for ${appId}`);
      }

      // ── Stamp, only now that the vendor has it ──────────────
      const { error: stampErr } = await supabase
        .from("partner_documents")
        .update({ last_expiry_notified_at: now.toISOString() })
        .in("id", listed.map((d) => d.id));

      if (stampErr) {
        // Loud: the vendor has the email, so an unstamped row means they get
        // the same list again tomorrow.
        console.error(
          `[partner-expiry-scan] STAMP FAILED for ${appId} after a successful send:`,
          stampErr.message,
        );
      }

      applicationsNotified++;
    }

    const summary = {
      ok: true,
      scanned,
      applications_notified: applicationsNotified,
      docs_flagged: docsFlagged,
    };
    console.info("[partner-expiry-scan]", JSON.stringify(summary));
    return json(summary);
  } catch (err) {
    console.error("[partner-expiry-scan] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "scan_failed" }, 500);
  }
});
