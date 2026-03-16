// ═══════════════════════════════════════════════════════════
// generate-job-report — HOODOPS Job Report Generator
//
// Generates a structured report for a completed job:
// service_report, inspection_report, deficiency_report,
// or certificate.
//
// Fetches all job data (details, customer, equipment,
// checklists, photos, deficiencies), builds structured
// content JSON, generates a PDF, uploads it to Supabase
// Storage, and stores the report record in job_reports.
// ═══════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
let corsHeaders = getCorsHeaders(null);

const VALID_REPORT_TYPES = [
  "service_report",
  "inspection_report",
  "deficiency_report",
  "certificate",
] as const;
type ReportType = (typeof VALID_REPORT_TYPES)[number];

// ── Report title + description lookup ─────────────────────
const REPORT_META: Record<ReportType, { title: string; description: string }> = {
  service_report: {
    title: "Kitchen Exhaust Service Report",
    description: "Comprehensive after-service report documenting all work performed, equipment condition, and compliance status.",
  },
  inspection_report: {
    title: "Kitchen Exhaust Inspection Report",
    description: "Detailed inspection findings including grease levels, equipment condition, code compliance, and recommended actions.",
  },
  deficiency_report: {
    title: "Deficiency Report",
    description: "Summary of all identified deficiencies, severity ratings, corrective actions required, and NFPA references.",
  },
  certificate: {
    title: "Certificate of Service Completion",
    description: "Official certification that kitchen exhaust system service has been completed in accordance with NFPA 96.",
  },
};

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { job_id, report_type, vendor_id } = body;

    if (!job_id) {
      return jsonResponse({ error: "job_id is required" }, 400);
    }
    if (!report_type || !VALID_REPORT_TYPES.includes(report_type)) {
      return jsonResponse({
        error: `report_type must be one of: ${VALID_REPORT_TYPES.join(", ")}`,
      }, 400);
    }

    // ── Step 1: Fetch all job data ────────────────────────────
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return jsonResponse({ error: "Job not found" }, 404);
    }

    // Fetch related data in parallel
    const [
      customerResult,
      equipmentResult,
      checklistsResult,
      photosResult,
      deficienciesResult,
      voiceNotesResult,
    ] = await Promise.all([
      // Customer info
      job.customer_id
        ? supabase
            .from("customers")
            .select("*")
            .eq("id", job.customer_id)
            .single()
        : Promise.resolve({ data: null, error: null }),

      // Equipment serviced
      supabase
        .from("job_equipment")
        .select("*")
        .eq("job_id", job_id)
        .order("created_at"),

      // Checklists completed
      supabase
        .from("job_checklists")
        .select("*")
        .eq("job_id", job_id)
        .order("completed_at"),

      // Photos with AI analysis
      supabase
        .from("job_photos")
        .select("*")
        .eq("job_id", job_id)
        .order("created_at"),

      // Deficiencies found
      supabase
        .from("job_deficiencies")
        .select("*")
        .eq("job_id", job_id)
        .order("severity", { ascending: false }),

      // Voice notes
      supabase
        .from("voice_notes")
        .select("id, transcription, extracted_data, created_at")
        .eq("job_id", job_id)
        .order("created_at"),
    ]);

    const customer = customerResult.data;
    const equipment = equipmentResult.data || [];
    const checklists = checklistsResult.data || [];
    const photos = photosResult.data || [];
    const deficiencies = deficienciesResult.data || [];
    const voiceNotes = voiceNotesResult.data || [];

    // ── Step 2: Build structured report content ───────────────
    const reportMeta = REPORT_META[report_type as ReportType];
    const generatedAt = new Date().toISOString();
    const reportNumber = `RPT-${job_id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const contentJson: any = {
      report_number: reportNumber,
      report_type,
      title: reportMeta.title,
      description: reportMeta.description,
      generated_at: generatedAt,

      // Job summary
      job: {
        id: job.id,
        status: job.status,
        scheduled_date: job.scheduled_date,
        started_at: job.started_at,
        completed_at: job.completed_at,
        job_type: job.job_type,
        service_type: job.service_type,
        notes: job.notes,
      },

      // Customer / location
      customer: customer
        ? {
            name: customer.name || customer.business_name,
            business_name: customer.business_name,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            contact_name: customer.contact_name,
            contact_phone: customer.contact_phone,
            contact_email: customer.contact_email,
          }
        : null,

      // Vendor info
      vendor_id: vendor_id || job.vendor_id || null,

      // Equipment serviced
      equipment: equipment.map((eq: any) => ({
        id: eq.id,
        name: eq.name || eq.equipment_type,
        equipment_type: eq.equipment_type,
        location: eq.location,
        condition_before: eq.condition_before,
        condition_after: eq.condition_after,
        notes: eq.notes,
      })),

      // Checklists
      checklists: checklists.map((cl: any) => ({
        id: cl.id,
        checklist_type: cl.checklist_type,
        completed_at: cl.completed_at,
        completed_by: cl.completed_by,
        items: cl.items,
        pass_fail: cl.pass_fail,
        notes: cl.notes,
      })),

      // Photos summary (URLs + AI analysis)
      photos: photos.map((ph: any) => ({
        id: ph.id,
        phase: ph.phase,
        category: ph.category,
        photo_url: ph.photo_url,
        ai_analyzed: ph.ai_analyzed,
        ai_analysis: ph.ai_analysis,
        caption: ph.caption,
        taken_at: ph.created_at,
      })),

      // Deficiencies
      deficiencies: deficiencies.map((df: any) => ({
        id: df.id,
        description: df.description,
        location: df.location,
        severity: df.severity,
        category: df.category,
        status: df.status,
        corrective_action: df.corrective_action,
        nfpa_reference: df.nfpa_reference,
        photo_ids: df.photo_ids,
      })),

      // Voice note summaries
      voice_notes: voiceNotes.map((vn: any) => ({
        id: vn.id,
        summary: vn.extracted_data?.summary || null,
        deficiencies_count: vn.extracted_data?.deficiencies?.length || 0,
        recorded_at: vn.created_at,
      })),

      // Aggregated stats
      stats: {
        total_equipment: equipment.length,
        total_photos: photos.length,
        photos_with_ai: photos.filter((p: any) => p.ai_analyzed).length,
        total_deficiencies: deficiencies.length,
        critical_deficiencies: deficiencies.filter(
          (d: any) => d.severity === "critical",
        ).length,
        high_deficiencies: deficiencies.filter(
          (d: any) => d.severity === "high",
        ).length,
        checklists_completed: checklists.length,
        checklists_passed: checklists.filter(
          (c: any) => c.pass_fail === "pass",
        ).length,
        voice_notes_count: voiceNotes.length,
      },
    };

    // ── Step 3: Generate PDF (HTML-based) ─────────────────────
    const pdfHtml = buildReportHtml(contentJson, report_type as ReportType);

    // Convert HTML to a simple text-based PDF representation
    // In production this would use a PDF rendering service;
    // here we store the HTML and upload it as a .html file that
    // can be printed to PDF from the client or converted server-side.
    const pdfBytes = new TextEncoder().encode(pdfHtml);

    // ── Step 4: Upload to Supabase Storage ────────────────────
    const storagePath = `reports/${job_id}/${reportNumber}.html`;
    const { error: uploadError } = await supabase.storage
      .from("job-reports")
      .upload(storagePath, pdfBytes, {
        contentType: "text/html",
        upsert: true,
      });

    let pdfUrl: string | null = null;
    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      // Non-fatal: continue without the stored file
    } else {
      const { data: urlData } = supabase.storage
        .from("job-reports")
        .getPublicUrl(storagePath);
      pdfUrl = urlData?.publicUrl || null;
    }

    // ── Step 5: Store report record in job_reports ─────────────
    const { data: report, error: reportError } = await supabase
      .from("job_reports")
      .insert({
        job_id,
        vendor_id: vendor_id || job.vendor_id || null,
        report_type,
        report_number: reportNumber,
        title: reportMeta.title,
        content_json: contentJson,
        pdf_url: pdfUrl,
        storage_path: uploadError ? null : storagePath,
        generated_at: generatedAt,
        stats: contentJson.stats,
        status: "generated",
      })
      .select("id")
      .single();

    if (reportError) {
      console.error("Failed to insert job_report:", reportError.message);
      // Still return the content even if DB insert fails
    }

    return jsonResponse({
      success: true,
      report_id: report?.id || null,
      report_number: reportNumber,
      pdf_url: pdfUrl,
      content_json: contentJson,
    });
  } catch (error) {
    console.error("Error in generate-job-report:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

// ── HTML Report Builder ───────────────────────────────────
function buildReportHtml(content: any, reportType: ReportType): string {
  const brandNavy = "#1E2D4D";
  const brandGold = "#A08C5A";

  const severityColors: Record<string, string> = {
    critical: "#DC2626",
    high: "#EA580C",
    medium: "#D97706",
    low: "#2563EB",
  };

  const deficiencyRows = (content.deficiencies || [])
    .map(
      (d: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#FFF;background:${severityColors[d.severity] || "#6B7280"};">
            ${(d.severity || "unknown").toUpperCase()}
          </span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(d.description || "")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(d.location || "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(d.corrective_action || "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-size:11px;color:#6B7280;">${escapeHtml(d.nfpa_reference || "")}</td>
      </tr>`,
    )
    .join("");

  const equipmentRows = (content.equipment || [])
    .map(
      (eq: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(eq.name || eq.equipment_type || "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(eq.location || "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(eq.condition_before || "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(eq.condition_after || "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(eq.notes || "")}</td>
      </tr>`,
    )
    .join("");

  const checklistRows = (content.checklists || [])
    .map(
      (cl: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(cl.checklist_type || "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">
          <span style="color:${cl.pass_fail === "pass" ? "#16A34A" : "#DC2626"};font-weight:600;">
            ${cl.pass_fail === "pass" ? "PASS" : cl.pass_fail === "fail" ? "FAIL" : "N/A"}
          </span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(cl.completed_at ? new Date(cl.completed_at).toLocaleDateString() : "N/A")}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${escapeHtml(cl.notes || "")}</td>
      </tr>`,
    )
    .join("");

  const isCertificate = reportType === "certificate";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(content.title)}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1F2937;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      background: #FFF;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th {
      text-align: left;
      padding: 10px 8px;
      background: #F3F4F6;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
      border-bottom: 2px solid #E5E7EB;
    }
    td { font-size: 13px; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
    .stat-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .stat-value { font-size: 28px; font-weight: 700; color: ${brandNavy}; }
    .stat-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  </style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div style="border-bottom:3px solid ${brandGold};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h1 style="margin:0;color:${brandNavy};font-size:24px;">${escapeHtml(content.title)}</h1>
      <p style="margin:4px 0 0;color:#6B7280;font-size:13px;">${escapeHtml(content.description)}</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#6B7280;">
      <div style="font-weight:600;color:${brandNavy};">${escapeHtml(content.report_number)}</div>
      <div>${new Date(content.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
    </div>
  </div>

  ${
    isCertificate
      ? buildCertificateBody(content, brandNavy, brandGold)
      : buildFullReportBody(content, deficiencyRows, equipmentRows, checklistRows, brandNavy)
  }

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:20px;border-top:2px solid ${brandGold};font-size:11px;color:#9CA3AF;text-align:center;">
    <p>Generated by HoodOps Intelligence Platform &mdash; ${new Date(content.generated_at).toLocaleString()}</p>
    <p>This report is for informational purposes. Refer to NFPA 96 and local AHJ requirements for compliance obligations.</p>
  </div>

</div>
</body>
</html>`;
}

function buildCertificateBody(
  content: any,
  brandNavy: string,
  brandGold: string,
): string {
  return `
  <div style="text-align:center;padding:40px 20px;">
    <div style="font-size:14px;text-transform:uppercase;letter-spacing:3px;color:${brandGold};margin-bottom:20px;">Certificate of Completion</div>
    <div style="font-size:16px;margin:30px 0;">This certifies that the kitchen exhaust system at</div>
    <div style="font-size:22px;font-weight:700;color:${brandNavy};margin:10px 0;">
      ${escapeHtml(content.customer?.business_name || content.customer?.name || "N/A")}
    </div>
    <div style="font-size:14px;color:#6B7280;">
      ${escapeHtml([content.customer?.address, content.customer?.city, content.customer?.state, content.customer?.zip].filter(Boolean).join(", ") || "N/A")}
    </div>
    <div style="font-size:16px;margin:30px 0;">
      has been serviced in accordance with <strong>NFPA 96</strong> standards.
    </div>
    <div style="margin:30px 0;">
      <div style="font-size:13px;color:#6B7280;">Service Date</div>
      <div style="font-size:18px;font-weight:600;color:${brandNavy};">
        ${content.job?.completed_at ? new Date(content.job.completed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : content.job?.scheduled_date || "N/A"}
      </div>
    </div>
    <div style="display:flex;justify-content:center;gap:60px;margin-top:50px;">
      <div>
        <div style="border-top:1px solid #9CA3AF;width:200px;margin-bottom:8px;"></div>
        <div style="font-size:12px;color:#6B7280;">Technician Signature</div>
      </div>
      <div>
        <div style="border-top:1px solid #9CA3AF;width:200px;margin-bottom:8px;"></div>
        <div style="font-size:12px;color:#6B7280;">Date</div>
      </div>
    </div>

    <div style="margin-top:40px;font-size:12px;color:#9CA3AF;">
      Equipment Serviced: ${content.stats?.total_equipment || 0} &bull;
      Photos Documented: ${content.stats?.total_photos || 0} &bull;
      Deficiencies: ${content.stats?.total_deficiencies || 0}
    </div>
  </div>`;
}

function buildFullReportBody(
  content: any,
  deficiencyRows: string,
  equipmentRows: string,
  checklistRows: string,
  brandNavy: string,
): string {
  return `
  <!-- Customer Info -->
  ${
    content.customer
      ? `
  <div style="margin-bottom:30px;">
    <h2 style="color:${brandNavy};font-size:16px;margin-bottom:12px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;">Customer Information</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
      <div><strong>Business:</strong> ${escapeHtml(content.customer.business_name || content.customer.name || "N/A")}</div>
      <div><strong>Contact:</strong> ${escapeHtml(content.customer.contact_name || "N/A")}</div>
      <div><strong>Address:</strong> ${escapeHtml([content.customer.address, content.customer.city, content.customer.state, content.customer.zip].filter(Boolean).join(", ") || "N/A")}</div>
      <div><strong>Phone:</strong> ${escapeHtml(content.customer.contact_phone || "N/A")}</div>
    </div>
  </div>`
      : ""
  }

  <!-- Job Summary -->
  <div style="margin-bottom:30px;">
    <h2 style="color:${brandNavy};font-size:16px;margin-bottom:12px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;">Job Summary</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
      <div><strong>Job Type:</strong> ${escapeHtml(content.job?.job_type || content.job?.service_type || "N/A")}</div>
      <div><strong>Status:</strong> ${escapeHtml(content.job?.status || "N/A")}</div>
      <div><strong>Scheduled:</strong> ${escapeHtml(content.job?.scheduled_date || "N/A")}</div>
      <div><strong>Completed:</strong> ${escapeHtml(content.job?.completed_at ? new Date(content.job.completed_at).toLocaleDateString() : "N/A")}</div>
    </div>
    ${content.job?.notes ? `<div style="margin-top:8px;font-size:13px;"><strong>Notes:</strong> ${escapeHtml(content.job.notes)}</div>` : ""}
  </div>

  <!-- Stats -->
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-value">${content.stats?.total_equipment || 0}</div>
      <div class="stat-label">Equipment</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${content.stats?.total_photos || 0}</div>
      <div class="stat-label">Photos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${content.stats?.total_deficiencies || 0}</div>
      <div class="stat-label">Deficiencies</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${content.stats?.checklists_completed || 0}</div>
      <div class="stat-label">Checklists</div>
    </div>
  </div>

  <!-- Equipment -->
  ${
    equipmentRows
      ? `
  <div style="margin-bottom:30px;">
    <h2 style="color:${brandNavy};font-size:16px;margin-bottom:12px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;">Equipment Serviced</h2>
    <table>
      <thead><tr>
        <th>Equipment</th><th>Location</th><th>Before</th><th>After</th><th>Notes</th>
      </tr></thead>
      <tbody>${equipmentRows}</tbody>
    </table>
  </div>`
      : ""
  }

  <!-- Deficiencies -->
  ${
    deficiencyRows
      ? `
  <div class="page-break" style="margin-bottom:30px;">
    <h2 style="color:${brandNavy};font-size:16px;margin-bottom:12px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;">Deficiencies Found</h2>
    <table>
      <thead><tr>
        <th>Severity</th><th>Description</th><th>Location</th><th>Corrective Action</th><th>NFPA Ref</th>
      </tr></thead>
      <tbody>${deficiencyRows}</tbody>
    </table>
  </div>`
      : `
  <div style="margin-bottom:30px;">
    <h2 style="color:${brandNavy};font-size:16px;margin-bottom:12px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;">Deficiencies Found</h2>
    <p style="color:#16A34A;font-weight:600;">No deficiencies identified during this service.</p>
  </div>`
  }

  <!-- Checklists -->
  ${
    checklistRows
      ? `
  <div style="margin-bottom:30px;">
    <h2 style="color:${brandNavy};font-size:16px;margin-bottom:12px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;">Checklists Completed</h2>
    <table>
      <thead><tr>
        <th>Type</th><th>Result</th><th>Completed</th><th>Notes</th>
      </tr></thead>
      <tbody>${checklistRows}</tbody>
    </table>
  </div>`
      : ""
  }

  <!-- Photo Summary -->
  ${
    content.photos && content.photos.length > 0
      ? `
  <div style="margin-bottom:30px;">
    <h2 style="color:${brandNavy};font-size:16px;margin-bottom:12px;border-bottom:1px solid #E5E7EB;padding-bottom:8px;">Photo Documentation</h2>
    <p style="font-size:13px;color:#6B7280;margin-bottom:12px;">
      ${content.stats?.total_photos} photos captured, ${content.stats?.photos_with_ai} analyzed by AI.
    </p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      ${content.photos
        .map(
          (ph: any) => `
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:8px;font-size:11px;">
          <div style="font-weight:600;">${escapeHtml(ph.phase || "")}: ${escapeHtml(ph.category || "")}</div>
          ${ph.ai_analysis?.grease_level ? `<div>Grease: ${escapeHtml(ph.ai_analysis.grease_level)}</div>` : ""}
          ${ph.ai_analysis?.condition_rating ? `<div>Condition: ${escapeHtml(ph.ai_analysis.condition_rating)}</div>` : ""}
          ${ph.caption ? `<div style="color:#6B7280;">${escapeHtml(ph.caption)}</div>` : ""}
        </div>`,
        )
        .join("")}
    </div>
  </div>`
      : ""
  }`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
