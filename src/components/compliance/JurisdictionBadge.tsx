// src/components/compliance/JurisdictionBadge.tsx
import React from 'react';

interface JurisdictionBadgeProps {
  gradingType: string;
  grade: string;
  gradeDisplay: string;
  passFail: string;
  jurisdictionName: string;
  size?: 'sm' | 'md' | 'lg';
  showJurisdiction?: boolean;
}

export const JurisdictionBadge: React.FC<JurisdictionBadgeProps> = ({
  gradingType,
  grade,
  gradeDisplay,
  passFail,
  jurisdictionName,
  size = 'md',
  showJurisdiction = true,
}) => {
  const sizeClasses = {
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
    lg: 'text-xl px-4 py-2 font-bold',
  };

  const getBackgroundColor = (): string => {
    switch (passFail) {
      case 'pass': return '#E8F5E9'; // Light green
      case 'fail': return '#FFEBEE'; // Light red
      case 'warning': return '#FFF8E1'; // Light yellow
      default: return '#F5F5F5'; // Light grey
    }
  };

  const getTextColor = (): string => {
    switch (passFail) {
      case 'pass': return '#2E7D32'; // Dark green
      case 'fail': return '#C62828'; // Dark red
      case 'warning': return '#F57F17'; // Dark yellow
      default: return '#616161'; // Grey
    }
  };

  const getBorderColor = (): string => {
    switch (passFail) {
      case 'pass': return '#4CAF50';
      case 'fail': return '#EF5350';
      case 'warning': return '#FFC107';
      default: return '#BDBDBD';
    }
  };

  const renderGradeContent = (): string => {
    switch (gradingType) {
      case 'letter_grade':
      case 'letter_grade_strict':
        return gradeDisplay;
      case 'color_placard':
        return gradeDisplay;
      case 'score_100':
        return gradeDisplay;
      case 'score_negative':
        return gradeDisplay;
      case 'report_only':
        return 'Report Only';
      default:
        return gradeDisplay;
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          backgroundColor: getBackgroundColor(),
          color: getTextColor(),
          border: `2px solid ${getBorderColor()}`,
          borderRadius: '8px',
          fontWeight: 600,
          display: 'inline-block',
          ...parseSizeStyle(sizeClasses[size]),
        }}
      >
        {renderGradeContent()}
      </span>
      {showJurisdiction && (
        <span style={{ fontSize: '0.85em', color: '#757575' }}>
          {jurisdictionName}
        </span>
      )}
    </div>
  );
};

function parseSizeStyle(classes: string): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (classes.includes('text-sm')) style.fontSize = '0.875rem';
  if (classes.includes('text-base')) style.fontSize = '1rem';
  if (classes.includes('text-xl')) style.fontSize = '1.25rem';
  if (classes.includes('px-2')) style.paddingLeft = style.paddingRight = '0.5rem';
  if (classes.includes('px-3')) style.paddingLeft = style.paddingRight = '0.75rem';
  if (classes.includes('px-4')) style.paddingLeft = style.paddingRight = '1rem';
  if (classes.includes('py-0.5')) style.paddingTop = style.paddingBottom = '0.125rem';
  if (classes.includes('py-1')) style.paddingTop = style.paddingBottom = '0.25rem';
  if (classes.includes('py-2')) style.paddingTop = style.paddingBottom = '0.5rem';
  if (classes.includes('font-bold')) style.fontWeight = 700;
  return style;
}

export default JurisdictionBadge;
