// ── Self-Inspection PDF Export ───────────────────────────────────────────
// Generates a branded PDF report from self-inspection results.
// Uses pdfExport.ts helpers for consistent EvidLY styling.

import {
  createReportPdf,
  saveReportPdf,
  drawReportHeader,
  drawSectionHeading,
  drawTable,
  drawScoreBadge,
  drawHorizontalBar,
  drawStatBox,
  MARGIN,
  CONTENT_W,
  PAGE_H,
  NAVY,
  GRAY,
  hexToRgb,
} from './pdfExport';
import type { JurisdictionScoringConfig } from '../data/selfInspectionJurisdictionMap';
import { computeJurisdictionScore, type CompletedItem } from './selfInspectionScoring';

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
  score: number;
  gradeDisplay: string | null;
  jurisdictionConfig: JurisdictionScoringConfig;
  failedItems: PdfFailedItem[];
  locationName: string;
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

export function generateSelfInspectionPdf(params: SelfInspectionPdfParams): void {
  const { sections, score, gradeDisplay, jurisdictionConfig, failedItems, locationName } = params;
  const doc = createReportPdf();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ──
  let y = drawReportHeader(
    doc,
    'Self-Inspection Report',
    `${jurisdictionConfig.agencyName} — ${jurisdictionConfig.scoringType.replace(/_/g, ' ')}`,
    locationName,
    dateStr,
  );

  // ── Score Summary ──
  y += 4;
  drawScoreBadge(doc, MARGIN, y + 8, score, gradeDisplay ? `Grade: ${gradeDisplay}` : 'Score');

  // Stats row
  const totalEvaluated = sections.reduce(
    (acc, s) => acc + s.items.filter(i => i.status === 'pass' || i.status === 'fail').length,
    0,
  );
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const passCount = sections.reduce(
    (acc, s) => acc + s.items.filter(i => i.status === 'pass').length,
    0,
  );

  const statW = CONTENT_W / 4 - 3;
  const statsX = MARGIN + 50;
  drawStatBox(doc, statsX, y, statW, String(totalItems), 'Total Items');
  drawStatBox(doc, statsX + statW + 4, y, statW, String(passCount), 'Passed');
  drawStatBox(doc, statsX + (statW + 4) * 2, y, statW, String(failedItems.length), 'Failed');

  y += 26;

  // ── Section Scores ──
  y = drawSectionHeading(doc, 'Score by Section', y);

  sections.forEach(s => {
    if (y + 10 > PAGE_H - 24) {
      doc.addPage();
      y = MARGIN;
    }
    const sItems: CompletedItem[] = s.items.map((it, i) => ({
      id: `pdf-${i}`,
      status: it.status,
      severity: it.severity,
    }));
    const sectionScore = computeJurisdictionScore(sItems, jurisdictionConfig).rawScore;
    drawHorizontalBar(doc, MARGIN, y + 4, CONTENT_W - 30, 4, sectionScore, s.name);
    y += 14;
  });

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
        f.text.length > 45 ? f.text.substring(0, 45) + '…' : f.text,
        f.sectionName,
        group.label,
        f.notes ? (f.notes.length > 40 ? f.notes.substring(0, 40) + '…' : f.notes) : '—',
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
  // Generate same PDF but open for print
  const { sections, score, gradeDisplay, jurisdictionConfig, failedItems, locationName } = params;
  const doc = createReportPdf();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let y = drawReportHeader(
    doc,
    'Self-Inspection Report',
    `${jurisdictionConfig.agencyName} — ${jurisdictionConfig.scoringType.replace(/_/g, ' ')}`,
    locationName,
    dateStr,
  );

  y += 4;
  drawScoreBadge(doc, MARGIN, y + 8, score, gradeDisplay ? `Grade: ${gradeDisplay}` : 'Score');

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const passCount = sections.reduce(
    (acc, s) => acc + s.items.filter(i => i.status === 'pass').length,
    0,
  );
  const statW = CONTENT_W / 4 - 3;
  const statsX = MARGIN + 50;
  drawStatBox(doc, statsX, y, statW, String(totalItems), 'Total Items');
  drawStatBox(doc, statsX + statW + 4, y, statW, String(passCount), 'Passed');
  drawStatBox(doc, statsX + (statW + 4) * 2, y, statW, String(failedItems.length), 'Failed');
  y += 26;

  y = drawSectionHeading(doc, 'Score by Section', y);
  sections.forEach(s => {
    if (y + 10 > PAGE_H - 24) { doc.addPage(); y = MARGIN; }
    const sItems: CompletedItem[] = s.items.map((it, i) => ({ id: `pdf-${i}`, status: it.status, severity: it.severity }));
    const sectionScore = computeJurisdictionScore(sItems, jurisdictionConfig).rawScore;
    drawHorizontalBar(doc, MARGIN, y + 4, CONTENT_W - 30, 4, sectionScore, s.name);
    y += 14;
  });
  y += 4;

  if (failedItems.length > 0) {
    y = drawSectionHeading(doc, `Failed Items (${failedItems.length})`, y);
    const rows = failedItems.map(f => [
      f.text.length > 45 ? f.text.substring(0, 45) + '…' : f.text,
      f.sectionName,
      f.severity.charAt(0).toUpperCase() + f.severity.slice(1),
      f.notes ? (f.notes.length > 40 ? f.notes.substring(0, 40) + '…' : f.notes) : '—',
    ]);
    y = drawTable(doc, ['Item', 'Section', 'Severity', 'Notes'], rows, y, { colWidths: [60, 40, 25, 49], fontSize: 7 });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(GRAY));
    doc.text(`Generated by EvidLY · www.getevidly.com · ${dateStr}`, MARGIN, PAGE_H - 12);
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
