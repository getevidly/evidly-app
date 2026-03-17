/**
 * Timecard Summary Report — hours by employee with OT breakdown.
 * Shows empty state when no data from API.
 */
import { FileText, Clock, AlertTriangle } from 'lucide-react';
import { NAVY, TEXT_TERTIARY, CARD_BORDER, CARD_BG } from '../dashboard/shared/constants';

interface TimecardSummaryProps {
  data: Record<string, unknown> | null;
}

export function TimecardSummaryReport({ data }: TimecardSummaryProps) {
  if (!data || Object.keys(data).length === 0) {
    return <EmptyReport title="Timecard Summary" />;
  }

  const employees = (data.employees as Array<Record<string, unknown>>) || [];
  const totalHours = employees.reduce((s, e) => s + (Number(e.totalHours) || 0), 0);
  const totalOT = employees.reduce((s, e) => s + (Number(e.overtimeHours) || 0), 0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Employees" value={String(employees.length)} />
        <KpiCard label="Total Hours" value={totalHours.toFixed(1)} />
        <KpiCard label="Regular Hours" value={(totalHours - totalOT).toFixed(1)} />
        <KpiCard label="Overtime Hours" value={totalOT.toFixed(1)} color={totalOT > 0 ? '#D97706' : '#059669'} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
              {['Employee', 'Regular Hrs', 'OT Hrs', 'Total Hrs', 'Est. Cost', 'Flag'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => {
              const ot = Number(emp.overtimeHours) || 0;
              const total = Number(emp.totalHours) || 0;
              const reg = total - ot;
              const hasOT = ot > 0;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${CARD_BORDER}`, background: hasOT ? '#FFFBEB' : 'transparent' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: NAVY }}>{String(emp.name || '')}</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{reg.toFixed(1)}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: hasOT ? '#D97706' : TEXT_TERTIARY }}>
                    {ot.toFixed(1)}
                    {hasOT && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-amber-500" />}
                  </td>
                  <td className="px-3 py-2 font-semibold" style={{ color: NAVY }}>{total.toFixed(1)}</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>${Number(emp.estimatedCost || 0).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {hasOT && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>
                        OT
                      </span>
                    )}
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
