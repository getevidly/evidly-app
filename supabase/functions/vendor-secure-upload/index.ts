import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// This function handles:
// 1. GET with token → validates token, returns upload form data (what doc is needed)
// 2. POST with token + file → uploads file to storage, creates document record, marks request complete

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return jsonResponse({ error: "Token required" }, 400);
    }

    // Validate token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("vendor_secure_tokens")
      .select("*, vendors(id, name, contact_name), organizations(id, name)")
      .eq("token", token)
      .is("used_at", null)
      .single();

    if (tokenError || !tokenRecord) {
      return jsonResponse({ error: "Invalid or expired token" }, 404);
    }

    // Check expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return jsonResponse({ error: "This upload link has expired. Contact your client for a new link." }, 410);
    }

    // GET → Return token info for the upload form
    if (req.method === "GET") {
      return jsonResponse({
        valid: true,
        vendor_name: (tokenRecord as any).vendors?.name,
        organization_name: (tokenRecord as any).organizations?.name,
        document_type: tokenRecord.document_type,
        expires_at: tokenRecord.expires_at,
      });
    }

    // POST → Handle file upload
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const notes = formData.get("notes") as string || "";

      if (!file) {
        return jsonResponse({ error: "No file provided" }, 400);
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg", "image/png", "image/heic", "image/heif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        return jsonResponse({ error: "File type not allowed. Please upload PDF, JPG, PNG, or Word document." }, 400);
      }

      // Max 25MB
      if (file.size > 25 * 1024 * 1024) {
        return jsonResponse({ error: "File too large. Maximum 25MB." }, 400);
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop() || "pdf";
      const filePath = `vendor-uploads/${tokenRecord.organization_id}/${tokenRecord.vendor_id}/${Date.now()}.${fileExt}`;

      const fileBuffer = await file.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[UPLOAD] Storage error:", uploadError);
        return jsonResponse({ error: "Failed to upload file" }, 500);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // Create document record
      const { data: docRecord, error: docError } = await supabase
        .from("documents")
        .insert({
          organization_id: tokenRecord.organization_id,
          title: `${tokenRecord.document_type} — ${(tokenRecord as any).vendors?.name}`,
          category: tokenRecord.document_type,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          status: "active",
          tags: ["vendor-upload", "auto-requested"],
        })
        .select()
        .single();

      // Mark token as used
      await supabase
        .from("vendor_secure_tokens")
        .update({
          used_at: new Date().toISOString(),
          document_id: docRecord?.id,
        })
        .eq("id", tokenRecord.id);

      // Mark upload request as completed
      if (tokenRecord.upload_request_id) {
        await supabase
          .from("vendor_upload_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            document_id: docRecord?.id,
          })
          .eq("id", tokenRecord.upload_request_id);
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        organization_id: tokenRecord.organization_id,
        user_id: null, // Vendor upload — no auth user
        action_type: "vendor_upload",
        entity_type: "document",
        entity_id: docRecord?.id,
        description: `${(tokenRecord as any).vendors?.name} uploaded ${tokenRecord.document_type} via secure link`,
        metadata: {
          vendor_id: tokenRecord.vendor_id,
          token_id: tokenRecord.id,
          file_name: file.name,
          file_size: file.size,
          notes,
        },
      });

      return jsonResponse({
        success: true,
        message: "Document uploaded successfully! Your client has been notified.",
        document_id: docRecord?.id,
      });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("Error in vendor-secure-upload:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
