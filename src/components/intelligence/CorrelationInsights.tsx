import React from 'react';
import type { CorrelationInsight } from '../../hooks/useBusinessIntelligence';

interface Props {
  correlations: CorrelationInsight[];
}

const impactStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: '#7f1d1d20', text: '#fca5a5', border: '#991b1b', dot: '#ef4444' },
  high:     { bg: '#78350f20', text: '#fdba74', border: '#92400e', dot: '#f97316' },
  medium:   { bg: '#78350f20', text: '#fde68a', border: '#854d0e', dot: '#fbbf24' },
  low:      { bg: '#14532d20', text: '#86efac', border: '#166534', dot: '#4ade80' },
};

const urgencyLabels: Record<string, string> = {
  immediate: 'Immediate',
  urgent: 'Urgent',
  standard: 'Standard',
  informational: 'Info',
};

const pillarLabels: Record<string, string> = {
  food_safety: 'Food Safety',
  facility_safety: 'Facility Safety',
  vendor_compliance: 'Vendor',
};

const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const CorrelationInsights: React.FC<Props> = ({ correlations }) => (
  <div style={{
    background: '#FFFFFF', border: '1px solid #D1D9E6',
    borderRadius: '12px', padding: '20px', marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ fontSize: '16px' }}>{'\u26A1'}</span>
      <div>
        <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: F }}>
          Scenario Intelligence Engine
        </h2>
        <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', fontFamily: F }}>
          Active correlation rules from the intelligence pipeline
        </p>
      </div>
      {correlations.length > 0 && (
        <span style={{
          background: '#A08C5A20', border: '1px solid #A08C5A',
          borderRadius: '10px', padding: '2px 8px', marginLeft: 'auto',
          fontSize: '11px', color: '#A08C5A', fontWeight: 700, fontFamily: F,
        }}>
          {correlations.length} active
        </span>
      )}
    </div>

    {(!correlations || correlations.length === 0) ? (
      <div style={{
        background: '#EEF1F7', borderRadius: '8px', padding: '20px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, margin: '0 0 4px', fontFamily: F }}>
          {'\u2713'} No active scenarios
        </p>
        <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, fontFamily: F }}>
          Your compliance posture is stable. No correlation rules have fired.
        </p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {correlations.map(c => {
          const style = impactStyles[c.impactLevel] || impactStyles.medium;
          return (
            <div key={c.id} style={{
              background: style.bg, border: `1px solid ${style.border}`,
              borderRadius: '8px', padding: '12px 14px',
              display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: style.dot, marginTop: '4px', flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                  <p style={{ color: style.text, fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: F }}>
                    {c.headline}
                  </p>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {c.urgency && (
                      <span style={{
                        background: `${style.dot}20`, border: `1px solid ${style.dot}40`,
                        borderRadius: '4px', padding: '1px 6px',
                        fontSize: '10px', color: style.text, fontWeight: 600, fontFamily: F,
                      }}>
                        {urgencyLabels[c.urgency] || c.urgency}
                      </span>
                    )}
                    <span style={{
                      background: `${style.dot}20`, border: `1px solid ${style.dot}40`,
                      borderRadius: '4px', padding: '1px 6px',
                      fontSize: '10px', color: style.text, fontWeight: 600, fontFamily: F, textTransform: 'uppercase',
                    }}>
                      {c.impactLevel}
                    </span>
                  </div>
                </div>
                <p style={{ color: '#3D5068', fontSize: '12px', margin: '0 0 6px', lineHeight: 1.5, fontFamily: F }}>
                  {c.summary}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(c.affectedPillars || []).map(p => (
                    <span key={p} style={{
                      background: '#EEF1F7', border: '1px solid #D1D9E6',
                      borderRadius: '4px', padding: '1px 6px',
                      fontSize: '10px', color: '#3D5068', fontFamily: F,
                    }}>
                      {pillarLabels[p] || p}
                    </span>
                  ))}
                  {(c.affectedCounties || []).map(county => (
                    <span key={county} style={{
                      background: '#EEF1F7', border: '1px solid #D1D9E6',
                      borderRadius: '4px', padding: '1px 6px',
                      fontSize: '10px', color: '#3D5068', fontFamily: F,
                    }}>
                      {county} County
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
