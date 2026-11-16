// ═══════════════════════════════════════════════════════════
// estimateProof — pure rules for Estimate Proof via EvidLY.
//
// No imports, no Deno or browser APIs: the edge functions use it and the
// Vitest suite (src/lib/__tests__/estimateProof.test.ts) tests it directly.
//
//   itemStatus          an expired item is never Current
//   dueReminderStage    60 and 30 day reminders (a setting), each sent once
//   compareRequest      "What They Require, Against What You Have"
//   normalizeRequirements  the client's form, checked against the settings
// ═══════════════════════════════════════════════════════════

export type ItemStatus = "current" | "expired";

export interface RequirementOption {
  kind: "coverage" | "endorsement";
  code: string;
  label: string;
  fields: string[];
  sort_order: number;
  active: boolean;
  company_id?: string | null;
}

export interface PolicyLike {
  id?: string;
  coverage_code: string;
  per_occurrence_limit: number | string | null;
  aggregate_limit: number | string | null;
  endorsements: string[] | null;
  notice_of_cancellation_days: number | null;
  expiration_date: string | null;
  archived_at?: string | null;
}

export interface CoverageRequirement {
  code: string;
  per_occurrence?: number | null;
  aggregate?: number | null;
  minimum?: number | null;
}

export interface EndorsementRequirement {
  code: string;
  name?: string | null;
  days?: number | null;
  text?: string | null;
}

export interface ComparisonLine {
  kind: "coverage" | "endorsement";
  code: string;
  text: string;
  meets: boolean;
}

const DAY_MS = 86400000;

/** Midnight UTC today, as epoch ms. */
export function todayUtcMs(now: Date = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** Whole days from today (UTC) to a "YYYY-MM-DD". Negative is past. */
export function daysUntil(dateOnly: string, todayMs: number): number {
  const then = new Date(`${dateOnly}T00:00:00Z`).getTime();
  return Math.round((then - todayMs) / DAY_MS);
}

export function isDateOnly(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * Current or Expired. An item without an expiration date is Current (a
 * membership with no end date). An item whose date has passed is Expired;
 * it is good through the last day printed on it.
 */
export function itemStatus(expirationDate: string | null | undefined, todayMs: number): ItemStatus {
  if (!expirationDate) return "current";
  return daysUntil(expirationDate, todayMs) < 0 ? "expired" : "current";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "March 2027". Expiry dates show month and year. */
export function monthYear(dateOnly: string | null | undefined): string | null {
  if (!dateOnly || !isDateOnly(dateOnly)) return null;
  const [y, m] = dateOnly.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/**
 * Which reminder to send today, or null.
 *
 * reminderDays is the setting (default [60, 30]). The stage due is the
 * smallest setting at or above the days left. It is sent only if no stage
 * that small has been sent for this expiration date, so each stage goes once,
 * a late start sends only the most urgent stage, and nothing goes after the
 * item has expired.
 */
export function dueReminderStage(
  expirationDate: string | null | undefined,
  reminderDays: number[],
  lastStageSent: number | null | undefined,
  todayMs: number,
): number | null {
  if (!expirationDate) return null;
  const days = daysUntil(expirationDate, todayMs);
  if (days < 0) return null;
  const applicable = reminderDays.filter((d) => Number.isInteger(d) && d > 0 && days <= d);
  if (applicable.length === 0) return null;
  const stage = Math.min(...applicable);
  if (lastStageSent != null && lastStageSent <= stage) return null;
  return stage;
}

// ── Money ────────────────────────────────────────────────────

export function toAmount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function formatAmount(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// ── Settings: the coverage and endorsement lists ─────────────

/**
 * Platform defaults (company_id null) overlaid by the company's own rows with
 * the same kind and code. Inactive rows drop out. Sorted for display.
 */
export function effectiveOptions(rows: RequirementOption[], companyId: string): RequirementOption[] {
  const byKey = new Map<string, RequirementOption>();
  for (const r of rows) {
    if (r.company_id && r.company_id !== companyId) continue;
    const key = `${r.kind}:${r.code}`;
    const existing = byKey.get(key);
    if (!existing || (r.company_id && !existing.company_id)) byKey.set(key, r);
  }
  return [...byKey.values()]
    .filter((r) => r.active)
    .sort((a, b) => (a.kind === b.kind ? a.sort_order - b.sort_order : a.kind === "coverage" ? -1 : 1));
}

// ── The client's form ────────────────────────────────────────

export const WHO_IS_ASKING = {
  our_company: "Our Company",
  landlord_or_property_manager: "Landlord or Property Manager",
  franchisor: "Franchisor",
  other: "Other",
} as const;

export type WhoIsAsking = keyof typeof WHO_IS_ASKING;

export interface NormalizedRequirements {
  holder_name: string;
  holder_address: string;
  who_is_asking: WhoIsAsking;
  who_is_asking_other: string | null;
  coverages: CoverageRequirement[];
  endorsements: EndorsementRequirement[];
}

const clean = (v: unknown, max = 500): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/**
 * Checks the submitted form against the settings. Only codes in the list are
 * kept; amounts only for the fields that option asks for.
 */
export function normalizeRequirements(
  input: Record<string, unknown>,
  options: RequirementOption[],
): { ok: true; value: NormalizedRequirements } | { ok: false; error: string } {
  const holderName = clean(input.holder_name, 200);
  const holderAddress = clean(input.holder_address, 500);
  if (!holderName) return { ok: false, error: "Enter the certificate holder's name." };
  if (!holderAddress) return { ok: false, error: "Enter the certificate holder's address." };

  const who = clean(input.who_is_asking, 60) as WhoIsAsking;
  if (!(who in WHO_IS_ASKING)) return { ok: false, error: "Choose who is asking." };
  const whoOther = who === "other" ? clean(input.who_is_asking_other, 200) || null : null;

  const byCode = (kind: "coverage" | "endorsement") =>
    new Map(options.filter((o) => o.kind === kind && o.active).map((o) => [o.code, o]));
  const coverageOpts = byCode("coverage");
  const endorsementOpts = byCode("endorsement");

  const coverages: CoverageRequirement[] = [];
  const seenC = new Set<string>();
  for (const raw of Array.isArray(input.coverages) ? input.coverages : []) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const opt = coverageOpts.get(clean(r.code, 60));
    if (!opt || seenC.has(opt.code)) continue;
    seenC.add(opt.code);
    const c: CoverageRequirement = { code: opt.code };
    for (const f of ["per_occurrence", "aggregate", "minimum"] as const) {
      if (opt.fields.includes(f)) c[f] = toAmount(r[f]);
    }
    coverages.push(c);
  }

  const endorsements: EndorsementRequirement[] = [];
  const seenE = new Set<string>();
  for (const raw of Array.isArray(input.endorsements) ? input.endorsements : []) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const opt = endorsementOpts.get(clean(r.code, 60));
    if (!opt || seenE.has(opt.code)) continue;
    seenE.add(opt.code);
    const e: EndorsementRequirement = { code: opt.code };
    if (opt.fields.includes("name")) {
      e.name = clean(r.name, 200) || null;
      if (!e.name) return { ok: false, error: `Enter the name exactly as it should appear for ${opt.label}.` };
    }
    if (opt.fields.includes("days")) {
      const d = Number(r.days);
      e.days = Number.isInteger(d) && d > 0 && d <= 365 ? d : null;
      if (e.days === null) return { ok: false, error: `Enter the number of days for ${opt.label}.` };
    }
    if (opt.fields.includes("text")) {
      e.text = clean(r.text, 500) || null;
      if (!e.text) return { ok: false, error: `Describe what you need for ${opt.label}.` };
    }
    endorsements.push(e);
  }

  if (coverages.length === 0 && endorsements.length === 0) {
    return { ok: false, error: "Choose at least one coverage or endorsement, or choose Our Current Certificates Are Enough." };
  }

  return {
    ok: true,
    value: {
      holder_name: holderName,
      holder_address: holderAddress,
      who_is_asking: who,
      who_is_asking_other: whoOther,
      coverages,
      endorsements,
    },
  };
}

// ── What They Require, Against What You Have ────────────────

function coverageText(req: CoverageRequirement, label: string): string {
  const parts = [label];
  if (req.per_occurrence != null) parts.push(`${formatAmount(req.per_occurrence)} per occurrence`);
  if (req.aggregate != null) parts.push(`${formatAmount(req.aggregate)} aggregate`);
  if (req.minimum != null) parts.push(`${formatAmount(req.minimum)} minimum`);
  return parts.join(" · ");
}

function endorsementText(req: EndorsementRequirement, label: string): string {
  if (req.name) return `${label} · ${req.name}`;
  if (req.days != null) return `${label} · ${req.days} days`;
  if (req.text) return `${label} · ${req.text}`;
  return label;
}

const num = (v: number | string | null | undefined): number | null => toAmount(v);

/**
 * Each requested line marked You Meet This (meets: true) or Ask Your Broker.
 *
 * Only current, unarchived policies count.
 * - A coverage is met when one current policy of that coverage carries every
 *   minimum asked for (per occurrence, aggregate; "minimum" is read against
 *   the per-occurrence or each-accident limit). A minimum the policy has no
 *   limit on file for is not met.
 * - Additional Insured names a party, and only a certificate naming that
 *   party meets it, so it is always Ask Your Broker.
 * - Waiver of Subrogation and Primary and Non-Contributory are met when a
 *   current policy carries that endorsement.
 * - Notice of Cancellation is met when a current policy gives at least the
 *   days asked for.
 * - Anything else (Other, or a code added to the list later) is Ask Your Broker.
 */
export function compareRequest(
  req: { coverages: CoverageRequirement[]; endorsements: EndorsementRequirement[] },
  policies: PolicyLike[],
  options: RequirementOption[],
  todayMs: number,
): ComparisonLine[] {
  const live = policies.filter((p) => !p.archived_at && itemStatus(p.expiration_date, todayMs) === "current");
  const label = (kind: string, code: string) =>
    options.find((o) => o.kind === kind && o.code === code)?.label ?? code.replace(/_/g, " ");

  const lines: ComparisonLine[] = [];

  for (const c of req.coverages ?? []) {
    const meets = live.some((p) => {
      if (p.coverage_code !== c.code) return false;
      const occ = num(p.per_occurrence_limit);
      const agg = num(p.aggregate_limit);
      if (c.per_occurrence != null && (occ == null || occ < c.per_occurrence)) return false;
      if (c.aggregate != null && (agg == null || agg < c.aggregate)) return false;
      if (c.minimum != null && (occ == null || occ < c.minimum)) return false;
      return true;
    });
    lines.push({ kind: "coverage", code: c.code, text: coverageText(c, label("coverage", c.code)), meets });
  }

  for (const e of req.endorsements ?? []) {
    let meets = false;
    if (e.code === "waiver_of_subrogation" || e.code === "primary_non_contributory") {
      meets = live.some((p) => (p.endorsements ?? []).includes(e.code));
    } else if (e.code === "notice_of_cancellation") {
      meets = live.some((p) =>
        p.notice_of_cancellation_days != null && e.days != null && p.notice_of_cancellation_days >= e.days
      );
    }
    lines.push({ kind: "endorsement", code: e.code, text: endorsementText(e, label("endorsement", e.code)), meets });
  }

  return lines;
}

// ── Files ────────────────────────────────────────────────────

export const ALLOWED_FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Base64 length to byte count, without decoding. */
export function base64Bytes(b64: string): number {
  const s = b64.replace(/\s/g, "");
  const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.floor((s.length * 3) / 4) - pad;
}

export function checkFile(
  file: unknown,
): { ok: true; contentType: string; ext: string; base64: string } | { ok: false; error: string } {
  const f = (file ?? {}) as Record<string, unknown>;
  const contentType = typeof f.content_type === "string" ? f.content_type.toLowerCase() : "";
  const base64 = typeof f.base64 === "string" ? f.base64.replace(/^data:[^,]*,/, "") : "";
  const ext = ALLOWED_FILE_TYPES[contentType];
  if (!ext) return { ok: false, error: "The file must be a PDF or a photo (JPEG, PNG, HEIC or WebP)." };
  if (!base64) return { ok: false, error: "The file is empty." };
  if (base64Bytes(base64) > MAX_FILE_BYTES) return { ok: false, error: "The file is larger than 10 MB." };
  return { ok: true, contentType, ext, base64 };
}

/** 32 random bytes as base64url: 43 characters, 256 bits. */
export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
