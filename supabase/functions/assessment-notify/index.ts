/**
 * ASSESS-TOOL-1 — Assessment Notification Edge Function
 *
 * Sends an email to arthur@getevidly.com when a new compliance assessment is completed.
 * Includes business info, grade, 4 risk scores, exposure range, and top findings.
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

interface AssessmentPayload {
  leadId: string;
  lead: {
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    zipCode: string;
    referralSource: string;
  };
  scores: {
    overallGrade: string;
    revenueRisk: number;
    liabilityRisk: number;
    costRisk: number;
    operationalRisk: number;
    facilitySafety: number;
    foodSafety: number;
    documentation: number;
    estimates: {
      totalLow: number;
      totalHigh: number;
    };
    findings: Array<{
      title: string;
      severity: string;
      isPositive: boolean;
    }>;
  };
}

function gradeEmoji(grade: string): string {
  return grade === "D" || grade === "F" ? "🚨 HIGH RISK — " : "";
}

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function scoreBar(score: number): string {
  const color =
    score > 60 ? "#ef4444" : score > 40 ? "#f59e0b" : "#22c55e";
  const width = Math.max(2, score);
  return `<div style="background:#e5e7eb;height:10px;border-radius:5px;width:200px;display:inline-block;vertical-align:middle">
    <div style="background:${color};height:10px;border-radius:5px;width:${width}%"></div>
  </div> <strong>${score}/100</strong>`;
}

function buildHtml(payload: AssessmentPayload): string {
  const { lead, scores } = payload;
  const gapFindings = scores.findings
    .filter((f) => !f.isPositive)
    .slice(0, 5);

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0B1628;padding:20px;border-radius:8px 8px 0 0">
        <span style="color:#A08C5A;font-size:20px;font-weight:bold">E</span>
        <span style="color:#fff;font-size:20px;font-weight:bold">vid</span>
        <span style="color:#A08C5A;font-size:20px;font-weight:bold">LY</span>
        <span style="color:#ccc;font-size:12px;margin-left:10px">Compliance Assessment Alert</span>
      </div>

      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="color:#0B1628;margin:0 0 4px">New Assessment: ${lead.businessName}</h2>
        <p style="color:#6B7F96;margin:0 0 16px;font-size:14px">
          ${lead.contactName} · ${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}<br/>
          ${lead.city}, ${lead.zipCode}
          ${lead.referralSource ? ` · Source: ${lead.referralSource}` : ""}
        </p>

        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;text-align:center">
          <div style="display:inline-block;width:60px;height:60px;border-radius:10px;line-height:60px;text-align:center;color:#fff;font-size:28px;font-weight:bold;background:${
            scores.overallGrade === "A"
              ? "#22c55e"
              : scores.overallGrade === "B"
                ? "#84cc16"
                : scores.overallGrade === "C"
                  ? "#eab308"
                  : scores.overallGrade === "D"
                    ? "#f97316"
                    : "#ef4444"
          }">
            ${scores.overallGrade}
          </div>
        </div>

        <h3 style="color:#0B1628;font-size:14px;margin:16px 0 8px">Risk Scores</h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:4px 0">Revenue Risk</td><td>${scoreBar(scores.revenueRisk)}</td></tr>
          <tr><td style="padding:4px 0">Liability Risk</td><td>${scoreBar(scores.liabilityRisk)}</td></tr>
          <tr><td style="padding:4px 0">Cost Risk</td><td>${scoreBar(scores.costRisk)}</td></tr>
          <tr><td style="padding:4px 0">Operational Risk</td><td>${scoreBar(scores.operationalRisk)}</td></tr>
        </table>

        <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin:16px 0">
          <strong style="color:#0B1628">Estimated Exposure:</strong>
          <span style="color:#92400e;font-size:16px;font-weight:bold">
            ${formatDollars(scores.estimates.totalLow)} – ${formatDollars(scores.estimates.totalHigh)}
          </span>
        </div>

        ${
          gapFindings.length > 0
            ? `<h3 style="color:#0B1628;font-size:14px;margin:16px 0 8px">Top Findings</h3>
          <ul style="margin:0;padding-left:16px;font-size:13px;color:#3D5068">
            ${gapFindings.map((f) => `<li style="margin-bottom:4px"><strong>${f.severity.toUpperCase()}</strong>: ${f.title}</li>`).join("")}
          </ul>`
            : ""
        }
      </div>

      <div style="background:#f1f5f9;padding:12px 24px;border-radius:0 0 8px 8px;font-size:11px;color:#6B7F96">
        Powered by EvidLY — Lead with Confidence
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

    const payload: AssessmentPayload = await req.json();

    if (!payload.lead || !payload.scores) {
      return jsonResponse({ error: "Missing lead or scores data" }, 400);
    }

    const subject = `${gradeEmoji(payload.scores.overallGrade)}[${payload.scores.overallGrade}] Compliance Assessment: ${payload.lead.businessName}`;
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
    console.error("Error in assessment-notify:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
