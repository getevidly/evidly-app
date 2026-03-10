import React from 'react';
import type { LocationRiskPrediction } from '../../hooks/useLocationRiskPredictions';

interface Props {
  predictions: LocationRiskPrediction[];
}

const dimensions = [
  { key: 'checklist', label: 'Checklists' },
  { key: 'tempLogs', label: 'Temp Logs' },
  { key: 'service', label: 'Service' },
  { key: 'correctiveActions', label: 'Open CAs' },
  { key: 'overall', label: 'Overall' },
];

function getDimScore(pred: LocationRiskPrediction, dim: string): { score: number; color: string } {
  switch (dim) {
    case 'checklist': {
      const r = pred.input_checklist_rate_30d;
      if (r === null) return { score: 0, color: '#9CA3AF' };
      return r >= 0.85 ? { score: 1, color: '#4ade80' }
        : r >= 0.7 ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    }
    case 'tempLogs': {
      const r = pred.input_temp_pass_rate_30d;
      if (r === null) return { score: 0, color: '#9CA3AF' };
      return r >= 0.95 ? { score: 1, color: '#4ade80' }
        : r >= 0.85 ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    }
    case 'service': {
      const d = pred.input_days_since_service;
      if (d === null) return { score: 0, color: '#9CA3AF' };
      return d <= 90 ? { score: 1, color: '#4ade80' }
        : d <= 120 ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    }
    case 'correctiveActions': {
      const n = pred.input_open_corrective_actions;
      return n === 0 ? { score: 1, color: '#4ade80' }
        : n <= 2 ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    }
    case 'overall': {
      const rl = pred.risk_level;
      return rl === 'low' ? { score: 1, color: '#4ade80' }
        : rl === 'moderate' ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    }
    default: return { score: 1, color: '#4ade80' };
  }
}

const scoreLabels = ['N/A', 'Low', 'Medium', 'High'];

export const RiskRadar: React.FC<Props> = ({ predictions }) => (
  <div style={{ background: '#FFFFFF', border: '1px solid #D1D9E6', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
    <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
      <span style={{ fontSize: '16px' }}>{'\uD83C\uDFAF'}</span> Multi-Dimensional Risk Assessment
    </h2>

    {predictions.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '24px 16px', background: '#EEF1F7', borderRadius: '10px', border: '1px solid #D1D9E6' }}>
        <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, fontFamily: 'system-ui' }}>
          No prediction data available. Risk dimensions will populate after compliance logs are recorded.
        </p>
      </div>
    ) : (
      <>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${dimensions.length}, 1fr)`, gap: '4px', marginBottom: '6px' }}>
          <span />
          {dimensions.map(d => (
            <span key={d.key} style={{ fontSize: '10px', color: '#3D5068', textAlign: 'center', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>
              {d.label}
            </span>
          ))}
        </div>

        {/* Location rows */}
        {predictions.map(pred => (
          <div key={pred.id} style={{
            display: 'grid', gridTemplateColumns: `150px repeat(${dimensions.length}, 1fr)`,
            gap: '4px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #D1D9E6',
          }}>
            <p style={{ color: '#0B1628', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>{pred.location_name || 'Unknown'}</p>
            {dimensions.map(d => {
              const risk = getDimScore(pred, d.key);
              return (
                <div key={d.key} style={{ textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-block', width: '28px', height: '28px', borderRadius: '6px',
                    background: `${risk.color}20`, border: `1px solid ${risk.color}40`,
                    lineHeight: '28px', fontSize: '11px', fontWeight: 700, color: risk.color, fontFamily: 'system-ui',
                  }}>
                    {scoreLabels[risk.score]?.[0] || '\u2014'}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
          {[
            { label: 'Low Risk', color: '#4ade80' },
            { label: 'Medium Risk', color: '#fbbf24' },
            { label: 'High Risk', color: '#ef4444' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: `${l.color}40`, border: `1px solid ${l.color}` }} />
              <span style={{ fontSize: '10px', color: '#3D5068', fontFamily: 'system-ui' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);
