/**
 * Jobs Summary Report — tabular view of jobs by status, tech, location.
 * Shows empty state when no data from API.
 */
import { FileText } from 'lucide-react';
import { NAVY, TEXT_TERTIARY, CARD_BORDER } from '../dashboard/shared/constants';

interface JobsSummaryProps {
  data: Record<string, unknown> | null;
}

export function JobsSummaryReport({ data }: JobsSummaryProps) {
  if (!data || Object.keys(data).length === 0) {
    return <EmptyReport title="Jobs Summary" />;
  }

  const jobs = (data.jobs as Array<Record<string, unknown>>) || [];
  const headers = ['Job #', 'Location', 'Technician', 'Service Type', 'Status', 'Date', 'Duration'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: NAVY }}>Jobs Summary</h3>
        <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{jobs.length} jobs</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
              {headers.map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                <td className="px-3 py-2 font-medium" style={{ color: NAVY }}>{String(job.number || '')}</td>
                <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(job.location || '')}</td>
                <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(job.technician || '')}</td>
                <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(job.serviceType || '')}</td>
                <td className="px-3 py-2"><StatusPill status={String(job.status || '')} /></td>
                <td className="px-3 py-2 text-xs" style={{ color: TEXT_TERTIARY }}>{String(job.date || '')}</td>
                <td className="px-3 py-2 text-xs" style={{ color: TEXT_TERTIARY }}>{String(job.duration || '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    completed: { bg: '#F0FFF4', text: '#059669' },
    scheduled: { bg: '#EFF6FF', text: '#2563EB' },
    cancelled: { bg: '#FEF2F2', text: '#DC2626' },
    'in-progress': { bg: '#FFFBEB', text: '#D97706' },
  };
  const c = colors[status.toLowerCase()] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function EmptyReport({ title }: { title: string }) {
  return (
    <div className="text-center py-12">
      <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
      <p className="text-sm font-medium" style={{ color: NAVY }}>No data available for {title}</p>
      <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Generate this report with live data to see results.</p>
    </div>
  );
}
