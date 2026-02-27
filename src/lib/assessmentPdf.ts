// ============================================================================
// Assessment PDF Report Generator — ASSESS-TOOL-1
// Generates a branded 2-page PDF with Diagnosis + Prognosis
// ============================================================================

import { jsPDF } from 'jspdf';
import type { AssessmentScores, LeadData, Finding } from './assessmentScoring';
import { gradeColor, scoreColor, formatDollars } from './assessmentScoring';

const GOLD = '#A08C5A';
const NAVY = '#0B1628';
const GRAY = '#6B7F96';
const LIGHT_GRAY = '#E5E7EB';
const WHITE = '#FFFFFF';

const PAGE_W = 210; // A4 mm
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawBar(doc: jsPDF, x: number, y: number, w: number, h: number, score: number, label: string) {
  const color = scoreColor(score);
  // Background bar
  doc.setFillColor(...hexToRgb(LIGHT_GRAY));
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  // Score bar
  const barW = Math.max(2, (score / 100) * w);
  doc.setFillColor(...hexToRgb(color));
  doc.roundedRect(x, y, barW, h, 2, 2, 'F');
  // Label
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(NAVY));
  doc.text(label, x, y - 2);
  // Score text
  doc.setTextColor(...hexToRgb(color));
  doc.text(`${score}/100`, x + w + 3, y + h - 1);
}

export function generateAssessmentPdf(
  lead: LeadData,
  scores: AssessmentScores,
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── PAGE 1: THE DIAGNOSIS ──────────────────────────────────────────────

  // Header band
  doc.setFillColor(...hexToRgb(NAVY));
  doc.rect(0, 0, PAGE_W, 35, 'F');

  // Logo text
  doc.setFontSize(20);
  doc.setTextColor(...hexToRgb(GOLD));
  doc.text('E', MARGIN, 18);
  doc.setTextColor(255, 255, 255);
  doc.text('vid', MARGIN + 8, 18);
  doc.setTextColor(...hexToRgb(GOLD));
  doc.text('LY', MARGIN + 22, 18);

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text('Compliance Assessment Report', MARGIN, 28);

  // Date + business info
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(GRAY));
  doc.text(now, PAGE_W - MARGIN, 18, { align: 'right' });

  let y = 45;

  // Business info
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(NAVY));
  doc.text(lead.businessName, MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(GRAY));
  doc.text(`Prepared for ${lead.contactName} | ${lead.email}`, MARGIN, y);
  if (lead.city || lead.zipCode) {
    y += 4;
    doc.text(`${lead.city}${lead.city && lead.zipCode ? ', ' : ''}${lead.zipCode}`, MARGIN, y);
  }

  y += 10;

  // Overall Grade
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(NAVY));
  doc.text('OVERALL COMPLIANCE GRADE', MARGIN, y);
  y += 2;

  const gc = gradeColor(scores.overallGrade);
  doc.setFillColor(...hexToRgb(gc));
  doc.roundedRect(MARGIN, y, 30, 20, 4, 4, 'F');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(scores.overallGrade, MARGIN + 15, y + 15, { align: 'center' });

  const gradeLabels: Record<string, string> = {
    A: 'Low Risk', B: 'Moderate Risk', C: 'Elevated Risk', D: 'High Risk', F: 'Critical Risk',
  };
  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(gc));
  doc.text(gradeLabels[scores.overallGrade] || '', MARGIN + 35, y + 10);

  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(GRAY));
  doc.text('Based on average of Revenue, Liability, Cost, and Operational risk scores', MARGIN + 35, y + 16);

  y += 28;

  // Section: Category Scores
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(NAVY));
  doc.text('CATEGORY RISK SCORES', MARGIN, y);
  y += 8;

  drawBar(doc, MARGIN, y, CONTENT_W - 30, 5, scores.facilitySafety, 'Facility Safety');
  y += 14;
  drawBar(doc, MARGIN, y, CONTENT_W - 30, 5, scores.foodSafety, 'Food Safety');
  y += 14;
  drawBar(doc, MARGIN, y, CONTENT_W - 30, 5, scores.documentation, 'Documentation');
  y += 14;

  // Section: Key Findings
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(NAVY));
  doc.text('KEY FINDINGS', MARGIN, y);
  y += 6;

  const gapFindings = scores.findings.filter(f => !f.isPositive);
  const positiveFindings = scores.findings.filter(f => f.isPositive);

  doc.setFontSize(8);
  for (const f of gapFindings.slice(0, 8)) {
    if (y > 260) break;
    const sColor = f.severity === 'critical' ? '#ef4444' : f.severity === 'high' ? '#f97316' : '#eab308';
    doc.setFillColor(...hexToRgb(sColor));
    doc.circle(MARGIN + 2, y - 1, 1.5, 'F');
    doc.setTextColor(...hexToRgb(NAVY));
    const lines = doc.splitTextToSize(f.description, CONTENT_W - 10);
    doc.text(lines, MARGIN + 6, y);
    y += lines.length * 3.5 + 2;
  }

  if (positiveFindings.length > 0 && y < 250) {
    y += 3;
    for (const f of positiveFindings.slice(0, 3)) {
      if (y > 260) break;
      doc.setFillColor(...hexToRgb('#22c55e'));
      doc.circle(MARGIN + 2, y - 1, 1.5, 'F');
      doc.setTextColor(...hexToRgb('#22c55e'));
      const lines = doc.splitTextToSize(f.description, CONTENT_W - 10);
      doc.text(lines, MARGIN + 6, y);
      y += lines.length * 3.5 + 2;
    }
  }

  // Footer Page 1
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb(GRAY));
  doc.text('Page 1 of 2 | Powered by EvidLY Compliance Intelligence', MARGIN, 285);

  // ── PAGE 2: THE PROGNOSIS ──────────────────────────────────────────────

  doc.addPage();

  // Header band
  doc.setFillColor(...hexToRgb(NAVY));
  doc.rect(0, 0, PAGE_W, 25, 'F');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Business Impact Analysis', MARGIN, 17);

  y = 35;

  // 4 Risk Dimension Scores
  const dims = [
    { label: 'Revenue Risk', score: scores.revenueRisk, est: `${formatDollars(scores.estimates.revenueRiskLow)} – ${formatDollars(scores.estimates.revenueRiskHigh)}/yr`, drivers: scores.riskDrivers.revenue },
    { label: 'Liability Risk', score: scores.liabilityRisk, est: `${formatDollars(scores.estimates.liabilityRiskLow)} – ${formatDollars(scores.estimates.liabilityRiskHigh)} exposure`, drivers: scores.riskDrivers.liability },
    { label: 'Cost Risk', score: scores.costRisk, est: `${formatDollars(scores.estimates.costRiskLow)} – ${formatDollars(scores.estimates.costRiskHigh)}/yr`, drivers: scores.riskDrivers.cost },
    { label: 'Operational Risk', score: scores.operationalRisk, est: `~${scores.estimates.operationalDays} days downtime risk`, drivers: scores.riskDrivers.operational },
  ];

  for (const dim of dims) {
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(NAVY));
    doc.text(dim.label, MARGIN, y);

    const sc = scoreColor(dim.score);
    doc.setTextColor(...hexToRgb(sc));
    doc.text(`${dim.score}/100`, PAGE_W - MARGIN, y, { align: 'right' });
    y += 4;

    // Bar
    doc.setFillColor(...hexToRgb(LIGHT_GRAY));
    doc.roundedRect(MARGIN, y, CONTENT_W, 4, 1, 1, 'F');
    const bw = Math.max(1, (dim.score / 100) * CONTENT_W);
    doc.setFillColor(...hexToRgb(sc));
    doc.roundedRect(MARGIN, y, bw, 4, 1, 1, 'F');
    y += 6;

    // Estimated impact
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(GOLD));
    doc.text(`Estimated: ${dim.est}`, MARGIN + 2, y);
    y += 4;

    // Top drivers
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(GRAY));
    for (const d of dim.drivers.slice(0, 2)) {
      const lines = doc.splitTextToSize(`• ${d.description}`, CONTENT_W - 5);
      doc.text(lines, MARGIN + 4, y);
      y += lines.length * 3 + 1;
    }
    y += 4;
  }

  // Total Estimated Exposure
  if (y < 230) {
    doc.setFillColor(...hexToRgb('#FEF3C7'));
    doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(NAVY));
    doc.text('TOTAL ESTIMATED ANNUAL RISK EXPOSURE', MARGIN + 5, y + 6);
    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb('#92400e'));
    doc.text(`${formatDollars(scores.estimates.totalLow)} – ${formatDollars(scores.estimates.totalHigh)}`, MARGIN + 5, y + 14);
    y += 24;
  }

  // Recommendations
  if (y < 240) {
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(NAVY));
    doc.text('RECOMMENDATIONS', MARGIN, y);
    y += 6;

    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(GRAY));

    const hasFacilityGaps = scores.facilitySafety > 20;
    const hasComplianceGaps = scores.foodSafety > 20 || scores.documentation > 20;

    if (hasFacilityGaps) {
      doc.setTextColor(...hexToRgb(NAVY));
      doc.text('Cleaning Pros Plus can help with:', MARGIN, y);
      y += 4;
      doc.setTextColor(...hexToRgb(GRAY));
      doc.text('• Hood cleaning service (scheduled per NFPA 96)', MARGIN + 4, y); y += 3.5;
      doc.text('• Fire suppression inspection', MARGIN + 4, y); y += 3.5;
      doc.text('• Fire extinguisher inspection/recharging', MARGIN + 4, y); y += 5;
    }

    if (hasComplianceGaps && y < 260) {
      doc.setTextColor(...hexToRgb(NAVY));
      doc.text('EvidLY can help with:', MARGIN, y);
      y += 4;
      doc.setTextColor(...hexToRgb(GRAY));
      doc.text('• Real-time compliance dashboard with 4 risk scores', MARGIN + 4, y); y += 3.5;
      doc.text('• Automated alerts before things expire', MARGIN + 4, y); y += 3.5;
      doc.text('• Vendor document management', MARGIN + 4, y); y += 3.5;
      doc.text('• Digital temperature logging & HACCP management', MARGIN + 4, y); y += 5;
    }
  }

  // Contact
  if (y < 265) {
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(NAVY));
    doc.text('Contact: Arthur Haggerty | Cleaning Pros Plus / EvidLY', MARGIN, y);
    y += 4;
    doc.setTextColor(...hexToRgb(GRAY));
    doc.text('arthur@getevidly.com | getevidly.com', MARGIN, y);
  }

  // Disclaimer
  doc.setFontSize(6);
  doc.setTextColor(...hexToRgb(GRAY));
  const disclaimer = 'This assessment is for informational purposes only and does not constitute legal, insurance, or regulatory advice. Risk estimates are approximations based on industry averages and your self-reported data.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  doc.text(disclaimerLines, MARGIN, 277);

  // Footer Page 2
  doc.setFontSize(7);
  doc.text('Page 2 of 2 | Powered by EvidLY Compliance Intelligence', MARGIN, 285);

  return doc;
}
