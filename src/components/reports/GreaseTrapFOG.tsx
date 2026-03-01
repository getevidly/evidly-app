// ── Report #10: Grease Trap / FOG ───────────────────────────────────────
import { useState } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getGreaseTrapData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

export default function GreaseTrapFOG({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Log grease trap services to track your FOG program compliance." />;

  const data = getGreaseTrapData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Grease Trap / FOG', 'Pumping history and disposal chain of custody', location === 'all' ? 'All Locations' : location, dateRange);
    y = drawSectionHeading(doc, 'Pumping History', y);
    drawTable(doc, ['Date', 'Vendor', 'Gallons', 'Facility', 'Manifest', 'Location'],
      data.history.map(h => [h.date, h.vendor, String(h.gallons), h.facility, h.manifest, h.location]), y);
    saveReportPdf(doc, `evidly-grease-trap-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Pumpings', value: String(data.totalPumpings) },
          { label: 'Total Gallons', value: data.totalGallons.toLocaleString() },
          { label: 'Schedule', value: data.schedule },
          { label: 'Status', value: data.compliance },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <p className="text-xl font-bold" style={{ color: s.label === 'Status' && s.value === 'On Schedule' ? '#16a34a' : BODY_TEXT }}>{s.value}</p>
            <p className="text-[11px] mt-1" style={{ color: MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pumping history */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Pumping History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Date', 'Vendor', 'Gallons', 'Receiving Facility', 'Manifest #', 'Location'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.history.map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{h.date}</td>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{h.vendor}</td>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{h.gallons} gal</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{h.facility}</td>
                  <td className="py-2 px-3 text-xs font-mono" style={{ color: MUTED }}>{h.manifest}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{h.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
