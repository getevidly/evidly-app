// ── Report #6: Temperature Log Summary ──────────────────────────────────
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getTempLogSummaryData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

export default function TemperatureLogSummary({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Start logging temperatures to see trends here." />;

  const data = getTempLogSummaryData(location);
  const avgCompliance = Math.round(data.tempCompliance.reduce((s, t) => s + t.compliance, 0) / data.tempCompliance.length);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Temperature Log Summary', 'Compliance rates and deviation tracking', location === 'all' ? 'All Locations' : location, dateRange);
    y = drawSectionHeading(doc, 'Weekly Compliance', y);
    drawTable(doc, ['Week', 'Compliance %'], data.tempCompliance.map(t => [t.week, `${t.compliance}%`]), y);
    saveReportPdf(doc, `evidly-temp-log-summary-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-2xl font-bold" style={{ color: avgCompliance >= 90 ? '#16a34a' : avgCompliance >= 75 ? '#d97706' : '#dc2626' }}>{avgCompliance}%</p>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>Avg Compliance</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-2xl font-bold" style={{ color: BODY_TEXT }}>{data.tempCompliance.length}</p>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>Weeks Tracked</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
          <p className="text-2xl font-bold" style={{ color: BODY_TEXT }}>
            {data.tempCompliance.filter(t => t.compliance < 90).length}
          </p>
          <p className="text-[11px] mt-1" style={{ color: MUTED }}>Weeks Below 90%</p>
        </div>
      </div>

      {/* Compliance trend */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Compliance Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.tempCompliance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <Tooltip />
              <Line type="monotone" dataKey="compliance" name="Compliance %" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly breakdown table */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Weekly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Week', 'Compliance %', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tempCompliance.map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{t.week}</td>
                  <td className="py-2 px-3 font-bold" style={{ color: t.compliance >= 90 ? '#16a34a' : t.compliance >= 75 ? '#d97706' : '#dc2626' }}>{t.compliance}%</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                      backgroundColor: t.compliance >= 90 ? '#f0fdf4' : t.compliance >= 75 ? '#fffbeb' : '#fef2f2',
                      color: t.compliance >= 90 ? '#166534' : t.compliance >= 75 ? '#92400e' : '#991b1b',
                    }}>{t.compliance >= 90 ? 'On Target' : t.compliance >= 75 ? 'Needs Improvement' : 'Below Target'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
