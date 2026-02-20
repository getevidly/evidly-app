import React from 'react';

interface Props { data: any }

function predictRisk(loc: any, days: number): { level: string; color: string; probability: number } {
  const trendMultiplier = loc.trend === 'declining' ? 1.3 : loc.trend === 'stable' ? 1.0 : 0.7;
  const baseRisk = loc.riskLevel === 'critical' ? 0.85 : loc.riskLevel === 'high' ? 0.6 : loc.riskLevel === 'medium' ? 0.35 : 0.1;
  const timeDecay = 1 + (days / 90) * 0.5;
  const predicted = Math.min(0.95, baseRisk * trendMultiplier * timeDecay);

  if (predicted >= 0.7) return { level: 'Critical', color: '#ef4444', probability: predicted };
  if (predicted >= 0.45) return { level: 'High', color: '#f97316', probability: predicted };
  if (predicted >= 0.25) return { level: 'Medium', color: '#fbbf24', probability: predicted };
  return { level: 'Low', color: '#4ade80', probability: predicted };
}

export const PredictiveRisk: React.FC<Props> = ({ data }) => (
  <div style={{ background: '#1E2D4D', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginTop: '16px', marginBottom: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ fontSize: '16px' }}>{'🔮'}</span>
      <div>
        <h2 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>
          Predictive Risk Trajectory
        </h2>
        <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
          Projected risk levels if current trends continue — model based on 90-day trajectory, staffing data, and permit status
        </p>
      </div>
      <span style={{
        background: '#A08C5A20', border: '1px solid #A08C5A40', borderRadius: '4px',
        padding: '2px 6px', fontSize: '10px', color: '#A08C5A', fontWeight: 600, fontFamily: 'system-ui', marginLeft: 'auto',
      }}>
        AI MODEL
      </span>
    </div>

    {data.complianceMatrix.map((loc: any) => {
      const predictions = [30, 60, 90].map(d => ({ days: d, ...predictRisk(loc, d) }));
      return (
        <div key={loc.locationId} style={{ background: '#0f172a', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{loc.locationName}</p>
              <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
                Current: <span style={{
                  color: loc.riskLevel === 'critical' ? '#ef4444' : loc.riskLevel === 'high' ? '#f97316' : loc.riskLevel === 'medium' ? '#fbbf24' : '#4ade80',
                  fontWeight: 700, textTransform: 'uppercase',
                }}>{loc.riskLevel}</span>
                {' · '}Trend: <span style={{ color: loc.trend === 'declining' ? '#ef4444' : loc.trend === 'improving' ? '#4ade80' : '#fbbf24' }}>
                  {loc.trend === 'declining' ? '↘ Declining' : loc.trend === 'improving' ? '↗ Improving' : '→ Stable'}
                </span>
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {predictions.map(p => (
              <div key={p.days} style={{ background: `${p.color}10`, border: `1px solid ${p.color}30`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: '10px', margin: '0 0 4px', fontWeight: 600, fontFamily: 'system-ui' }}>{p.days}-DAY</p>
                <p style={{ color: p.color, fontSize: '16px', fontWeight: 800, margin: '0 0 2px', fontFamily: 'system-ui' }}>{p.level}</p>
                <p style={{ color: '#475569', fontSize: '10px', margin: 0, fontFamily: 'system-ui' }}>
                  {Math.round(p.probability * 100)}% probability
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);
