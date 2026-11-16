// ═══════════════════════════════════════════════════════════
// companyProof — data access for Estimate Proof via EvidLY.
//
// Every function takes a company_id that the CALLER has already resolved
// from a verified HoodOps signature (hoodops-estimate-proof) or a link token
// (proof-access). Nothing here accepts a company from the request body, and
// every query is filtered by company_id: that is the wall between companies.
//
// The company is its records set, partner_applications.id
// (hoodops_tenant_id-linked, migration 20261231000000).
// ═══════════════════════════════════════════════════════════

import {
  checkFile,
  compareRequest,
  effectiveOptions,
  itemStatus,
  monthYear,
  newToken,
  type PolicyLike,
  type RequirementOption,
  WHO_IS_ASKING,
} from "./estimateProof.ts";

// deno-lint-ignore no-explicit-any
export type Db = any;

export const BUCKET = "company-proof";
export const SIGNED_URL_TTL_SECONDS = 300;
export const COMPANY_AREA_TTL_DAYS = 7;

export function proofBaseUrl(): string {
  return (Deno.env.get("PROOF_BASE_URL") || "https://app.getevidly.com").replace(/\/+$/, "");
}

export const proofUrl = (token: string) => `${proofBaseUrl()}/proof/${token}`;
export const insuranceUrl = (token: string) => `${proofBaseUrl()}/proof/${token}/insurance`;
export const companyAreaUrl = (token: string) => `${proofBaseUrl()}/company-proof/${token}`;

const str = (v: unknown, max = 500): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ── The records set (the company's EvidLY account) ───────────

/* The six partner_documents slots a records set is made of, as
 * hoodops-partner-link creates them (index.ts:25-32). */
const PARTNER_DOC_TYPES = [
  "business_license",
  "professional_license",
  "w9",
  "liability_insurance",
  "workers_comp",
  "auto_insurance",
];

export async function findRecordsSet(db: Db, tenantId: string): Promise<string | null> {
  const { data, error } = await db
    .from("partner_applications")
    .select("id")
    .eq("hoodops_tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(`records set lookup: ${error.message}`);
  return data?.id ?? null;
}

/**
 * The tenant's records set, set up the first time it is needed: linked row,
 * else an unclaimed row with the same email (adopted), else a new row with
 * its six partner slots. The same create-or-adopt rule as hoodops-partner-link.
 * Company level only: no organization, no location, no kitchen data.
 */
export async function ensureRecordsSet(
  db: Db,
  tenant: { id: string; tenant_name: string },
  body: Record<string, unknown>,
): Promise<{ companyId: string; created: boolean } | { error: string; status: number }> {
  const existing = await findRecordsSet(db, tenant.id);
  if (existing) return { companyId: existing, created: false };

  const email = str(body.email, 320);
  const businessName = str(body.business_name, 200) || tenant.tenant_name;
  if (!email) {
    return {
      error: "This company has no EvidLY records yet. Send email (and business_name) with its first certificate.",
      status: 409,
    };
  }

  const { data: unclaimed, error: uErr } = await db
    .from("partner_applications")
    .select("id")
    .ilike("email", email)
    .is("hoodops_tenant_id", null)
    .limit(1)
    .maybeSingle();
  if (uErr) throw new Error(`unclaimed lookup: ${uErr.message}`);
  if (unclaimed) {
    const { data: stamped, error: sErr } = await db
      .from("partner_applications")
      .update({ hoodops_tenant_id: tenant.id })
      .eq("id", unclaimed.id)
      .is("hoodops_tenant_id", null)
      .select("id")
      .maybeSingle();
    if (sErr) throw new Error(`adopt: ${sErr.message}`);
    if (stamped) return { companyId: stamped.id, created: false };
  }

  const { data: app, error: aErr } = await db
    .from("partner_applications")
    .insert({
      first_name: str(body.first_name, 100),
      last_name: str(body.last_name, 100),
      business_name: businessName,
      service_type: "Hood Cleaning",
      email,
      phone: str(body.phone, 40),
      website: str(body.website, 300),
      status: "submitted",
      hoodops_tenant_id: tenant.id,
    })
    .select("id")
    .single();
  if (aErr || !app) throw new Error(`records set insert: ${aErr?.message}`);

  const { error: dErr } = await db.from("partner_documents").insert(
    PARTNER_DOC_TYPES.map((doc_type) => ({ application_id: app.id, doc_type, status: "pending" })),
  );
  if (dErr) {
    await db.from("partner_applications").delete().eq("id", app.id);
    throw new Error(`records set slots: ${dErr.message}`);
  }
  return { companyId: app.id, created: true };
}

export async function companyProfile(db: Db, companyId: string): Promise<{ name: string; email: string | null }> {
  const { data } = await db
    .from("partner_applications")
    .select("business_name, email")
    .eq("id", companyId)
    .maybeSingle();
  return { name: data?.business_name || "", email: data?.email || null };
}

// ── Settings ─────────────────────────────────────────────────

export async function loadOptions(db: Db, companyId: string): Promise<RequirementOption[]> {
  const { data, error } = await db
    .from("proof_requirement_options")
    .select("company_id, kind, code, label, fields, sort_order, active")
    .or(`company_id.is.null,company_id.eq.${companyId}`);
  if (error) throw new Error(`options: ${error.message}`);
  return effectiveOptions((data ?? []) as RequirementOption[], companyId);
}

export async function loadSettings(db: Db, companyId: string): Promise<{ broker_email: string | null; reminder_days: number[] }> {
  const { data } = await db
    .from("company_proof_settings")
    .select("broker_email, reminder_days")
    .eq("company_id", companyId)
    .maybeSingle();
  return { broker_email: data?.broker_email ?? null, reminder_days: data?.reminder_days ?? [60, 30] };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_REMINDER_DAYS = [1, 2, 3, 5, 7, 10, 14, 15, 21, 30, 45, 60, 75, 90, 120, 180];

export async function saveSettings(
  db: Db,
  companyId: string,
  body: Record<string, unknown>,
): Promise<{ error?: string }> {
  const patch: Record<string, unknown> = { company_id: companyId, updated_at: new Date().toISOString() };
  if ("broker_email" in body) {
    const e = str(body.broker_email, 320);
    if (e && !EMAIL_RE.test(e)) return { error: "Enter a valid broker email." };
    patch.broker_email = e || null;
  }
  if ("reminder_days" in body) {
    const days = Array.isArray(body.reminder_days) ? body.reminder_days.map(Number) : [];
    if (days.some((d) => !ALLOWED_REMINDER_DAYS.includes(d))) {
      return { error: `Reminder days must be from: ${ALLOWED_REMINDER_DAYS.join(", ")}.` };
    }
    patch.reminder_days = [...new Set(days)].sort((a, b) => b - a);
  }
  const { error } = await db.from("company_proof_settings").upsert(patch, { onConflict: "company_id" });
  if (error) throw new Error(`settings: ${error.message}`);
  return {};
}

// ── Files ────────────────────────────────────────────────────

export async function storeFile(
  db: Db,
  path: string,
  file: unknown,
): Promise<{ path: string; contentType: string } | { error: string }> {
  const checked = checkFile(file);
  if (!checked.ok) return { error: checked.error };
  const bin = Uint8Array.from(atob(checked.base64), (c) => c.charCodeAt(0));
  const fullPath = `${path}.${checked.ext}`;
  const { error } = await db.storage.from(BUCKET).upload(fullPath, bin, {
    contentType: checked.contentType,
    upsert: true,
  });
  if (error) throw new Error(`upload: ${error.message}`);
  return { path: fullPath, contentType: checked.contentType };
}

export async function signPath(db: Db, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error(`[companyProof] sign failed: ${error?.message}`);
    return null;
  }
  return data.signedUrl;
}

// ── Certifications and policies ──────────────────────────────

export interface CertRow {
  id: string;
  name: string;
  cert_number: string | null;
  holder: string | null;
  expiration_date: string | null;
  file_path: string | null;
  sort_order: number;
  created_at: string;
}

export interface PolicyRow extends PolicyLike {
  id: string;
  carrier: string | null;
  policy_number: string | null;
  limits_text: string | null;
  file_path: string | null;
  sort_order: number;
  created_at: string;
}

export async function listCertifications(db: Db, companyId: string): Promise<CertRow[]> {
  const { data, error } = await db
    .from("company_certifications")
    .select("id, name, cert_number, holder, expiration_date, file_path, sort_order, created_at")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`certifications: ${error.message}`);
  return data ?? [];
}

export async function listPolicies(db: Db, companyId: string): Promise<PolicyRow[]> {
  const { data, error } = await db
    .from("company_insurance_policies")
    .select("id, coverage_code, carrier, policy_number, per_occurrence_limit, aggregate_limit, limits_text, endorsements, notice_of_cancellation_days, expiration_date, file_path, sort_order, created_at")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`policies: ${error.message}`);
  return data ?? [];
}

export function shapeCertification(c: CertRow, todayMs: number) {
  return {
    id: c.id,
    name: c.name,
    number: c.cert_number,
    holder: c.holder,
    expiration_date: c.expiration_date,
    expires: monthYear(c.expiration_date),
    status: itemStatus(c.expiration_date, todayMs),
    has_file: !!c.file_path,
  };
}

export function limitsSummary(p: PolicyRow): string | null {
  if (p.limits_text) return p.limits_text;
  const fmt = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== null ? `$${n.toLocaleString("en-US")}` : null;
  };
  const parts = [];
  const occ = fmt(p.per_occurrence_limit);
  const agg = fmt(p.aggregate_limit);
  if (occ) parts.push(`${occ} per occurrence`);
  if (agg) parts.push(`${agg} aggregate`);
  return parts.length ? parts.join(" · ") : null;
}

export function shapePolicy(p: PolicyRow, options: RequirementOption[], todayMs: number) {
  const coverage = options.find((o) => o.kind === "coverage" && o.code === p.coverage_code);
  const endorsementLabels = (p.endorsements ?? []).map((code) =>
    options.find((o) => o.kind === "endorsement" && o.code === code)?.label ?? code
  );
  return {
    id: p.id,
    coverage_code: p.coverage_code,
    type: coverage?.label ?? p.coverage_code,
    carrier: p.carrier,
    policy_number: p.policy_number,
    per_occurrence_limit: p.per_occurrence_limit,
    aggregate_limit: p.aggregate_limit,
    limits: limitsSummary(p),
    limits_text: p.limits_text,
    endorsements: p.endorsements ?? [],
    endorsement_labels: endorsementLabels,
    notice_of_cancellation_days: p.notice_of_cancellation_days,
    expiration_date: p.expiration_date,
    expires: monthYear(p.expiration_date),
    status: itemStatus(p.expiration_date, todayMs),
    has_file: !!p.file_path,
  };
}

function dateOrNull(v: unknown): string | null | "invalid" {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "invalid";
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? "invalid" : v;
}

/** Create (no id) or update (id) one certification, with an optional file. */
export async function saveCertification(
  db: Db,
  companyId: string,
  body: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  const name = str(body.name, 200);
  if (!name) return { error: "Enter the certification name." };
  const exp = dateOrNull(body.expiration_date);
  if (exp === "invalid") return { error: "The expiration date must be YYYY-MM-DD." };

  const fields: Record<string, unknown> = {
    name,
    cert_number: str(body.number ?? body.cert_number, 100) || null,
    holder: str(body.holder, 200) || null,
    expiration_date: exp,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.sort_order === "number") fields.sort_order = Math.trunc(body.sort_order);

  let id = str(body.id, 60);
  if (id) {
    const { data: cur } = await db
      .from("company_certifications")
      .select("id, expiration_date")
      .eq("id", id)
      .eq("company_id", companyId)
      .is("archived_at", null)
      .maybeSingle();
    if (!cur) return { error: "Certification not found." };
    if (cur.expiration_date !== exp) fields.reminder_stage_sent = null;
    const { error } = await db.from("company_certifications").update(fields).eq("id", id).eq("company_id", companyId);
    if (error) throw new Error(`certification update: ${error.message}`);
  } else {
    const { data, error } = await db
      .from("company_certifications")
      .insert({ ...fields, company_id: companyId })
      .select("id")
      .single();
    if (error || !data) throw new Error(`certification insert: ${error?.message}`);
    id = data.id;
  }

  if (body.file) {
    const stored = await storeFile(db, `${companyId}/certifications/${id}-${Date.now()}`, body.file);
    if ("error" in stored) return { error: stored.error };
    await db.from("company_certifications")
      .update({ file_path: stored.path, file_type: stored.contentType })
      .eq("id", id).eq("company_id", companyId);
  }
  return { id };
}

/** Create (no id) or update (id) one insurance policy, with an optional file. */
export async function savePolicy(
  db: Db,
  companyId: string,
  body: Record<string, unknown>,
  options: RequirementOption[],
): Promise<{ id: string } | { error: string }> {
  const coverageCode = str(body.coverage_code, 60);
  if (!options.some((o) => o.kind === "coverage" && o.code === coverageCode)) {
    return { error: "Choose the type of insurance from the list." };
  }
  const exp = dateOrNull(body.expiration_date);
  if (exp === "invalid") return { error: "The expiration date must be YYYY-MM-DD." };

  const endorsementCodes = new Set(options.filter((o) => o.kind === "endorsement").map((o) => o.code));
  const endorsements = (Array.isArray(body.endorsements) ? body.endorsements : [])
    .map((e) => str(e, 60))
    .filter((e) => endorsementCodes.has(e));

  const amount = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(/[$,\s]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const notice = Number(body.notice_of_cancellation_days);

  const fields: Record<string, unknown> = {
    coverage_code: coverageCode,
    carrier: str(body.carrier, 200) || null,
    policy_number: str(body.policy_number, 100) || null,
    per_occurrence_limit: amount(body.per_occurrence_limit),
    aggregate_limit: amount(body.aggregate_limit),
    limits_text: str(body.limits_text, 300) || null,
    endorsements: [...new Set(endorsements)],
    notice_of_cancellation_days: Number.isInteger(notice) && notice > 0 && notice <= 365 ? notice : null,
    expiration_date: exp,
    updated_at: new Date().toISOString(),
  };
  if (typeof body.sort_order === "number") fields.sort_order = Math.trunc(body.sort_order);

  let id = str(body.id, 60);
  if (id) {
    const { data: cur } = await db
      .from("company_insurance_policies")
      .select("id, expiration_date")
      .eq("id", id)
      .eq("company_id", companyId)
      .is("archived_at", null)
      .maybeSingle();
    if (!cur) return { error: "Policy not found." };
    if (cur.expiration_date !== exp) fields.reminder_stage_sent = null;
    const { error } = await db.from("company_insurance_policies").update(fields).eq("id", id).eq("company_id", companyId);
    if (error) throw new Error(`policy update: ${error.message}`);
  } else {
    const { data, error } = await db
      .from("company_insurance_policies")
      .insert({ ...fields, company_id: companyId })
      .select("id")
      .single();
    if (error || !data) throw new Error(`policy insert: ${error?.message}`);
    id = data.id;
  }

  if (body.file) {
    const stored = await storeFile(db, `${companyId}/policies/${id}-${Date.now()}`, body.file);
    if ("error" in stored) return { error: stored.error };
    await db.from("company_insurance_policies")
      .update({ file_path: stored.path, file_type: stored.contentType })
      .eq("id", id).eq("company_id", companyId);
  }
  return { id };
}

export async function archiveItem(
  db: Db,
  companyId: string,
  table: "company_certifications" | "company_insurance_policies",
  id: string,
): Promise<boolean> {
  const { data, error } = await db
    .from(table)
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId)
    .is("archived_at", null)
    .select("id");
  if (error) throw new Error(`archive: ${error.message}`);
  return (data ?? []).length > 0;
}

/** A file path for one item, only if it belongs to this company and is current. */
export async function currentItemPath(
  db: Db,
  companyId: string,
  table: "company_certifications" | "company_insurance_policies",
  id: string,
  todayMs: number,
): Promise<string | null> {
  const { data } = await db
    .from(table)
    .select("file_path, expiration_date")
    .eq("id", id)
    .eq("company_id", companyId)
    .is("archived_at", null)
    .maybeSingle();
  if (!data?.file_path) return null;
  if (itemStatus(data.expiration_date, todayMs) !== "current") return null;
  return data.file_path;
}

// ── Proof links ──────────────────────────────────────────────

export interface LinkRow {
  id: string;
  company_id: string;
  token: string;
  estimate_ref: string;
  location_name: string;
  location_ref: string | null;
  client_name: string | null;
  client_email: string | null;
  approved_at: string | null;
  created_at: string;
}

const LINK_COLS = "id, company_id, token, estimate_ref, location_name, location_ref, client_name, client_email, approved_at, created_at";

export async function linkByToken(db: Db, token: string): Promise<LinkRow | null> {
  if (typeof token !== "string" || token.length < 43 || token.length > 64) return null;
  const { data, error } = await db
    .from("estimate_proof_links")
    .select(LINK_COLS)
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`link lookup: ${error.message}`);
  return data ?? null;
}

export async function linkByEstimate(db: Db, companyId: string, estimateRef: string): Promise<LinkRow | null> {
  const { data, error } = await db
    .from("estimate_proof_links")
    .select(LINK_COLS)
    .eq("company_id", companyId)
    .eq("estimate_ref", estimateRef)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`link lookup: ${error.message}`);
  return data ?? null;
}

/** One live link per estimate: returns the existing one, refreshed, or a new one. */
export async function createOrGetLink(
  db: Db,
  companyId: string,
  body: Record<string, unknown>,
): Promise<{ link: LinkRow; created: boolean } | { error: string }> {
  const estimateRef = str(body.estimate_id ?? body.estimate_ref, 200);
  const locationName = str(body.location_name, 200);
  if (!estimateRef) return { error: "estimate_id is required." };
  if (!locationName) return { error: "location_name is required." };
  const clientEmail = str(body.client_email, 320);
  if (clientEmail && !EMAIL_RE.test(clientEmail)) return { error: "client_email is not a valid email." };

  const patch: Record<string, unknown> = {
    location_name: locationName,
    location_ref: str(body.location_id ?? body.location_ref, 200) || null,
  };
  if (str(body.client_name, 200)) patch.client_name = str(body.client_name, 200);
  if (clientEmail) patch.client_email = clientEmail;

  const existing = await linkByEstimate(db, companyId, estimateRef);
  if (existing) {
    const { data, error } = await db
      .from("estimate_proof_links")
      .update(patch)
      .eq("id", existing.id)
      .eq("company_id", companyId)
      .select(LINK_COLS)
      .single();
    if (error) throw new Error(`link update: ${error.message}`);
    return { link: data, created: false };
  }

  const { data, error } = await db
    .from("estimate_proof_links")
    .insert({ ...patch, company_id: companyId, estimate_ref: estimateRef, token: newToken() })
    .select(LINK_COLS)
    .single();
  if (error) {
    // Two calls for the same estimate at once: the unique index keeps one.
    if (String(error.code) === "23505") {
      const again = await linkByEstimate(db, companyId, estimateRef);
      if (again) return { link: again, created: false };
    }
    throw new Error(`link insert: ${error.message}`);
  }
  return { link: data, created: true };
}

export function shapeLink(link: LinkRow) {
  return {
    link_id: link.id,
    estimate_id: link.estimate_ref,
    location_name: link.location_name,
    location_id: link.location_ref,
    approved: !!link.approved_at,
    approved_at: link.approved_at,
    certifications_url: proofUrl(link.token),
    insurance_url: insuranceUrl(link.token),
    created_at: link.created_at,
  };
}

// ── Views ────────────────────────────────────────────────────

export type ViewPage =
  | "certifications"
  | "insurance"
  | "certification_file"
  | "policy_file"
  | "updated_certificate_file";

export async function logView(
  db: Db,
  link: { id: string; company_id: string },
  page: ViewPage,
  req: Request,
  itemId: string | null = null,
): Promise<boolean> {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") || null;
  const { error } = await db.from("estimate_proof_views").insert({
    link_id: link.id,
    company_id: link.company_id,
    page,
    item_id: itemId,
    ip: ip ? ip.slice(0, 64) : null,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300) || null,
  });
  if (error) console.error(`[companyProof] view log failed: ${error.message}`);
  return !error;
}

// ── Insurance requests ───────────────────────────────────────

export interface RequestRow {
  id: string;
  company_id: string;
  link_id: string;
  kind: "requirements" | "current_enough";
  status: "open" | "answered" | "closed";
  holder_name: string | null;
  holder_address: string | null;
  who_is_asking: keyof typeof WHO_IS_ASKING | null;
  who_is_asking_other: string | null;
  coverages: unknown[];
  endorsements: unknown[];
  upload_path: string | null;
  submitted_at: string;
  broker_emailed_at: string | null;
  answered_at: string | null;
  answer_file_path: string | null;
  client_notified_at: string | null;
}

export const REQUEST_COLS =
  "id, company_id, link_id, kind, status, holder_name, holder_address, who_is_asking, who_is_asking_other, coverages, endorsements, upload_path, submitted_at, broker_emailed_at, answered_at, answer_file_path, client_notified_at";

export function whoLabel(r: Pick<RequestRow, "who_is_asking" | "who_is_asking_other">): string | null {
  if (!r.who_is_asking) return null;
  const base = WHO_IS_ASKING[r.who_is_asking];
  return r.who_is_asking === "other" && r.who_is_asking_other ? `${base}: ${r.who_is_asking_other}` : base;
}

export function shapeRequest(
  r: RequestRow,
  link: Pick<LinkRow, "location_name" | "estimate_ref" | "location_ref"> | null,
  policies: PolicyLike[],
  options: RequirementOption[],
  todayMs: number,
) {
  const lines = r.kind === "requirements"
    ? compareRequest(
      { coverages: r.coverages as never, endorsements: r.endorsements as never },
      policies,
      options,
      todayMs,
    )
    : [];
  return {
    request_id: r.id,
    kind: r.kind,
    status: r.status,
    location_name: link?.location_name ?? null,
    location_id: link?.location_ref ?? null,
    estimate_id: link?.estimate_ref ?? null,
    requested_at: r.submitted_at,
    who_is_asking: whoLabel(r),
    certificate_holder: r.holder_name,
    certificate_holder_address: r.holder_address,
    lines,
    all_met: lines.length > 0 && lines.every((l) => l.meets),
    has_requirements_file: !!r.upload_path,
    broker_emailed_at: r.broker_emailed_at,
    answered_at: r.answered_at,
    has_updated_certificate: !!r.answer_file_path,
    client_notified_at: r.client_notified_at,
  };
}

// ── Requests, listed ─────────────────────────────────────────

async function requestsWithLinks(db: Db, companyId: string, onlyRequirements = true) {
  let q = db.from("insurance_requests").select(REQUEST_COLS).eq("company_id", companyId);
  if (onlyRequirements) q = q.eq("kind", "requirements");
  const { data, error } = await q.order("submitted_at", { ascending: false }).limit(200);
  if (error) throw new Error(`requests: ${error.message}`);
  const rows = (data ?? []) as RequestRow[];
  const linkIds = [...new Set(rows.map((r) => r.link_id))];
  const links = new Map<string, { location_name: string; estimate_ref: string; location_ref: string | null; token: string; client_email: string | null }>();
  if (linkIds.length) {
    const { data: ls } = await db
      .from("estimate_proof_links")
      .select("id, location_name, estimate_ref, location_ref, token, client_email")
      .eq("company_id", companyId)
      .in("id", linkIds);
    for (const l of ls ?? []) links.set(l.id, l);
  }
  return { rows, links };
}

/** Requests with their link, compared against current policies. */
export async function shapedRequests(db: Db, companyId: string, todayMs: number, status: "open" | "all") {
  const [{ rows, links }, policies, options] = await Promise.all([
    requestsWithLinks(db, companyId),
    listPolicies(db, companyId),
    loadOptions(db, companyId),
  ]);
  return rows
    .filter((r) => status === "all" || r.status === "open")
    .map((r) => shapeRequest(r, links.get(r.link_id) ?? null, policies, options, todayMs));
}

// ── Company area links ───────────────────────────────────────

export async function mintCompanyAreaLink(db: Db, companyId: string): Promise<{ url: string; expires_at: string }> {
  const token = newToken();
  const expires = new Date(Date.now() + COMPANY_AREA_TTL_DAYS * 86400000).toISOString();
  const { error } = await db.from("company_area_links").insert({ company_id: companyId, token, expires_at: expires });
  if (error) throw new Error(`company area link: ${error.message}`);
  return { url: companyAreaUrl(token), expires_at: expires };
}

export async function companyFromAreaToken(db: Db, token: string): Promise<string | null> {
  if (typeof token !== "string" || token.length < 43 || token.length > 64) return null;
  const { data, error } = await db
    .from("company_area_links")
    .select("company_id, expires_at")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`company area lookup: ${error.message}`);
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.company_id;
}

// ── Email ────────────────────────────────────────────────────

export const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A From display name that cannot break the header. */
export function fromAs(companyName: string): string {
  const safe = companyName.replace(/["<>\r\n\\]/g, "").trim().slice(0, 80) || "EvidLY";
  return `"${safe} via EvidLY" <noreply@getevidly.com>`;
}
