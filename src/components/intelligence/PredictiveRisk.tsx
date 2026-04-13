import React from 'react';
import type { LocationRiskPrediction } from '../../hooks/useLocationRiskPredictions';

interface Props {
  predictions: LocationRiskPrediction[];
}

function riskColor(level: string): string {
  if (level === 'critical') return '#ef4444';
  if (level === 'high') return '#f97316';
  if (level === 'moderate') return '#fbbf24';
  return '#4ade80';
}

function projectProbability(base: number, trajectory: string, days: number): { level: string; color: string; probability: number } {
  const mult = trajectory === 'declining' ? 1 + (days / 90) * 0.3
    : trajectory === 'improving' ? 1 - (days / 90) * 0.25
    : 1;
  const projected = Math.max(0.01, Math.min(0.95, base * mult));

  if (projected >= 0.7) return { level: 'Critical', color: '#ef4444', probability: projected };
  if (projected >= 0.45) return { level: 'High', color: '#f97316', probability: projected };
  if (projected >= 0.25) return { level: 'Medium', color: '#fbbf24', probability: projected };
  return { level: 'Low', color: '#4ade80', probability: projected };
}

export const PredictiveRisk: React.FC<Props> = ({ predictions }) => (
  <div style={{ background: '#FFFFFF', border: '1px solid #D1D9E6', borderRadius: '12px', padding: '20px', marginTop: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <span style={{ fontSize: '16px' }}>{'\uD83D\uDD2E'}</span>
      <div>
        <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>
          Predictive Risk Trajectory
        </h2>
        <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
          Projected risk levels if current trends continue — model based on checklist rate, temp compliance, and service recency
        </p>
      </div>
      <span style={{
        background: '#A08C5A20', border: '1px solid #A08C5A40', borderRadius: '4px',
        padding: '2px 6px', fontSize: '10px', color: '#A08C5A', fontWeight: 600, fontFamily: 'system-ui', marginLeft: 'auto',
      }}>
        AI MODEL
      </span>
    </div>

    {predictions.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '24px 16px', background: '#EEF1F7', borderRadius: '10px', border: '1px solid #D1D9E6' }}>
        <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, fontFamily: 'system-ui' }}>
          No predictions generated yet. Risk trajectories will appear after compliance logs are recorded.
        </p>
      </div>
    ) : (
      predictions.map(pred => {
        const projections = [30, 60, 90].map(d => ({ days: d, ...projectProbability(pred.failure_probability, pred.score_trajectory, d) }));
        return (
          <div key={pred.id} style={{ background: '#EEF1F7', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px', border: '1px solid #D1D9E6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <p style={{ color: '#0B1628', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{pred.location_name || 'Unknown Location'}</p>
                <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
                  Current: <span style={{
                    color: riskColor(pred.risk_level),
                    fontWeight: 700, textTransform: 'uppercase',
                  }}>{pred.risk_level}</span>
                  {' \u00B7 '}Trend: <span style={{ color: pred.score_trajectory === 'declining' ? '#ef4444' : pred.score_trajectory === 'improving' ? '#4ade80' : '#fbbf24' }}>
                    {pred.score_trajectory === 'declining' ? '\u2198 Declining' : pred.score_trajectory === 'improving' ? '\u2197 Improving' : '\u2192 Stable'}
                  </span>
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {projections.map(p => (
                <div key={p.days} style={{ background: `${p.color}10`, border: `1px solid ${p.color}30`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ color: '#3D5068', fontSize: '10px', margin: '0 0 4px', fontWeight: 600, fontFamily: 'system-ui' }}>{p.days}-DAY</p>
                  <p style={{ color: p.color, fontSize: '16px', fontWeight: 800, margin: '0 0 2px', fontFamily: 'system-ui' }}>{p.level}</p>
                  <p style={{ color: '#3D5068', fontSize: '10px', margin: 0, fontFamily: 'system-ui' }}>
                    {Math.round(p.probability * 100)}% probability
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })
    )}
  </div>
);
