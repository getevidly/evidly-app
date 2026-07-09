// ── Proof Packet PDF — per-incident evidence trail ──────────────────────
// Generates a branded proof-of-resolution PDF for a single resolved incident.
// Uses pdfExport.ts helpers for consistent EvidLY styling.

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
  GOLD,
  hexToRgb,
} from './pdfExport';

// ── Types (mirrors IncidentLog.tsx shapes) ──────────────────────────────

interface PhotoRecord {
  id: string;
  dataUrl: string;
  timestamp: string;
  displayTime: string;
}

interface TimelineEntry {
  id: string;
  action: string;
  status: string;
  user: string;
  timestamp: string;
}

export interface ProofPacketIncident {
  id: string;               // incident_number (INC-001)
  title: string;
  description: string;
  category: string;
  type: string;
  severity: string;
  location: string;
  status: string;
  assignedTo: string;
  reportedBy: string;
  createdAt: string;
  resolvedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  correctiveAction?: string;
  resolutionSummary?: string;
  rootCause?: string;
  linkedCorrectiveActionId?: string;
  photos: PhotoRecord[];
  resolutionPhotos: PhotoRecord[];
  timeline: TimelineEntry[];
}

export interface ProofPacketCA {
  title: string;
  description?: string;
  corrective_steps?: string;
  status: string;
  assignee_name?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

const CATEGORY_DISPLAY: Record<string, string> = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
  facility_services: 'Facility Services',
};

const SEVERITY_DISPLAY: Record<string, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const ROOT_CAUSE_DISPLAY: Record<string, string> = {
  equipment: 'Equipment Failure',
  training: 'Training Gap',
  process: 'Process Failure',
  vendor: 'Vendor Issue',
  external: 'External Factor',
  unknown: 'Unknown',
};

function fmtDate(iso: string | undefined): string {
  if (!iso) return '\u2014';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function fmtTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function drawKeyValue(
  doc: any, x: number, y: number, key: string, value: string, maxW: number,
): number {
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(GRAY));
  doc.text(key, x, y);
  doc.setTextColor(...hexToRgb(NAVY));
  doc.setFontSize(9);
  // Wrap long values
  const lines = doc.splitTextToSize(value || '\u2014', maxW);
  doc.text(lines, x, y + 4);
  return y + 4 + lines.length * 4;
}

function ensureSpace(doc: any, y: number, needed: number): number {
  if (y + needed > PAGE_H - 25) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

// ── Main Export ─────────────────────────────────────────────────────────

export function exportProofPacketPdf(
  incident: ProofPacketIncident,
  linkedCA?: ProofPacketCA | null,
  resolvedByName?: string,
): void {
  const doc = createReportPdf();
  const isResolved = incident.status === 'resolved' || incident.status === 'verified';
  const dateRange = `${fmtDate(incident.createdAt)} \u2013 ${fmtDate(incident.resolvedAt || incident.createdAt)}`;

  // ── Header ──
  const headerTitle = isResolved
    ? `PROOF OF RESOLUTION \u2014 ${incident.id}`
    : `INCIDENT REPORT \u2014 ${incident.id}`;
  const headerSub = isResolved
    ? 'Evidence trail for regulatory, insurance, and audit review'
    : 'Incident details for review';
  let y = drawReportHeader(
    doc,
    headerTitle,
    headerSub,
    incident.location || 'All Locations',
    dateRange,
  );

  y += 2;

  // ── Incident Summary ──
  y = drawSectionHeading(doc, 'Incident Summary', y);

  const halfW = CONTENT_W / 2 - 4;

  // Row 1: Number + Title
  y = drawKeyValue(doc, MARGIN, y, 'Incident Number', incident.id, CONTENT_W);
  y = drawKeyValue(doc, MARGIN, y + 1, 'Title', incident.title, CONTENT_W);

  // Row 2: Category / Severity / Type
  const catLabel = CATEGORY_DISPLAY[incident.category] || incident.category;
  const sevLabel = SEVERITY_DISPLAY[incident.severity] || incident.severity;
  const row2y = y + 1;
  drawKeyValue(doc, MARGIN, row2y, 'Category', catLabel, halfW);
  drawKeyValue(doc, MARGIN + halfW + 8, row2y, 'Severity', sevLabel, halfW);
  y = row2y + 9;

  // Row 3: Location / Type
  drawKeyValue(doc, MARGIN, y, 'Location', incident.location || '\u2014', halfW);
  drawKeyValue(doc, MARGIN + halfW + 8, y, 'Incident Type', incident.type.replace(/_/g, ' '), halfW);
  y += 9;

  // Row 4: Reported By / Assigned To
  drawKeyValue(doc, MARGIN, y, 'Reported By', incident.reportedBy || '\u2014', halfW);
  drawKeyValue(doc, MARGIN + halfW + 8, y, 'Assigned To', incident.assignedTo || '\u2014', halfW);
  y += 9;

  // Row 5: Dates
  drawKeyValue(doc, MARGIN, y, 'Created', fmtDate(incident.createdAt), halfW);
  drawKeyValue(doc, MARGIN + halfW + 8, y, 'Resolved', fmtDate(incident.resolvedAt), halfW);
  y += 9;

  // Description
  if (incident.description) {
    y = ensureSpace(doc, y, 20);
    y = drawKeyValue(doc, MARGIN, y, 'Description', incident.description, CONTENT_W);
    y += 2;
  }

  // ── Corrective Action ──
  if (incident.correctiveAction || linkedCA) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeading(doc, 'Corrective Action', y);

    if (incident.correctiveAction) {
      y = drawKeyValue(doc, MARGIN, y, 'Action Taken', incident.correctiveAction, CONTENT_W);
      y += 2;
    }

    if (linkedCA) {
      y = drawKeyValue(doc, MARGIN, y, 'Linked CA', linkedCA.title, CONTENT_W);
      if (linkedCA.description) {
        y = drawKeyValue(doc, MARGIN, y + 1, 'CA Description', linkedCA.description, CONTENT_W);
      }
      if (linkedCA.corrective_steps) {
        y = drawKeyValue(doc, MARGIN, y + 1, 'Corrective Steps', linkedCA.corrective_steps, CONTENT_W);
      }
      y = drawKeyValue(doc, MARGIN, y + 1, 'CA Status', linkedCA.status || '\u2014', halfW);
      if (linkedCA.assignee_name) {
        drawKeyValue(doc, MARGIN + halfW + 8, y - 4, 'CA Assignee', linkedCA.assignee_name, halfW);
      }
      y += 2;
    }
  }

  // ── Resolution ──
  if (incident.resolutionSummary || incident.rootCause) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeading(doc, 'Resolution', y);

    if (incident.resolutionSummary) {
      y = drawKeyValue(doc, MARGIN, y, 'Resolution Summary', incident.resolutionSummary, CONTENT_W);
      y += 2;
    }
    if (incident.rootCause) {
      const rcLabel = ROOT_CAUSE_DISPLAY[incident.rootCause] || incident.rootCause;
      y = drawKeyValue(doc, MARGIN, y, 'Root Cause', rcLabel, CONTENT_W);
      y += 2;
    }
    drawKeyValue(doc, MARGIN, y, 'Resolved At', fmtDate(incident.resolvedAt), halfW);
    drawKeyValue(doc, MARGIN + halfW + 8, y, 'Resolved By', resolvedByName || '\u2014', halfW);
    y += 10;
  }

  // ── Photo Evidence ──
  const hasIncidentPhotos = incident.photos.length > 0;
  const hasResolutionPhotos = incident.resolutionPhotos.length > 0;

  if (hasIncidentPhotos || hasResolutionPhotos) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionHeading(doc, 'Photo Evidence', y);

    const photoW = 38;
    const photoH = 28;
    const photoGap = 4;

    // Incident photos
    if (hasIncidentPhotos) {
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(GRAY));
      doc.text(`Incident Photos (${incident.photos.length})`, MARGIN, y);
      y += 4;

      let px = MARGIN;
      for (const photo of incident.photos) {
        if (px + photoW > MARGIN + CONTENT_W) {
          px = MARGIN;
          y += photoH + photoGap + 4;
        }
        y = ensureSpace(doc, y, photoH + 8);
        try {
          doc.addImage(photo.dataUrl, 'JPEG', px, y, photoW, photoH);
          // Timestamp below photo
          doc.setFontSize(6);
          doc.setTextColor(...hexToRgb(GRAY));
          doc.text(photo.displayTime || fmtTimestamp(photo.timestamp), px, y + photoH + 3);
        } catch {
          // If image fails to embed, show placeholder
          doc.setFillColor(240, 240, 240);
          doc.rect(px, y, photoW, photoH, 'F');
          doc.setFontSize(7);
          doc.setTextColor(...hexToRgb(GRAY));
          doc.text('Photo', px + 2, y + photoH / 2);
        }
        px += photoW + photoGap;
      }
      y += photoH + 8;
    }

    // Resolution photos
    if (hasResolutionPhotos) {
      y = ensureSpace(doc, y, photoH + 12);
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(GRAY));
      doc.text(`Resolution Photos (${incident.resolutionPhotos.length})`, MARGIN, y);
      y += 4;

      let px = MARGIN;
      for (const photo of incident.resolutionPhotos) {
        if (px + photoW > MARGIN + CONTENT_W) {
          px = MARGIN;
          y += photoH + photoGap + 4;
        }
        y = ensureSpace(doc, y, photoH + 8);
        try {
          doc.addImage(photo.dataUrl, 'JPEG', px, y, photoW, photoH);
          doc.setFontSize(6);
          doc.setTextColor(...hexToRgb(GRAY));
          doc.text(photo.displayTime || fmtTimestamp(photo.timestamp), px, y + photoH + 3);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.rect(px, y, photoW, photoH, 'F');
          doc.setFontSize(7);
          doc.setTextColor(...hexToRgb(GRAY));
          doc.text('Photo', px + 2, y + photoH / 2);
        }
        px += photoW + photoGap;
      }
      y += photoH + 8;
    }
  }

  // ── Audit Trail (Timeline) ──
  if (incident.timeline.length > 0) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeading(doc, `Audit Trail (${incident.timeline.length} events)`, y);

    const tlRows = incident.timeline.map(t => [
      fmtTimestamp(t.timestamp),
      t.action.length > 55 ? t.action.substring(0, 55) + '\u2026' : t.action,
      t.status || '\u2014',
      t.user || '\u2014',
    ]);

    y = drawTable(
      doc,
      ['Timestamp', 'Action', 'Status', 'By'],
      tlRows,
      y,
      { colWidths: [38, 76, 28, 32], fontSize: 7 },
    );
  }

  // ── Verification ──
  y = ensureSpace(doc, y, 20);
  y = drawSectionHeading(doc, 'Verification', y);

  if (incident.verifiedAt) {
    drawKeyValue(doc, MARGIN, y, 'Verified', 'Yes', halfW);
    drawKeyValue(doc, MARGIN + halfW + 8, y, 'Verified At', fmtDate(incident.verifiedAt), halfW);
    y += 10;
    drawKeyValue(doc, MARGIN, y, 'Verified By', incident.verifiedBy || '\u2014', halfW);
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(GRAY));
    doc.text('Pending verification', MARGIN, y + 4);
  }

  // ── Save ──
  const tag = isResolved ? 'Proof-Packet' : 'Incident-Report';
  const filename = `EvidLY-${tag}-${incident.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
  saveReportPdf(doc, filename);
}
