import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// document-scan — Layer 2: Backend magic-byte validation
// ---------------------------------------------------------------------------
// Called after a document is uploaded to Supabase Storage.
// 1. Downloads the file from storage
// 2. Validates magic bytes match the declared MIME type
// 3. Computes SHA-256 hash
// 4. Logs a security_event (Layer 4)
// 5. On mismatch: moves file to quarantined/ bucket, updates document status,
//    and creates an admin notification (Layer 5)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Magic byte signatures for allowed file types
const MAGIC_SIGNATURES: {
  mime: string;
  bytes: number[];
  offset?: number;
}[] = [
  // PDF: %PDF
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  // JPEG: FF D8 FF
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // DOCX / XLSX (ZIP-based): PK (50 4B 03 04)
  { mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
];

// DOCX and XLSX are ZIP archives — we check for PK magic bytes
const ZIP_BASED_MIMES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// CSV is plain text — no magic bytes, just verify it's valid UTF-8 text
const TEXT_MIMES = ["text/csv", "text/plain"];

/**
 * Check if the file's first bytes match the expected magic signature
 * for the declared MIME type.
 */
function validateMagicBytes(
  header: Uint8Array,
  declaredMime: string
): { valid: boolean; detectedType: string } {
  // CSV/plain text — verify first bytes are printable ASCII/UTF-8
  if (TEXT_MIMES.includes(declaredMime)) {
    const isText = header.every(
      (b) => b === 0x0a || b === 0x0d || b === 0x09 || (b >= 0x20 && b <= 0x7e)
    );
    return {
      valid: isText,
      detectedType: isText ? "text/csv" : "binary",
    };
  }

  // ZIP-based formats (DOCX, XLSX) — check for PK signature
  if (ZIP_BASED_MIMES.includes(declaredMime)) {
    const pkSig = MAGIC_SIGNATURES.find((s) => s.mime === "application/zip")!;
    const match = pkSig.bytes.every((b, i) => header[i] === b);
    return {
      valid: match,
      detectedType: match ? declaredMime : detectType(header),
    };
  }

  // Direct MIME match
  const sig = MAGIC_SIGNATURES.find((s) => s.mime === declaredMime);
  if (!sig) {
    return { valid: false, detectedType: "unknown" };
  }

  const offset = sig.offset ?? 0;
  const match = sig.bytes.every((b, i) => header[offset + i] === b);
  return {
    valid: match,
    detectedType: match ? declaredMime : detectType(header),
  };
}

/** Best-effort detection of what the file actually is */
function detectType(header: Uint8Array): string {
  for (const sig of MAGIC_SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (sig.bytes.every((b, i) => header[offset + i] === b)) {
      return sig.mime;
    }
  }
  return "unknown";
}

/** Compute SHA-256 hash of file contents */
async function sha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const {
      document_id,
      storage_path,
      storage_bucket,
      declared_mime,
      user_id,
      organization_id,
      file_name,
    } = body;

    if (!storage_path || !declared_mime || !document_id) {
      return jsonResponse(
        { error: "Missing required fields: document_id, storage_path, declared_mime" },
        400
      );
    }

    // 1. Download file from storage
    const bucket = storage_bucket || "documents";
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(storage_path);

    if (downloadError || !fileData) {
      // Log failed scan attempt
      await supabase.from("security_events").insert({
        user_id: user_id || null,
        document_id,
        file_hash: null,
        scan_result: "download_failed",
        event_type: "scan_error",
        metadata: { storage_path, bucket, error: downloadError?.message },
      });

      return jsonResponse({ error: "Failed to download file for scanning" }, 500);
    }

    // 2. Read file bytes
    const arrayBuffer = await fileData.arrayBuffer();
    const header = new Uint8Array(arrayBuffer.slice(0, 16));

    // 3. Compute SHA-256 hash
    const fileHash = await sha256(arrayBuffer);

    // 4. Validate magic bytes
    const { valid, detectedType } = validateMagicBytes(header, declared_mime);

    if (valid) {
      // ── CLEAN: file passes scan ──
      // Update document status to "available"
      await supabase
        .from("documents")
        .update({ scan_status: "available" })
        .eq("id", document_id);

      // Log clean scan (Layer 4)
      await supabase.from("security_events").insert({
        user_id: user_id || null,
        document_id,
        file_hash: fileHash,
        scan_result: "clean",
        event_type: "upload_scan",
        metadata: {
          declared_mime,
          detected_type: detectedType,
          file_name,
          file_size: arrayBuffer.byteLength,
          storage_path,
        },
      });

      return jsonResponse({
        status: "available",
        file_hash: fileHash,
        declared_mime,
        detected_type: detectedType,
      });
    }

    // ── QUARANTINED: magic bytes mismatch ──

    // Move file to quarantined/ bucket path
    const quarantinePath = `quarantined/${fileHash}_${file_name || "unknown"}`;

    // Copy to quarantine location
    const quarantineBlob = new Blob([arrayBuffer], { type: "application/octet-stream" });
    await supabase.storage.from(bucket).upload(quarantinePath, quarantineBlob, {
      contentType: "application/octet-stream",
      upsert: true,
    });

    // Remove original file
    await supabase.storage.from(bucket).remove([storage_path]);

    // Update document record to quarantined
    await supabase
      .from("documents")
      .update({
        scan_status: "quarantined",
        file_url: null, // Remove access to quarantined file
      })
      .eq("id", document_id);

    // Log quarantine event (Layer 4)
    await supabase.from("security_events").insert({
      user_id: user_id || null,
      document_id,
      file_hash: fileHash,
      scan_result: "quarantined",
      event_type: "upload_scan",
      metadata: {
        declared_mime,
        detected_type: detectedType,
        file_name,
        file_size: arrayBuffer.byteLength,
        storage_path,
        quarantine_path: quarantinePath,
        reason: `Magic bytes mismatch: declared ${declared_mime}, detected ${detectedType}`,
      },
    });

    // Layer 5: Create admin notification for quarantined file
    if (organization_id) {
      await supabase.from("admin_notifications").insert({
        organization_id,
        notification_type: "file_quarantined",
        title: `File quarantined: ${file_name || "unknown"}`,
        body: `A file uploaded by user ${user_id || "unknown"} was quarantined. Declared type: ${declared_mime}, detected type: ${detectedType}. The file has been moved to quarantine and is not accessible.`,
        severity: "high",
        metadata: {
          document_id,
          file_name,
          file_hash: fileHash,
          declared_mime,
          detected_type: detectedType,
          user_id,
          quarantine_path: quarantinePath,
        },
      });
    }

    return jsonResponse({
      status: "quarantined",
      file_hash: fileHash,
      declared_mime,
      detected_type: detectedType,
      reason: `File content does not match declared type. Expected ${declared_mime}, found ${detectedType}.`,
    });
  } catch (err) {
    console.error("document-scan error:", err);
    return jsonResponse({ error: "Internal scan error" }, 500);
  }
});
