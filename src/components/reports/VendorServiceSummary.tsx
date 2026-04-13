// ── Report #3: Vendor Service Summary ───────────────────────────────────
import { useState } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getVendorServiceData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

function StatusDot({ status }: { status: string }) {
  const color = status === 'current' || status === 'Current' ? '#16a34a' : status === 'Coming Due' || status === 'upcoming' ? '#d97706' : '#dc2626';
  return <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />;
}

export default function VendorServiceSummary({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Add vendors and log services to track your service history." />;

  const data = getVendorServiceData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Vendor Service Summary', 'Service history, status, and document compliance', location === 'all' ? 'All Locations' : location, dateRange);
    y = drawSectionHeading(doc, 'Service Records', y);
    drawTable(doc, ['Vendor', 'Service', 'Date', 'Location', 'Result'],
      data.serviceRecords.map(r => [r.vendorName, r.serviceName, r.serviceDate, r.locationName, r.result]), y);
    saveReportPdf(doc, `evidly-vendor-service-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Services', value: String(data.totalServices) },
          { label: 'Total Spend', value: `$${data.totalSpend.toLocaleString()}` },
          { label: 'Current Vendors', value: String(data.currentVendors) },
          { label: 'Needs Attention', value: String(data.overdueVendors) },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <p className="text-xl font-bold" style={{ color: BODY_TEXT }}>{s.value}</p>
            <p className="text-[11px] mt-1" style={{ color: MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent service records */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Recent Service Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Vendor', 'Service', 'Date', 'Location', 'Result', 'Cost'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.serviceRecords.slice(0, 10).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{r.vendorName}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.serviceName}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.serviceDate}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.locationName}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                      backgroundColor: r.result === 'pass' ? '#f0fdf4' : '#fef2f2',
                      color: r.result === 'pass' ? '#166534' : '#991b1b',
                    }}>{r.result === 'pass' ? 'Pass' : 'Fail'}</span>
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{r.cost ? `$${r.cost}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor document compliance */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Vendor Document Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Vendor', 'COI', 'Certs', 'Insurance', 'Overall'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.vendorDocCompliance.map((v, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{v.vendor}</td>
                  {[v.coi, v.certs, v.insurance, v.status].map((s, j) => (
                    <td key={j} className="py-2 px-3">
                      <span className="flex items-center gap-1.5">
                        <StatusDot status={s} />
                        <span className="text-xs" style={{ color: MUTED }}>{s}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spend by category */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Spend by Category</h3>
        <div className="space-y-3">
          {data.vendorSpend.map(s => (
            <div key={s.category} className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: BODY_TEXT }}>{s.category}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs" style={{ color: MUTED }}>{s.services} services</span>
                <span className="text-sm font-semibold" style={{ color: BODY_TEXT }}>${s.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
