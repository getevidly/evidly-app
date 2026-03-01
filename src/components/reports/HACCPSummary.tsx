// ── Report #7: HACCP Summary ────────────────────────────────────────────
import { useState } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getHACCPSummaryData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

function ProgressBar({ value, color = '#1e4d6b' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold min-w-[32px] text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function HACCPSummary({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Set up HACCP plans and start monitoring control points to generate this report." />;

  const data = getHACCPSummaryData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'HACCP Summary', 'Control points, deviations, and corrective actions', location === 'all' ? 'All Locations' : location, dateRange);
    y = drawSectionHeading(doc, 'HACCP Compliance by Location', y);
    drawTable(doc, ['Location', 'Monitoring %', 'Records %', 'Corrective %'],
      data.compliance.map(c => [c.location, `${c.monitoring}%`, `${c.records}%`, `${c.corrective}%`]), y);
    saveReportPdf(doc, `evidly-haccp-summary-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-2xl font-bold" style={{ color: BODY_TEXT }}>{data.totalDeviations}</p>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>Deviations</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>{data.resolvedRate}%</p>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>Resolved</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-2xl font-bold" style={{ color: BODY_TEXT }}>{data.compliance.length}</p>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>Locations Monitored</p>
        </div>
      </div>

      {/* HACCP compliance by location */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>HACCP Compliance by Location</h3>
        <div className="space-y-4">
          {data.compliance.map((c, i) => (
            <div key={i}>
              <p className="text-sm font-medium mb-2" style={{ color: BODY_TEXT }}>{c.location}</p>
              <div className="space-y-1.5">
                <div><span className="text-[11px]" style={{ color: MUTED }}>Monitoring</span><ProgressBar value={c.monitoring} color={c.monitoring >= 90 ? '#16a34a' : '#d97706'} /></div>
                <div><span className="text-[11px]" style={{ color: MUTED }}>Records</span><ProgressBar value={c.records} color={c.records >= 90 ? '#16a34a' : '#d97706'} /></div>
                <div><span className="text-[11px]" style={{ color: MUTED }}>Corrective Actions</span><ProgressBar value={c.corrective} color={c.corrective >= 90 ? '#16a34a' : '#d97706'} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deviations */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Recent Deviations</h3>
        {data.deviations.length === 0 ? (
          <p className="text-sm" style={{ color: MUTED }}>No deviations for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                  {['Date', 'Control Point', 'Reading', 'Corrective Action', 'Location'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.deviations.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{d.date}</td>
                    <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{d.controlPoint}</td>
                    <td className="py-2 px-3 text-xs" style={{ color: '#dc2626' }}>{d.reading}</td>
                    <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{d.correctiveAction}</td>
                    <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{d.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
