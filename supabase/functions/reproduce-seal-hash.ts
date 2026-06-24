// reproduce-seal-hash.ts — G4 proof: independent hash recomputation
//
// Proves that content_hash can be recomputed from stored data using the
// SAME canonicalization module the seal function uses.
//
// Run with:
//   deno run --allow-net supabase/functions/reproduce-seal-hash.ts
//
// Requires: SUPABASE_URL, SERVICE_ROLE_KEY, SEAL_ID as env vars or hardcoded below.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  canonicalTimestamp,
  buildCanonicalAuthorityJson,
  buildSealHashInput,
  sha256,
} from "./_shared/seal-canonicalization.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://irxgmhxhmxtzfwuieblc.supabase.co";
const SERVICE_KEY  = Deno.env.get("SERVICE_ROLE_KEY") || "<PASTE_SERVICE_ROLE_KEY>";
const SEAL_ID      = Deno.env.get("SEAL_ID") || "<PASTE_SEAL_ID>";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// 1. Fetch the sealed row
const { data: row, error: rowErr } = await supabase
  .from("inspection_reports")
  .select("sealed_at, sealed_by, content_hash, supersedes_id, source_file_url, pillar, inspection_date, raw_result, raw_result_type, numeric_equivalent, violations, critical_violations, non_critical_violations, inspector_name")
  .eq("id", SEAL_ID)
  .single();

if (rowErr || !row) {
  console.error("Failed to fetch row:", rowErr);
  Deno.exit(1);
}

// 2. Parse source_file_url ("bucket:path") and download the file
const colonIdx = row.source_file_url.indexOf(":");
const bucket = row.source_file_url.slice(0, colonIdx);
const path = row.source_file_url.slice(colonIdx + 1);

const { data: fileData, error: fileErr } = await supabase.storage
  .from(bucket)
  .download(path);

if (fileErr || !fileData) {
  console.error("Failed to download file:", fileErr);
  Deno.exit(1);
}
const documentBytes = await fileData.arrayBuffer();

// 3. Re-canonicalize sealed_at from stored value
const sealedAtCanonical = canonicalTimestamp(new Date(row.sealed_at));

// 4. Build canonical authority JSON (same 9 fields, same order)
const canonicalJson = buildCanonicalAuthorityJson({
  pillar: row.pillar,
  inspection_date: row.inspection_date,
  raw_result: row.raw_result,
  raw_result_type: row.raw_result_type,
  numeric_equivalent: row.numeric_equivalent ?? null,
  violations: row.violations ?? null,
  critical_violations: row.critical_violations ?? null,
  non_critical_violations: row.non_critical_violations ?? null,
  inspector_name: row.inspector_name ?? null,
});

// 5. Predecessor hash
let predecessorHash = "";
if (row.supersedes_id) {
  const { data: pred } = await supabase
    .from("inspection_reports")
    .select("content_hash")
    .eq("id", row.supersedes_id)
    .single();
  if (!pred?.content_hash) {
    console.error("Predecessor has no content_hash");
    Deno.exit(1);
  }
  predecessorHash = pred.content_hash;
}

// 6. Assemble and hash
const hashInput = buildSealHashInput(
  documentBytes,
  canonicalJson,
  sealedAtCanonical,
  row.sealed_by,
  predecessorHash,
);

const recomputedHash = await sha256(hashInput.buffer as ArrayBuffer);

// 7. Report
console.log("═══════════════════════════════════════════════════");
console.log("G4 HASH RECOMPUTATION PROOF");
console.log("═══════════════════════════════════════════════════");
console.log("Seal ID:           ", SEAL_ID);
console.log("Stored sealed_at:  ", row.sealed_at);
console.log("Canonical sealed_at:", sealedAtCanonical);
console.log("Sealed by:         ", row.sealed_by);
console.log("Document bucket:   ", bucket);
console.log("Document path:     ", path);
console.log("Document bytes:    ", documentBytes.byteLength);
console.log("Canonical JSON:    ", canonicalJson.slice(0, 120) + "...");
console.log("Predecessor hash:  ", predecessorHash || "(empty — original)");
console.log("───────────────────────────────────────────────────");
const tsRoundTrip = canonicalTimestamp(new Date(row.sealed_at));
console.log("Timestamp round-trip OK:", tsRoundTrip === sealedAtCanonical ? "YES" : "NO — canonicalization mismatch");
console.log("Stored hash:       ", row.content_hash);
console.log("Recomputed hash:   ", recomputedHash);
console.log("───────────────────────────────────────────────────");
console.log("MATCH:             ", row.content_hash === recomputedHash ? "YES" : "NO — TAMPER DETECTED");
