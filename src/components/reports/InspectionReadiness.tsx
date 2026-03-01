// ── Report #2: Inspection Readiness ─────────────────────────────────────
import { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getInspectionReadinessData } from '../../data/reportsDemoData';
import { createReportPdf, drawReportHeader, drawSectionHeading, drawTable, saveReportPdf } from '../../lib/pdfExport';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED } from '../dashboard/shared/constants';
import type { ReportTypeConfig } from '../../config/reportConfig';

const gradeIcon = (grade: string) => {
  if (grade === 'Ready') return <ShieldCheck size={20} className="text-green-600" />;
  if (grade === 'Mostly Ready') return <ShieldAlert size={20} className="text-amber-500" />;
  return <ShieldX size={20} className="text-red-500" />;
};
const gradeColor = (g: string) => g === 'Ready' ? '#166534' : g === 'Mostly Ready' ? '#92400e' : '#991b1b';
const gradeBg = (g: string) => g === 'Ready' ? '#f0fdf4' : g === 'Mostly Ready' ? '#fffbeb' : '#fef2f2';

function ProgressBar({ value, color = '#1e4d6b' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function InspectionReadiness({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Complete checklists and log temperatures to build your inspection readiness score." />;

  const data = getInspectionReadinessData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Inspection Readiness', 'If the inspector walked in right now', data.locationName, dateRange);
    y = drawSectionHeading(doc, `Readiness Grade: ${data.readinessGrade}`, y);
    y = drawSectionHeading(doc, 'Checklist Completion', y);
    drawTable(doc, ['Template', 'Rate', 'Completed', 'Missed'], data.checklists.map(c => [c.template, `${c.rate}%`, String(c.completed), String(c.missed)]), y);
    saveReportPdf(doc, `evidly-inspection-readiness-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Readiness grade */}
      <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: gradeBg(data.readinessGrade), border: `1px solid ${CARD_BORDER}` }}>
        {gradeIcon(data.readinessGrade)}
        <div>
          <p className="text-lg font-bold" style={{ color: gradeColor(data.readinessGrade) }}>{data.readinessGrade}</p>
          <p className="text-xs" style={{ color: MUTED }}>{data.locationName}</p>
        </div>
        <div className="ml-auto flex gap-6">
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: BODY_TEXT }}>{data.checklistAvg}%</p>
            <p className="text-[11px]" style={{ color: MUTED }}>Checklist Completion</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: BODY_TEXT }}>{data.tempAvg}%</p>
            <p className="text-[11px]" style={{ color: MUTED }}>Temp Log Compliance</p>
          </div>
        </div>
      </div>

      {/* Checklist completion */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Checklist Completion</h3>
        <div className="space-y-3">
          {data.checklists.map(c => (
            <div key={c.template}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: BODY_TEXT }}>{c.template}</span>
                <span style={{ color: MUTED }}>{c.completed}/{c.completed + c.missed}</span>
              </div>
              <ProgressBar value={c.rate} color={c.rate >= 90 ? '#16a34a' : c.rate >= 75 ? '#d97706' : '#dc2626'} />
            </div>
          ))}
        </div>
      </div>

      {/* Temperature compliance trend */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Temperature Log Compliance Trend</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.tempCompliance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#6B7F96' }} />
              <Tooltip />
              <Line type="monotone" dataKey="compliance" name="Compliance %" stroke="#1e4d6b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff food handler status */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Food Handler Card Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Name', 'Location', 'Status', 'Expires', 'Days'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.staffCerts.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td className="py-2 px-3" style={{ color: BODY_TEXT }}>{s.name}</td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{s.location}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                      backgroundColor: s.status === 'Current' ? '#f0fdf4' : s.status === 'Coming Due' ? '#fffbeb' : '#fef2f2',
                      color: s.status === 'Current' ? '#166534' : s.status === 'Coming Due' ? '#92400e' : '#991b1b',
                    }}>{s.status}</span>
                  </td>
                  <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{s.expires}</td>
                  <td className="py-2 px-3 text-xs font-medium" style={{ color: s.daysLeft < 0 ? '#dc2626' : s.daysLeft < 30 ? '#d97706' : '#166534' }}>
                    {s.daysLeft < 0 ? `${Math.abs(s.daysLeft)}d overdue` : `${s.daysLeft}d`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open corrective actions */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Open Corrective Actions</h3>
        {data.correctiveActions.length === 0 ? (
          <p className="text-sm" style={{ color: MUTED }}>No open corrective actions — nice.</p>
        ) : (
          <div className="space-y-2">
            {data.correctiveActions.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: '#f8f9fc' }}>
                <span className="shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: a.status === 'Open' ? '#dc2626' : a.status === 'In Progress' ? '#d97706' : '#16a34a' }} />
                <span className="text-sm flex-1" style={{ color: BODY_TEXT }}>{a.action}</span>
                <span className="text-xs" style={{ color: MUTED }}>{a.location}</span>
                <span className="text-xs font-medium" style={{ color: MUTED }}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
