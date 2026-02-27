import React from 'react';
import type { RiskAssessmentData, RiskDriver } from '../../hooks/useBusinessIntelligence';

type RiskDimension = 'operational' | 'liability' | 'financial' | 'people';

interface Props {
  riskAssessments: RiskAssessmentData[];
  dimension: RiskDimension;
}

const dimensionConfig: Record<RiskDimension, {
  title: string;
  icon: string;
  scoreKey: (r: RiskAssessmentData) => number;
  scoreLabel: string;
  driverFilter: (d: RiskDriver) => boolean;
  emptyMessage: string;
}> = {
  operational: {
    title: 'Operational Risk Assessment',
    icon: '\u2699\uFE0F',
    scoreKey: r => r.operationalRisk,
    scoreLabel: 'Operational Risk',
    driverFilter: d => d.dimension === 'operational' || d.factor.toLowerCase().includes('checklist') || d.factor.toLowerCase().includes('temp'),
    emptyMessage: 'Risk assessment pending \u2014 compliance score required first',
  },
  liability: {
    title: 'Liability & Legal Risk Assessment',
    icon: '\u2696\uFE0F',
    scoreKey: r => r.liabilityRisk,
    scoreLabel: 'Liability Risk',
    driverFilter: d => d.dimension === 'liability' || d.factor.toLowerCase().includes('fire') || d.factor.toLowerCase().includes('incident') || d.factor.toLowerCase().includes('food safety'),
    emptyMessage: 'Risk assessment pending \u2014 compliance score required first',
  },
  financial: {
    title: 'Financial Risk Assessment',
    icon: '\uD83D\uDCB0',
    scoreKey: r => (r.revenueRisk + r.costRisk) / 2,
    scoreLabel: 'Financial Risk',
    driverFilter: d => d.dimension === 'financial' || d.factor.toLowerCase().includes('expir'),
    emptyMessage: 'Risk assessment pending \u2014 compliance score required first',
  },
  people: {
    title: 'People & Staffing Risk Assessment',
    icon: '\uD83D\uDC65',
    scoreKey: r => r.operationalRisk * 0.5 + r.liabilityRisk * 0.5,
    scoreLabel: 'Staffing Risk',
    driverFilter: d => d.dimension === 'people' || d.factor.toLowerCase().includes('turnover') || d.factor.toLowerCase().includes('training') || d.factor.toLowerCase().includes('staff') || d.factor.toLowerCase().includes('food handler'),
    emptyMessage: 'Risk assessment pending \u2014 compliance score required first',
  },
};

function riskColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 45) return '#f97316';
  if (score >= 25) return '#fbbf24';
  return '#4ade80';
}

function riskLabel(score: number): string {
  if (score >= 70) return 'Critical';
  if (score >= 45) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#7f1d1d20', text: '#fca5a5', border: '#991b1b' },
  high:     { bg: '#78350f20', text: '#fdba74', border: '#92400e' },
  medium:   { bg: '#78350f20', text: '#fde68a', border: '#854d0e' },
  low:      { bg: '#14532d20', text: '#86efac', border: '#166534' },
};

const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const RiskDriversPanel: React.FC<Props> = ({ riskAssessments, dimension }) => {
  const config = dimensionConfig[dimension];

  if (!riskAssessments || riskAssessments.length === 0) {
    return (
      <div style={{
        background: '#FFFFFF', border: '1px solid #D1D9E6',
        borderRadius: '12px', padding: '24px', marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '20px' }}>{config.icon}</span>
        <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: '8px 0', fontFamily: F }}>
          {config.title}
        </h2>
        <p style={{ color: '#3D5068', fontSize: '13px', fontFamily: F, margin: 0 }}>
          {config.emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #D1D9E6',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      <h2 style={{
        color: '#0B1628', fontSize: '14px', fontWeight: 700,
        margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: F,
      }}>
        <span style={{ fontSize: '16px' }}>{config.icon}</span>
        {config.title}
      </h2>

      {riskAssessments.map(ra => {
        const score = Math.round(config.scoreKey(ra));
        const color = riskColor(score);
        const label = riskLabel(score);
        const drivers = (ra.drivers || []).filter(config.driverFilter);

        return (
          <div key={ra.locationId} style={{
            background: '#EEF1F7', borderRadius: '10px',
            padding: '16px', marginBottom: '12px', border: '1px solid #D1D9E6',
          }}>
            {/* Location header + score */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <p style={{ color: '#0B1628', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: F }}>
                  {ra.locationName}
                </p>
                {ra.insuranceTier && (
                  <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', fontFamily: F }}>
                    Insurance tier: <span style={{ color: '#A08C5A', fontWeight: 600 }}>{ra.insuranceTier}</span>
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color, fontSize: '22px', fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>
                  {score}
                </p>
                <p style={{ color, fontSize: '10px', fontWeight: 700, margin: '2px 0 0', fontFamily: F, textTransform: 'uppercase' }}>
                  {label} Risk
                </p>
              </div>
            </div>

            {/* Score bars for financial dimension */}
            {dimension === 'financial' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: 'Revenue Risk', value: ra.revenueRisk },
                  { label: 'Cost Risk', value: ra.costRisk },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FFFFFF', borderRadius: '6px', padding: '8px 10px' }}>
                    <p style={{ color: '#3D5068', fontSize: '10px', fontWeight: 600, margin: '0 0 4px', fontFamily: F, textTransform: 'uppercase' }}>
                      {item.label}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#D1D9E6', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, item.value)}%`,
                          height: '100%',
                          background: riskColor(item.value),
                          borderRadius: '3px',
                        }} />
                      </div>
                      <span style={{ color: riskColor(item.value), fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', minWidth: '24px' }}>
                        {Math.round(item.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Risk drivers */}
            {drivers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ color: '#3D5068', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, fontFamily: F }}>
                  Risk Drivers
                </p>
                {drivers.map((d, i) => {
                  const sev = severityColors[d.severity] || severityColors.medium;
                  return (
                    <div key={i} style={{
                      background: sev.bg, border: `1px solid ${sev.border}`,
                      borderRadius: '6px', padding: '8px 10px',
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                    }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: sev.text, marginTop: '5px', flexShrink: 0,
                      }} />
                      <div>
                        <p style={{ color: sev.text, fontSize: '12px', fontWeight: 700, margin: 0, fontFamily: F }}>
                          {d.factor}
                        </p>
                        <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', lineHeight: 1.4, fontFamily: F }}>
                          {d.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#3D5068', fontSize: '12px', fontFamily: F, margin: 0 }}>
                No specific risk drivers identified for this dimension.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
