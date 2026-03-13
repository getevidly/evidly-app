/**
 * Profitability Report — margin analysis, flags jobs/customers below 60%.
 * Shows empty state when no data from API.
 */
import { FileText, AlertTriangle } from 'lucide-react';
import { NAVY, TEXT_TERTIARY, CARD_BORDER, CARD_BG } from '../dashboard/shared/constants';

const MARGIN_THRESHOLD = 60;

interface ProfitabilityProps {
  data: Record<string, unknown> | null;
}

export function ProfitabilityReport({ data }: ProfitabilityProps) {
  if (!data || Object.keys(data).length === 0) {
    return <EmptyReport title="Profitability" />;
  }

  const jobs = (data.jobs as Array<Record<string, unknown>>) || [];
  const flagged = jobs.filter(j => (Number(j.margin) || 0) < MARGIN_THRESHOLD);
  const avgMargin = jobs.length > 0
    ? jobs.reduce((sum, j) => sum + (Number(j.margin) || 0), 0) / jobs.length
    : 0;

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Jobs" value={String(jobs.length)} />
        <KpiCard label="Avg Margin" value={`${avgMargin.toFixed(1)}%`} color={avgMargin < MARGIN_THRESHOLD ? '#DC2626' : '#059669'} />
        <KpiCard label="Below 60%" value={String(flagged.length)} color={flagged.length > 0 ? '#DC2626' : '#059669'} />
      </div>

      {/* Flagged jobs alert */}
      {flagged.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">{flagged.length} job{flagged.length > 1 ? 's' : ''} below {MARGIN_THRESHOLD}% margin</p>
            <p className="text-xs text-red-700 mt-1">Review these jobs for cost reduction or repricing opportunities.</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
              {['Job', 'Customer', 'Revenue', 'Cost', 'Margin', 'Status'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, i) => {
              const margin = Number(job.margin) || 0;
              const isFlagged = margin < MARGIN_THRESHOLD;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${CARD_BORDER}`, background: isFlagged ? '#FEF2F2' : 'transparent' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: NAVY }}>{String(job.number || '')}</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(job.customer || '')}</td>
                  <td className="px-3 py-2" style={{ color: NAVY }}>${Number(job.revenue || 0).toLocaleString()}</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>${Number(job.cost || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: isFlagged ? '#DC2626' : '#059669' }}>
                    {margin.toFixed(1)}%
                    {isFlagged && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-red-500" />}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                      background: isFlagged ? '#FEF2F2' : '#F0FFF4',
                      color: isFlagged ? '#DC2626' : '#059669',
                    }}>
                      {isFlagged ? 'Below Threshold' : 'Healthy'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: color || NAVY }}>{value}</p>
    </div>
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
