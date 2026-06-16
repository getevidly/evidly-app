// ── Report #1: Where You Stand (Executive Summary) ──────────────────────
import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getExecutiveSummaryData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED, TEXT_TERTIARY } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

const NAVY = '#1E2D4D';

export default function ExecutiveSummary({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} />;

  const data = getExecutiveSummaryData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    const locName = location === 'all' ? 'All Locations' : data.locationScores.find(l => l.urlId === location)?.location || location;
    let y = drawReportHeader(doc, 'Where You Stand — Executive Summary', 'Top items and operational summary', locName, dateRange);

    y = drawSectionHeading(doc, 'Locations', y);
    drawTable(doc,
      ['Location'],
      data.locationScores.map(l => [l.location]),
      y,
    );

    saveReportPdf(doc, `evidly-executive-summary-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Jurisdiction grading notice */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: BODY_TEXT }}>Compliance Grading</h3>
        <p className="text-sm" style={{ color: MUTED }}>
          Scores being transitioned to jurisdiction-native grading.
        </p>
      </div>

      {/* Locations */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Locations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>Location</th>
              </tr>
            </thead>
            <tbody>
              {data.locationScores.map(l => (
                <tr key={l.urlId} style={{ borderBottom: `1px solid #f0f0f0` }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{l.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top issues + positives side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: BODY_TEXT }}>
            <AlertTriangle size={14} className="text-amber-500" /> Top Items Needing Attention
          </h3>
          <ul className="space-y-2">
            {data.topIssues.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{
                    backgroundColor: item.priority === 'HIGH' ? '#fef2f2' : item.priority === 'MEDIUM' ? '#fffbeb' : '#eff6ff',
                    color: item.priority === 'HIGH' ? '#ef4444' : item.priority === 'MEDIUM' ? '#A08C5A' : NAVY,
                  }}
                >
                  {item.priority}
                </span>
                <span style={{ color: BODY_TEXT }}>{item.issue}</span>
                <span className="ml-auto text-xs shrink-0" style={{ color: TEXT_TERTIARY }}>{item.affected}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: BODY_TEXT }}>
            <CheckCircle2 size={14} className="text-green-500" /> Going Well
          </h3>
          <ul className="space-y-2">
            {data.topPositives.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-green-500" />
                <span style={{ color: BODY_TEXT }}>{item.item}</span>
                <span className="ml-auto text-xs shrink-0" style={{ color: TEXT_TERTIARY }}>{item.category}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
