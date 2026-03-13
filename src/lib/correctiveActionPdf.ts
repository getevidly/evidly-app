// ── Corrective Actions PDF Export ──────────────────────────────────────────
// Generates a branded PDF report from corrective action data.
// Uses pdfExport.ts helpers for consistent EvidLY styling.

import {
  createReportPdf,
  saveReportPdf,
  drawReportHeader,
  drawSectionHeading,
  drawTable,
  drawStatBox,
  MARGIN,
  CONTENT_W,
} from './pdfExport';
import type { CorrectiveActionItem } from '../data/correctiveActionsDemoData';
import { isOverdue, SEVERITY_LABELS, CATEGORY_LABELS } from '../data/correctiveActionsDemoData';
import { CA_STATUS_MAP } from '../constants/correctiveActionStatus';

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportCorrectiveActionsPdf(
  actions: CorrectiveActionItem[],
  locationName: string,
): void {
  const doc = createReportPdf();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ──
  let y = drawReportHeader(
    doc,
    'Corrective Actions Report',
    'Internal operational record',
    locationName,
    dateStr,
  );

  y += 4;

  // ── Summary Stats ──
  const openCount = actions.filter(i => ['reported', 'assigned', 'in_progress'].includes(i.status)).length;
  const overdueCount = actions.filter(i => isOverdue(i)).length;
  const verifiedCount = actions.filter(i => i.status === 'verified').length;
  const resolvedItems = actions.filter(i => i.resolvedAt);
  const avgResolveDays = resolvedItems.length > 0
    ? Math.round(
        resolvedItems.reduce((sum, i) => {
          const created = new Date(i.createdAt).getTime();
          const resolved = new Date(i.resolvedAt!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedItems.length,
      )
    : 0;

  const boxW = CONTENT_W / 4 - 3;
  drawStatBox(doc, MARGIN, y, boxW, String(openCount), 'Open');
  drawStatBox(doc, MARGIN + boxW + 4, y, boxW, String(overdueCount), 'Overdue');
  drawStatBox(doc, MARGIN + (boxW + 4) * 2, y, boxW, `${avgResolveDays}d`, 'Avg Resolve');
  drawStatBox(doc, MARGIN + (boxW + 4) * 3, y, boxW, String(verifiedCount), 'Verified');
  y += 26;

  // ── Actions Table ──
  y = drawSectionHeading(doc, `All Actions (${actions.length})`, y);

  const rows = actions.map(item => {
    const daysOpen = Math.ceil(
      (new Date().getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    return [
      item.title.length > 35 ? item.title.substring(0, 35) + '\u2026' : item.title,
      SEVERITY_LABELS[item.severity],
      CA_STATUS_MAP[item.status].label,
      item.assignee || '\u2014',
      new Date(item.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      `${daysOpen}d`,
    ];
  });

  y = drawTable(
    doc,
    ['Title', 'Severity', 'Status', 'Assignee', 'Due', 'Days'],
    rows,
    y,
    { colWidths: [55, 22, 24, 30, 24, 19], fontSize: 7 },
  );

  // ── Save ──
  saveReportPdf(doc, `corrective-actions-${now.toISOString().slice(0, 10)}.pdf`);
}
