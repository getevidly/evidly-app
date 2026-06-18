// ═══════════════════════════════════════════════════════════════════════════════
// seal-canonicalization.ts — Shared canonicalization for evidentiary seals
//
// THIS IS THE SINGLE SOURCE OF TRUTH for how seal hashes are built.
// Used by:  seal-inspection-report  (Food Step 2 — creates food seals)
//           verify-inspection-report(Food Step 5 — tamper-checks food seals)
//           seal-service-record     (Fire Step 2 — creates fire seals)
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
