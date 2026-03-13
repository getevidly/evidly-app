/**
 * Deficiency Aging Report — open deficiencies grouped by age and severity.
 * Shows empty state when no data from API.
 */
import { FileText, AlertTriangle, Clock } from 'lucide-react';
import { NAVY, TEXT_TERTIARY, CARD_BORDER, CARD_BG } from '../dashboard/shared/constants';

interface DeficiencyAgingProps {
  data: Record<string, unknown> | null;
}

const AGE_BUCKETS = ['0-7 days', '8-30 days', '31-60 days', '60+ days'];
const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626' },
  major: { bg: '#FFFBEB', text: '#D97706' },
  minor: { bg: '#EFF6FF', text: '#2563EB' },
};

export function DeficiencyAgingReport({ data }: DeficiencyAgingProps) {
  if (!data || Object.keys(data).length === 0) {
    return <EmptyReport title="Deficiency Aging" />;
  }

  const deficiencies = (data.deficiencies as Array<Record<string, unknown>>) || [];
  const critical = deficiencies.filter(d => d.severity === 'critical').length;
  const major = deficiencies.filter(d => d.severity === 'major').length;
  const minor = deficiencies.filter(d => d.severity === 'minor').length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Open" value={String(deficiencies.length)} icon={AlertTriangle} iconColor="#DC2626" />
        <KpiCard label="Critical" value={String(critical)} icon={AlertTriangle} iconColor="#DC2626" />
        <KpiCard label="Major" value={String(major)} icon={AlertTriangle} iconColor="#D97706" />
        <KpiCard label="Minor" value={String(minor)} icon={Clock} iconColor="#2563EB" />
      </div>

      {/* Aging matrix */}
      <div className="rounded-lg p-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <h4 className="text-xs font-bold uppercase mb-3" style={{ color: TEXT_TERTIARY }}>Aging Matrix</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>Severity</th>
                {AGE_BUCKETS.map(b => (
                  <th key={b} className="text-center px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{b}</th>
                ))}
                <th className="text-center px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {['critical', 'major', 'minor'].map(sev => {
                const sevDefs = deficiencies.filter(d => d.severity === sev);
                const sc = SEVERITY_COLORS[sev] || { bg: '#F3F4F6', text: '#6B7280' };
                return (
                  <tr key={sev} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: sc.bg, color: sc.text }}>
                        {sev}
                      </span>
                    </td>
                    {AGE_BUCKETS.map(b => (
                      <td key={b} className="text-center px-3 py-2 font-medium" style={{ color: NAVY }}>
                        {sevDefs.filter(d => d.ageBucket === b).length || '—'}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2 font-bold" style={{ color: sc.text }}>{sevDefs.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
              {['Deficiency', 'Location', 'Severity', 'Age', 'Assigned To', 'Status'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deficiencies.map((def, i) => {
              const sc = SEVERITY_COLORS[String(def.severity)] || { bg: '#F3F4F6', text: '#6B7280' };
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <td className="px-3 py-2 font-medium" style={{ color: NAVY }}>{String(def.title || '')}</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(def.location || '')}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: sc.bg, color: sc.text }}>
                      {String(def.severity || '')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: TEXT_TERTIARY }}>{String(def.age || '')} days</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(def.assignedTo || '—')}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: TEXT_TERTIARY }}>{String(def.status || '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, iconColor }: { label: string; value: string; icon: typeof AlertTriangle; iconColor: string }) {
  return (
    <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: iconColor }} />
      <div>
        <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{label}</p>
        <p className="text-lg font-bold" style={{ color: NAVY }}>{value}</p>
      </div>
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
