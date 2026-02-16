// src/components/compliance/ScoringBreakdownPanel.tsx
// Drill-down view showing how the score was calculated per jurisdiction methodology
import React, { useState } from 'react';

interface Violation {
  calcodeSection: string;
  title: string;
  severity: string;
  pointsDeducted: number;
  module: string;
  cdcRiskFactor: boolean;
  status: string;
}

interface ScoringBreakdownPanelProps {
  startingScore: number;
  finalScore: number;
  violations: Violation[];
  scoringType: string;
  jurisdictionName: string;
  opsWeight: number;
  docsWeight: number;
}

export const ScoringBreakdownPanel: React.FC<ScoringBreakdownPanelProps> = ({
  startingScore,
  finalScore,
  violations,
  scoringType,
  jurisdictionName,
  opsWeight,
  docsWeight,
}) => {
  const [showAll, setShowAll] = useState(false);

  const nonCompliant = violations.filter(v => v.status === 'non_compliant');
  const compliant = violations.filter(v => v.status === 'compliant');
  const displayed = showAll ? nonCompliant : nonCompliant.slice(0, 5);

  const severityColors: Record<string, string> = {
    critical: '#C62828',
    major: '#E65100',
    minor: '#F57F17',
    grp: '#757575',
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E0E0',
      borderRadius: '12px',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e4d6b' }}>
            Score Breakdown
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#757575' }}>
            {jurisdictionName} methodology (Ops {opsWeight} / Docs {docsWeight})
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: finalScore >= 90 ? '#2E7D32' : finalScore >= 70 ? '#F57F17' : '#C62828' }}>
            {finalScore}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#757575' }}>of {startingScore}</div>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: '#FFEBEE', borderRadius: '8px', padding: '8px 12px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#C62828' }}>{nonCompliant.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#C62828' }}>Issues Found</div>
        </div>
        <div style={{ backgroundColor: '#E8F5E9', borderRadius: '8px', padding: '8px 12px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2E7D32' }}>{compliant.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#2E7D32' }}>Compliant</div>
        </div>
        <div style={{ backgroundColor: '#FFF3E0', borderRadius: '8px', padding: '8px 12px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#E65100' }}>
            -{nonCompliant.reduce((sum, v) => sum + v.pointsDeducted, 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#E65100' }}>Points Lost</div>
        </div>
      </div>

      {/* Violation list */}
      {displayed.map((v, i) => (
        <div
          key={v.calcodeSection + i}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < displayed.length - 1 ? '1px solid #F0F0F0' : 'none',
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: severityColors[v.severity] || '#757575',
            marginRight: '12px',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#212121' }}>
              {v.title}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#757575' }}>
              CalCode {v.calcodeSection} | {v.severity.charAt(0).toUpperCase() + v.severity.slice(1)}
              {v.cdcRiskFactor && ' | CDC Risk Factor'}
            </div>
          </div>
          <div style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: severityColors[v.severity],
            marginLeft: '12px',
          }}>
            -{v.pointsDeducted}
          </div>
        </div>
      ))}

      {nonCompliant.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '8px',
            backgroundColor: '#F5F5F5',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: '#424242',
          }}
        >
          Show all {nonCompliant.length} issues
        </button>
      )}
    </div>
  );
};

export default ScoringBreakdownPanel;
