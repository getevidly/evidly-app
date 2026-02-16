// src/components/compliance/DemoJurisdictionSwitcher.tsx
import React from 'react';
import { DEMO_JURISDICTIONS, DemoJurisdiction, calculateDemoGrade } from '../../data/demoJurisdictions';

interface DemoJurisdictionSwitcherProps {
  currentJurisdictionId: string;
  currentScore: number;
  onSwitch: (jurisdictionId: string) => void;
}

export const DemoJurisdictionSwitcher: React.FC<DemoJurisdictionSwitcherProps> = ({
  currentJurisdictionId,
  currentScore,
  onSwitch,
}) => {
  return (
    <div style={{
      backgroundColor: '#FFF8E1',
      border: '2px solid #FFC107',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F57F17', textTransform: 'uppercase', letterSpacing: '1px' }}>
          DEMO MODE
        </span>
        <span style={{ fontSize: '0.85rem', color: '#795548' }}>
          Switch jurisdiction to see how the same score is graded differently
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {DEMO_JURISDICTIONS.map((j: DemoJurisdiction) => {
          const isActive = j.id === currentJurisdictionId;
          const result = calculateDemoGrade(currentScore, j);

          return (
            <button
              key={j.id}
              onClick={() => onSwitch(j.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: isActive ? '2px solid #1e4d6b' : '1px solid #E0E0E0',
                backgroundColor: isActive ? '#eef4f8' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '100px',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#212121' }}>
                {j.county}
              </span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: result.passFail === 'pass' ? '#2E7D32' :
                       result.passFail === 'fail' ? '#C62828' :
                       result.passFail === 'warning' ? '#F57F17' : '#757575',
              }}>
                {result.display}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DemoJurisdictionSwitcher;
