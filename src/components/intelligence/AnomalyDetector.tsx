import React from 'react';

interface Props { data: any }

interface Anomaly {
  severity: 'warning' | 'alert' | 'info';
  type: string;
  location: string;
  description: string;
  recommendation: string;
}

function detectAnomalies(data: any): Anomaly[] {
  const anomalies: Anomaly[] = [];

  data.complianceMatrix.forEach((loc: any) => {
    // Sudden compliance drop
    if (loc.trend === 'declining' && loc.checklistCompletionRate < 0.7) {
      anomalies.push({
        severity: 'alert',
        type: 'Rapid Compliance Decline',
        location: loc.locationName,
        description: `Checklist completion dropped to ${Math.round(loc.checklistCompletionRate * 100)}% with declining trend. This pattern typically indicates a staffing change or management gap.`,
        recommendation: 'Review staffing changes in the last 30 days. Verify manager oversight of daily checklists.',
      });
    }

    // High incidents with declining trend
    if (loc.incidentsLast90Days >= 3 && loc.trend === 'declining') {
      anomalies.push({
        severity: 'alert',
        type: 'Incident Velocity Anomaly',
        location: loc.locationName,
        description: `${loc.incidentsLast90Days} incidents in 90 days with declining compliance trend. Incident frequency is accelerating.`,
        recommendation: 'Initiate root cause analysis. Consider temporary operational support or management rotation.',
      });
    }

    // Checklist / temp log mismatch
    if (Math.abs(loc.checklistCompletionRate - loc.tempLogCompletionRate) > 0.15) {
      anomalies.push({
        severity: 'warning',
        type: 'Data Consistency Flag',
        location: loc.locationName,
        description: `Checklist completion (${Math.round(loc.checklistCompletionRate * 100)}%) and temp log completion (${Math.round(loc.tempLogCompletionRate * 100)}%) differ by more than 15 points. This may indicate selective compliance — completing visible tasks while skipping less-monitored ones.`,
        recommendation: 'Audit both data streams. Verify temp logs are being completed independently of checklists.',
      });
    }

    // Turnover + compliance gap
    if (loc.staffTurnoverRate > 0.4 && loc.checklistCompletionRate < 0.75) {
      anomalies.push({
        severity: 'info',
        type: 'Staffing-Compliance Correlation',
        location: loc.locationName,
        description: `${Math.round(loc.staffTurnoverRate * 100)}% turnover rate with ${Math.round(loc.checklistCompletionRate * 100)}% checklist completion. New staff typically require 3 weeks to reach compliance proficiency.`,
        recommendation: 'Implement structured onboarding checklist. Assign compliance mentor for new hires.',
      });
    }
  });

  return anomalies;
}

const severityStyles: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
  alert:   { bg: '#7f1d1d15', text: '#fca5a5', border: '#991b1b', icon: '🚨', label: 'ALERT' },
  warning: { bg: '#78350f15', text: '#fde68a', border: '#854d0e', icon: '⚠️', label: 'WARNING' },
  info:    { bg: '#1e3a5f15', text: '#93c5fd', border: '#1e40af', icon: 'ℹ️', label: 'INFO' },
};

export const AnomalyDetector: React.FC<Props> = ({ data }) => {
  const anomalies = detectAnomalies(data);

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #D1D9E6', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
          <span style={{ fontSize: '16px' }}>{'🔍'}</span> Anomaly Detection
        </h2>
        <span style={{ fontSize: '11px', color: '#3D5068', fontFamily: 'system-ui' }}>
          {anomalies.length} anomalies detected
        </span>
      </div>

      {anomalies.length === 0 ? (
        <p style={{ color: '#4ade80', fontSize: '13px', fontFamily: 'system-ui', textAlign: 'center', padding: '20px' }}>
          No anomalies detected. All data patterns are within expected ranges.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {anomalies.map((a, i) => {
            const s = severityStyles[a.severity];
            return (
              <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{s.icon}</span>
                  <span style={{ background: s.border, borderRadius: '4px', padding: '1px 6px', fontSize: '9px', color: '#ffffff', fontWeight: 700, fontFamily: 'system-ui' }}>{s.label}</span>
                  <p style={{ color: s.text, fontSize: '12px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{a.type}</p>
                  <span style={{ fontSize: '10px', color: '#3D5068', fontFamily: 'system-ui', marginLeft: 'auto' }}>{a.location}</span>
                </div>
                <p style={{ color: '#3D5068', fontSize: '11px', margin: '0 0 6px', lineHeight: 1.5, fontFamily: 'system-ui' }}>{a.description}</p>
                <div style={{ background: '#EEF1F7', borderRadius: '4px', padding: '6px 10px', borderLeft: '2px solid #A08C5A' }}>
                  <p style={{ color: '#A08C5A', fontSize: '10px', fontWeight: 700, margin: '0 0 2px', fontFamily: 'system-ui' }}>Recommendation</p>
                  <p style={{ color: '#3D5068', fontSize: '11px', margin: 0, fontFamily: 'system-ui' }}>{a.recommendation}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
