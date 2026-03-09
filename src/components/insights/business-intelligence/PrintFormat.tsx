// ── Print/PDF Ready format tab ───────────────────────────────────────────
import { type BISignal, DIMENSIONS, SEV_ORDER, getHighestSeverity } from './types';
import { SevBadge } from './SevBadge';
import { RiskCards } from './RiskCards';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';
import { NAVY, CARD_BORDER, TEXT_TERTIARY } from '../../dashboard/shared/constants';

interface Props {
  signals: BISignal[];
  orgName: string;
  jurisdiction: string;
}

function formatCategory(cat: string): string {
  return cat
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Build auto-generated executive summary (same logic as ExecFormat) */
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

  const urgent = signals.find(s => s.priority === 'critical' || s.priority === 'high');
  if (urgent && urgent.recommended_action) {
    const topic = urgent.title.toLowerCase();
    parts.push(`Immediate action is recommended on ${topic.length > 60 ? topic.slice(0, 57) + '...' : topic}.`);
  }

  return parts.join(' ');
}

export function PrintFormat({ signals, orgName, jurisdiction }: Props) {
  const sorted = [...signals].sort((a, b) => {
    const sevA = SEV_ORDER[getHighestSeverity(a)] || 0;
    const sevB = SEV_ORDER[getHighestSeverity(b)] || 0;
    return sevB - sevA;
  });

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, header, aside, [data-sidebar], [data-topbar] { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${CARD_BORDER}` }}>
        <ReportHeader orgName={orgName} jurisdiction={jurisdiction} />

        <div style={{ background: '#fff', padding: 28 }}>
          {/* ── Executive Summary ── */}
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: NAVY,
            borderBottom: `2px solid ${NAVY}`,
            paddingBottom: 4,
            marginBottom: 12,
          }}>
            Executive Summary
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: '#0B1628', margin: '0 0 20px' }}>
            {buildNarrative(signals)}
          </p>

          {/* ── Risk Overview Cards ── */}
          <div style={{ marginBottom: 20 }}>
            <RiskCards signals={signals} />
          </div>

          {/* ── Signal Detail Table ── */}
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: NAVY,
            borderBottom: `2px solid ${NAVY}`,
            paddingBottom: 4,
            marginBottom: 12,
          }}>
            Signal Details
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F8F9FC' }}>
                <th style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700, width: 28 }}>
                  #
                </th>
                <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700 }}>
                  Title
                </th>
                <th style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700, width: 90 }}>
                  Category
                </th>
                <th style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700, width: 100 }}>
                  County
                </th>
                <th style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700, width: 80 }}>
                  Highest Risk
                </th>
                <th style={{ textAlign: 'center', padding: '8px 6px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700, width: 90 }}>
                  Deadline
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((signal, idx) => (
                <tr key={signal.id}>
                  <td colSpan={6} style={{ padding: 0 }}>
                    {/* Main row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr 90px 100px 80px 90px',
                      alignItems: 'center',
                      borderBottom: `1px solid #F0F2F5`,
                    }}>
                      <div style={{ padding: '8px 6px', textAlign: 'center', color: TEXT_TERTIARY, fontWeight: 500 }}>
                        {idx + 1}
                      </div>
                      <div style={{
                        padding: '8px 6px',
                        fontWeight: 600,
                        color: '#0B1628',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {signal.title}
                      </div>
                      <div style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: '#F3F4F6',
                          color: '#4B5563',
                          whiteSpace: 'nowrap',
                        }}>
                          {formatCategory(signal.category)}
                        </span>
                      </div>
                      <div style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, color: TEXT_TERTIARY }}>
                        {signal.county}
                      </div>
                      <div style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <SevBadge level={getHighestSeverity(signal)} compact />
                      </div>
                      <div style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, color: TEXT_TERTIARY }}>
                        {signal.action_deadline
                          ? new Date(signal.action_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : <span style={{ color: '#9CA3AF' }}>--</span>}
                      </div>
                    </div>

                    {/* Sub-row: summary + recommended action */}
                    <div style={{
                      padding: '6px 34px 12px',
                      background: '#FAFBFC',
                      borderBottom: `1px solid ${CARD_BORDER}`,
                    }}>
                      <div style={{ fontSize: 11, color: '#3D5068', lineHeight: 1.6, marginBottom: 4 }}>
                        {signal.summary}
                      </div>
                      {signal.recommended_action && (
                        <div style={{ fontSize: 11, color: '#92400E', fontWeight: 500 }}>
                          Action: {signal.recommended_action}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ReportFooter />
      </div>
    </>
  );
}
