// ── Executive Summary format tab ─────────────────────────────────────────
import { AlertTriangle } from 'lucide-react';
import { type BISignal, type RiskPlan, DIMENSIONS, SEV_ORDER, getHighestSeverity } from './types';
import { SevBadge } from './SevBadge';
import { RiskCards } from './RiskCards';
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

      {/* ── Immediate Actions ── */}
      <div style={{
        background: '#fff',
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 10,
        padding: 20,
        textAlign: 'left',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>
          Immediate Actions
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map((signal) => {
            const plan = riskPlans.get(signal.id);
            return (
              <div
                key={signal.id}
                style={{
                  borderBottom: `1px solid ${CARD_BORDER}`,
                  paddingBottom: 14,
                }}
              >
                {/* Row 1: badge + title + county */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <SevBadge level={signal.priority} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0B1628' }}>{signal.title}</span>
                  <span style={{ fontSize: 11, color: TEXT_TERTIARY }}>
                    {signal.county}
                  </span>
                </div>

                {/* Recommended action */}
                {signal.recommended_action && (
                  <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.6, marginBottom: 6, paddingLeft: 4 }}>
                    {signal.recommended_action}
                  </div>
                )}

                {/* Action deadline + Risk Plan status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, paddingLeft: 4 }}>
                  {signal.action_deadline && (
                    <span style={{ color: TEXT_TERTIARY }}>
                      Deadline: <span style={{ fontWeight: 600, color: '#0B1628' }}>
                        {new Date(signal.action_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </span>
                  )}
                  <span style={{ color: TEXT_TERTIARY }}>
                    Risk Plan:{' '}
                    {plan ? (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: plan.status === 'completed' ? '#D1FAE5' :
                                    plan.status === 'in_progress' ? '#DBEAFE' :
                                    plan.status === 'accepted' ? '#FEF3C7' : '#F3F4F6',
                        color: plan.status === 'completed' ? '#059669' :
                               plan.status === 'in_progress' ? '#1D4ED8' :
                               plan.status === 'accepted' ? '#D97706' : '#6B7280',
                        whiteSpace: 'nowrap' as const,
                      }}>
                        {plan.status === 'not_started' ? 'Not Started' :
                         plan.status === 'in_progress' ? 'In Progress' :
                         plan.status === 'completed' ? 'Completed' : 'Accepted'}
                      </span>
                    ) : (
                      <span style={{ color: TEXT_TERTIARY, fontStyle: 'italic' }}>No plan</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
