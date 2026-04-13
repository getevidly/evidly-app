// ── Report #1: Where You Stand (Executive Summary) ──────────────────────
import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getExecutiveSummaryData, getScoreColor, getScoreStatus } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, drawScoreBadge, drawHorizontalBar, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED, TEXT_TERTIARY } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

const NAVY = '#1e4d6b';

function StatusBadge({ status }: { status: string }) {
  const isGood = status === 'Excellent' || status === 'Good';
  const isWarn = status === 'Needs Attention';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{
        backgroundColor: isGood ? '#f0fdf4' : isWarn ? '#fffbeb' : '#fef2f2',
        color: isGood ? '#166534' : isWarn ? '#92400e' : '#991b1b',
        border: `1px solid ${isGood ? '#bbf7d0' : isWarn ? '#fef3c7' : '#fecaca'}`,
      }}
    >
      {status}
    </span>
  );
}

export default function ExecutiveSummary({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} />;

  const data = getExecutiveSummaryData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    const locName = location === 'all' ? 'All Locations' : data.locationScores.find(l => l.urlId === location)?.location || location;
    let y = drawReportHeader(doc, 'Where You Stand — Executive Summary', 'Overall compliance scores, trends, and top items', locName, dateRange);

    y = drawSectionHeading(doc, 'Compliance Scores by Location', y);
    drawTable(doc,
      ['Location', 'Food Safety', 'Status', 'Facility Safety', 'Status'],
      data.locationScores.map(l => [l.location, String(l.foodSafety), l.foodStatus, String(l.facilitySafety), l.facilityStatus]),
      y,
    );

    saveReportPdf(doc, `evidly-executive-summary-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Org-level scores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Food Safety', score: data.orgScores.foodSafety },
          { label: 'Facility Safety', score: data.orgScores.facilitySafety },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <p className="text-xs font-medium mb-1" style={{ color: MUTED }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: getScoreColor(s.score) }}>{s.score}</p>
            <StatusBadge status={getScoreStatus(s.score)} />
          </div>
        ))}
      </div>

      {/* Score trend chart */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Score Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="foodSafety" name="Food Safety" stroke={NAVY} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="facilitySafety" name="Facility Safety" stroke="#d97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Location comparison */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Scores by Location</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Location', 'Food Safety', 'Status', 'Facility Safety', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.locationScores.map(l => (
                <tr key={l.urlId} style={{ borderBottom: `1px solid #f0f0f0` }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{l.location}</td>
                  <td className="py-2 px-3 font-bold" style={{ color: getScoreColor(l.foodSafety) }}>{l.foodSafety}</td>
                  <td className="py-2 px-3"><StatusBadge status={l.foodStatus} /></td>
                  <td className="py-2 px-3 font-bold" style={{ color: getScoreColor(l.facilitySafety) }}>{l.facilitySafety}</td>
                  <td className="py-2 px-3"><StatusBadge status={l.facilityStatus} /></td>
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
                  className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: item.priority === 'HIGH' ? '#fef2f2' : item.priority === 'MEDIUM' ? '#fffbeb' : '#eff6ff',
                    color: item.priority === 'HIGH' ? '#ef4444' : item.priority === 'MEDIUM' ? '#d4af37' : NAVY,
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
