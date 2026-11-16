// ═══════════════════════════════════════════════════════════
// proof-access — the public side of Estimate Proof via EvidLY.
//
// No account or password. The 43-character link token is the only
// credential; it resolves exactly one estimate_proof_links row, and that
// row's company_id is the only company anything here touches.
//
//   /proof/<token>             action 'certifications', 'certification_file'
//   /proof/<token>/insurance   action 'insurance', 'policy_file',
//                              'updated_certificate_file',
//                              'submit_requirements', 'current_enough'
//                              — all refused until the estimate is approved
//   /company-proof/<token>     action 'company.*' (./company.ts): the company's
//                              own area, by a 7-day company_area_links token
//   /company-proof             action 'company.email_link'
//
// Every page load and every certificate opened is logged in
// estimate_proof_views (link, page, item, IP, user agent, time).
//
// Files are never public: each View Certificate fetches a five-minute
// signed URL for that one file, and only for an item that is current.
//
// Default verify_jwt = true: the page calls with the project anon key.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildEmailHtml, sendEmail } from "../_shared/email.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { COMPANY_HANDLERS, emailCompanyLink } from "./company.ts";
import { checkFile, normalizeRequirements, todayUtcMs, WHO_IS_ASKING } from "../_shared/estimateProof.ts";
import {
  companyFromAreaToken,
  companyProfile,
  currentItemPath,
  type Db,
  esc,
  type LinkRow,
  linkByToken,
  listCertifications,
  listPolicies,
  loadOptions,
  logView,
  mintCompanyAreaLink,
  REQUEST_COLS,
  type RequestRow,
  shapeCertification,
  shapePolicy,
  shapeRequest,
  signPath,
  storeFile,
  whoLabel,
} from "../_shared/companyProof.ts";

type Json = Record<string, unknown>;
type Handler = (ctx: { db: Db; req: Request; body: Json; link: LinkRow; todayMs: number }) => Promise<[Json, number]>;

const str = (v: unknown, max = 100) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ── /proof/<token> ───────────────────────────────────────────

const certifications: Handler = async ({ db, req, link, todayMs }) => {
  const [company, certs] = await Promise.all([
    companyProfile(db, link.company_id),
    listCertifications(db, link.company_id),
  ]);
  await logView(db, link, "certifications", req);
  return [{
    status: "ok",
    company_name: company.name,
    location_name: link.location_name,
    approved: !!link.approved_at,
    certifications: certs.map((c) => shapeCertification(c, todayMs)),
  }, 200];
};

const certificationFile: Handler = async ({ db, req, body, link, todayMs }) => {
  const id = str(body.item_id, 60);
  const path = id ? await currentItemPath(db, link.company_id, "company_certifications", id, todayMs) : null;
  const url = await signPath(db, path);
  if (!url) return [{ error: "This certificate is not available." }, 404];
  await logView(db, link, "certification_file", req, id);
  return [{ url }, 200];
};

// ── /proof/<token>/insurance ─────────────────────────────────
// Locked until HoodOps reports the estimate Approved (proof_link.approve).

const LOCKED = (companyName: string, link: LinkRow): [Json, number] => [{
  status: "locked",
  company_name: companyName,
  location_name: link.location_name,
}, 200];

const MAX_REQUESTS_PER_LINK_PER_DAY = 10;

async function linkRequests(db: Db, link: LinkRow) {
  const { data, error } = await db
    .from("insurance_requests")
    .select(REQUEST_COLS)
    .eq("link_id", link.id)
    .eq("company_id", link.company_id)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(`requests: ${error.message}`);
  return (data ?? []) as RequestRow[];
}

const insurance: Handler = async ({ db, req, link, todayMs }) => {
  const company = await companyProfile(db, link.company_id);
  if (!link.approved_at) return LOCKED(company.name, link);

  const [policies, options, requests] = await Promise.all([
    listPolicies(db, link.company_id),
    loadOptions(db, link.company_id),
    linkRequests(db, link),
  ]);
  await logView(db, link, "insurance", req);

  return [{
    status: "ok",
    company_name: company.name,
    location_name: link.location_name,
    // Every CURRENT policy. An expired one is not shown to the client.
    policies: policies
      .map((p) => shapePolicy(p, options, todayMs))
      .filter((p) => p.status === "current"),
    coverage_options: options.filter((o) => o.kind === "coverage").map(({ code, label, fields }) => ({ code, label, fields })),
    endorsement_options: options.filter((o) => o.kind === "endorsement").map(({ code, label, fields }) => ({ code, label, fields })),
    who_is_asking_options: Object.entries(WHO_IS_ASKING).map(([code, label]) => ({ code, label })),
    requests: requests.map((r) => ({
      request_id: r.id,
      kind: r.kind,
      status: r.status,
      submitted_at: r.submitted_at,
      certificate_holder: r.holder_name,
      who_is_asking: whoLabel(r),
      has_updated_certificate: !!r.answer_file_path,
      answered_at: r.answered_at,
    })),
  }, 200];
};

const policyFile: Handler = async ({ db, req, body, link, todayMs }) => {
  if (!link.approved_at) return [{ error: "Insurance is shared once the estimate is approved." }, 403];
  const id = str(body.item_id, 60);
  const path = id ? await currentItemPath(db, link.company_id, "company_insurance_policies", id, todayMs) : null;
  const url = await signPath(db, path);
  if (!url) return [{ error: "This certificate is not available." }, 404];
  await logView(db, link, "policy_file", req, id);
  return [{ url }, 200];
};

const updatedCertificateFile: Handler = async ({ db, req, body, link }) => {
  if (!link.approved_at) return [{ error: "Insurance is shared once the estimate is approved." }, 403];
  const id = str(body.request_id, 60);
  const { data } = await db
    .from("insurance_requests")
    .select("answer_file_path")
    .eq("id", id)
    .eq("link_id", link.id)
    .eq("company_id", link.company_id)
    .maybeSingle();
  const url = await signPath(db, data?.answer_file_path ?? null);
  if (!url) return [{ error: "This certificate is not available." }, 404];
  await logView(db, link, "updated_certificate_file", req, id);
  return [{ url }, 200];
};

async function tooManyRequests(db: Db, link: LinkRow): Promise<boolean> {
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await db
    .from("insurance_requests")
    .select("id", { count: "exact", head: true })
    .eq("link_id", link.id)
    .gte("submitted_at", since);
  return (count ?? 0) >= MAX_REQUESTS_PER_LINK_PER_DAY;
}

async function notifyCompany(db: Db, link: LinkRow, request: RequestRow, todayMs: number) {
  const company = await companyProfile(db, link.company_id);
  if (!company.email) return;
  const [policies, options] = await Promise.all([listPolicies(db, link.company_id), loadOptions(db, link.company_id)]);
  const shaped = shapeRequest(request, link, policies, options, todayMs);
  const area = await mintCompanyAreaLink(db, link.company_id);
  const lines = shaped.lines
    .map((l) => `<li style="margin:0 0 6px">${esc(l.text)} — <b>${l.meets ? "You Meet This" : "Ask Your Broker"}</b></li>`)
    .join("");
  const html = buildEmailHtml({
    recipientName: company.name || "there",
    bodyHtml: `<p>${esc(link.location_name)} told you what insurance it requires.</p>
<p><b>Who is asking:</b> ${esc(shaped.who_is_asking ?? "")}<br><b>Certificate holder:</b> ${esc(request.holder_name ?? "")}<br>${esc(request.holder_address ?? "")}</p>
<p><b>What they require, against what you have:</b></p><ul style="padding-left:20px">${lines}</ul>`,
    ctaText: "Answer the Request",
    ctaUrl: area.url,
    footerNote: "This link to your records works for 7 days.",
  });
  await sendEmail({
    to: company.email,
    subject: `Insurance Request from ${link.location_name}`.slice(0, 150),
    html,
  });
}

const submitRequirements: Handler = async ({ db, body, link, todayMs }) => {
  if (!link.approved_at) return [{ error: "Insurance is shared once the estimate is approved." }, 403];
  if (await tooManyRequests(db, link)) return [{ error: "Too many requests from this link today. Please try again tomorrow." }, 429];

  const options = await loadOptions(db, link.company_id);
  const norm = normalizeRequirements((body.requirements ?? {}) as Json, options);
  if (!norm.ok) return [{ error: norm.error }, 400];

  let fileCheck: ReturnType<typeof checkFile> | null = null;
  if (body.file) {
    fileCheck = checkFile(body.file);
    if (!fileCheck.ok) return [{ error: fileCheck.error }, 400];
  }

  const { data: created, error } = await db
    .from("insurance_requests")
    .insert({
      company_id: link.company_id,
      link_id: link.id,
      kind: "requirements",
      status: "open",
      ...norm.value,
    })
    .select(REQUEST_COLS)
    .single();
  if (error || !created) throw new Error(`request insert: ${error?.message}`);

  if (fileCheck?.ok) {
    const stored = await storeFile(db, `${link.company_id}/requests/${created.id}/requirements`, body.file);
    if (!("error" in stored)) {
      await db.from("insurance_requests")
        .update({ upload_path: stored.path, upload_type: stored.contentType })
        .eq("id", created.id).eq("company_id", link.company_id);
      created.upload_path = stored.path;
    }
  }

  try {
    await notifyCompany(db, link, created as RequestRow, todayMs);
  } catch (err) {
    // The request is saved and shows in EvidLY and HoodOps either way.
    console.error(`[proof-access] company notice failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return [{ status: "sent", request_id: created.id }, 200];
};

const currentEnough: Handler = async ({ db, link }) => {
  if (!link.approved_at) return [{ error: "Insurance is shared once the estimate is approved." }, 403];
  if (await tooManyRequests(db, link)) return [{ error: "Too many requests from this link today. Please try again tomorrow." }, 429];
  const { data, error } = await db
    .from("insurance_requests")
    .insert({ company_id: link.company_id, link_id: link.id, kind: "current_enough", status: "closed" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`current enough insert: ${error?.message}`);
  return [{ status: "recorded", request_id: data.id }, 200];
};

const HANDLERS: Record<string, Handler> = {
  certifications,
  certification_file: certificationFile,
  insurance,
  policy_file: policyFile,
  updated_certificate_file: updatedCertificateFile,
  submit_requirements: submitRequirements,
  current_enough: currentEnough,
};

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get("origin"));
  const respond = (payload: Json, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  let body: Json;
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }

  const action = str(body.action, 40);
  const handler = HANDLERS[action];
  const companyHandler = COMPANY_HANDLERS[action];
  if (!handler && !companyHandler && action !== "company.email_link") {
    return respond({ error: "Unknown action" }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // ── The company's own area: a company_area_links token ──
    if (action === "company.email_link") {
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
      const { allowed } = await checkRateLimit({ key: `proof_company_link:${ip}`, maxRequests: 5, windowSeconds: 3600, supabase: db });
      if (allowed) await emailCompanyLink(db, str(body.email, 320));
      return respond({ status: "sent" }, 200);
    }
    if (companyHandler) {
      const companyId = await companyFromAreaToken(db, str(body.token, 100));
      if (!companyId) return respond({ status: "invalid" }, 200);
      const [payload, status] = await companyHandler({ db, body, companyId, todayMs: todayUtcMs() });
      return respond(payload, status);
    }

    // ── A client's proof link ──
    const link = await linkByToken(db, str(body.token, 100));
    // An unknown, revoked or malformed token: the same answer every time.
    if (!link) return respond({ status: "invalid" }, 200);
    const [payload, status] = await handler({ db, req, body, link, todayMs: todayUtcMs() });
    return respond(payload, status);
  } catch (err) {
    console.error(`[proof-access] ${action} failed: ${err instanceof Error ? err.message : String(err)}`);
    return respond({ error: "Internal error" }, 500);
  }
});
