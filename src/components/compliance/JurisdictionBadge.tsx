// src/components/compliance/JurisdictionBadge.tsx
// Role-aware jurisdiction grade badge — supports all 8 grading types
import React from 'react';
import { UserRole, getBadgeSize, showJurisdictionName } from '../../utils/roleAccess';

interface JurisdictionBadgeProps {
  gradingType: string;
  grade: string;
  gradeDisplay: string;
  passFail: string;
  jurisdictionName: string;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  isClosed?: boolean; // Imminent health hazard — overrides everything
}

export const JurisdictionBadge: React.FC<JurisdictionBadgeProps> = ({
  gradingType,
  grade,
  gradeDisplay,
  passFail,
  jurisdictionName,
  role = 'demo',
  size,
  isClosed = false,
}) => {
  const resolvedSize = size || getBadgeSize(role);
  const showName = showJurisdictionName(role);

  // Closed overrides everything
  if (isClosed) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          backgroundColor: '#B71C1C',
          color: '#FFFFFF',
          border: '2px solid #D32F2F',
          borderRadius: '8px',
          fontWeight: 700,
          display: 'inline-block',
          ...getSizeStyle(resolvedSize),
          letterSpacing: '0.5px',
        }}>
          CLOSED
        </span>
        {showName && (
          <span style={{ fontSize: '0.85em', color: '#C62828', fontWeight: 600 }}>
            Imminent Health Hazard
          </span>
        )}
      </div>
    );
  }

  const getColors = (): { bg: string; text: string; border: string } => {
    switch (passFail) {
      case 'pass': return { bg: '#E8F5E9', text: '#2E7D32', border: '#4CAF50' };
      case 'fail': return { bg: '#FFEBEE', text: '#C62828', border: '#EF5350' };
      case 'warning': return { bg: '#FFF8E1', text: '#F57F17', border: '#FFC107' };
      default: return { bg: '#F5F5F5', text: '#616161', border: '#BDBDBD' };
    }
  };

  const renderContent = (): string => {
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
      case 'pass_reinspect':
        // Show Pass / Reinspection Required
        if (grade === 'Pass') return 'Pass';
        if (grade === 'Reinspection Required') return 'Reinspect';
        return gradeDisplay;
      case 'three_tier_rating':
        return gradeDisplay;
      case 'report_only':
        return 'Report Only';
      default:
        return gradeDisplay;
    }
  };

  const colors = getColors();

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          border: `2px solid ${colors.border}`,
          borderRadius: '8px',
          fontWeight: 600,
          display: 'inline-block',
          ...getSizeStyle(resolvedSize),
        }}
      >
        {renderContent()}
      </span>
      {showName && (
        <span style={{ fontSize: '0.85em', color: '#757575' }}>
          {jurisdictionName}
        </span>
      )}
    </div>
  );
};

function getSizeStyle(size: 'sm' | 'md' | 'lg'): React.CSSProperties {
  switch (size) {
    case 'sm':
      return { fontSize: '0.875rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.125rem', paddingBottom: '0.125rem' };
    case 'lg':
      return { fontSize: '1.25rem', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', fontWeight: 700 };
    case 'md':
    default:
      return { fontSize: '1rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem' };
  }
}

export default JurisdictionBadge;
