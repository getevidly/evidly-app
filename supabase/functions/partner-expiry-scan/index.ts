import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, buildEmailHtml } from "../_shared/email.ts";
import { createOrgNotification } from "../_shared/notify.ts";

/**
 * partner-expiry-scan — daily expiration reminders for inbound vendor
 * documents, in both flows:
 *
 *   partner  partner_documents (Trusted Partners; Arthur is the recipient)
 *   kitchen  compliance_documents, business documents a kitchen requested
 *            and accepted (the kitchen is the recipient)
 *
 * Cron only (11:00 UTC, migration 20261221000000). No external input, no
 * config.toml entry — it keeps the default verify_jwt = true, and the cron's
 * service-role bearer satisfies it.
 *
 * Timing is a setting (vendor_document_reminder_settings.reminder_days,
 * default 30 then 7 days before), plus one notice on expiry. Each stage is
 * sent once per document (last_reminder_stage), and only stamped after the
 * vendor's email was accepted, so a failed send is retried the next day.
 *
 * Reminders go to the SENDER (the vendor). The RECIPIENT is told:
 *   "{Vendor}'s {document} expires {date}. We've asked them for the renewal."
 *   partner flow: Arthur's email copy. kitchen flow: an in-app notification
 *   to the organization's compliance managers and owners.
 *
 * Renewals go through the sender-side check like any new document:
 *   partner flow: the partner's private upload link (a dead token is
 *     replaced first, so the link always works).
 *   kitchen flow: a renewal is requested once: a new requested document
 *     (parent_document_id = the expiring one) with its own secure link.
 *
 * On expiry the document's review_status becomes expired (kitchen documents
 * also status = expired), which is what the recipient's list shows.
 */

const DEFAULT_REMINDER_DAYS = [30, 7];
const TOKEN_TTL_DAYS = 30;
const ADMIN_EMAIL = "arthur@getevidly.com";

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

/** "December 12, 2026" */
function longDate(dateOnly: string): string {
  return new Date(`${dateOnly}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

/** "expires in 12 days" / "expired 3 days ago" / "expires today". */
function phrase(days: number): string {
  if (days > 1) return `expires in ${days} days`;
  if (days === 1) return "expires tomorrow";
  if (days === 0) return "expires today";
  if (days === -1) return "expired yesterday";
  return `expired ${Math.abs(days)} days ago`;
}

/** The recipient notice, word for word. */
function recipientNotice(vendor: string, document: string, dateOnly: string, days: number): string {
  return days < 0
    ? `${vendor}'s ${document} expired ${longDate(dateOnly)}. We've asked them for the renewal.`
    : `${vendor}'s ${document} expires ${longDate(dateOnly)}. We've asked them for the renewal.`;
}

/**
 * The stage a document is in: the smallest configured reminder (days
 * before expiry) it has reached, or 0 once expired. null = not yet due.
 */
function dueStage(days: number, stages: number[]): number | null {
  if (days < 0) return 0;
  let due: number | null = null;
  for (const s of stages) if (days <= s && (due === null || s < due)) due = s;
  return due;
}

const shouldSend = (due: number | null, last: number | null) =>
  due !== null && (last === null || due < last);

interface PartnerDocRow {
  id: string;
  application_id: string;
  doc_type: string;
  expiration_date: string;
  review_status: string | null;
  last_reminder_stage: number | null;
}

interface AppRow {
  id: string;
  business_name: string | null;
  email: string | null;
  upload_token: string | null;
  token_expires_at: string | null;
}

interface KitchenDocRow {
  id: string;
  organization_id: string;
  location_id: string | null;
  vendor_id: string | null;
  category: string;
  type: string;
  name: string;
  expiry_date: string;
  review_status: string | null;
  last_reminder_stage: number | null;
  renewal_requested_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const appUrl = (Deno.env.get("APP_URL") || "https://app.getevidly.com").replace(/\/+$/, "");
  const uploadBase = (Deno.env.get("PARTNER_UPLOAD_BASE") || "https://getevidly.com/partners/upload").replace(/\/+$/, "");

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { "Content-Type": "application/json" },
    });

  try {
    // ── Setting: when reminders go ───────────────────────────
    const { data: setting } = await supabase
      .from("vendor_document_reminder_settings")
      .select("reminder_days")
      .eq("id", 1)
      .maybeSingle();
    const stages = Array.isArray(setting?.reminder_days) && setting.reminder_days.length
      ? (setting.reminder_days as number[]).filter((n) => Number.isFinite(n) && n > 0)
      : DEFAULT_REMINDER_DAYS;
    const windowDays = Math.max(...stages);

    const now = new Date();
    const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const todayIso = new Date(todayMs).toISOString().slice(0, 10);
    const cutoff = new Date(todayMs + windowDays * 86400000).toISOString().slice(0, 10);

    // deno-lint-ignore no-explicit-any
    const results: any[] = [];

    // ── On expiry: the recipient's list shows Expired ────────
    const { data: expiredPartner } = await supabase
      .from("partner_documents")
      .update({ review_status: "expired" })
      .lt("expiration_date", todayIso)
      .in("review_status", ["accepted", "waiting_for_acceptance"])
      .select("id");
    const { data: expiredKitchen } = await supabase
      .from("compliance_documents")
      .update({ review_status: "expired", status: "expired" })
      .lt("expiry_date", todayIso)
      .in("review_status", ["accepted", "waiting_for_acceptance"])
      .select("id");

    // ════════════════════════════════════════════════════════
    // PARTNER FLOW — one digest per vendor, Arthur is the recipient
    // ════════════════════════════════════════════════════════
    const { data: pDocs, error: pErr } = await supabase
      .from("partner_documents")
      .select("id, application_id, doc_type, expiration_date, review_status, last_reminder_stage")
      .not("expiration_date", "is", null)
      .not("file_path", "is", null)
      .lte("expiration_date", cutoff);

    if (pErr) {
      console.error("[partner-expiry-scan] partner scan failed:", pErr.message);
      return json({ ok: false, error: "scan_failed" }, 500);
    }

    const byApp = new Map<string, PartnerDocRow[]>();
    for (const d of (pDocs ?? []) as PartnerDocRow[]) {
      if (!byApp.has(d.application_id)) byApp.set(d.application_id, []);
      byApp.get(d.application_id)!.push(d);
    }

    const { data: apps } = byApp.size
      ? await supabase
        .from("partner_applications")
        .select("id, business_name, email, upload_token, token_expires_at")
        .in("id", [...byApp.keys()])
      : { data: [] };
    const appById = new Map<string, AppRow>(((apps ?? []) as AppRow[]).map((a) => [a.id, a]));

    let applicationsNotified = 0;

    for (const [appId, appDocs] of byApp) {
      const app = appById.get(appId);
      if (!app || !app.email) {
        console.warn(`[partner-expiry-scan] application ${appId} has no email — skipped`);
        continue;
      }

      const due = appDocs.map((d) => ({
        doc: d,
        days: daysUntil(d.expiration_date, todayMs),
        stage: dueStage(daysUntil(d.expiration_date, todayMs), stages),
      }));
      if (!due.some((x) => shouldSend(x.stage, x.doc.last_reminder_stage))) continue;

      // Once it fires, it lists everything currently lapsing.
      const listed = [...due].sort((a, b) => a.doc.expiration_date.localeCompare(b.doc.expiration_date));

      // ── Keep the link usable ────────────────────────────────
      let token = app.upload_token;
      const tokenDead = !token || !app.token_expires_at ||
        new Date(app.token_expires_at).getTime() <= now.getTime();
      if (tokenDead) {
        const fresh = crypto.randomUUID();
        const { error: tokErr } = await supabase
          .from("partner_applications")
          .update({
            upload_token: fresh,
            token_expires_at: new Date(now.getTime() + TOKEN_TTL_DAYS * 86400000).toISOString(),
          })
          .eq("id", appId);
        if (tokErr) {
          console.error(`[partner-expiry-scan] token refresh failed for ${appId} — skipped:`, tokErr.message);
          continue;
        }
        token = fresh;
      }

      const uploadUrl = `${uploadBase}?token=${token}`;
      const businessName = app.business_name || "your business";
      const anyExpired = listed.some((x) => x.days < 0);

      const rows = listed.map((x) => {
        const color = x.days < 0 ? "#b91c1c" : x.days <= 7 ? "#b45309" : "#334155";
        return `<tr>
          <td style="padding: 6px 16px 6px 0; color: #334155;">${esc(label(x.doc.doc_type))}</td>
          <td style="padding: 6px 16px 6px 0; color: #64748b;">${esc(longDate(x.doc.expiration_date))}</td>
          <td style="padding: 6px 0; color: ${color}; font-weight: 600;">${esc(phrase(x.days))}</td>
        </tr>`;
      }).join("");
      const table = `<table style="border-collapse: collapse; font-size: 14px; margin: 16px 0;">${rows}</table>`;

      // ── The vendor's reminder ───────────────────────────────
      const vendorSent = await sendEmail({
        to: app.email,
        subject: anyExpired
          ? `Action Needed: Expired Documents for ${businessName}`
          : `Documents Expiring Soon for ${businessName}`,
        html: buildEmailHtml({
          recipientName: businessName,
          skipGreeting: true,
          urgencyBanner: anyExpired ? { text: "One or more documents have expired", color: "#b91c1c" } : undefined,
          bodyHtml: `
            <p>Hi ${esc(businessName)},</p>
            <p>${anyExpired
              ? "Some of the paperwork we hold for you is out of date."
              : "Some of the paperwork we hold for you is coming up for renewal."}</p>
            ${table}
            <p>Use your private link to upload the renewal. Type its expiration date and
            number, press Check My Document, and send it once every detail matches.</p>`,
          ctaText: "Upload the Renewal",
          ctaUrl: uploadUrl,
          footerNote: "You are receiving this because you are an EvidLY Trusted Partner.",
        }),
      });

      // ── The recipient's notice (Arthur) ─────────────────────
      let recipientSent = false;
      if (vendorSent) {
        const notices = listed.map((x) =>
          `<li>${esc(recipientNotice(businessName, label(x.doc.doc_type), x.doc.expiration_date, x.days))}</li>`
        ).join("");
        recipientSent = Boolean(await sendEmail({
          to: ADMIN_EMAIL,
          subject: anyExpired ? `Partner Documents Expired: ${businessName}` : `Partner Documents Expiring: ${businessName}`,
          html: buildEmailHtml({
            recipientName: "Arthur",
            bodyHtml: `<ul style="padding-left: 18px;">${notices}</ul>${table}`,
          }),
        }));

        // Stamp only now that the vendor has it.
        for (const x of listed) {
          const next = shouldSend(x.stage, x.doc.last_reminder_stage) ? x.stage : x.doc.last_reminder_stage;
          const { error: stampErr } = await supabase
            .from("partner_documents")
            .update({ last_reminder_stage: next, last_expiry_notified_at: now.toISOString() })
            .eq("id", x.doc.id);
          if (stampErr) console.error(`[partner-expiry-scan] STAMP FAILED for ${x.doc.id}:`, stampErr.message);
        }
        applicationsNotified++;
      } else {
        console.error(`[partner-expiry-scan] vendor email failed for ${appId} — not stamped, will retry`);
      }

      for (const x of listed) {
        results.push({
          flow: "partner",
          document_id: x.doc.id,
          document: label(x.doc.doc_type),
          expires: x.doc.expiration_date,
          stage: x.stage,
          vendor_reminder: vendorSent ? "sent" : "attempted_not_delivered",
          recipient_notice: recipientNotice(businessName, label(x.doc.doc_type), x.doc.expiration_date, x.days),
          recipient_notified: recipientSent ? "emailed" : "not_delivered",
        });
      }
    }

    // ════════════════════════════════════════════════════════
    // KITCHEN FLOW — the kitchen is the recipient
    // ════════════════════════════════════════════════════════
    const { data: kDocs, error: kErr } = await supabase
      .from("compliance_documents")
      .select("id, organization_id, location_id, vendor_id, category, type, name, expiry_date, review_status, last_reminder_stage, renewal_requested_at")
      .eq("category", "business")
      .in("review_status", ["accepted", "expired"])
      .not("expiry_date", "is", null)
      .lte("expiry_date", cutoff);

    if (kErr) {
      console.error("[partner-expiry-scan] kitchen scan failed:", kErr.message);
      return json({ ok: false, error: "scan_failed" }, 500);
    }

    let kitchenNotified = 0;

    for (const doc of (kDocs ?? []) as KitchenDocRow[]) {
      const days = daysUntil(doc.expiry_date, todayMs);
      const stage = dueStage(days, stages);
      if (!shouldSend(stage, doc.last_reminder_stage)) continue;

      // Who the document came from: the request it answered.
      const { data: lastReq } = await supabase
        .from("compliance_document_requests")
        .select("recipient_email, recipient_name, requested_by")
        .eq("document_id", doc.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let vendorName = lastReq?.recipient_name || "Your vendor";
      let vendorEmail: string | null = lastReq?.recipient_email ?? null;
      if (doc.vendor_id) {
        const { data: v } = await supabase
          .from("vendors").select("company_name, email").eq("id", doc.vendor_id).maybeSingle();
        if (v?.company_name) vendorName = v.company_name;
        if (!vendorEmail && v?.email) vendorEmail = v.email;
      }
      const { data: org } = await supabase
        .from("organizations").select("name").eq("id", doc.organization_id).maybeSingle();
      const orgName = org?.name || "your client";

      // ── The renewal request, once: a new requested document ──
      const { data: openRenewal } = await supabase
        .from("compliance_documents")
        .select("id")
        .eq("parent_document_id", doc.id)
        .in("status", ["requested", "pending_review"])
        .limit(1)
        .maybeSingle();

      let renewalToken: string | null = null;
      let renewalDocId: string | null = openRenewal?.id ?? null;
      if (renewalDocId) {
        const { data: openReq } = await supabase
          .from("compliance_document_requests")
          .select("secure_token, secure_token_expires_at")
          .eq("document_id", renewalDocId)
          .is("fulfilled_at", null)
          .is("cancelled_at", null)
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (openReq && new Date(openReq.secure_token_expires_at).getTime() > now.getTime()) {
          renewalToken = openReq.secure_token;
        }
      }

      if (!renewalToken && vendorEmail) {
        if (!renewalDocId) {
          const { data: created, error: cErr } = await supabase
            .from("compliance_documents")
            .insert({
              organization_id: doc.organization_id,
              location_id: doc.location_id,
              vendor_id: doc.vendor_id,
              category: "business",
              type: doc.type,
              name: `${doc.type} — Renewal requested from ${vendorName}`,
              status: "requested",
              parent_document_id: doc.id,
              import_source: "vendor_secure_link",
              requested_at: now.toISOString(),
            })
            .select("id")
            .single();
          if (cErr || !created) {
            console.error(`[partner-expiry-scan] renewal document failed for ${doc.id}:`, cErr?.message);
            continue;
          }
          renewalDocId = created.id;
        }
        renewalToken = crypto.randomUUID();
        const { error: rErr } = await supabase.from("compliance_document_requests").insert({
          organization_id: doc.organization_id,
          document_id: renewalDocId,
          vendor_id: doc.vendor_id,
          requested_by: lastReq?.requested_by ?? null,
          secure_token: renewalToken,
          secure_token_expires_at: new Date(now.getTime() + TOKEN_TTL_DAYS * 86400000).toISOString(),
          recipient_email: vendorEmail,
          recipient_name: vendorName,
          note_to_recipient: `Renewal of the ${doc.type} that ${days < 0 ? "expired" : "expires"} ${longDate(doc.expiry_date)}.`,
        });
        if (rErr) {
          console.error(`[partner-expiry-scan] renewal request failed for ${doc.id}:`, rErr.message);
          continue;
        }
        await supabase.from("compliance_documents")
          .update({ renewal_requested_at: now.toISOString() }).eq("id", doc.id);
      }

      if (!vendorEmail || !renewalToken) {
        console.warn(`[partner-expiry-scan] kitchen document ${doc.id} has no vendor email — skipped`);
        continue;
      }

      // ── The vendor's reminder ───────────────────────────────
      const fixUrl = `${appUrl}/vendor/upload/${renewalToken}`;
      const vendorSent = await sendEmail({
        to: vendorEmail,
        subject: days < 0
          ? `Your ${doc.type} for ${orgName} Has Expired`
          : `Your ${doc.type} for ${orgName} Expires ${longDate(doc.expiry_date)}`,
        html: buildEmailHtml({
          recipientName: vendorName,
          bodyHtml: `
            <p>The ${esc(doc.type)} ${esc(orgName)} has on file for ${esc(vendorName)}
            ${days < 0 ? "expired" : "expires"} on <strong>${esc(longDate(doc.expiry_date))}</strong>
            (${esc(phrase(days))}).</p>
            <p>Upload the renewal at the link below. Type its expiration date and number,
            press Check My Document, and send it once every detail matches.</p>`,
          ctaText: `Upload the Current ${doc.type}`,
          ctaUrl: fixUrl,
        }),
      });

      // ── The recipient's notice (the kitchen) ────────────────
      const notice = recipientNotice(vendorName, doc.type, doc.expiry_date, days);
      let recipientNotified = 0;
      try {
        const r = await createOrgNotification({
          supabase,
          organizationId: doc.organization_id,
          roleFilter: ["compliance_manager", "owner_operator"],
          type: "vendor_document_expiring",
          category: "documents",
          title: notice,
          body: notice,
          actionUrl: `/documents?doc=${doc.id}`,
          actionLabel: "View Document",
          priority: days < 0 ? "high" : "medium",
          severity: days < 0 ? "urgent" : "advisory",
          sourceType: `vendor_document_expiry_${stage}`,
          sourceId: doc.id,
          deduplicate: true,
        });
        recipientNotified = r.count;
      } catch (e) {
        console.error(`[partner-expiry-scan] recipient notice failed for ${doc.id}:`, e);
      }

      if (vendorSent) {
        await supabase.from("compliance_documents").update({ last_reminder_stage: stage }).eq("id", doc.id);
        kitchenNotified++;
      }

      results.push({
        flow: "kitchen",
        document_id: doc.id,
        document: doc.type,
        expires: doc.expiry_date,
        stage,
        vendor_reminder: vendorSent ? "sent" : "attempted_not_delivered",
        renewal_document_id: renewalDocId,
        recipient_notice: notice,
        recipient_notified: `in_app:${recipientNotified}`,
      });
    }

    const summary = {
      ok: true,
      reminder_days: stages,
      partner_docs_scanned: pDocs?.length ?? 0,
      kitchen_docs_scanned: kDocs?.length ?? 0,
      marked_expired: (expiredPartner?.length ?? 0) + (expiredKitchen?.length ?? 0),
      applications_notified: applicationsNotified,
      kitchen_documents_notified: kitchenNotified,
      results,
    };
    console.info("[partner-expiry-scan]", JSON.stringify({ ...summary, results: results.length }));
    return json(summary);
  } catch (err) {
    console.error("[partner-expiry-scan] unhandled:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "scan_failed" }, 500);
  }
});
