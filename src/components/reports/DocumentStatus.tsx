// ── Report #4: Document Status ──────────────────────────────────────────
import { useState } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getDocumentStatusData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, drawStatBox, saveReportPdf, MARGIN, CONTENT_W } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

export default function DocumentStatus({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Upload documents and certificates to see your document inventory here." />;

  const data = getDocumentStatusData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Document Status', 'Every document across both pillars', location === 'all' ? 'All Locations' : location, dateRange);
    const boxW = CONTENT_W / 4 - 3;
    drawStatBox(doc, MARGIN, y, boxW, String(data.totals.total), 'Total');
    drawStatBox(doc, MARGIN + boxW + 4, y, boxW, String(data.totals.current), 'Current');
    drawStatBox(doc, MARGIN + (boxW + 4) * 2, y, boxW, String(data.totals.expiring), 'Coming Due');
    drawStatBox(doc, MARGIN + (boxW + 4) * 3, y, boxW, String(data.totals.expired), 'Needs Renewal');
    y += 26;
    y = drawSectionHeading(doc, 'Document Inventory', y);
    drawTable(doc, ['Type', 'Total', 'Current', 'Coming Due', 'Needs Renewal'], data.inventory.map(d => [d.type, String(d.total), String(d.current), String(d.expiring), String(d.expired)]), y);
    saveReportPdf(doc, `evidly-document-status-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: data.totals.total, color: BODY_TEXT },
          { label: 'Current', value: data.totals.current, color: '#16a34a' },
          { label: 'Coming Due', value: data.totals.expiring, color: '#d97706' },
          { label: 'Needs Renewal', value: data.totals.expired, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-1" style={{ color: MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Document inventory table */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Document Inventory by Category</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Type', 'Total', 'Current', 'Coming Due', 'Needs Renewal'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.inventory.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{d.type}</td>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{d.total}</td>
                  <td className="py-2 px-3" style={{ color: '#16a34a' }}>{d.current}</td>
                  <td className="py-2 px-3" style={{ color: d.expiring > 0 ? '#d97706' : MUTED }}>{d.expiring}</td>
                  <td className="py-2 px-3" style={{ color: d.expired > 0 ? '#dc2626' : MUTED }}>{d.expired}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiration timeline */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Expiration Timeline</h3>
        <div className="space-y-2">
          {data.expirationTimeline.map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: '#f8f9fc' }}>
              <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: e.daysLeft <= 0 ? '#dc2626' : e.daysLeft <= 30 ? '#d97706' : '#16a34a' }} />
              <span className="text-sm flex-1" style={{ color: BODY_TEXT }}>{e.document}</span>
              <span className="text-xs" style={{ color: MUTED }}>{e.type}</span>
              <span className="text-xs" style={{ color: MUTED }}>{e.expires}</span>
              <span className="text-xs font-medium" style={{ color: e.daysLeft <= 0 ? '#dc2626' : e.daysLeft <= 14 ? '#d97706' : '#16a34a' }}>
                {e.daysLeft <= 0 ? 'Overdue' : `${e.daysLeft}d`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing documents */}
      {data.missingDocs.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Missing Documents</h3>
          <div className="space-y-2">
            {data.missingDocs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                <span className="text-sm flex-1" style={{ color: BODY_TEXT }}>{d.document}</span>
                <span className="text-xs" style={{ color: MUTED }}>{d.location}</span>
                <span className="text-xs" style={{ color: MUTED }}>{d.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
