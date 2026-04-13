// ── Report #9: Training & Certification ─────────────────────────────────
import { useState } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { ReportFilters, type DateRange } from './ReportFilters';
import { ReportPdfButton } from './ReportPdfButton';
import { ReportEmptyState } from './ReportEmptyState';
import { getTrainingCertData } from '../../data/reportsDemoData';
import { getTrainingStatus, getStatusColors, getNextExpiration } from '../../data/trainingRecordsDemoData';
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

export default function TrainingCertification({ config }: { config: ReportTypeConfig }) {
  const { isDemoMode } = useDemo();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState('all');

  if (!isDemoMode) return <ReportEmptyState reportTitle={config.title} guidance="Add team members and upload certifications to see training status here." />;

  const data = getTrainingCertData(location);

  const handleExportPdf = () => {
    const doc = createReportPdf();
    let y = drawReportHeader(doc, 'Training & Certification', 'Employee certifications and training completion', location === 'all' ? 'All Locations' : location, dateRange);
    y = drawSectionHeading(doc, 'Employee Certification Status', y);
    drawTable(doc, ['Name', 'Role', 'Location', 'Status', 'Next Expiry'],
      data.employees.map(e => [e.name, e.role, e.locationName, getTrainingStatus(e), getNextExpiration(e) || 'N/A']), y);
    saveReportPdf(doc, `evidly-training-cert-${dateRange}.pdf`);
  };

  return (
    <div className="space-y-5">
      <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} selectedLocation={location} onLocationChange={setLocation}>
        <ReportPdfButton onExport={handleExportPdf} />
      </ReportFilters>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Team Members', value: String(data.totalEmployees), color: BODY_TEXT },
          { label: 'Coming Due (30d)', value: String(data.expiring30), color: '#d97706' },
          { label: 'Needs Renewal', value: String(data.expired), color: '#dc2626' },
          { label: 'Avg Completion', value: `${data.training.length > 0 ? Math.round(data.training.reduce((s, t) => s + t.rate, 0) / data.training.length) : 0}%`, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-1" style={{ color: MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Employee certification table */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Employee Certification Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${CARD_BORDER}` }}>
                {['Name', 'Role', 'Location', 'Certs', 'Status', 'Next Expiry'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.employees.map(e => {
                const status = getTrainingStatus(e);
                const colors = getStatusColors(status);
                const next = getNextExpiration(e);
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td className="py-2 px-3 font-medium" style={{ color: BODY_TEXT }}>{e.name}</td>
                    <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{e.role}</td>
                    <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{e.locationName}</td>
                    <td className="py-2 px-3 text-xs" style={{ color: BODY_TEXT }}>{e.certifications.length}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}>
                        {status === 'current' ? 'All Current' : status === 'coming_due' ? 'Coming Due' : 'Needs Renewal'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs" style={{ color: MUTED }}>{next ? new Date(next).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training completion rates */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: BODY_TEXT }}>Training Completion by Program</h3>
        <div className="space-y-3">
          {data.training.map(t => (
            <div key={t.training}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: BODY_TEXT }}>{t.training}</span>
                <span style={{ color: MUTED }}>{t.completed}/{t.completed + t.pending}</span>
              </div>
              <ProgressBar value={t.rate} color={t.rate >= 90 ? '#16a34a' : t.rate >= 70 ? '#d97706' : '#dc2626'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
