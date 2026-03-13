// ── Self-Inspection PDF Export ───────────────────────────────────────────
// Generates a branded PDF report from self-inspection results.
// Uses pdfExport.ts helpers for consistent EvidLY styling.
// NOTE: EvidLY NEVER generates a compliance score, grade, or rating.
// Only the jurisdiction (EHD / AHJ) has that authority.

import {
  createReportPdf,
  saveReportPdf,
  drawReportHeader,
  drawSectionHeading,
  drawTable,
  MARGIN,
  CONTENT_W,
  PAGE_H,
  NAVY,
  GRAY,
  hexToRgb,
} from './pdfExport';
import type { JurisdictionScoringConfig } from '../data/selfInspectionJurisdictionMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PdfSection {
  name: string;
  citation: string;
  items: PdfItem[];
}

interface PdfItem {
  text: string;
  status: 'pass' | 'fail' | 'na' | null;
  severity: 'critical' | 'major' | 'minor';
  notes: string;
  citation?: string;
}

interface PdfFailedItem extends PdfItem {
  sectionName: string;
}

export interface SelfInspectionPdfParams {
  sections: PdfSection[];
  jurisdictionConfig: JurisdictionScoringConfig;
  failedItems: PdfFailedItem[];
  locationName: string;
}

const DISCLAIMER =
  'Internal audit only \u2014 not an official inspection result. This document does not constitute a compliance determination. Consult your EHD (food safety) or AHJ (fire safety) for official guidance.';

// ---------------------------------------------------------------------------
// Shared: draw the counts-only summary + disclaimer
// ---------------------------------------------------------------------------

function drawSummaryBlock(
  doc: any,
  y: number,
  sections: PdfSection[],
  failedItems: PdfFailedItem[],
): number {
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const passCount = sections.reduce(
    (acc, s) => acc + s.items.filter(i => i.status === 'pass').length,
    0,
  );
  const criticalCount = failedItems.filter(f => f.severity === 'critical').length;
  const majorCount = failedItems.filter(f => f.severity === 'major').length;
  const minorCount = failedItems.filter(f => f.severity === 'minor').length;

  // Summary line: "X items passed · Y items failed (Z critical, W major, V minor)"
  const failParts: string[] = [];
  if (criticalCount > 0) failParts.push(`${criticalCount} critical`);
  if (majorCount > 0) failParts.push(`${majorCount} major`);
  if (minorCount > 0) failParts.push(`${minorCount} minor`);
  const failDetail = failParts.length > 0 ? ` (${failParts.join(', ')})` : '';
  const summaryLine = `${passCount} items passed  \u00B7  ${failedItems.length} items failed${failDetail}`;

  doc.setFontSize(13);
  doc.setTextColor(...hexToRgb(NAVY));
  doc.text(summaryLine, MARGIN, y);
  y += 6;

  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb(GRAY));
  doc.text(`${totalItems} total items evaluated`, MARGIN, y);
  y += 8;

  // Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb('#991b1b'));
  const disclaimerLines = doc.splitTextToSize(DISCLAIMER, CONTENT_W);
  doc.text(disclaimerLines, MARGIN, y);
  y += disclaimerLines.length * 3.5 + 4;

  return y;
}

// ---------------------------------------------------------------------------
// Generate (download)
// ---------------------------------------------------------------------------

export function generateSelfInspectionPdf(params: SelfInspectionPdfParams): void {
  const { sections, jurisdictionConfig, failedItems, locationName } = params;
  const doc = createReportPdf();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ──
  let y = drawReportHeader(
    doc,
    'Self-Inspection Report',
    `${jurisdictionConfig.agencyName} \u2014 ${jurisdictionConfig.scoringType.replace(/_/g, ' ')}`,
    locationName,
    dateStr,
  );

  // ── Counts-only summary + disclaimer ──
  y += 4;
  y = drawSummaryBlock(doc, y, sections, failedItems);

  // ── Section Breakdown (pass/fail counts, NOT scores) ──
  y = drawSectionHeading(doc, 'Results by Section', y);

  const sectionRows = sections.map(s => {
    const passed = s.items.filter(i => i.status === 'pass').length;
    const failed = s.items.filter(i => i.status === 'fail').length;
    const na = s.items.filter(i => i.status === 'na').length;
    return [s.name, String(s.items.length), String(passed), String(failed), String(na)];
  });

  y = drawTable(
    doc,
    ['Section', 'Items', 'Passed', 'Failed', 'N/A'],
    sectionRows,
    y,
    { colWidths: [64, 22, 22, 22, 22], fontSize: 8 },
  );

  y += 4;

  // ── Failed Items ──
  if (failedItems.length > 0) {
    y = drawSectionHeading(doc, `Failed Items (${failedItems.length})`, y);

    const severityGroups: { label: string; sev: string }[] = [
      { label: 'Critical', sev: 'critical' },
      { label: 'Major', sev: 'major' },
      { label: 'Minor', sev: 'minor' },
    ];

    for (const group of severityGroups) {
      const items = failedItems.filter(f => f.severity === group.sev);
      if (items.length === 0) continue;

      const rows = items.map(f => [
        f.text.length > 45 ? f.text.substring(0, 45) + '\u2026' : f.text,
        f.sectionName,
        group.label,
        f.notes ? (f.notes.length > 40 ? f.notes.substring(0, 40) + '\u2026' : f.notes) : '\u2014',
      ]);

      y = drawTable(
        doc,
        ['Item', 'Section', 'Severity', 'Notes'],
        rows,
        y,
        { colWidths: [60, 40, 25, 49], fontSize: 7 },
      );
    }
  }

  // ── Corrective Action Plan ──
  if (failedItems.length > 0) {
    y = drawSectionHeading(doc, 'Corrective Action Plan', y);

    failedItems.forEach((f, idx) => {
      if (y + 14 > PAGE_H - 24) {
        doc.addPage();
        y = MARGIN;
      }
      const actionText = getCorrectiveText(f);
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(NAVY));

      const lines = doc.splitTextToSize(`${idx + 1}. ${actionText}`, CONTENT_W);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4 + 3;
    });
  }

  // ── Save ──
  saveReportPdf(doc, `self-inspection-${now.toISOString().slice(0, 10)}.pdf`);
}

/** Print-optimized: opens in new window with print dialog */
export function printSelfInspectionPdf(params: SelfInspectionPdfParams): void {
  const { sections, jurisdictionConfig, failedItems, locationName } = params;
  const doc = createReportPdf();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let y = drawReportHeader(
    doc,
    'Self-Inspection Report',
    `${jurisdictionConfig.agencyName} \u2014 ${jurisdictionConfig.scoringType.replace(/_/g, ' ')}`,
    locationName,
    dateStr,
  );

  // ── Counts-only summary + disclaimer ──
  y += 4;
  y = drawSummaryBlock(doc, y, sections, failedItems);

  // ── Failed Items table ──
  if (failedItems.length > 0) {
    y = drawSectionHeading(doc, `Failed Items (${failedItems.length})`, y);
    const rows = failedItems.map(f => [
      f.text.length > 45 ? f.text.substring(0, 45) + '\u2026' : f.text,
      f.sectionName,
      f.severity.charAt(0).toUpperCase() + f.severity.slice(1),
      f.notes ? (f.notes.length > 40 ? f.notes.substring(0, 40) + '\u2026' : f.notes) : '\u2014',
    ]);
    y = drawTable(doc, ['Item', 'Section', 'Severity', 'Notes'], rows, y, { colWidths: [60, 40, 25, 49], fontSize: 7 });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(GRAY));
    doc.text(`Generated by EvidLY \u00B7 www.getevidly.com \u00B7 ${dateStr}`, MARGIN, PAGE_H - 12);
    doc.text(`Page ${i} of ${totalPages}`, 210 - MARGIN, PAGE_H - 12, { align: 'right' });
  }

  doc.autoPrint();
  doc.output('dataurlnewwindow');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCorrectiveText(item: PdfFailedItem): string {
  const actions: Record<string, string> = {
    critical: `Immediately address "${item.text}" in ${item.sectionName}. Halt affected operations until corrected. Document corrective steps and re-verify within 24 hours.`,
    major: `Schedule corrective action for "${item.text}" in ${item.sectionName} within 48 hours. Assign responsible staff and document completion.`,
    minor: `Address "${item.text}" in ${item.sectionName} during next scheduled maintenance or shift change. Log the correction.`,
  };
  return actions[item.severity] || actions.major;
}
