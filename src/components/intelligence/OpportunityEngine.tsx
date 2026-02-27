import React from 'react';

interface Props { data: any }

export const OpportunityEngine: React.FC<Props> = ({ data }) => {
  // Build ranked list of improvements with estimated ROI from complianceMatrix
  const opportunities: { priority: number; title: string; location: string; investmentRange: string; roiEstimate: string; impact: string; category: string }[] = [];

  data.complianceMatrix.forEach((loc: any) => {
    if (loc.facilitySafetyVerdict === 'Fail') {
      opportunities.push({
        priority: 1,
        title: 'Resolve Facility Safety Failure',
        location: loc.locationName,
        investmentRange: '$2,000 – $8,000',
        roiEstimate: `$${Math.round(loc.estimatedRiskExposure * 0.4).toLocaleString()} risk reduction`,
        impact: 'Eliminates facility safety closure risk and insurance carrier dispute grounds',
        category: 'Facility Safety',
      });
    }
    if (loc.foodSafetyStatus === 'Action Required') {
      opportunities.push({
        priority: 1,
        title: 'Address Food Safety Violations Before Reinspection',
        location: loc.locationName,
        investmentRange: '$500 – $3,000',
        roiEstimate: `$${Math.round(loc.estimatedRiskExposure * 0.35).toLocaleString()} risk reduction`,
        impact: 'Prevents reinspection failure, potential closure, and public score posting',
        category: 'Food Safety',
      });
    }
    if (loc.checklistCompletionRate < 0.8) {
      opportunities.push({
        priority: 2,
        title: 'Improve Checklist Compliance',
        location: loc.locationName,
        investmentRange: '$0 (process change)',
        roiEstimate: `${Math.round((0.90 - loc.checklistCompletionRate) * 100)}% completion improvement`,
        impact: 'Each 10% improvement in checklist completion correlates with 15-20% fewer open items',
        category: 'Operations',
      });
    }
    if (loc.staffTurnoverRate > 0.3) {
      opportunities.push({
        priority: 3,
        title: 'Reduce Staff Turnover',
        location: loc.locationName,
        investmentRange: '$1,500 – $5,000 (retention program)',
        roiEstimate: `$${Math.round(loc.estimatedRiskExposure * 0.2).toLocaleString()} indirect risk reduction`,
        impact: `Current ${Math.round(loc.staffTurnoverRate * 100)}% turnover is the leading indicator of compliance gaps`,
        category: 'People',
      });
    }
    loc.permitExpirations?.forEach((p: any) => {
      opportunities.push({
        priority: p.daysUntilExpiry <= 14 ? 1 : 2,
        title: `Renew ${p.document}`,
        location: loc.locationName,
        investmentRange: '$200 – $800',
        roiEstimate: 'Prevents closure notice and insurance dispute grounds',
        impact: `${p.daysUntilExpiry} days until expiry — non-renewal triggers enforcement`,
        category: 'Documentation',
      });
    });
  });

  opportunities.sort((a, b) => a.priority - b.priority);

  const priorityStyles: Record<number, { bg: string; text: string; border: string; label: string }> = {
    1: { bg: '#7f1d1d20', text: '#fca5a5', border: '#991b1b', label: 'URGENT' },
    2: { bg: '#78350f20', text: '#fde68a', border: '#854d0e', label: 'HIGH' },
    3: { bg: '#1e3a5f20', text: '#93c5fd', border: '#1e40af', label: 'MEDIUM' },
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #D1D9E6', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
          <span style={{ fontSize: '16px' }}>{'🎯'}</span> Opportunity Engine — ROI-Ranked Improvements
        </h2>
        <span style={{ fontSize: '11px', color: '#3D5068', fontFamily: 'system-ui' }}>
          {opportunities.length} opportunities identified
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {opportunities.map((opp, i) => {
          const s = priorityStyles[opp.priority] || priorityStyles[3];
          return (
            <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: s.border, borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: '#ffffff', fontWeight: 700, fontFamily: 'system-ui' }}>{s.label}</span>
                  <p style={{ color: '#0B1628', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{opp.title}</p>
                </div>
                <span style={{ fontSize: '11px', color: '#3D5068', fontFamily: 'system-ui' }}>{opp.category}</span>
              </div>
              <p style={{ color: '#3D5068', fontSize: '11px', margin: '0 0 8px', fontFamily: 'system-ui' }}>{opp.location}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <p style={{ color: '#3D5068', fontSize: '10px', margin: '0 0 2px', fontFamily: 'system-ui' }}>Investment</p>
                  <p style={{ color: '#3D5068', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>{opp.investmentRange}</p>
                </div>
                <div>
                  <p style={{ color: '#3D5068', fontSize: '10px', margin: '0 0 2px', fontFamily: 'system-ui' }}>Estimated Return</p>
                  <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>{opp.roiEstimate}</p>
                </div>
                <div>
                  <p style={{ color: '#3D5068', fontSize: '10px', margin: '0 0 2px', fontFamily: 'system-ui' }}>Impact</p>
                  <p style={{ color: '#3D5068', fontSize: '11px', margin: 0, fontFamily: 'system-ui' }}>{opp.impact}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
