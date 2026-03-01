// ── Report #8: Insurance Documentation ──────────────────────────────────
import { useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getInsuranceDocData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

export default function InsuranceDocumentation({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Upload insurance documents and vendor COIs to build your insurance-ready file." />;

  const data = getInsuranceDocData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Insurance Documentation', 'Everything an insurance carrier would ask for', location === 'all' ? 'All Locations' : location, dateRange);
    y = drawSectionHeading(doc, `Readiness: ${data.readiness}`, y);
    y = drawSectionHeading(doc, 'Documentation Status', y);
    drawTable(doc, ['Item', 'Provider', 'Status', 'Expires'],
      data.items.map(i => [i.item, i.provider, i.status, i.expires]), y);
    saveReportPdf(doc, `evidly-insurance-docs-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Readiness banner */}
      <div className="rounded-xl p-5 flex items-center gap-4" style={{
        background: data.readiness === 'Ready' ? '#f0fdf4' : '#fffbeb',
        border: `1px solid ${CARD_BORDER}`,
      }}>
        {data.readiness === 'Ready'
          ? <ShieldCheck size={24} className="text-green-600" />
          : <ShieldAlert size={24} className="text-amber-500" />
        }
        <div>
          <p className="text-lg font-bold" style={{ color: data.readiness === 'Ready' ? '#166534' : '#92400e' }}>
            Insurance Readiness: {data.readiness}
          </p>
          <p className="text-xs" style={{ color: MUTED }}>
            {data.readiness === 'Ready' ? 'All required documentation is current.' : `${data.gaps.length} gap(s) identified.`}
          </p>
        </div>
      </div>

      {/* Documentation items */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Insurance Documentation Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Item', 'Provider', 'Status', 'Expires'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{item.item}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{item.provider}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                      backgroundColor: item.status === 'Current' ? '#f0fdf4' : '#fffbeb',
                      color: item.status === 'Current' ? '#166534' : '#92400e',
                    }}>{item.status}</span>
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{item.expires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gaps */}
      {data.gaps.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: BODY_TEXT }}>Gaps a Carrier Would Flag</h3>
          <ul className="space-y-2">
            {data.gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm py-2 px-3 rounded-lg" style={{ backgroundColor: '#fffbeb' }}>
                <ShieldAlert size={14} className="shrink-0 mt-0.5 text-amber-500" />
                <span style={{ color: BODY_TEXT }}>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vendor COI status */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Vendor COI Status</h3>
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
                  {[v.coi, v.certs, v.insurance, v.status].map((s, j) => {
                    const isGood = s === 'Current';
                    const isWarn = s === 'Coming Due';
                    return (
                      <td key={j} className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                          backgroundColor: isGood ? '#f0fdf4' : isWarn ? '#fffbeb' : '#fef2f2',
                          color: isGood ? '#166534' : isWarn ? '#92400e' : '#991b1b',
                        }}>{s}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
