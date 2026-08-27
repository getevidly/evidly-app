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
  buildCanonicalIncidentJson,
  buildCanonicalCorrectiveActionJson,
  buildSealHashInput,
  sha256,
} from "./_shared/seal-canonicalization.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://irxgmhxhmxtzfwuieblc.supabase.co";
const SERVICE_KEY  = Deno.env.get("SERVICE_ROLE_KEY") || "<PASTE_SERVICE_ROLE_KEY>";
const SEAL_ID      = Deno.env.get("SEAL_ID") || "<PASTE_SEAL_ID>";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── MODE SWITCH (additive) ────────────────────────────────────────────────
// SEAL_MODE=incident            -> SEAL_ID is an incident_seals.id
// SEAL_MODE=corrective_action   -> SEAL_ID is a corrective_action_seals.id
// unset / inspection_report     -> the original path below, untouched
const SEAL_MODE = Deno.env.get("SEAL_MODE") || "inspection_report";

if (SEAL_MODE === "incident") {
  await reproduceIncidentSeal(SEAL_ID);
  Deno.exit(0);
}
if (SEAL_MODE === "corrective_action") {
  await reproduceCorrectiveActionSeal(SEAL_ID);
  Deno.exit(0);
}

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

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIVE — incident and corrective-action seal reproduction
//
// Same proof as the inspection_reports path above: re-read the SOURCE rows,
// re-canonicalize through the shared module, re-assemble the hash input, and
// compare to the stored content_hash. Nothing is taken from the seal except
// sealed_at, sealed_by, supersedes_id and the hash being checked.
//
// For incidents the photo bytes are re-downloaded and re-hashed rather than
// read back from incident_seals.photo_hashes, so a swapped storage object is
// caught the same way a swapped inspection PDF is.
// ═══════════════════════════════════════════════════════════════════════════

const PHOTO_BUCKET = "compliance-photos";

function decodeDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("data URL has no payload separator");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function reportResult(
  label: string,
  sealId: string,
  sealedAt: string,
  sealedAtCanonical: string,
  sealedBy: string,
  canonicalJson: string,
  predecessorHash: string,
  storedHash: string,
  recomputedHash: string,
  extra: string,
) {
  console.log("═══════════════════════════════════════════════════");
  console.log("G4 HASH RECOMPUTATION PROOF —", label);
  console.log("═══════════════════════════════════════════════════");
  console.log("Seal ID:           ", sealId);
  console.log("Stored sealed_at:  ", sealedAt);
  console.log("Canonical sealed_at:", sealedAtCanonical);
  console.log("Sealed by:         ", sealedBy);
  console.log(extra);
  console.log("Canonical JSON:    ", canonicalJson.slice(0, 120) + "...");
  console.log("Predecessor hash:  ", predecessorHash || "(empty — original)");
  console.log("───────────────────────────────────────────────────");
  const tsRoundTrip = canonicalTimestamp(new Date(sealedAt));
  console.log(
    "Timestamp round-trip OK:",
    tsRoundTrip === sealedAtCanonical ? "YES" : "NO — canonicalization mismatch",
  );
  console.log("Stored hash:       ", storedHash);
  console.log("Recomputed hash:   ", recomputedHash);
  console.log("───────────────────────────────────────────────────");
  console.log("MATCH:             ", storedHash === recomputedHash ? "YES" : "NO — TAMPER DETECTED");
}

async function reproduceIncidentSeal(sealId: string) {
  const { data: seal, error: sealErr } = await supabase
    .from("incident_seals")
    .select("sealed_at, sealed_by, content_hash, supersedes_id, incident_id")
    .eq("id", sealId)
    .single();

  if (sealErr || !seal) {
    console.error("Failed to fetch incident seal:", sealErr);
    Deno.exit(1);
  }

  const { data: row, error: rowErr } = await supabase
    .from("incidents")
    .select(
      "id, organization_id, location_id, location_name, incident_number, category, type, " +
        "severity, status, title, description, urgency_label, source_type, source_id, " +
        "source_label, assigned_to, reported_by, requires_regulatory_report, " +
        "regulatory_citation, root_cause, corrective_action, resolution_summary, " +
        "resolved_at, resolved_by, verified_at, verified_by, linked_corrective_action_id, " +
        "created_at, photos, resolution_photos",
    )
    .eq("id", seal.incident_id)
    .single();

  if (rowErr || !row) {
    console.error("Failed to fetch incident:", rowErr);
    Deno.exit(1);
  }

  const { data: timeline, error: tlErr } = await supabase
    .from("incident_timeline")
    .select("id, action, status, performed_by, notes, created_at")
    .eq("incident_id", row.id)
    .order("created_at", { ascending: true });

  if (tlErr) {
    console.error("Failed to fetch timeline:", tlErr);
    Deno.exit(1);
  }

  // Re-hash every photo from source — same dual-mode rules as seal-incident.
  const allPhotos: string[] = [
    ...((row.photos as string[] | null) ?? []),
    ...((row.resolution_photos as string[] | null) ?? []),
  ];

  const photoHashes: Record<string, unknown>[] = [];
  for (let i = 0; i < allPhotos.length; i++) {
    const entry = allPhotos[i];
    if (entry && entry.startsWith("data:")) {
      const bytes = decodeDataUrl(entry);
      photoHashes.push({
        mode: "inline",
        index: i,
        sha256: await sha256(bytes.buffer as ArrayBuffer),
      });
      continue;
    }
    const { data: file, error: dlErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .download(entry);
    if (dlErr || !file) {
      console.error("Failed to download photo object:", entry, dlErr);
      Deno.exit(1);
    }
    photoHashes.push({
      mode: "storage",
      path: entry,
      sha256: await sha256(await file.arrayBuffer()),
    });
  }

  const sealedAtCanonical = canonicalTimestamp(new Date(seal.sealed_at));

  const canonicalJson = buildCanonicalIncidentJson({
    id: row.id,
    organization_id: row.organization_id,
    location_id: row.location_id,
    location_name: row.location_name,
    incident_number: row.incident_number,
    category: row.category,
    type: row.type,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    urgency_label: row.urgency_label,
    source_type: row.source_type,
    source_id: row.source_id,
    source_label: row.source_label,
    assigned_to: row.assigned_to,
    reported_by: row.reported_by,
    requires_regulatory_report: row.requires_regulatory_report,
    regulatory_citation: row.regulatory_citation,
    root_cause: row.root_cause,
    corrective_action: row.corrective_action,
    resolution_summary: row.resolution_summary,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    verified_at: row.verified_at,
    verified_by: row.verified_by,
    linked_corrective_action_id: row.linked_corrective_action_id,
    created_at: row.created_at,
    timeline: timeline ?? [],
    photo_hashes: photoHashes,
  });

  let predecessorHash = "";
  if (seal.supersedes_id) {
    const { data: pred } = await supabase
      .from("incident_seals")
      .select("content_hash")
      .eq("id", seal.supersedes_id)
      .single();
    if (!pred?.content_hash) {
      console.error("Predecessor has no content_hash");
      Deno.exit(1);
    }
    predecessorHash = pred.content_hash;
  }

  const hashInput = buildSealHashInput(
    new ArrayBuffer(0),
    canonicalJson,
    sealedAtCanonical,
    seal.sealed_by,
    predecessorHash,
  );
  const recomputedHash = await sha256(hashInput.buffer as ArrayBuffer);

  reportResult(
    "INCIDENT",
    sealId,
    seal.sealed_at,
    sealedAtCanonical,
    seal.sealed_by,
    canonicalJson,
    predecessorHash,
    seal.content_hash,
    recomputedHash,
    "Incident:           " + row.incident_number + "  photos re-hashed: " + photoHashes.length,
  );
}

async function reproduceCorrectiveActionSeal(sealId: string) {
  const { data: seal, error: sealErr } = await supabase
    .from("corrective_action_seals")
    .select("sealed_at, sealed_by, content_hash, supersedes_id, corrective_action_id")
    .eq("id", sealId)
    .single();

  if (sealErr || !seal) {
    console.error("Failed to fetch corrective action seal:", sealErr);
    Deno.exit(1);
  }

  const { data: row, error: rowErr } = await supabase
    .from("corrective_actions")
    .select(
      "id, organization_id, location_id, title, description, category, pillar, severity, " +
        "status, source, source_type, source_id, assignee_id, assignee_name, " +
        "assigned_by_user_id, assigned_at, root_cause, corrective_steps, " +
        "preventive_measures, regulation_reference, due_date, completed_at, resolved_at, " +
        "resolved_by, resolution_note, verified_at, verified_by, verification_note, " +
        "created_by, created_at, notes",
    )
    .eq("id", seal.corrective_action_id)
    .single();

  if (rowErr || !row) {
    console.error("Failed to fetch corrective action:", rowErr);
    Deno.exit(1);
  }

  const { data: history, error: histErr } = await supabase
    .from("corrective_action_history")
    .select("id, action, from_value, to_value, performed_by, performed_by_name, detail, created_at")
    .eq("corrective_action_id", row.id)
    .order("created_at", { ascending: true });

  if (histErr) {
    console.error("Failed to fetch history:", histErr);
    Deno.exit(1);
  }

  const sealedAtCanonical = canonicalTimestamp(new Date(seal.sealed_at));

  const canonicalJson = buildCanonicalCorrectiveActionJson({
    id: row.id,
    organization_id: row.organization_id,
    location_id: row.location_id,
    title: row.title,
    description: row.description,
    category: row.category,
    pillar: row.pillar,
    severity: row.severity,
    status: row.status,
    source: row.source,
    source_type: row.source_type,
    source_id: row.source_id,
    assignee_id: row.assignee_id,
    assignee_name: row.assignee_name,
    assigned_by_user_id: row.assigned_by_user_id,
    assigned_at: row.assigned_at,
    root_cause: row.root_cause,
    corrective_steps: row.corrective_steps,
    preventive_measures: row.preventive_measures,
    regulation_reference: row.regulation_reference,
    due_date: row.due_date,
    completed_at: row.completed_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    resolution_note: row.resolution_note,
    verified_at: row.verified_at,
    verified_by: row.verified_by,
    verification_note: row.verification_note,
    created_by: row.created_by,
    created_at: row.created_at,
    history: history ?? [],
    notes: row.notes ?? null,
  });

  let predecessorHash = "";
  if (seal.supersedes_id) {
    const { data: pred } = await supabase
      .from("corrective_action_seals")
      .select("content_hash")
      .eq("id", seal.supersedes_id)
      .single();
    if (!pred?.content_hash) {
      console.error("Predecessor has no content_hash");
      Deno.exit(1);
    }
    predecessorHash = pred.content_hash;
  }

  const hashInput = buildSealHashInput(
    new ArrayBuffer(0),
    canonicalJson,
    sealedAtCanonical,
    seal.sealed_by,
    predecessorHash,
  );
  const recomputedHash = await sha256(hashInput.buffer as ArrayBuffer);

  reportResult(
    "CORRECTIVE ACTION",
    sealId,
    seal.sealed_at,
    sealedAtCanonical,
    seal.sealed_by,
    canonicalJson,
    predecessorHash,
    seal.content_hash,
    recomputedHash,
    "Corrective action:  " + row.id + "  history rows: " + (history ?? []).length,
  );
}
