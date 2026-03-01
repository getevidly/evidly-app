/**
 * CHECKUP-1 — Kitchen Checkup Notification Edge Function
 *
 * Sends an email to arthur@getevidly.com when a new Kitchen Checkup is completed.
 * Includes business info, grade, 4 impact scores, exposure range, and top findings.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const NOTIFY_EMAIL = "arthur@getevidly.com";

interface CheckupPayload {
  leadId: string;
  lead: {
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    zipCode: string;
    referralSource: string;
    utmRef: string;
  };
  scores: {
    overallGrade: string;
    gradeLabel: string;
    facilitySafety: number;
    foodSafety: number;
    documentation: number;
    revenueRisk: number;
    liabilityRisk: number;
    costRisk: number;
    operationalRisk: number;
    totalLow: number;
    totalHigh: number;
    topFindings: string[];
  };
}

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function scoreBar(label: string, score: number): string {
  const color =
    score > 60 ? "#ef4444" : score > 40 ? "#f59e0b" : "#22c55e";
  const width = Math.max(2, score);
  return `<tr>
    <td style="padding:4px 0;font-size:13px">${label}</td>
    <td>
      <div style="background:#e5e7eb;height:10px;border-radius:5px;width:200px;display:inline-block;vertical-align:middle">
        <div style="background:${color};height:10px;border-radius:5px;width:${width}%"></div>
      </div>
      <strong style="font-size:13px;margin-left:6px">${score}/100</strong>
    </td>
  </tr>`;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#22c55e";
    case "B": return "#84cc16";
    case "C": return "#eab308";
    case "D": return "#f97316";
    case "F": return "#ef4444";
    default: return "#6b7280";
  }
}

function buildHtml(payload: CheckupPayload): string {
  const { lead, scores } = payload;
  const isHighRisk = scores.overallGrade === "D" || scores.overallGrade === "F";

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1E2D4D;padding:20px;border-radius:8px 8px 0 0">
        <span style="color:#A08C5A;font-size:20px;font-weight:bold">Evid</span>
        <span style="color:#fff;font-size:20px;font-weight:bold">LY</span>
        <span style="color:#ccc;font-size:12px;margin-left:10px">Kitchen Checkup Alert</span>
      </div>

      ${isHighRisk ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:10px 16px;font-size:13px;color:#b91c1c;font-weight:bold">
        ⚠ NEEDS ATTENTION — Grade ${scores.overallGrade}
      </div>` : ""}

      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="color:#1E2D4D;margin:0 0 4px">New Kitchen Checkup: ${lead.businessName}</h2>
        <p style="color:#6B7F96;margin:0 0 16px;font-size:14px">
          ${lead.contactName} · ${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}<br/>
          ${lead.city}, ${lead.zipCode}
          ${lead.referralSource ? ` · How heard: ${lead.referralSource}` : ""}
          ${lead.utmRef ? ` · Ref: ${lead.utmRef}` : ""}
        </p>

        <div style="text-align:center;margin-bottom:16px">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;line-height:60px;text-align:center;color:#fff;font-size:28px;font-weight:bold;background:${gradeColor(scores.overallGrade)}">
            ${scores.overallGrade}
          </div>
          <div style="color:#1E2D4D;font-size:14px;margin-top:4px;font-weight:600">${scores.gradeLabel}</div>
        </div>

        <h3 style="color:#1E2D4D;font-size:14px;margin:16px 0 8px">Impact Scores</h3>
        <table style="width:100%;border-collapse:collapse">
          ${scoreBar("Business Continuity", scores.revenueRisk)}
          ${scoreBar("Exposure", scores.liabilityRisk)}
          ${scoreBar("Avoidable Costs", scores.costRisk)}
          ${scoreBar("Day-to-Day Impact", scores.operationalRisk)}
        </table>

        <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin:16px 0">
          <strong style="color:#1E2D4D;font-size:12px">Estimated Annual Impact:</strong><br/>
          <span style="color:#92400e;font-size:18px;font-weight:bold">
            ${formatDollars(scores.totalLow)} – ${formatDollars(scores.totalHigh)}
          </span>
        </div>

        ${scores.topFindings.length > 0 ? `
          <h3 style="color:#1E2D4D;font-size:14px;margin:16px 0 8px">Top Findings</h3>
          <ul style="margin:0;padding-left:16px;font-size:13px;color:#3D5068">
            ${scores.topFindings.map((f: string) => `<li style="margin-bottom:4px">${f}</li>`).join("")}
          </ul>
        ` : ""}

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb">
          <a href="https://app.getevidly.com/admin/assessments" style="display:inline-block;background:#1e4d6b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">
            View in Admin Dashboard →
          </a>
        </div>
      </div>

      <div style="background:#f1f5f9;padding:12px 24px;border-radius:0 0 8px 8px;font-size:11px;color:#6B7F96">
        Kitchen Checkup · Powered by EvidLY
      </div>
    </div>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const payload: CheckupPayload = await req.json();

    if (!payload.lead || !payload.scores) {
      return jsonResponse({ error: "Missing lead or scores data" }, 400);
    }

    const isHighRisk = payload.scores.overallGrade === "D" || payload.scores.overallGrade === "F";
    const subject = `${isHighRisk ? "🚨 " : ""}New Kitchen Checkup: ${payload.lead.businessName} — Grade ${payload.scores.overallGrade}`;
    const html = buildHtml(payload);

    const result = await sendEmail({
      to: NOTIFY_EMAIL,
      subject,
      html,
      replyTo: payload.lead.email,
    });

    return jsonResponse({
      success: true,
      emailId: result?.id || null,
    });
  } catch (error) {
    console.error("Error in checkup-notify:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
