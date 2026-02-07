import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Generates a compliance package containing:
// 1. Cover page with compliance score and organization info
// 2. Table of contents listing all included documents
// 3. Document status summary (what's current, expired, missing)
// 4. Each included document (fetched from storage)
// Returns a combined PDF or a ZIP file

interface PackageRequest {
  package_type: "inspection" | "insurance" | "landlord" | "custom";
  location_id?: string;
  document_ids: string[];
  include_score_report: boolean;
  include_temp_summary: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*, organizations(id, name)")
      .eq("id", user.id)
      .single();

    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);

    const payload: PackageRequest = await req.json();
    const orgId = profile.organization_id;

    // Fetch requested documents
    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("organization_id", orgId)
      .in("id", payload.document_ids);

    if (!documents || documents.length === 0) {
      return jsonResponse({ error: "No documents found" }, 404);
    }

    // Build package manifest
    const now = new Date();
    const manifest = {
      generated_at: now.toISOString(),
      generated_by: profile.full_name,
      organization: (profile as any).organizations?.name,
      package_type: payload.package_type,
      document_count: documents.length,
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        expiration_date: doc.expiration_date,
        status: getDocStatus(doc.expiration_date),
        file_url: doc.file_url,
      })),
      compliance_summary: {
        current: documents.filter((d) => getDocStatus(d.expiration_date) === "current").length,
        expiring_soon: documents.filter((d) => getDocStatus(d.expiration_date) === "expiring").length,
        expired: documents.filter((d) => getDocStatus(d.expiration_date) === "expired").length,
        no_expiration: documents.filter((d) => !d.expiration_date).length,
      },
    };

    // Fetch temp log summary if requested
    let tempSummary = null;
    if (payload.include_temp_summary) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: tempLogs } = await supabase
        .from("temp_logs")
        .select("*")
        .eq("organization_id", orgId)
        .gte("recorded_at", thirtyDaysAgo.toISOString())
        .order("recorded_at", { ascending: false });

      if (tempLogs) {
        const total = tempLogs.length;
        const outOfRange = tempLogs.filter((l) => l.status === "out_of_range").length;
        tempSummary = {
          period: "Last 30 days",
          total_readings: total,
          in_range: total - outOfRange,
          out_of_range: outOfRange,
          compliance_rate: total > 0 ? Math.round(((total - outOfRange) / total) * 100) : 0,
        };
      }
    }

    // Store the package record for sharing
    const packageToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    // For now, return the manifest as JSON (PDF generation would use a library like pdf-lib)
    // In production, you'd generate a PDF here and store it in Supabase Storage
    const packageData = {
      ...manifest,
      temp_summary: tempSummary,
      share_token: packageToken,
      share_url: `${Deno.env.get("APP_URL") || "https://app.getevidly.com"}/package/${packageToken}`,
    };

    // Log the package generation
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      user_id: user.id,
      action_type: "package_generated",
      entity_type: "compliance_package",
      description: `Generated ${payload.package_type} compliance package with ${documents.length} documents`,
      metadata: packageData,
    });

    return jsonResponse({
      success: true,
      package: packageData,
    });
  } catch (error) {
    console.error("Error in generate-compliance-package:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

function getDocStatus(expirationDate: string | null): string {
  if (!expirationDate) return "no_expiration";
  const now = new Date();
  const expDate = new Date(expirationDate);
  const daysUntil = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 30) return "expiring";
  return "current";
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
