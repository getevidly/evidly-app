// ── Compliance Package PDF — DEMO-SCRIPT-01 ──────────────────────────
// Branded multi-section compliance package for "I look good" demo flow.
// Uses pdfExport.ts utilities. In demo mode, uses reportsDemoData.

import {
  createReportPdf, saveReportPdf, drawReportHeader,
  drawSectionHeading, drawTable, drawStatBox, MARGIN, CONTENT_W,
} from './pdfExport';
import {
  getExecutiveSummaryData, getInspectionReadinessData, getDocumentStatusData,
  getEquipmentServiceData, getTempLogSummaryData, getTrainingCertData,
  locations,
} from '../data/reportsDemoData';

/**
 * Export a branded Compliance Package PDF.
 * In demo mode: pulls from reportsDemoData.
 * In production: same structure but would pull from Supabase (future).
 */
export function exportCompliancePackage(locationSlug = 'all') {
  const doc = createReportPdf();
  const locName = locationSlug === 'all'
    ? 'All Locations'
    : locations.find(l => l.urlId === locationSlug)?.name || 'All Locations';
  const dateRange = 'Last 12 Months';

  let y = drawReportHeader(doc, 'Compliance Package', 'Complete compliance record for insurance, audit, and management review.', locName, dateRange);

  // ── 1. Location Overview ──────────────────────────────────
  const exec = getExecutiveSummaryData(locationSlug);
  y = drawSectionHeading(doc, '1. Location Overview', y);

  const boxW = CONTENT_W / 3 - 4;
  drawStatBox(doc, MARGIN, y, boxW, String(locations.length), 'Locations');
  drawStatBox(doc, MARGIN + boxW + 6, y, boxW, String(exec.orgScores.foodSafety), 'Food Safety');
  drawStatBox(doc, MARGIN + (boxW + 6) * 2, y, boxW, String(exec.orgScores.facilitySafety), 'Fire Safety');
  y += 26;

  y = drawTable(doc,
    ['Location', 'Food Safety', 'Fire Safety', 'Status'],
    exec.locationScores.map(l => [l.location, String(l.foodSafety), String(l.facilitySafety), l.foodStatus]),
    y,
    { colWidths: [60, 34, 38, 42] },
  );

  // ── 2. Service History ────────────────────────────────────
  const equip = getEquipmentServiceData(locationSlug);
  y = drawSectionHeading(doc, '2. Service History (Last 12 Months)', y + 2);

  y = drawTable(doc,
    ['Equipment', 'Location', 'Status', 'Expires'],
    equip.equipmentCerts.map(e => [e.equipment, e.location, e.status, e.expires]),
    y,
    { colWidths: [55, 40, 35, 44] },
  );

  y = drawTable(doc,
    ['Equipment', 'Due Date', 'Last Service', 'Adherence'],
    equip.maintenanceSchedule.map(m => [m.equipment, m.dueDate, m.lastService, m.adherence]),
    y + 2,
    { colWidths: [55, 38, 38, 43] },
  );

  // ── 3. Temperature Log Summary ────────────────────────────
  const temps = getTempLogSummaryData(locationSlug);
  y = drawSectionHeading(doc, '3. Temperature Log Summary', y + 2);

  y = drawTable(doc,
    ['Week', 'Compliance %'],
    temps.tempCompliance.map(t => [t.week, `${t.compliance}%`]),
    y,
    { colWidths: [87, 87] },
  );

  // ── 4. Checklist Completion ───────────────────────────────
  const readiness = getInspectionReadinessData(locationSlug);
  y = drawSectionHeading(doc, '4. Checklist Completion Rate', y + 2);

  y = drawTable(doc,
    ['Template', 'Rate', 'Completed', 'Missed'],
    readiness.checklists.map(c => [c.template, `${c.rate}%`, String(c.completed), String(c.missed)]),
    y,
    { colWidths: [60, 30, 40, 44] },
  );

  // ── 5. Corrective Actions ─────────────────────────────────
  y = drawSectionHeading(doc, '5. Corrective Actions', y + 2);

  y = drawTable(doc,
    ['Action', 'Status', 'Days Open', 'Location'],
    readiness.correctiveActions.map(a => [a.action, a.status, String(a.daysOpen), a.location]),
    y,
    { colWidths: [60, 34, 30, 50] },
  );

  // ── 6. Documents on File ──────────────────────────────────
  const docs = getDocumentStatusData(locationSlug);
  y = drawSectionHeading(doc, '6. Documents on File', y + 2);

  y = drawTable(doc,
    ['Document Type', 'Total', 'Current', 'Expiring', 'Expired'],
    docs.inventory.map(d => [d.type, String(d.total), String(d.current), String(d.expiring), String(d.expired)]),
    y,
    { colWidths: [50, 27, 27, 35, 35] },
  );

  // ── 7. Training & Certifications ──────────────────────────
  const training = getTrainingCertData(locationSlug);
  y = drawSectionHeading(doc, '7. Training & Certifications', y + 2);

  y = drawTable(doc,
    ['Training', 'Completed', 'Pending', 'Rate'],
    training.training.map(t => [t.training, String(t.completed), String(t.pending), `${t.rate}%`]),
    y,
    { colWidths: [60, 34, 34, 46] },
  );

  // Save
  const ts = new Date().toISOString().slice(0, 10);
  saveReportPdf(doc, `EvidLY-Compliance-Package-${ts}.pdf`);
}
