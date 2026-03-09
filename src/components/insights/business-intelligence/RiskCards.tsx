import { DIMENSIONS, LEVEL_COLORS, SEV_ORDER, type BISignal } from './types';
import { SevBadge } from './SevBadge';

interface Props {
  signals: BISignal[];
  showNewBadge?: boolean; // P5 "NEW" badge in demo mode
}

export function RiskCards({ signals, showNewBadge }: Props) {
  // Compute highest severity + signal count per dimension
  const dimStats = DIMENSIONS.map(dim => {
    let highest = 'none';
    let count = 0;
    for (const s of signals) {
      const level = (s as Record<string, unknown>)[dim.riskKey] as string | null;
      if (level && level !== 'none') {
        count++;
        if ((SEV_ORDER[level] || 0) > (SEV_ORDER[highest] || 0)) highest = level;
      }
    }
    return { ...dim, highest, count };
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      {dimStats.map(d => {
        const lc = LEVEL_COLORS[d.highest] || { bg: '#F9FAFB', text: '#9CA3AF', label: 'NONE' };
        return (
          <div key={d.key} style={{
            background: '#fff',
            border: `1px solid ${d.border}`,
            borderLeft: `4px solid ${d.color}`,
            borderRadius: 10,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: d.color, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {d.label}
              {d.key === 'workforce' && showNewBadge && (
                <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#6B21A8', color: '#fff' }}>NEW</span>
              )}
            </div>
            <div style={{ marginBottom: 6 }}>
              <SevBadge level={d.highest === 'none' ? null : d.highest} />
            </div>
            <div style={{ fontSize: 10, color: '#6B7F96' }}>
              {d.count} signal{d.count !== 1 ? 's' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
