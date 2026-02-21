import React from 'react';

export const ThreatIntelligence: React.FC<{ data: any }> = ({ data }) => {
  const threats: { severity: string; title: string; location: string; daysUntil?: number; action: string }[] = [];

  data.complianceMatrix.forEach((loc: any) => {
    loc.permitExpirations.forEach((p: any) => {
      threats.push({
        severity: p.daysUntilExpiry <= 7 ? 'critical' : p.daysUntilExpiry <= 30 ? 'high' : 'medium',
        title: `${p.document} Expiring`,
        location: loc.locationName,
        daysUntil: p.daysUntilExpiry,
        action: `Renew ${p.document} immediately. Non-renewal may trigger closure notice.`,
      });
    });

    if (loc.fireSafetyVerdict === 'Fail') {
      threats.push({
        severity: 'high',
        title: 'Fire Safety Inspection Failure',
        location: loc.locationName,
        action: 'Schedule remediation with AHJ. Re-inspection required per NFPA 96 (2024).',
      });
    }

    if (loc.foodSafetyStatus === 'Action Required') {
      threats.push({
        severity: 'critical',
        title: 'Food Safety Reinspection Required',
        location: loc.locationName,
        action: 'Address all open major violations before reinspection window closes.',
      });
    }

    const nextInspect = new Date(loc.nextInspectionWindow);
    const daysToInspect = Math.round((nextInspect.getTime() - Date.now()) / 86400000);
    if (daysToInspect <= 30 && daysToInspect > 0) {
      threats.push({
        severity: 'medium',
        title: 'Inspection Due Soon',
        location: loc.locationName,
        daysUntil: daysToInspect,
        action: `Run self-inspection checklist in EvidLY. ${loc.openItems} open items to resolve.`,
      });
    }
  });

  data.upcomingRegulatoryChanges.forEach((r: any) => {
    const days = Math.round((new Date(r.effectiveDate).getTime() - Date.now()) / 86400000);
    threats.push({
      severity: r.impact === 'high' ? 'high' : 'medium',
      title: r.title,
      location: r.affectedLocations.join(', '),
      daysUntil: days,
      action: r.description,
    });
  });

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  threats.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  const severityStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    critical: { bg: '#7f1d1d20', text: '#fca5a5', border: '#991b1b', dot: '#ef4444' },
    high:     { bg: '#78350f20', text: '#fdba74', border: '#92400e', dot: '#f97316' },
    medium:   { bg: '#78350f20', text: '#fde68a', border: '#854d0e', dot: '#fbbf24' },
    low:      { bg: '#14532d20', text: '#86efac', border: '#166534', dot: '#4ade80' },
  };

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #D1D9E6',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
        {'\u26A0\uFE0F'} Threat Intelligence
        <span style={{
          backgroundColor: '#ef444420', border: '1px solid #ef4444',
          borderRadius: '10px', padding: '1px 6px',
          fontSize: '11px', color: '#ef4444', fontWeight: 700, fontFamily: 'system-ui',
        }}>
          {threats.filter(t => t.severity === 'critical').length} Critical
        </span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {threats.map((threat, i) => {
          const s = severityStyles[threat.severity] || severityStyles.medium;
          return (
            <div key={i} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: '8px', padding: '12px 14px',
              display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: s.dot, marginTop: '4px', flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <p style={{ color: s.text, fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{threat.title}</p>
                  {threat.daysUntil !== undefined && (
                    <span style={{ fontSize: '11px', color: s.text, fontWeight: 600, fontFamily: 'system-ui' }}>
                      {threat.daysUntil} days
                    </span>
                  )}
                </div>
                <p style={{ color: '#3D5068', fontSize: '11px', margin: '0 0 4px', fontFamily: 'system-ui' }}>{threat.location}</p>
                <p style={{ color: '#3D5068', fontSize: '11px', margin: 0, lineHeight: 1.4, fontFamily: 'system-ui' }}>{threat.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
