import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

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

    // Phase 4: Fetch latest compliance score snapshot
    let scoreSnapshot: any = null;
    if (payload.location_id) {
      const { data } = await supabase
        .from("compliance_score_snapshots")
        .select("id, overall_score, food_safety_score, facility_safety_score, vendor_score, score_date, model_version")
        .eq("location_id", payload.location_id)
        .eq("organization_id", orgId)
        .order("score_date", { ascending: false })
        .limit(1)
        .single();
      scoreSnapshot = data;
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
      // Phase 4: Include compliance score with audit chain FK
      compliance_score: scoreSnapshot ? {
        overall_score: scoreSnapshot.overall_score,
        food_safety_score: scoreSnapshot.food_safety_score,
        facility_safety_score: scoreSnapshot.facility_safety_score,
        vendor_score: scoreSnapshot.vendor_score,
        score_date: scoreSnapshot.score_date,
        model_version: scoreSnapshot.model_version,
        score_snapshot_id: scoreSnapshot.id,
      } : null,
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

    // ── Phase 4: Generate PDF with pdf-lib ──────────────────────
    let pdfUrl: string | null = null;
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const brandBlue = rgb(0.118, 0.302, 0.420); // #1e4d6b
      const brandGold = rgb(0.831, 0.686, 0.216); // #d4af37
      const gray = rgb(0.5, 0.5, 0.5);

      // ── Cover Page ──
      const cover = pdfDoc.addPage([612, 792]);
      // Header bar
      cover.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: brandBlue });
      cover.drawText("EvidLY — Lead with Confidence", { x: 30, y: 768, size: 10, font: boldFont, color: rgb(1, 1, 1) });

      cover.drawText("Compliance Package", { x: 50, y: 710, size: 26, font: boldFont, color: brandBlue });
      cover.drawText(manifest.organization || "Organization", { x: 50, y: 680, size: 16, font });
      cover.drawText(`Package Type: ${manifest.package_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`, { x: 50, y: 655, size: 12, font });
      cover.drawText(`Generated: ${new Date(manifest.generated_at).toLocaleDateString()}`, { x: 50, y: 635, size: 12, font });
      cover.drawText(`Generated By: ${manifest.generated_by}`, { x: 50, y: 615, size: 12, font });

      // Compliance Score section
      let yPos = 575;
      if (scoreSnapshot) {
        cover.drawText("Compliance Score", { x: 50, y: yPos, size: 18, font: boldFont, color: brandBlue });
        yPos -= 28;
        cover.drawText(`Overall: ${scoreSnapshot.overall_score}`, { x: 60, y: yPos, size: 14, font: boldFont });
        yPos -= 20;
        cover.drawText(`Food Safety: ${scoreSnapshot.food_safety_score ?? "N/A"}`, { x: 60, y: yPos, size: 12, font });
        yPos -= 18;
        cover.drawText(`Facility Safety: ${scoreSnapshot.facility_safety_score ?? "N/A"}`, { x: 60, y: yPos, size: 12, font });
        yPos -= 18;
        cover.drawText(`Vendor Compliance: ${scoreSnapshot.vendor_score ?? "N/A"}`, { x: 60, y: yPos, size: 12, font });
        yPos -= 18;
        cover.drawText(`Score Date: ${scoreSnapshot.score_date}  |  Model: ${scoreSnapshot.model_version || "1.0"}`, { x: 60, y: yPos, size: 10, font, color: gray });
        yPos -= 35;
      }

      // Document Summary
      cover.drawText("Document Summary", { x: 50, y: yPos, size: 18, font: boldFont, color: brandBlue });
      yPos -= 24;
      const summaryLines = [
        `Current: ${manifest.compliance_summary.current}`,
        `Expiring Soon: ${manifest.compliance_summary.expiring_soon}`,
        `Expired: ${manifest.compliance_summary.expired}`,
        `No Expiration: ${manifest.compliance_summary.no_expiration}`,
      ];
      for (const line of summaryLines) {
        cover.drawText(line, { x: 60, y: yPos, size: 12, font });
        yPos -= 18;
      }

      // Temp Summary (if present)
      if (tempSummary) {
        yPos -= 15;
        cover.drawText("Temperature Log Summary (30 Days)", { x: 50, y: yPos, size: 18, font: boldFont, color: brandBlue });
        yPos -= 24;
        cover.drawText(`Total Readings: ${tempSummary.total_readings}  |  In Range: ${tempSummary.in_range}  |  Out of Range: ${tempSummary.out_of_range}`, { x: 60, y: yPos, size: 12, font });
        yPos -= 18;
        cover.drawText(`Compliance Rate: ${tempSummary.compliance_rate}%`, { x: 60, y: yPos, size: 12, font: boldFont });
        yPos -= 25;
      }

      // ── Document List Page ──
      yPos -= 20;
      cover.drawText("Included Documents", { x: 50, y: yPos, size: 18, font: boldFont, color: brandBlue });
      yPos -= 24;

      let currentPage = cover;
      for (const doc of manifest.documents) {
        if (yPos < 60) {
          currentPage = pdfDoc.addPage([612, 792]);
          yPos = 740;
          // Header bar on new page
          currentPage.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: brandBlue });
          currentPage.drawText("EvidLY — Compliance Package (continued)", { x: 30, y: 768, size: 10, font: boldFont, color: rgb(1, 1, 1) });
        }
        const statusColor = doc.status === "current" ? rgb(0.13, 0.55, 0.13) : doc.status === "expiring" ? rgb(0.83, 0.68, 0.22) : rgb(0.7, 0.1, 0.1);
        currentPage.drawText(`• ${doc.title}`, { x: 60, y: yPos, size: 11, font });
        currentPage.drawText(`[${doc.status.toUpperCase()}]`, { x: 400, y: yPos, size: 10, font: boldFont, color: statusColor });
        if (doc.expiration_date) {
          currentPage.drawText(`Exp: ${doc.expiration_date}`, { x: 480, y: yPos, size: 9, font, color: gray });
        }
        yPos -= 16;
      }

      // Footer on all pages
      const totalPages = pdfDoc.getPageCount();
      for (let i = 0; i < totalPages; i++) {
        const page = pdfDoc.getPage(i);
        page.drawText(`Page ${i + 1} of ${totalPages}`, { x: 500, y: 20, size: 8, font, color: gray });
        page.drawText(new Date().toLocaleDateString(), { x: 30, y: 20, size: 8, font, color: gray });
      }

      const pdfBytes = await pdfDoc.save();

      // Upload to Supabase Storage
      const fileName = `compliance-packages/${packageToken}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("reports").getPublicUrl(fileName);
        pdfUrl = urlData?.publicUrl || null;
      } else {
        console.error("[generate-compliance-package] PDF upload error:", uploadError);
      }
    } catch (pdfErr) {
      // PDF generation is non-blocking — still return manifest
      console.error("[generate-compliance-package] PDF generation error:", pdfErr);
    }

    const packageData = {
      ...manifest,
      temp_summary: tempSummary,
      share_token: packageToken,
      share_url: `${Deno.env.get("APP_URL") || "https://app.getevidly.com"}/package/${packageToken}`,
      pdf_url: pdfUrl,
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
