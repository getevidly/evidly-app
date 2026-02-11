import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PhotoItem {
  id: string;
  base64_data: string;
  activation_id: string;
  step_number: number;
  caption: string;
  content_type?: string;
}

interface BatchUploadRequest {
  device_id: string;
  photos: PhotoItem[];
}

interface UploadResult {
  photo_id: string;
  url?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const { device_id, photos } = (await req.json()) as BatchUploadRequest;

    if (!device_id) {
      return jsonResponse(
        { success: false, error: "device_id is required" },
        400
      );
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return jsonResponse(
        { success: false, error: "photos array is required and must not be empty" },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify device exists
    const { data: device, error: deviceError } = await supabase
      .from("device_registrations")
      .select("id, is_active")
      .eq("id", device_id)
      .single();

    if (deviceError || !device) {
      return jsonResponse(
        { success: false, error: "Device not found" },
        404
      );
    }

    if (!device.is_active) {
      return jsonResponse(
        { success: false, error: "Device is deactivated" },
        403
      );
    }

    const results: UploadResult[] = [];
    let uploadedCount = 0;
    let failedCount = 0;

    for (const photo of photos) {
      try {
        // Decode base64 data to Uint8Array
        const binaryString = atob(photo.base64_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const contentType = photo.content_type || "image/jpeg";
        const extension = contentType === "image/png" ? "png" : "jpg";
        const storagePath = `offline-photos/${device_id}/${photo.id}.${extension}`;

        // Upload to Supabase storage bucket
        const { error: uploadError } = await supabase.storage
          .from("evidence-photos")
          .upload(storagePath, bytes, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          failedCount++;
          results.push({ photo_id: photo.id, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("evidence-photos")
          .getPublicUrl(storagePath);

        uploadedCount++;
        results.push({
          photo_id: photo.id,
          url: urlData.publicUrl,
        });
      } catch (err) {
        failedCount++;
        results.push({
          photo_id: photo.id,
          error: err instanceof Error ? err.message : "Unknown upload error",
        });
      }
    }

    return jsonResponse({
      success: true,
      uploaded_count: uploadedCount,
      failed_count: failedCount,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
