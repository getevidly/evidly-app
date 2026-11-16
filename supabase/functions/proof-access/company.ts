// ═══════════════════════════════════════════════════════════
// proof-access / company — the company's own Estimate Proof area
// (/company-proof/:token, mock screens 5 and 6 on the EvidLY side).
//
// Credential: a company_area_links token (7 days), minted for HoodOps by
// hoodops-estimate-proof (company_area.link), emailed by the daily
// reminders and request notices, or emailed on request to the address on
// the records set (company.email_link). The token resolves one company_id;
// every query below is filtered by it.
// ═══════════════════════════════════════════════════════════

import { buildEmailHtml, sendEmail } from "../_shared/email.ts";
import { checkFile } from "../_shared/estimateProof.ts";
import {
  archiveItem,
  BUCKET,
  companyProfile,
  type Db,
  esc,
  fromAs,
  insuranceUrl,
  listCertifications,
  listPolicies,
  loadOptions,
  loadSettings,
  mintCompanyAreaLink,
  REQUEST_COLS,
  type RequestRow,
  saveCertification,
  savePolicy,
  saveSettings,
  shapeCertification,
  shapePolicy,
  shapedRequests,
  shapeRequest,
  signPath,
  storeFile,
  whoLabel,
} from "../_shared/companyProof.ts";

type Json = Record<string, unknown>;
export type CompanyHandler = (ctx: { db: Db; body: Json; companyId: string; todayMs: number }) => Promise<[Json, number]>;

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ── Load ─────────────────────────────────────────────────────

const load: CompanyHandler = async ({ db, companyId, todayMs }) => {
  const [company, certs, policies, options, settings, requests, views] = await Promise.all([
    companyProfile(db, companyId),
    listCertifications(db, companyId),
    listPolicies(db, companyId),
    loadOptions(db, companyId),
    loadSettings(db, companyId),
    shapedRequests(db, companyId, todayMs, "all"),
    db.from("estimate_proof_views")
      .select("page, viewed_at, ip, user_agent, estimate_proof_links(location_name, estimate_ref)")
      .eq("company_id", companyId)
      .order("viewed_at", { ascending: false })
      .limit(100),
  ]);
  return [{
    status: "ok",
    company_name: company.name,
    company_email: company.email,
    broker_email: settings.broker_email,
    reminder_days: settings.reminder_days,
    certifications: certs.map((c) => shapeCertification(c, todayMs)),
    policies: policies.map((p) => shapePolicy(p, options, todayMs)),
    coverage_options: options.filter((o) => o.kind === "coverage").map(({ code, label, fields }) => ({ code, label, fields })),
    endorsement_options: options.filter((o) => o.kind === "endorsement").map(({ code, label, fields }) => ({ code, label, fields })),
    requests,
    views: (views.data ?? []).map((v: Json) => {
      const l = v.estimate_proof_links as { location_name?: string; estimate_ref?: string } | null;
      return {
        page: v.page,
        viewed_at: v.viewed_at,
        location_name: l?.location_name ?? null,
        estimate_id: l?.estimate_ref ?? null,
        ip: v.ip,
        user_agent: v.user_agent,
      };
    }),
  }, 200];
};

// ── Files (the company sees its own, expired included) ──────

const file: CompanyHandler = async ({ db, body, companyId }) => {
  const kind = str(body.kind, 30);
  const id = str(body.id, 60);
  let path: string | null = null;
  if (kind === "certification" || kind === "policy") {
    const { data } = await db
      .from(kind === "certification" ? "company_certifications" : "company_insurance_policies")
      .select("file_path").eq("id", id).eq("company_id", companyId).maybeSingle();
    path = data?.file_path ?? null;
  } else if (kind === "requirements" || kind === "updated_certificate") {
    const { data } = await db
      .from("insurance_requests")
      .select("upload_path, answer_file_path").eq("id", id).eq("company_id", companyId).maybeSingle();
    path = (kind === "requirements" ? data?.upload_path : data?.answer_file_path) ?? null;
  }
  const url = await signPath(db, path);
  return url ? [{ url }, 200] : [{ error: "File not found." }, 404];
};

// ── Records ──────────────────────────────────────────────────

const saveCert: CompanyHandler = async ({ db, body, companyId }) => {
  const r = await saveCertification(db, companyId, (body.certification ?? {}) as Json);
  return "error" in r ? [{ error: r.error }, 400] : [{ id: r.id }, 200];
};

const savePol: CompanyHandler = async ({ db, body, companyId }) => {
  const r = await savePolicy(db, companyId, (body.policy ?? {}) as Json, await loadOptions(db, companyId));
  return "error" in r ? [{ error: r.error }, 400] : [{ id: r.id }, 200];
};

const archive: CompanyHandler = async ({ db, body, companyId }) => {
  const table = str(body.kind, 30) === "policy" ? "company_insurance_policies" : "company_certifications";
  const ok = await archiveItem(db, companyId, table, str(body.id, 60));
  return ok ? [{ archived: true }, 200] : [{ error: "Not found." }, 404];
};

const settings: CompanyHandler = async ({ db, body, companyId }) => {
  const r = await saveSettings(db, companyId, (body.settings ?? {}) as Json);
  return r.error ? [{ error: r.error }, 400] : [{ saved: true }, 200];
};

// ── Answering a request ──────────────────────────────────────

async function oneRequest(db: Db, companyId: string, id: string) {
  const { data } = await db
    .from("insurance_requests")
    .select(REQUEST_COLS)
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("kind", "requirements")
    .maybeSingle();
  if (!data) return null;
  const { data: link } = await db
    .from("estimate_proof_links")
    .select("id, location_name, estimate_ref, location_ref, token, client_email, client_name")
    .eq("id", data.link_id)
    .eq("company_id", companyId)
    .maybeSingle();
  return link ? { request: data as RequestRow, link } : null;
}

/** Email the Request to My Broker: to the broker email on file. */
const emailBroker: CompanyHandler = async ({ db, body, companyId, todayMs }) => {
  const found = await oneRequest(db, companyId, str(body.request_id, 60));
  if (!found) return [{ error: "Request not found." }, 404];
  const settingsRow = await loadSettings(db, companyId);
  if (!settingsRow.broker_email) {
    return [{ error: "Add your broker's email under Certifications and Insurance first." }, 400];
  }
  const company = await companyProfile(db, companyId);
  const [policies, options] = await Promise.all([listPolicies(db, companyId), loadOptions(db, companyId)]);
  const shaped = shapeRequest(found.request, found.link, policies, options, todayMs);

  const list = shaped.lines
    .map((l) => `<li style="margin:0 0 6px">${esc(l.text)}${l.meets ? " (already on our current certificate)" : ""}</li>`)
    .join("");
  const attachments: { filename: string; content: string }[] = [];
  if (found.request.upload_path) {
    const { data: blob } = await db.storage.from(BUCKET).download(found.request.upload_path);
    if (blob && blob.size <= 8 * 1024 * 1024) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const ext = found.request.upload_path.split(".").pop();
      attachments.push({ filename: `client-requirements.${ext}`, content: btoa(bin) });
    }
  }

  const html = buildEmailHtml({
    recipientName: "there",
    bodyHtml: `<p>${esc(company.name)} needs an updated certificate of insurance for a client.</p>
<p><b>Certificate holder:</b><br>${esc(found.request.holder_name ?? "")}<br>${esc(found.request.holder_address ?? "").replace(/\n/g, "<br>")}</p>
<p><b>Who is asking:</b> ${esc(whoLabel(found.request) ?? "")}<br><b>Location:</b> ${esc(found.link.location_name)}</p>
<p><b>What they require:</b></p><ul style="padding-left:20px">${list}</ul>
${attachments.length ? "<p>The client's requirements are attached.</p>" : ""}
<p>Please send the updated certificate to ${esc(company.email ?? company.name)}.</p>`,
    footerNote: `Sent for ${company.name} from EvidLY.`,
  });
  const sent = await sendEmail({
    to: settingsRow.broker_email,
    from: fromAs(company.name),
    replyTo: company.email ?? undefined,
    subject: `Certificate of Insurance Request · ${company.name} · ${found.link.location_name}`.slice(0, 180),
    html,
    attachments,
  });
  if (!sent) return [{ error: "The email to your broker could not be sent. Please try again." }, 502];
  await db.from("insurance_requests")
    .update({ broker_emailed_at: new Date().toISOString() })
    .eq("id", found.request.id).eq("company_id", companyId);
  return [{ sent: true, to: settingsRow.broker_email }, 200];
};

/** Upload Updated Certificate: shows on the client's page, and emails the client. */
const answer: CompanyHandler = async ({ db, body, companyId }) => {
  const found = await oneRequest(db, companyId, str(body.request_id, 60));
  if (!found) return [{ error: "Request not found." }, 404];
  const checked = checkFile(body.file);
  if (!checked.ok) return [{ error: checked.error }, 400];

  const stored = await storeFile(
    db,
    `${companyId}/requests/${found.request.id}/updated-certificate-${Date.now()}`,
    body.file,
  );
  if ("error" in stored) return [{ error: stored.error }, 400];
  const now = new Date().toISOString();
  const { error } = await db.from("insurance_requests")
    .update({ answer_file_path: stored.path, answer_file_type: stored.contentType, status: "answered", answered_at: now })
    .eq("id", found.request.id).eq("company_id", companyId);
  if (error) throw new Error(`answer: ${error.message}`);

  let clientNotified = false;
  if (found.link.client_email) {
    const company = await companyProfile(db, companyId);
    const html = buildEmailHtml({
      recipientName: found.link.client_name || "there",
      bodyHtml: `<p>Your updated certificate of insurance from ${esc(company.name)} for ${esc(found.link.location_name)} is ready${found.request.holder_name ? `, with ${esc(found.request.holder_name)} as certificate holder` : ""}.</p><p>It is on your insurance page in EvidLY. No account or password needed.</p>`,
      ctaText: "View Your Updated Certificate",
      ctaUrl: insuranceUrl(found.link.token),
    });
    const sent = await sendEmail({
      to: found.link.client_email,
      from: fromAs(company.name),
      replyTo: company.email ?? undefined,
      subject: `Your Updated Certificate of Insurance Is Ready · ${found.link.location_name}`.slice(0, 180),
      html,
    });
    if (sent) {
      clientNotified = true;
      await db.from("insurance_requests")
        .update({ client_notified_at: new Date().toISOString() })
        .eq("id", found.request.id).eq("company_id", companyId);
    }
  }
  return [{ answered: true, client_notified: clientNotified, client_email_on_file: !!found.link.client_email }, 200];
};

export const COMPANY_HANDLERS: Record<string, CompanyHandler> = {
  "company.load": load,
  "company.file": file,
  "company.save_certification": saveCert,
  "company.save_policy": savePol,
  "company.archive": archive,
  "company.save_settings": settings,
  "company.email_broker": emailBroker,
  "company.answer": answer,
};

/**
 * company.email_link — "Email Me a Link". Sends a fresh 7-day link to the
 * address on a HoodOps company's records set. The answer is the same whether
 * or not the address is on file.
 */
export async function emailCompanyLink(db: Db, email: string): Promise<void> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const { data } = await db
    .from("partner_applications")
    .select("id, business_name, email")
    .ilike("email", email)
    .not("hoodops_tenant_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (!data?.email) return;
  const area = await mintCompanyAreaLink(db, data.id);
  await sendEmail({
    to: data.email,
    subject: "Your Certifications and Insurance in EvidLY",
    html: buildEmailHtml({
      recipientName: data.business_name || "there",
      bodyHtml: "<p>Here is your link to your certifications, insurance and insurance requests in EvidLY.</p>",
      ctaText: "Open My Certifications and Insurance",
      ctaUrl: area.url,
      footerNote: "This link works for 7 days. If you did not ask for it, you can ignore this email.",
    }),
  });
}
