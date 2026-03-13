// ── Executive Summary format tab ─────────────────────────────────────────
import { AlertTriangle } from 'lucide-react';
import { type BISignal, type RiskPlan, DIMENSIONS, SEV_ORDER, getHighestSeverity } from './types';
import { SevBadge } from './SevBadge';
import { RiskCards } from './RiskCards';
import { SignalCard } from '../../signals/SignalCard';
import { NAVY, GOLD, CARD_BORDER, TEXT_TERTIARY } from '../../dashboard/shared/constants';

interface Props {
  signals: BISignal[];
  riskPlans: Map<string, RiskPlan>;
  isDemoMode: boolean;
}

/** Build an auto-generated narrative paragraph from signal data. */
function buildNarrative(signals: BISignal[]): string {
  const critCount = signals.filter(s => s.priority === 'critical').length;
  const highCount = signals.filter(s => s.priority === 'high').length;
  const counties = [...new Set(signals.map(s => s.county))];

  const parts: string[] = [];
  if (critCount + highCount > 0) {
    const counts: string[] = [];
    if (critCount) counts.push(`${critCount} critical`);
    if (highCount) counts.push(`${highCount} high-priority`);
    parts.push(`Your organization has ${counts.join(' and ')} intelligence signal${critCount + highCount !== 1 ? 's' : ''}`);
    if (counties.length > 0) {
      parts[0] += ` across ${counties.join(', ')}`;
    }
    parts[0] += '.';
  } else {
    parts.push(`Your organization has ${signals.length} active intelligence signal${signals.length !== 1 ? 's' : ''} across ${counties.join(', ')}.`);
  }

  // Add a recommendation hint from the first critical/high signal
  const urgent = signals.find(s => s.priority === 'critical' || s.priority === 'high');
  if (urgent && urgent.recommended_action) {
    const topic = urgent.title.toLowerCase();
    parts.push(`Immediate action is recommended on ${topic.length > 60 ? topic.slice(0, 57) + '...' : topic}.`);
  }

  return parts.join(' ');
}

function formatCategory(cat: string): string {
  return cat
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ExecFormat({ signals, riskPlans, isDemoMode }: Props) {
  const sorted = [...signals].sort((a, b) => (SEV_ORDER[b.priority] || 0) - (SEV_ORDER[a.priority] || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Narrative Summary ── */}
      <div style={{
        background: '#fff',
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 10,
        padding: 20,
        textAlign: 'left',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
          Intelligence Summary
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#0B1628', margin: 0 }}>
          {buildNarrative(signals)}
        </p>
      </div>

      {/* ── Risk Cards (5-pillar aggregate) ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_TERTIARY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Risk Overview by Dimension
        </div>
        <RiskCards signals={signals} showNewBadge={isDemoMode} />
      </div>

      {/* ── Signal Cards ── */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_TERTIARY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Intelligence Signals ({sorted.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      </div>
    </div>
  );
}
