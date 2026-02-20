import React from 'react';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  Compliant:       { bg: '#14532d20', text: '#4ade80', border: '#166534' },
  Good:            { bg: '#14532d20', text: '#4ade80', border: '#166534' },
  Satisfactory:    { bg: '#78350f20', text: '#fbbf24', border: '#92400e' },
  'Action Required': { bg: '#7f1d1d20', text: '#f87171', border: '#991b1b' },
  Unsatisfactory:  { bg: '#7f1d1d20', text: '#f87171', border: '#991b1b' },
  Pass:            { bg: '#14532d20', text: '#4ade80', border: '#166534' },
  Fail:            { bg: '#7f1d1d20', text: '#f87171', border: '#991b1b' },
};

const riskColors: Record<string, string> = {
  low: '#4ade80', medium: '#fbbf24', high: '#f97316', critical: '#ef4444',
};

export const ComplianceHeatMap: React.FC<{ data: any }> = ({ data }) => (
  <div style={{
    background: '#1E2D4D', border: '1px solid #334155',
    borderRadius: '12px', padding: '20px', marginBottom: '16px',
  }}>
    <h2 style={{
      color: '#ffffff', fontSize: '14px', fontWeight: 700,
      margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui',
    }}>
      <span style={{ fontSize: '16px' }}>{'🗺️'}</span> Compliance Heat Map
      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>
        Status by location and pillar
      </span>
    </h2>

    {/* Column headers */}
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 80px 80px 80px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>Location</span>
      <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>Food Safety</span>
      <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>Fire Safety</span>
      <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>Checklists</span>
      <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>Temp Logs</span>
      <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600, fontFamily: 'system-ui', textTransform: 'uppercase' }}>Risk</span>
    </div>

    {data.complianceMatrix.map((loc: any) => {
      const fs = statusColors[loc.foodSafetyStatus] || statusColors['Satisfactory'];
      const fire = statusColors[loc.fireSafetyVerdict] || statusColors['Pass'];
      const checkRate = Math.round(loc.checklistCompletionRate * 100);
      const tempRate = Math.round(loc.tempLogCompletionRate * 100);
      const riskColor = riskColors[loc.riskLevel];

      return (
        <div key={loc.locationId} style={{
          display: 'grid', gridTemplateColumns: '180px 1fr 1fr 80px 80px 80px',
          gap: '8px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b',
        }}>
          <div>
            <p style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>{loc.locationName}</p>
            <p style={{ color: '#64748b', fontSize: '10px', margin: '1px 0 0', fontFamily: 'system-ui' }}>{loc.jurisdiction}</p>
          </div>
          <div style={{
            background: fs.bg, border: `1px solid ${fs.border}`,
            borderRadius: '6px', padding: '4px 8px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '11px', color: fs.text, fontWeight: 600, fontFamily: 'system-ui' }}>{loc.foodSafetyStatus}</span>
          </div>
          <div style={{
            background: fire.bg, border: `1px solid ${fire.border}`,
            borderRadius: '6px', padding: '4px 8px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '11px', color: fire.text, fontWeight: 600, fontFamily: 'system-ui' }}>{loc.fireSafetyVerdict}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontSize: '13px', fontWeight: 700, fontFamily: 'system-ui',
              color: checkRate >= 90 ? '#4ade80' : checkRate >= 75 ? '#fbbf24' : '#f87171',
            }}>
              {checkRate}%
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontSize: '13px', fontWeight: 700, fontFamily: 'system-ui',
              color: tempRate >= 90 ? '#4ade80' : tempRate >= 75 ? '#fbbf24' : '#f87171',
            }}>
              {tempRate}%
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, fontFamily: 'system-ui',
              color: riskColor, textTransform: 'uppercase',
            }}>
              {loc.riskLevel}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);
