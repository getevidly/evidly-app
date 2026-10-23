/**
 * Sample sealed records for HoodOps demos.
 *
 * Seals RPT-K-SAMPLE.pdf (Report of Service) and CERT-K-SAMPLE.pdf
 * (Certificate of Service) into the one sample organization, so
 * demo.gethoodops.com can link to real /sealed and /verify pages.
 *
 * content_hash is computed with _shared/seal-canonicalization.ts exactly as
 * hoodops-webhook handleDocumentEvent computes it, with fixed sealed_at values
 * and the certificate chained to the report's hash. The PDFs are uploaded to
 * the documents bucket at the webhook's path; create.sql then writes the rows.
 *
 * Idempotent: fixed ids, fixed seal times, fixed files. A stored file that
 * already matches is left alone; one that differs stops the run (a sealed
 * file is never overwritten).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... SEAL_SYSTEM_USER_ID=... \
 *     npx deno run --no-lock --allow-env --allow-read --allow-write --allow-net --allow-run \
 *     scripts/hoodops-sample-records/create.ts
 *
 * Neither secret is ever printed. Revert: revert.sql.
 */

import {
  buildCanonicalServiceJson,
  buildSealHashInput,
  canonicalDateField,
  canonicalTimestamp,
  sha256,
} from "../../supabase/functions/_shared/seal-canonicalization.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://irxgmhxhmxtzfwuieblc.supabase.co";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SEALED_BY = Deno.env.get("SEAL_SYSTEM_USER_ID");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
if (!SEALED_BY || !UUID_RE.test(SEALED_BY)) throw new Error("SEAL_SYSTEM_USER_ID is not set or not a uuid");

const ORG_ID = "7dbf7d73-5074-47c8-9e67-53176956b7ce";
const LOCATION_ID = "57565702-a5b1-4d6a-b690-934d8dd8d71d";
const VENDOR_ID = "3f696ecd-17ce-4cae-80ef-7b13bc7b43e1";
const BUCKET = "documents";
const here = new URL(".", import.meta.url);

/** The 9 hashed fields, as handleDocumentEvent passes them. */
const common = {
  location_id: LOCATION_ID,
  safeguard_type: "hood_cleaning",
  service_type_code: "KEC",
  vendor_name: "Cleaning Pros Plus, LLC",
  vendor_id: VENDOR_ID,
  technician_name: "Sample Technician",
  service_date: canonicalDateField("2026-06-12"),
  organization_id: ORG_ID,
};

const docs = [
  {
    file: "RPT-K-SAMPLE.pdf",
    event: "document.report",
    certNumber: "RPT-K-SAMPLE",
    sealedAt: "2026-06-12T23:00:00Z",
  },
  {
    file: "CERT-K-SAMPLE.pdf",
    event: "document.cert",
    certNumber: "CERT-K-SAMPLE",
    sealedAt: "2026-06-12T23:00:05Z",
  },
];

// ── Storage: upload once, never overwrite ──────────────────────────────────
async function ensureObject(path: string, bytes: Uint8Array): Promise<string> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const auth = { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY! };

  const existing = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${path}`, {
    headers: auth,
  });
  if (existing.ok) {
    const stored = new Uint8Array(await existing.arrayBuffer());
    const same = stored.byteLength === bytes.byteLength &&
      (await sha256(stored.buffer as ArrayBuffer)) === (await sha256(bytes.buffer as ArrayBuffer));
    if (!same) throw new Error(`${path} already exists with different bytes; refusing to overwrite`);
    return "already present, identical";
  }
  await existing.body?.cancel();

  const res = await fetch(url, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/pdf", "x-upsert": "false" },
    body: bytes as Uint8Array<ArrayBuffer>,
  });
  if (!res.ok) throw new Error(`upload of ${path} failed: HTTP ${res.status} ${await res.text()}`);
  return "uploaded";
}

// ── SQL through the linked project; output scrubbed of the seal identity ──
const npx = Deno.build.os === "windows" ? "npx.cmd" : "npx";

async function runSql(args: string[]): Promise<string> {
  const out = await new Deno.Command(npx, {
    args: ["supabase", "db", "query", "--linked", ...args],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const scrub = (b: Uint8Array) =>
    new TextDecoder().decode(b).replaceAll(SEALED_BY!, "<SEAL_SYSTEM_USER_ID>");
  if (!out.success) throw new Error(`SQL failed:\n${scrub(out.stdout)}${scrub(out.stderr)}`);
  return scrub(out.stdout);
}

async function scalar(sql: string): Promise<unknown> {
  const text = await runSql([sql, "-o", "json"]);
  const json = JSON.parse(text.slice(text.indexOf("{")));
  return Object.values(json.rows[0])[0];
}

// ── Main ───────────────────────────────────────────────────────────────────
if (await scalar(`select count(*)::int from user_profiles where id = '${SEALED_BY}'`) !== 1) {
  throw new Error("SEAL_SYSTEM_USER_ID has no user_profiles row; refusing to seal");
}

const values: Record<string, string> = { SEALED_BY };
let predecessorHash = "";

for (const doc of docs) {
  const bytes = await Deno.readFile(new URL(doc.file, here));
  const storagePath = `${ORG_ID}/hoodops/${doc.event}:${doc.certNumber}.pdf`;

  const canonicalJson = buildCanonicalServiceJson({ ...common, cert_number: doc.certNumber });
  const hashInput = buildSealHashInput(
    bytes.buffer as ArrayBuffer,
    canonicalJson,
    canonicalTimestamp(new Date(doc.sealedAt)),
    SEALED_BY,
    predecessorHash,
  );
  const contentHash = await sha256(hashInput.buffer as ArrayBuffer);
  predecessorHash = contentHash; // the certificate chains to the report

  const key = doc.event === "document.report" ? "REPORT" : "CERT";
  values[`${key}_HASH`] = contentHash;
  values[`${key}_BYTES`] = String(bytes.byteLength);

  console.log(`${doc.certNumber}: ${bytes.byteLength} bytes, content_hash ${contentHash}`);
  console.log(`  storage ${BUCKET}:${storagePath}: ${await ensureObject(storagePath, bytes)}`);
}

const foundersBefore = await scalar("select get_founder_count()");

let sql = await Deno.readTextFile(new URL("create.sql", here));
for (const [k, v] of Object.entries(values)) sql = sql.replaceAll(`{{${k}}}`, v);
if (/\{\{\w+\}\}/.test(sql)) throw new Error("create.sql has an unfilled placeholder");

const tmp = await Deno.makeTempFile({ suffix: ".sql" });
try {
  await Deno.writeTextFile(tmp, sql);
  await runSql(["-f", tmp]);
} finally {
  await Deno.remove(tmp);
}

const planTier = await scalar(`select plan_tier from organizations where id = '${ORG_ID}'`);
const foundersAfter = await scalar("select get_founder_count()");
console.log(`rows in place. plan_tier = ${planTier}; get_founder_count() ${foundersBefore} -> ${foundersAfter}`);
if (planTier !== "standard" || foundersAfter !== foundersBefore) {
  throw new Error("plan_tier is not 'standard' or the founder count changed");
}
