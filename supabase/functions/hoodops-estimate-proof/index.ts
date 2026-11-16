// ═══════════════════════════════════════════════════════════
// hoodops-estimate-proof — the API HoodOps calls for Estimate Proof via
// EvidLY. Documented in docs/estimate-proof/api.md.
//
// Auth: per-tenant HMAC over the exact request bytes, via
// _shared/verifyHoodopsRequest.ts — the same server-to-server auth as
// hoodops-partner-link and hoodops-partner-documents. No global-secret
// fallback. No config.toml block, so gateway JWT verification stays on
// (HoodOps sends the project anon key as the bearer).
//
// The company is resolved ONLY from the verified tenant: its records set,
// partner_applications.hoodops_tenant_id. Nothing in the body can name
// another company.
//
// POST { hoodops_tenant_slug, action, ...fields }
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyHoodopsRequest, type HoodopsTenant } from "../_shared/verifyHoodopsRequest.ts";
import { todayUtcMs } from "../_shared/estimateProof.ts";
import {
  archiveItem,
  createOrGetLink,
  type Db,
  ensureRecordsSet,
  findRecordsSet,
  linkByEstimate,
  listCertifications,
  listPolicies,
  loadOptions,
  loadSettings,
  mintCompanyAreaLink,
  saveCertification,
  shapedRequests,
  savePolicy,
  saveSettings,
  shapeCertification,
  shapeLink,
  shapePolicy,
  signPath,
} from "../_shared/companyProof.ts";

type Json = Record<string, unknown>;
interface Ctx {
  db: Db;
  tenant: HoodopsTenant;
  body: Json;
  todayMs: number;
}
type Handler = (ctx: Ctx) => Promise<[Json, number]>;

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const NOT_CONNECTED: [Json, number] = [{
  connected: false,
  error: "This company has no certifications or insurance in EvidLY yet.",
}, 409];

async function companyOrNull(ctx: Ctx): Promise<string | null> {
  return await findRecordsSet(ctx.db, ctx.tenant.id);
}

// ── Records (HoodOps Settings › Certifications and Insurance) ─

async function recordsPayload(db: Db, companyId: string, todayMs: number, withUrls: boolean): Promise<Json> {
  const [certs, policies, options, settings] = await Promise.all([
    listCertifications(db, companyId),
    listPolicies(db, companyId),
    loadOptions(db, companyId),
    loadSettings(db, companyId),
  ]);
  const withUrl = async <T extends Json>(shaped: T, path: string | null) =>
    withUrls && path && shaped.status === "current" ? { ...shaped, url: await signPath(db, path) } : shaped;
  return {
    connected: true,
    certifications: await Promise.all(certs.map((c) => withUrl(shapeCertification(c, todayMs), c.file_path))),
    insurance: await Promise.all(policies.map((p) => withUrl(shapePolicy(p, options, todayMs), p.file_path))),
    broker_email: settings.broker_email,
    reminder_days: settings.reminder_days,
    coverage_options: options.filter((o) => o.kind === "coverage").map(({ code, label, fields }) => ({ code, label, fields })),
    endorsement_options: options.filter((o) => o.kind === "endorsement").map(({ code, label, fields }) => ({ code, label, fields })),
  };
}

const recordsList: Handler = async (ctx) => {
  const companyId = await companyOrNull(ctx);
  if (!companyId) return [{ connected: false, certifications: [], insurance: [] }, 200];
  return [await recordsPayload(ctx.db, companyId, ctx.todayMs, ctx.body.include_urls === true), 200];
};

const certificationSave: Handler = async (ctx) => {
  const ensured = await ensureRecordsSet(ctx.db, ctx.tenant, ctx.body);
  if ("error" in ensured) return [{ error: ensured.error }, ensured.status];
  const saved = await saveCertification(ctx.db, ensured.companyId, (ctx.body.certification ?? ctx.body) as Json);
  if ("error" in saved) return [{ error: saved.error }, 400];
  return [{ id: saved.id, account_created: ensured.created }, 200];
};

const policySave: Handler = async (ctx) => {
  const ensured = await ensureRecordsSet(ctx.db, ctx.tenant, ctx.body);
  if ("error" in ensured) return [{ error: ensured.error }, ensured.status];
  const options = await loadOptions(ctx.db, ensured.companyId);
  const saved = await savePolicy(ctx.db, ensured.companyId, (ctx.body.policy ?? ctx.body) as Json, options);
  if ("error" in saved) return [{ error: saved.error }, 400];
  return [{ id: saved.id, account_created: ensured.created }, 200];
};

const archive = (table: "company_certifications" | "company_insurance_policies"): Handler => async (ctx) => {
  const companyId = await companyOrNull(ctx);
  if (!companyId) return NOT_CONNECTED;
  const ok = await archiveItem(ctx.db, companyId, table, str(ctx.body.id, 60));
  return ok ? [{ archived: true }, 200] : [{ error: "Not found." }, 404];
};

const settingsSave: Handler = async (ctx) => {
  const ensured = await ensureRecordsSet(ctx.db, ctx.tenant, ctx.body);
  if ("error" in ensured) return [{ error: ensured.error }, ensured.status];
  const r = await saveSettings(ctx.db, ensured.companyId, (ctx.body.settings ?? ctx.body) as Json);
  if (r.error) return [{ error: r.error }, 400];
  return [{ saved: true, ...(await loadSettings(ctx.db, ensured.companyId)) }, 200];
};

// ── Proof links ──────────────────────────────────────────────

const proofLinkCreate: Handler = async (ctx) => {
  const companyId = await companyOrNull(ctx);
  if (!companyId) return NOT_CONNECTED;
  const r = await createOrGetLink(ctx.db, companyId, ctx.body);
  if ("error" in r) return [{ error: r.error }, 400];
  const certs = await listCertifications(ctx.db, companyId);
  return [{
    ...shapeLink(r.link),
    created: r.created,
    // For the estimate email's "Our Certifications" box.
    certifications: certs.map((c) => shapeCertification(c, ctx.todayMs)),
  }, r.created ? 201 : 200];
};

/** The estimate is Approved: unlocks /proof/<token>/insurance. Idempotent. */
const proofLinkApprove: Handler = async (ctx) => {
  const companyId = await companyOrNull(ctx);
  if (!companyId) return NOT_CONNECTED;
  const estimateRef = str(ctx.body.estimate_id ?? ctx.body.estimate_ref, 200);
  if (!estimateRef) return [{ error: "estimate_id is required." }, 400];
  const link = await linkByEstimate(ctx.db, companyId, estimateRef);
  if (!link) return [{ error: "No proof link for this estimate. Call proof_link.create first." }, 404];

  const patch: Json = {};
  if (!link.approved_at) patch.approved_at = new Date().toISOString();
  const clientEmail = str(ctx.body.client_email, 320);
  if (clientEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return [{ error: "client_email is not a valid email." }, 400];
    patch.client_email = clientEmail;
  }
  if (str(ctx.body.client_name)) patch.client_name = str(ctx.body.client_name);

  let current = link;
  if (Object.keys(patch).length) {
    const { data, error } = await ctx.db
      .from("estimate_proof_links")
      .update(patch)
      .eq("id", link.id)
      .eq("company_id", companyId)
      .select("id, company_id, token, estimate_ref, location_name, location_ref, client_name, client_email, approved_at, created_at")
      .single();
    if (error) throw new Error(`approve: ${error.message}`);
    current = data;
  }

  const [policies, options] = await Promise.all([listPolicies(ctx.db, companyId), loadOptions(ctx.db, companyId)]);
  return [{
    ...shapeLink(current),
    // For the approval email's "Our Insurance" box: current policies only.
    insurance: policies.map((p) => shapePolicy(p, options, ctx.todayMs)).filter((p) => p.status === "current"),
  }, 200];
};

// ── Insurance requests (a task in HoodOps) ───────────────────

const insuranceRequestsList: Handler = async (ctx) => {
  const companyId = await companyOrNull(ctx);
  if (!companyId) return [{ connected: false, requests: [] }, 200];
  const status = str(ctx.body.status, 10) === "all" ? "all" : "open";
  const requests = await shapedRequests(ctx.db, companyId, ctx.todayMs, status);
  // One link into the company's area for the task's "Answer" button.
  const area = requests.length ? await mintCompanyAreaLink(ctx.db, companyId) : null;
  return [{
    connected: true,
    requests,
    open_count: requests.filter((r) => r.status === "open").length,
    answer_url: area?.url ?? null,
    answer_url_expires_at: area?.expires_at ?? null,
  }, 200];
};

/** A 7-day link to the company's Estimate Proof area in EvidLY. */
const companyAreaLink: Handler = async (ctx) => {
  const ensured = await ensureRecordsSet(ctx.db, ctx.tenant, ctx.body);
  if ("error" in ensured) return [{ error: ensured.error }, ensured.status];
  const area = await mintCompanyAreaLink(ctx.db, ensured.companyId);
  return [{ url: area.url, expires_at: area.expires_at, account_created: ensured.created }, 200];
};

const HANDLERS: Record<string, Handler> = {
  "insurance_requests.list": insuranceRequestsList,
  "company_area.link": companyAreaLink,
  "proof_link.approve": proofLinkApprove,
  "records.list": recordsList,
  "certification.save": certificationSave,
  "certification.archive": archive("company_certifications"),
  "policy.save": policySave,
  "policy.archive": archive("company_insurance_policies"),
  "settings.save": settingsSave,
  "proof_link.create": proofLinkCreate,
};

function jsonResp(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const verified = await verifyHoodopsRequest(req, db);
  if (!verified.ok || !verified.tenant) {
    return jsonResp({ error: verified.error || "Unauthorized" }, verified.status);
  }

  const body = (verified.body ?? {}) as Json;
  const action = str(body.action, 60);
  const handler = HANDLERS[action];
  if (!handler) return jsonResp({ error: "Unknown action", actions: Object.keys(HANDLERS) }, 400);

  try {
    const [payload, status] = await handler({ db, tenant: verified.tenant, body, todayMs: todayUtcMs() });
    return jsonResp(payload, status);
  } catch (err) {
    console.error(
      `[hoodops-estimate-proof] ${action} failed for tenant ${verified.tenant.tenant_slug}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return jsonResp({ error: "Internal error" }, 500);
  }
});
