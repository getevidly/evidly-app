import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

// ---------------------------------------------------------------------------
// Cloud File Import — server-side fetch from cloud provider download URLs
// ---------------------------------------------------------------------------
// Accepts a temporary download URL from Google Drive / OneDrive / Dropbox
// picker APIs, fetches the file, and returns it as base64 for client-side
// processing through the same validation & scanning pipeline.
//
// Never stores OAuth refresh tokens — relies on picker-generated temp URLs.
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — matches client-side limit
const FETCH_TIMEOUT_MS = 30_000;

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const { url, filename, mimeType, importSource } = await req.json();

    if (!url || !filename) {
      return jsonResponse({ success: false, error: "Missing required fields: url, filename" }, 400);
    }

    // Validate import source
    const validSources = ["google_drive", "onedrive", "dropbox"];
    if (importSource && !validSources.includes(importSource)) {
      return jsonResponse({ success: false, error: `Invalid import source: ${importSource}` }, 400);
    }

    // Fetch the file from the cloud provider with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "EvidLY-Cloud-Import/1.0",
        },
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return jsonResponse({
          success: false,
          error: "File download timed out. The file may be too large or the provider is unresponsive.",
        }, 408);
      }
      return jsonResponse({
        success: false,
        error: `File unavailable: ${fetchErr.message}`,
      }, 502);
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const statusMessages: Record<number, string> = {
        401: "Permission denied — the file link has expired or access was revoked.",
        403: "Permission denied — you do not have access to this file.",
        404: "File not found — it may have been moved or deleted.",
        410: "File no longer available — the download link has expired.",
        429: "Too many requests — please try again in a moment.",
      };
      const reason = statusMessages[response.status] || `Provider returned HTTP ${response.status}`;
      return jsonResponse({ success: false, error: reason }, 422);
    }

    // Check content length before downloading
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return jsonResponse({
        success: false,
        error: `File too large (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB). Maximum file size is 10MB.`,
      }, 413);
    }

    // Read the response body
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_FILE_SIZE) {
      return jsonResponse({
        success: false,
        error: `File too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB). Maximum file size is 10MB.`,
      }, 413);
    }

    if (buffer.byteLength < 5 * 1024) {
      return jsonResponse({
        success: false,
        error: "File too small (minimum 5KB). This may not be a valid document.",
      }, 422);
    }

    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const fileBase64 = btoa(binary);

    return jsonResponse({
      success: true,
      fileBase64,
      filename,
      mimeType: mimeType || response.headers.get("content-type") || "application/octet-stream",
      importSource: importSource || "direct",
      fileSize: buffer.byteLength,
    });
  } catch (error) {
    console.error("[cloud-file-import] Error:", error);
    return jsonResponse({
      success: false,
      error: (error as Error).message || "Unexpected error during file import",
    }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
