// ═══════════════════════════════════════════════════════════════════════════════
// seal-canonicalization.ts — Shared canonicalization for evidentiary seals
//
// THIS IS THE SINGLE SOURCE OF TRUTH for how seal hashes are built.
// Used by:  seal-inspection-report  (Food Step 2 — creates food seals)
//           verify-inspection-report(Food Step 5 — tamper-checks food seals)
//           seal-service-record     (Fire Step 2 — creates fire seals)
//           pl-release-report       (Policy Lens B4 — seals report at release)
//           G4 test scripts         (proves hash reproducibility)
//
// If you change ANY logic here, every existing content_hash becomes
// non-reproducible. Do not change without a versioned migration plan.
// ═══════════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// 1. TIMESTAMP CANONICALIZATION
//
// Contract:
//   • Input:  any JavaScript Date object
//   • Output: exactly "YYYY-MM-DDTHH:MM:SSZ"  (20 characters)
//   • Truncated to whole seconds (floor, not round)
//   • Always UTC, always trailing "Z", never "+00:00"
//   • No fractional seconds, no milliseconds
//
// This is what gets hashed AND what gets stored in sealed_at.
// The verifier reads sealed_at back from Postgres, parses to Date,
// and re-canonicalizes — producing the identical 20-char string because
// the stored value has zero fractional seconds.
//
// Examples:
//   new Date("2026-06-17T14:30:45.789Z")  →  "2026-06-17T14:30:45Z"
//   new Date("2026-01-01T00:00:00.000Z")  →  "2026-01-01T00:00:00Z"
// ---------------------------------------------------------------------------
export function canonicalTimestamp(date: Date): string {
  // Floor to whole second
  const ms = Math.floor(date.getTime() / 1000) * 1000;
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`;
}

// ---------------------------------------------------------------------------
// 2. DETERMINISTIC JSON SERIALIZATION
//
// Recursively sorts object keys alphabetically so the same data always
// produces the same string regardless of insertion order.
//
// Type rules:
//   null / undefined  →  "null"
//   boolean           →  "true" or "false"
//   number            →  bare number, no quotes:  96 → "96",  3.14 → "3.14"
//                        (uses String(n), which matches JSON.stringify for
//                        all finite numbers; NaN/Infinity cannot appear in
//                        valid JSON from Postgres)
//   string            →  JSON-quoted:  "hello" → '"hello"'
//   array             →  preserves element order, recurses into elements
//   object            →  keys sorted alphabetically, recurses into values
// ---------------------------------------------------------------------------
export function sortedJsonStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(sortedJsonStringify).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(
    (k) => JSON.stringify(k) + ":" + sortedJsonStringify(obj[k]),
  );
  return "{" + pairs.join(",") + "}";
}

// ---------------------------------------------------------------------------
// 3. CANONICAL AUTHORITY JSON
//
// FIXED KEY ORDER — this is the contract. The nine authority fields are
// serialized in THIS exact sequence. Do NOT sort. Do NOT use JSON.stringify
// on an object literal (JS key order is not guaranteed across engines).
//
// Key order (immutable):
//   1. pillar                 (string)
//   2. inspection_date        (string, "YYYY-MM-DD")
//   3. raw_result             (string)
//   4. raw_result_type        (string)
//   5. numeric_equivalent     (number or null — bare: 96, not "96")
//   6. violations             (jsonb — sorted keys recursively via sortedJsonStringify)
//   7. critical_violations    (integer or null — bare: 0, not "0")
//   8. non_critical_violations(integer or null — bare: 2, not "2")
//   9. inspector_name         (string or null)
//
// Null handling: null/undefined/absent → JSON null literal.
//   Missing vs. explicit null → identical output.
//
// numeric_equivalent, critical_violations, non_critical_violations:
//   These are numbers. JSON.stringify(96) → "96" (bare number token).
//   JSON.stringify(null) → "null". Both are unquoted in JSON.
//   The verifier MUST use the same JSON.stringify path, not String().
//
// Example output:
//   {"pillar":"food_safety","inspection_date":"2026-06-10","raw_result":"A",
//    "raw_result_type":"letter_grade","numeric_equivalent":96,"violations":
//    [{"code":"114099","description":"...","severity":"minor"}],
//    "critical_violations":0,"non_critical_violations":2,
//    "inspector_name":"J. Martinez"}
// ---------------------------------------------------------------------------
export function buildCanonicalAuthorityJson(
  fields: Record<string, unknown>,
): string {
  const CANONICAL_KEYS: string[] = [
    "pillar",
    "inspection_date",
    "raw_result",
    "raw_result_type",
    "numeric_equivalent",
    "violations",
    "critical_violations",
    "non_critical_violations",
    "inspector_name",
  ];

  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const val = fields[key] ?? null;
    let serialized: string;
    if (key === "violations") {
      // violations is jsonb — use sortedJsonStringify for recursive key sorting
      serialized = sortedJsonStringify(val);
    } else {
      // All other fields: JSON.stringify handles numbers (bare), strings
      // (quoted), and null correctly. This is the SAME path the verifier uses.
      serialized = JSON.stringify(val);
    }
    parts.push(JSON.stringify(key) + ":" + serialized);
  }
  return "{" + parts.join(",") + "}";
}

// ---------------------------------------------------------------------------
// 3b. CANONICAL SERVICE JSON (Fire Pillar)
//
// FIXED KEY ORDER — this is the contract. The nine service authority fields
// are serialized in THIS exact sequence. Do NOT sort. Do NOT use
// JSON.stringify on an object literal.
//
// Key order (immutable):
//   1. location_id          (uuid string or null)
//   2. safeguard_type       (string: hood_cleaning|fire_suppression|fire_alarm|sprinklers)
//   3. service_type_code    (string or null)
//   4. vendor_name          (string or null)
//   5. vendor_id            (uuid string or null)
//   6. technician_name      (string or null)
//   7. cert_number          (string)
//   8. service_date         (string, "YYYY-MM-DD")
//   9. organization_id      (uuid string)
//
// All fields are simple types (string, uuid, null). No complex types
// like violations/jsonb — plain JSON.stringify for all values.
// ---------------------------------------------------------------------------
export function buildCanonicalServiceJson(
  fields: Record<string, unknown>,
): string {
  const CANONICAL_KEYS: string[] = [
    "location_id",
    "safeguard_type",
    "service_type_code",
    "vendor_name",
    "vendor_id",
    "technician_name",
    "cert_number",
    "service_date",
    "organization_id",
  ];

  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const val = fields[key] ?? null;
    parts.push(JSON.stringify(key) + ":" + JSON.stringify(val));
  }
  return "{" + parts.join(",") + "}";
}

// ---------------------------------------------------------------------------
// 3c. CANONICAL DRIFT RESOLUTION JSON
//
// FIXED KEY ORDER — this is the contract. The eight resolution fields
// are serialized in THIS exact sequence. Do NOT sort.
//
// Key order (immutable):
//   1. drift_catch_id      (uuid string)
//   2. drift_type           (string)
//   3. pillar               (string: food_safety | fire_safety)
//   4. requirement_source   (string or null)
//   5. source_table         (string)
//   6. source_record_id     (uuid string or null)
//   7. resolved_at          (string, canonical timestamp "YYYY-MM-DDTHH:MM:SSZ")
//   8. resolved_by          (uuid string)
//
// All fields are simple types. Plain JSON.stringify for all values.
// ---------------------------------------------------------------------------
export function buildCanonicalResolutionJson(
  fields: Record<string, unknown>,
): string {
  const CANONICAL_KEYS: string[] = [
    "drift_catch_id",
    "drift_type",
    "pillar",
    "requirement_source",
    "source_table",
    "source_record_id",
    "resolved_at",
    "resolved_by",
  ];

  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const val = fields[key] ?? null;
    parts.push(JSON.stringify(key) + ":" + JSON.stringify(val));
  }
  return "{" + parts.join(",") + "}";
}

// ---------------------------------------------------------------------------
// 3d. CANONICAL POLICY-LENS REPORT JSON
//
// FIXED KEY ORDER — this is the contract. The seven report fields are
// serialized in THIS exact sequence. Do NOT sort the top-level keys. Do NOT
// use JSON.stringify on an object literal (JS key order is not guaranteed).
//
// Key order (immutable):
//   1. run_id               (uuid string)
//   2. intake_id            (uuid string)
//   3. recipient_party_id   (uuid string or null)
//   4. broker_display_name  (string or null)
//   5. coverage             (jsonb — run.reconciled coverage; sortedJsonStringify)
//   6. findings             (jsonb array — corrected source records; sortedJsonStringify)
//   7. render               (jsonb array — shaped findings, BOTH voices per element,
//                            verbatim as the read functions return them; sortedJsonStringify)
//
// Scalars (1–4): JSON.stringify — quoted strings or null, the SAME path verify uses.
// Complex (5–7): sortedJsonStringify — recursive alphabetical key sort, so
//   insertion order inside these blobs cannot change the hash.
//
//   ⚠ ARRAY ORDER IS PRESERVED. sortedJsonStringify sorts object KEYS, not
//   array elements. The compose step (B4c) MUST order `findings` (and any
//   nested arrays inside `render`) by a stable key — e.g. finding id ASC —
//   before sealing, or the hash will not reproduce.
//
//   ⚠ report_jsonb MUST contain ONLY these seven keys. The builder ignores any
//   extra key, so an un-listed field would be stored-but-not-hashed — a silent
//   tamper surface. Compose builds exactly this shape, nothing more.
//
// Reports have NO document bytes: callers pass an empty ArrayBuffer to
// buildSealHashInput, and predecessorHash = "" (one seal per run, no chain).
//
// Null handling: null/undefined/absent → JSON null literal. Missing vs.
//   explicit null → identical output.
// ---------------------------------------------------------------------------
export function buildCanonicalReportJson(
  fields: Record<string, unknown>,
): string {
  const CANONICAL_KEYS: string[] = [
    "run_id",
    "intake_id",
    "recipient_party_id",
    "broker_display_name",
    "coverage",
    "findings",
    "render",
  ];

  const COMPLEX_KEYS = new Set<string>([
    "coverage",
    "findings",
    "render",
  ]);

  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const val = fields[key] ?? null;
    let serialized: string;
    if (COMPLEX_KEYS.has(key)) {
      // jsonb-like — recursive key sort so insertion order is irrelevant.
      serialized = sortedJsonStringify(val);
    } else {
      // scalar — JSON.stringify (bare numbers, quoted strings, null).
      serialized = JSON.stringify(val);
    }
    parts.push(JSON.stringify(key) + ":" + serialized);
  }
  return "{" + parts.join(",") + "}";
}

// ---------------------------------------------------------------------------
// 4. HASH INPUT ASSEMBLY
//
// Concatenates the five hash-input components with an unambiguous separator.
//
// Byte layout:
//   documentBytes (raw file bytes, Uint8Array)
//   "\n--SEP--\n"  (9 UTF-8 bytes)
//   canonicalJson  (UTF-8 encoded string)
//   "\n--SEP--\n"
//   sealedAtCanonical (exactly "YYYY-MM-DDTHH:MM:SSZ", 20 UTF-8 bytes)
//   "\n--SEP--\n"
//   sealedBy       (UUID string, 36 UTF-8 bytes)
//   "\n--SEP--\n"
//   predecessorHash (64-char hex string, or "" for originals)
//
// The separator "\n--SEP--\n" cannot appear inside any component:
//   - document bytes: binary, separator is a text pattern
//   - canonical JSON: no unescaped newlines in JSON strings
//   - timestamps/UUIDs/hex: no newlines or dashes-in-sequence
//
// To reproduce this hash:
//   1. Download the same file from the same bucket:path
//   2. Call buildCanonicalAuthorityJson with the 9 stored authority fields
//   3. Call canonicalTimestamp(new Date(stored_sealed_at))
//   4. Use the stored sealed_by UUID string
//   5. Use the predecessor's content_hash (or "" for originals)
//   6. Call buildSealHashInput with all five
//   7. SHA-256 the .buffer — must match stored content_hash
// ---------------------------------------------------------------------------
const SEP = "\n--SEP--\n";
const encoder = new TextEncoder();

export function buildSealHashInput(
  documentBytes: ArrayBuffer,
  canonicalJson: string,
  sealedAtCanonical: string,
  sealedBy: string,
  predecessorHash: string,
): Uint8Array {
  const textParts = encoder.encode(
    SEP +
      canonicalJson +
      SEP +
      sealedAtCanonical +
      SEP +
      sealedBy +
      SEP +
      predecessorHash,
  );

  const result = new Uint8Array(documentBytes.byteLength + textParts.byteLength);
  result.set(new Uint8Array(documentBytes), 0);
  result.set(textParts, documentBytes.byteLength);
  return result;
}

// ---------------------------------------------------------------------------
// 5. SHA-256 (reused from document-scan/index.ts:97-104)
// ---------------------------------------------------------------------------
export async function sha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// 6. TIMESTAMP FIELD CANONICALIZATION (additive - used by 3e/3f only)
//
// Every timestamptz that enters a canonical JSON goes through canonicalTimestamp,
// so a value read back from Postgres re-canonicalizes to the identical 20-char
// string no matter what fractional-second precision the driver hands back.
//
// null / undefined / empty  ->  null (JSON null literal)
// unparseable               ->  the raw value, unchanged (never silently drops data)
// ---------------------------------------------------------------------------
export function canonicalTimestampField(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return String(value);
  return canonicalTimestamp(d);
}

// ---------------------------------------------------------------------------
// Shared row normalizer for the two history arrays (timeline / CA history).
//
// Sorts by (created_at, id) ascending - a total order - and canonicalizes each
// row created_at. Anything that is not an array comes back as an empty array,
// so a null column and an empty column hash identically.
//
// sortedJsonStringify sorts object KEYS, not array elements, so this explicit
// sort is what makes array order reproducible between seal and verify.
// ---------------------------------------------------------------------------
function canonicalizeHistoryRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  const rows = value.map((row) => {
    const r = { ...(row as Record<string, unknown>) };
    if ("created_at" in r) r.created_at = canonicalTimestampField(r.created_at);
    return r;
  });
  rows.sort((a, b) => {
    const at = String(a.created_at ?? "");
    const bt = String(b.created_at ?? "");
    if (at !== bt) return at < bt ? -1 : 1;
    const ai = String(a.id ?? "");
    const bi = String(b.id ?? "");
    return ai < bi ? -1 : ai > bi ? 1 : 0;
  });
  return rows;
}

// ---------------------------------------------------------------------------
// 3e. CANONICAL INCIDENT JSON
//
// FIXED KEY ORDER - this is the contract. Thirty keys: the twenty-eight
// substantive incident columns, then timeline, then photo_hashes.
// Do NOT sort the top-level keys. Do NOT use JSON.stringify on an object literal.
//
// Key order (immutable):
//    1. id                            16. assigned_to
//    2. organization_id               17. reported_by
//    3. location_id                   18. requires_regulatory_report
//    4. location_name                 19. regulatory_citation
//    5. incident_number               20. root_cause
//    6. category                      21. corrective_action
//    7. type                          22. resolution_summary
//    8. severity                      23. resolved_at    (canonical ts)
//    9. status                        24. resolved_by
//   10. title                         25. verified_at    (canonical ts)
//   11. description                   26. verified_by
//   12. urgency_label                 27. linked_corrective_action_id
//   13. source_type                   28. created_at     (canonical ts)
//   14. source_id                     29. timeline       (jsonb array)
//   15. source_label                  30. photo_hashes   (jsonb array)
//
// timeline: incident_timeline rows, each {id, action, status, performed_by,
//   notes, created_at}, normalized by canonicalizeHistoryRows - total ordering
//   on (created_at, id) and per-row timestamp canonicalization.
//
// photo_hashes: the array written to incident_seals.photo_hashes verbatim -
//   {mode:"storage", path, sha256} or {mode:"inline", index, sha256}. The caller
//   supplies it already in photos-then-resolution_photos order.
// ---------------------------------------------------------------------------
export function buildCanonicalIncidentJson(
  fields: Record<string, unknown>,
): string {
  const CANONICAL_KEYS: string[] = [
    "id",
    "organization_id",
    "location_id",
    "location_name",
    "incident_number",
    "category",
    "type",
    "severity",
    "status",
    "title",
    "description",
    "urgency_label",
    "source_type",
    "source_id",
    "source_label",
    "assigned_to",
    "reported_by",
    "requires_regulatory_report",
    "regulatory_citation",
    "root_cause",
    "corrective_action",
    "resolution_summary",
    "resolved_at",
    "resolved_by",
    "verified_at",
    "verified_by",
    "linked_corrective_action_id",
    "created_at",
    "timeline",
    "photo_hashes",
  ];

  const TIMESTAMP_KEYS = new Set<string>([
    "resolved_at",
    "verified_at",
    "created_at",
  ]);

  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const val = fields[key] ?? null;
    let serialized: string;
    if (key === "timeline") {
      serialized = sortedJsonStringify(canonicalizeHistoryRows(val));
    } else if (key === "photo_hashes") {
      serialized = sortedJsonStringify(val);
    } else if (TIMESTAMP_KEYS.has(key)) {
      serialized = JSON.stringify(canonicalTimestampField(val));
    } else {
      serialized = JSON.stringify(val);
    }
    parts.push(JSON.stringify(key) + ":" + serialized);
  }
  return "{" + parts.join(",") + "}";
}

// ---------------------------------------------------------------------------
// 3f. CANONICAL CORRECTIVE ACTION JSON
//
// FIXED KEY ORDER - this is the contract. Thirty-two keys: the thirty
// substantive corrective_actions columns, then history, then notes.
// Do NOT sort the top-level keys.
//
// Timestamp columns (canonicalized): assigned_at, completed_at, resolved_at,
//   verified_at, created_at.
//
// due_date is a DATE column, not timestamptz. It is serialized as the plain
//   "YYYY-MM-DD" string Postgres returns and is never widened to a timestamp,
//   so a date cannot drift by a timezone hour between seal and verify.
//
// history: corrective_action_history rows, each {id, action, from_value,
//   to_value, performed_by, performed_by_name, detail, created_at}, normalized
//   by canonicalizeHistoryRows - the same total ordering used for 3e timeline.
//
// notes: the jsonb column exactly as stored. sortedJsonStringify sorts its keys
//   recursively, so insertion order inside the blob cannot move the hash.
// ---------------------------------------------------------------------------
export function buildCanonicalCorrectiveActionJson(
  fields: Record<string, unknown>,
): string {
  const CANONICAL_KEYS: string[] = [
    "id",
    "organization_id",
    "location_id",
    "title",
    "description",
    "category",
    "pillar",
    "severity",
    "status",
    "source",
    "source_type",
    "source_id",
    "assignee_id",
    "assignee_name",
    "assigned_by_user_id",
    "assigned_at",
    "root_cause",
    "corrective_steps",
    "preventive_measures",
    "regulation_reference",
    "due_date",
    "completed_at",
    "resolved_at",
    "resolved_by",
    "resolution_note",
    "verified_at",
    "verified_by",
    "verification_note",
    "created_by",
    "created_at",
    "history",
    "notes",
  ];

  const TIMESTAMP_KEYS = new Set<string>([
    "assigned_at",
    "completed_at",
    "resolved_at",
    "verified_at",
    "created_at",
  ]);

  const parts: string[] = [];
  for (const key of CANONICAL_KEYS) {
    const val = fields[key] ?? null;
    let serialized: string;
    if (key === "history") {
      serialized = sortedJsonStringify(canonicalizeHistoryRows(val));
    } else if (key === "notes") {
      serialized = sortedJsonStringify(val);
    } else if (TIMESTAMP_KEYS.has(key)) {
      serialized = JSON.stringify(canonicalTimestampField(val));
    } else {
      serialized = JSON.stringify(val);
    }
    parts.push(JSON.stringify(key) + ":" + serialized);
  }
  return "{" + parts.join(",") + "}";
}
