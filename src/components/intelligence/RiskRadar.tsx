import React from 'react';

interface Props { data: any }

const dimensions = [
  { key: 'foodSafety', label: 'Food Safety' },
  { key: 'fireSafety', label: 'Fire Safety' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'operational', label: 'Operational' },
  { key: 'staffing', label: 'Staffing' },
  { key: 'regulatory', label: 'Regulatory' },
];

function getRiskScore(loc: any, dim: string): { score: number; color: string } {
  switch (dim) {
    case 'foodSafety':
      return loc.foodSafetyStatus === 'Compliant' ? { score: 1, color: '#4ade80' }
        : loc.foodSafetyStatus === 'Satisfactory' ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    case 'fireSafety':
      return loc.fireSafetyVerdict === 'Pass' ? { score: 1, color: '#4ade80' } : { score: 3, color: '#ef4444' };
    case 'documentation':
      return loc.permitExpirations.length === 0 ? { score: 1, color: '#4ade80' }
        : loc.permitExpirations.some((p: any) => p.daysUntilExpiry <= 7) ? { score: 3, color: '#ef4444' }
        : { score: 2, color: '#fbbf24' };
    case 'operational':
      return loc.checklistCompletionRate >= 0.9 ? { score: 1, color: '#4ade80' }
        : loc.checklistCompletionRate >= 0.75 ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    case 'staffing':
      return loc.staffTurnoverRate <= 0.2 ? { score: 1, color: '#4ade80' }
        : loc.staffTurnoverRate <= 0.35 ? { score: 2, color: '#fbbf24' }
        : { score: 3, color: '#ef4444' };
    case 'regulatory': {
      const nextInspect = new Date(loc.nextInspectionWindow);
      const daysToInspect = Math.round((nextInspect.getTime() - Date.now()) / 86400000);
      return daysToInspect <= 30 ? { score: 2, color: '#fbbf24' }
        : daysToInspect <= 14 ? { score: 3, color: '#ef4444' }
        : { score: 1, color: '#4ade80' };
    }
    default: return { score: 1, color: '#4ade80' };
  }
}

const scoreLabels = ['', 'Low', 'Medium', 'High'];

export const RiskRadar: React.FC<Props> = ({ data }) => (
  <div style={{ background: '#1E2D4D', border: '1px solid #334155', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
    <h2 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
      <span style={{ fontSize: '16px' }}>{'🎯'}</span> Multi-Dimensional Risk Assessment
    </h2>

    {/* Header row */}
    <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${dimensions.length}, 1fr)`, gap: '4px', marginBottom: '6px' }}>
      <span />
      {dimensions.map(d => (
        <span key={d.key} style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>
          {d.label}
        </span>
      ))}
    </div>

    {/* Location rows */}
    {data.complianceMatrix.map((loc: any) => (
      <div key={loc.locationId} style={{
        display: 'grid', gridTemplateColumns: `150px repeat(${dimensions.length}, 1fr)`,
        gap: '4px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b',
      }}>
        <p style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>{loc.locationName}</p>
        {dimensions.map(d => {
          const risk = getRiskScore(loc, d.key);
          return (
            <div key={d.key} style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-block', width: '28px', height: '28px', borderRadius: '6px',
                background: `${risk.color}20`, border: `1px solid ${risk.color}40`,
                lineHeight: '28px', fontSize: '11px', fontWeight: 700, color: risk.color, fontFamily: 'system-ui',
              }}>
                {scoreLabels[risk.score]?.[0]}
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
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'system-ui' }}>{l.label}</span>
        </div>
      ))}
    </div>
  </div>
);
