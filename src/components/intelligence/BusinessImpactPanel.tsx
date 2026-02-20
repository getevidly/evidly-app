import React from 'react';

export const BusinessImpactPanel: React.FC<{ data: any }> = ({ data }) => {
  const totalExposure = data.orgMetrics.totalEstimatedRiskExposure;
  const totalSavings = data.orgMetrics.totalEstimatedSavings;

  return (
    <div style={{
      background: '#1E2D4D', border: '1px solid #334155',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      <h2 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
        {'\uD83D\uDCB0'} Financial Impact Analysis
      </h2>

      {/* Top row — org totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Risk Exposure', value: `$${totalExposure.toLocaleString()}`, sub: 'Estimated annual if unresolved', color: '#ef4444' },
          { label: 'Compliance Savings', value: `$${totalSavings.toLocaleString()}`, sub: 'Estimated annual savings from compliance', color: '#4ade80' },
          { label: 'Net ROI of Compliance', value: `$${Math.abs(totalSavings - totalExposure).toLocaleString()}`, sub: totalSavings > totalExposure ? 'Net positive' : 'Risk exceeds savings', color: totalSavings > totalExposure ? '#4ade80' : '#f87171' },
        ].map((m, i) => (
          <div key={i} style={{
            background: '#0f172a', border: '1px solid #334155',
            borderRadius: '10px', padding: '16px',
          }}>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'system-ui' }}>{m.label}</p>
            <p style={{ color: m.color, fontSize: '24px', fontWeight: 800, margin: '0 0 4px', fontFamily: 'monospace' }}>{m.value}</p>
            <p style={{ color: '#475569', fontSize: '11px', margin: 0, fontFamily: 'system-ui' }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-location breakdown */}
      <h3 style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'system-ui' }}>
        By Location
      </h3>
      {data.complianceMatrix.map((loc: any) => (
        <div key={loc.locationId} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0', borderBottom: '1px solid #1e293b',
        }}>
          <div>
            <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>{loc.locationName}</p>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
              Risk Level: <span style={{
                color: loc.riskLevel === 'critical' ? '#ef4444' : loc.riskLevel === 'high' ? '#f97316' : loc.riskLevel === 'medium' ? '#fbbf24' : '#4ade80',
                fontWeight: 600, textTransform: 'uppercase',
              }}>{loc.riskLevel}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
            <div>
              <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                ${loc.estimatedRiskExposure.toLocaleString()}
              </p>
              <p style={{ color: '#64748b', fontSize: '10px', margin: '1px 0 0', fontFamily: 'system-ui' }}>exposure</p>
            </div>
            <div>
              <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                ${loc.estimatedComplianceSavings.toLocaleString()}
              </p>
              <p style={{ color: '#64748b', fontSize: '10px', margin: '1px 0 0', fontFamily: 'system-ui' }}>savings</p>
            </div>
          </div>
        </div>
      ))}

      {/* Insurance impact note */}
      <div style={{
        background: '#0f172a', border: '1px solid #A08C5A40',
        borderRadius: '8px', padding: '12px 16px', marginTop: '16px',
      }}>
        <p style={{ color: '#A08C5A', fontSize: '12px', fontWeight: 700, margin: '0 0 4px', fontFamily: 'system-ui' }}>
          {'\uD83D\uDCA1'} Insurance Optimization Opportunity
        </p>
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, lineHeight: 1.5, fontFamily: 'system-ui' }}>
          Documented compliance through EvidLY can support insurance premium renegotiation.
          Carriers increasingly factor digital compliance documentation into underwriting.
          Share this report with your broker at next renewal.
        </p>
      </div>
    </div>
  );
};
