// ── Report #5: Equipment Service History ────────────────────────────────
import { useState } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getEquipmentServiceData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

export default function EquipmentServiceHistory({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Add equipment and log services to see history here." />;

  const data = getEquipmentServiceData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Equipment Service History', 'Service records, certifications, and maintenance tracking', location === 'all' ? 'All Locations' : location, dateRange);
    y = drawSectionHeading(doc, 'Service Records', y);
    drawTable(doc, ['Vendor', 'Service', 'Date', 'Location', 'Result', 'Cost'],
      data.serviceRecords.map(r => [r.vendorName, r.serviceName, r.serviceDate, r.locationName, r.result, r.cost ? `$${r.cost}` : '—']), y);
    saveReportPdf(doc, `evidly-equipment-service-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Equipment certifications */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Equipment Certifications</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Equipment', 'Location', 'Status', 'Expires'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.equipmentCerts.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{e.equipment}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{e.location}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                      backgroundColor: e.status === 'Current' ? '#f0fdf4' : '#fffbeb',
                      color: e.status === 'Current' ? '#166534' : '#92400e',
                    }}>{e.status}</span>
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{e.expires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance schedule */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Maintenance Schedule</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Equipment', 'Due Date', 'Last Service', 'Adherence'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.maintenanceSchedule.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{m.equipment}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{m.dueDate}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{m.lastService}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                      backgroundColor: m.adherence === 'On Track' ? '#f0fdf4' : '#fef2f2',
                      color: m.adherence === 'On Track' ? '#166534' : '#991b1b',
                    }}>{m.adherence}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service history */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Service History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Date', 'Vendor', 'Service', 'Location', 'Result', 'Cost', 'Cert #'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.serviceRecords.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.serviceDate}</td>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{r.vendorName}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.serviceName}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.locationName}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                      backgroundColor: r.result === 'pass' ? '#f0fdf4' : '#fef2f2',
                      color: r.result === 'pass' ? '#166534' : '#991b1b',
                    }}>{r.result === 'pass' ? 'Pass' : r.result === 'fail' ? 'Fail' : 'N/A'}</span>
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.cost ? `$${r.cost}` : '—'}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.certificateNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
