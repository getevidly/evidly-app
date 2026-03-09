// ── Formal Document format tab ───────────────────────────────────────────
import { AlertTriangle } from 'lucide-react';
import { type BISignal, DIMENSIONS, SEV_ORDER, getHighestSeverity } from './types';
import { SevBadge } from './SevBadge';
import { ReportHeader } from './ReportHeader';
import { ReportFooter } from './ReportFooter';
import { NAVY, GOLD, CARD_BORDER, TEXT_TERTIARY } from '../../dashboard/shared/constants';

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

/** Group signals by category */
function groupByCategory(signals: BISignal[]): Map<string, BISignal[]> {
  const map = new Map<string, BISignal[]>();
  for (const s of signals) {
    const group = map.get(s.category) || [];
    group.push(s);
    map.set(s.category, group);
  }
  return map;
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: NAVY,
  borderBottom: `2px solid ${NAVY}`,
  paddingBottom: 6,
  marginBottom: 16,
  marginTop: 28,
};

export function FormalFormat({ signals, orgName, jurisdiction }: Props) {
  const grouped = groupByCategory(signals);
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let findingNum = 0;

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${CARD_BORDER}` }}>
      <ReportHeader orgName={orgName} jurisdiction={jurisdiction} confidential />

      {/* ── Content Area ── */}
      <div style={{ background: '#fff', padding: 32, fontSize: 13, lineHeight: 1.7, color: '#0B1628' }}>

        {/* ── Section I: Purpose ── */}
        <div style={sectionHeadingStyle}>I. Purpose</div>
        <p style={{ margin: '0 0 8px' }}>
          This report summarizes active intelligence signals identified by EvidLY's monitoring of 80+
          regulatory, legislative, and industry sources as they relate to {orgName}'s operations
          in {jurisdiction}.
        </p>

        {/* ── Section II: Active Findings ── */}
        <div style={sectionHeadingStyle}>II. Active Findings</div>

        {[...grouped.entries()].map(([category, categorySignals]) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: NAVY,
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {formatCategory(category)}
            </div>

            {categorySignals.map((signal) => {
              findingNum++;
              return (
                <div key={signal.id} style={{ marginBottom: 20, paddingLeft: 8 }}>
                  {/* Finding heading */}
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: NAVY }}>Finding {findingNum}:</span>{' '}
                    {signal.title}
                    <span style={{ color: TEXT_TERTIARY, fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
                      ({signal.county})
                    </span>
                  </div>

                  {/* Summary */}
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#3D5068' }}>
                    {signal.summary}
                  </p>

                  {/* 5-dimension risk table */}
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 11,
                    marginBottom: 10,
                  }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${CARD_BORDER}`, color: TEXT_TERTIARY, fontWeight: 600 }}>
                          Dimension
                        </th>
                        <th style={{ textAlign: 'center', padding: '6px 8px', borderBottom: `1px solid ${CARD_BORDER}`, color: TEXT_TERTIARY, fontWeight: 600, width: 80 }}>
                          Risk Level
                        </th>
                        <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${CARD_BORDER}`, color: TEXT_TERTIARY, fontWeight: 600 }}>
                          Client Impact
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {DIMENSIONS.map(dim => {
                        const riskLevel = (signal as Record<string, unknown>)[dim.riskKey] as string | null;
                        const impact = (signal as Record<string, unknown>)[dim.impactKey] as string | null;
                        return (
                          <tr key={dim.key}>
                            <td style={{ padding: '5px 8px', borderBottom: `1px solid #F0F2F5`, fontWeight: 500 }}>
                              {dim.label}
                            </td>
                            <td style={{ padding: '5px 8px', borderBottom: `1px solid #F0F2F5`, textAlign: 'center' }}>
                              <SevBadge level={riskLevel} compact />
                            </td>
                            <td style={{ padding: '5px 8px', borderBottom: `1px solid #F0F2F5`, color: '#3D5068', fontSize: 11 }}>
                              {impact || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>N/A</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Recommended action */}
                  {signal.recommended_action && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                      paddingLeft: 16,
                      fontSize: 12,
                      color: '#92400E',
                      background: '#FFFBEB',
                      border: '1px solid #FEF3C7',
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}>
                      <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span><strong>Recommended Action:</strong> {signal.recommended_action}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* ── Section III: Risk Summary ── */}
        <div style={sectionHeadingStyle}>III. Risk Summary</div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          marginBottom: 8,
        }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700 }}>
                Dimension
              </th>
              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700, width: 100 }}>
                Highest Level
              </th>
              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700, width: 90 }}>
                Signal Count
              </th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `2px solid ${CARD_BORDER}`, color: NAVY, fontWeight: 700 }}>
                Primary Concern
              </th>
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map(dim => {
              let highest = 'none';
              let count = 0;
              let primaryConcern = '';
              for (const s of signals) {
                const level = (s as Record<string, unknown>)[dim.riskKey] as string | null;
                if (level && level !== 'none') {
                  count++;
                  if ((SEV_ORDER[level] || 0) > (SEV_ORDER[highest] || 0)) {
                    highest = level;
                    const impact = (s as Record<string, unknown>)[dim.impactKey] as string | null;
                    primaryConcern = impact || s.title;
                  }
                }
              }
              return (
                <tr key={dim.key} style={{ background: count > 0 ? undefined : '#FAFBFC' }}>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid #F0F2F5`, fontWeight: 500 }}>
                    {dim.label}
                  </td>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid #F0F2F5`, textAlign: 'center' }}>
                    <SevBadge level={highest === 'none' ? null : highest} />
                  </td>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid #F0F2F5`, textAlign: 'center', color: TEXT_TERTIARY }}>
                    {count}
                  </td>
                  <td style={{ padding: '7px 10px', borderBottom: `1px solid #F0F2F5`, fontSize: 11, color: '#3D5068' }}>
                    {primaryConcern || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No signals</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Section IV: Attestation ── */}
        <div style={sectionHeadingStyle}>IV. Attestation</div>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: '#3D5068' }}>
          This report was generated on {now} by EvidLY's intelligence platform. Content is based on
          publicly available regulatory data and proprietary analysis.
        </p>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0B1628', marginBottom: 20 }}>
            Prepared for: {orgName}
          </div>
          <div style={{ display: 'flex', gap: 40 }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: `1px solid ${CARD_BORDER}`, marginBottom: 4, paddingBottom: 24 }} />
              <div style={{ fontSize: 10, color: TEXT_TERTIARY }}>Authorized Signature</div>
            </div>
            <div style={{ width: 160 }}>
              <div style={{ borderBottom: `1px solid ${CARD_BORDER}`, marginBottom: 4, paddingBottom: 24 }} />
              <div style={{ fontSize: 10, color: TEXT_TERTIARY }}>Date</div>
            </div>
          </div>
        </div>
      </div>

      <ReportFooter />
    </div>
  );
}
