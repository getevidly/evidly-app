/**
 * Compliance Status Report — location compliance summary with scores.
 * Shows empty state when no data from API.
 */
import { FileText, Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { NAVY, TEXT_TERTIARY, CARD_BORDER, CARD_BG } from '../dashboard/shared/constants';

interface ComplianceStatusProps {
  data: Record<string, unknown> | null;
}

export function ComplianceStatusReport({ data }: ComplianceStatusProps) {
  if (!data || Object.keys(data).length === 0) {
    return <EmptyReport title="Compliance Status" />;
  }

  const locations = (data.locations as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ScoreCard label="Total Locations" value={String(locations.length)} icon={Shield} iconColor="#1E2D4D" />
        <ScoreCard label="Compliant" value={String(locations.filter(l => (Number(l.score) || 0) >= 90).length)} icon={CheckCircle} iconColor="#059669" />
        <ScoreCard label="At Risk" value={String(locations.filter(l => { const s = Number(l.score) || 0; return s >= 70 && s < 90; }).length)} icon={AlertTriangle} iconColor="#D97706" />
        <ScoreCard label="Non-Compliant" value={String(locations.filter(l => (Number(l.score) || 0) < 70).length)} icon={XCircle} iconColor="#DC2626" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
              {['Location', 'Score', 'Food Safety', 'Fire Safety', 'Last Inspection', 'Status'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase" style={{ color: TEXT_TERTIARY }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locations.map((loc, i) => {
              const score = Number(loc.score) || 0;
              const sc = scoreColor(score);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <td className="px-3 py-2 font-medium" style={{ color: NAVY }}>{String(loc.name || '')}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: sc }}>{score}</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(loc.foodSafety || '—')}</td>
                  <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{String(loc.facilitySafety || '—')}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: TEXT_TERTIARY }}>{String(loc.lastInspection || '—')}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                      background: score >= 90 ? '#F0FFF4' : score >= 70 ? '#FFFBEB' : '#FEF2F2',
                      color: sc,
                    }}>
                      {score >= 90 ? 'Compliant' : score >= 70 ? 'At Risk' : 'Non-Compliant'}
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

function scoreColor(score: number): string {
  if (score >= 90) return '#059669';
  if (score >= 70) return '#D97706';
  return '#DC2626';
}

function ScoreCard({ label, value, icon: Icon, iconColor }: { label: string; value: string; icon: typeof Shield; iconColor: string }) {
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
