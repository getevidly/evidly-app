// ── Report #12: Location Comparison ─────────────────────────────────────
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getLocationComparisonData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

const NAVY = '#1E2D4D';

export default function LocationComparison({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Add multiple locations to compare operational metrics side by side." />;

  const data = getLocationComparisonData();

  if (data.length < 2) {
    return <ReportEmptyState message="Location comparison requires 2 or more locations" guidance="Add another location to start comparing." />;
  }

  // Find best / needs most attention by checklist completion
  const sorted = [...data].sort((a, b) => b.checklistCompletion - a.checklistCompletion);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Location Comparison', 'Side-by-side operational metrics', 'All Locations', 'Current');
    y = drawSectionHeading(doc, 'Comparison Table', y);
    drawTable(doc,
      ['Location', 'Checklists', 'Temperature Readings', 'Open Items'],
      data.map(l => [l.location, `${l.checklistCompletion}%`, `${l.tempCompliance}%`, String(l.openItems)]),
      y,
    );
    saveReportPdf(doc, 'evidly-location-comparison.pdf');
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ReportPdfButton onExport={handleExportPdf} />
      </div>

      {/* Best / Worst callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span className="text-2xl font-bold tracking-tight" style={{ color: '#16a34a' }}>{best.checklistCompletion}%</span>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#166534' }}>Best Checklist Completion</p>
            <p className="text-sm font-medium" style={{ color: BODY_TEXT }}>{best.location}</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
          <span className="text-2xl font-bold tracking-tight" style={{ color: '#d97706' }}>{worst.checklistCompletion}%</span>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#92400e' }}>Needs Most Attention</p>
            <p className="text-sm font-medium" style={{ color: BODY_TEXT }}>{worst.location}</p>
          </div>
        </div>
      </div>

      {/* Bar chart — operational metrics */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Operational Metrics Comparison</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <YAxis dataKey="location" type="category" tick={{ fontSize: 11, fill: '#6B7F96' }} width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="checklistCompletion" name="Checklist %" fill={NAVY} radius={[0, 4, 4, 0]} />
              <Bar dataKey="tempCompliance" name="Temperature Reading %" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full comparison table */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Detailed Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Location', 'Checklist %', 'Temperature Reading %', 'Open Items'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(l => (
                <tr key={l.urlId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{l.location}</td>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{l.checklistCompletion}%</td>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{l.tempCompliance}%</td>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{l.openItems}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
