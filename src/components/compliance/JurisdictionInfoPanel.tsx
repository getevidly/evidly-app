// src/components/compliance/JurisdictionInfoPanel.tsx
// Role-aware jurisdiction info — returns null for staff role
import React from 'react';
import { UserRole, canViewJurisdictionInfo } from '../../utils/roleAccess';

interface JurisdictionInfo {
  county: string;
  city?: string;
  agencyName: string;
  scoringType: string;
  gradingType: string;
  passThreshold: number | null;
  foodSafetyWeight: number;
  fireSafetyWeight: number;
  opsWeight: number;
  docsWeight: number;
  fireAhjName: string;
}

interface JurisdictionInfoPanelProps {
  jurisdiction: JurisdictionInfo;
  role?: UserRole;
  currentScore?: number;
  currentGrade?: string;
  passFail?: string;
}

const SCORING_LABELS: Record<string, string> = {
  weighted_deduction: 'Weighted Point Deduction (Start at 100, subtract per violation)',
  heavy_weighted: 'Heavy Weighted (8 points per major violation)',
  major_violation_count: 'Major Violation Count (Grade based on number of majors)',
  negative_scale: 'Negative Scale (0 is perfect, points added for violations)',
  major_minor_reinspect: 'Major/Minor with Reinspection (CalCode ORFIR standard)',
  violation_point_accumulation: 'Violation Point Accumulation (Points accumulate per violation)',
  report_only: 'Report Only (No public grade assigned by jurisdiction)',
};

const GRADING_LABELS: Record<string, string> = {
  letter_grade: 'Letter Grade (A/B/C)',
  letter_grade_strict: 'Letter Grade - Strict (Only A passes)',
  color_placard: 'Color Placard (Green/Yellow/Red)',
  score_100: 'Numeric Score (0-100)',
  score_negative: 'Negative Score (0 is perfect)',
  pass_reinspect: 'Pass / Reinspection Required (CalCode ORFIR)',
  three_tier_rating: 'Three-Tier Rating (Good/Satisfactory/Unsatisfactory)',
  report_only: 'No Public Grade',
};

const THRESHOLD_DESCRIPTIONS: Record<string, string> = {
  letter_grade: 'A (90-100), B (80-89), C (70-79). Below 70 = closure review.',
  letter_grade_strict: 'Only A (90+) is a passing grade. B or below = FAIL.',
  color_placard: 'Green = pass, Yellow = conditional, Red = closure.',
  score_100: 'Numeric score displayed publicly. Pass threshold set by jurisdiction.',
  score_negative: '0 is perfect. Points are added for each violation found.',
  pass_reinspect: 'No numeric grade. Pass if no uncorrected major violations. Reinspection if majors remain uncorrected. Closed if imminent health hazard.',
  three_tier_rating: 'Good (0-6 points), Satisfactory (7-13 points), Unsatisfactory (14+ points).',
  report_only: 'Inspection report filed but no public-facing grade or placard.',
};

export const JurisdictionInfoPanel: React.FC<JurisdictionInfoPanelProps> = ({
  jurisdiction,
  role = 'demo',
}) => {
  // Staff role gets no info panel
  if (!canViewJurisdictionInfo(role)) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E0E0',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e4d6b' }}>
          Your Jurisdiction
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: '#424242' }}>
          {jurisdiction.agencyName}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#757575' }}>
          {jurisdiction.city
            ? `${jurisdiction.city}, ${jurisdiction.county} County`
            : `${jurisdiction.county} County`}
        </p>
      </div>

      {/* Scoring Method */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#616161', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          How Your Inspector Scores
        </span>
        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#424242' }}>
          {SCORING_LABELS[jurisdiction.scoringType] || jurisdiction.scoringType}
        </p>
      </div>

      {/* Grading Format */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#616161', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Grade Format
        </span>
        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#424242' }}>
          {GRADING_LABELS[jurisdiction.gradingType] || jurisdiction.gradingType}
        </p>
        {THRESHOLD_DESCRIPTIONS[jurisdiction.gradingType] && (
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#9E9E9E', fontStyle: 'italic' }}>
            {THRESHOLD_DESCRIPTIONS[jurisdiction.gradingType]}
          </p>
        )}
      </div>

      {/* Pass Threshold — only for grading types that use numeric thresholds */}
      {jurisdiction.passThreshold && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#616161', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Passing Threshold
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#424242' }}>
            Score of {jurisdiction.passThreshold} or above required to pass
          </p>
        </div>
      )}

      {/* Weights — from jurisdiction, not hardcoded */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#616161', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Compliance Weights (Set by Jurisdiction)
        </span>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <div style={{ flex: 1, backgroundColor: '#E3F2FD', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1565C0' }}>
              {jurisdiction.foodSafetyWeight}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#1565C0' }}>Food Safety</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#FFF3E0', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#E65100' }}>
              {jurisdiction.fireSafetyWeight}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#E65100' }}>Fire Safety</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <div style={{ flex: 1, backgroundColor: '#F3E5F5', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6A1B9A' }}>
              {jurisdiction.opsWeight}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6A1B9A' }}>Operations</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#E8EAF6', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#283593' }}>
              {jurisdiction.docsWeight}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#283593' }}>Documentation</div>
          </div>
        </div>
      </div>

      {/* Fire AHJ */}
      <div>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#616161', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Fire Authority
        </span>
        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#424242' }}>
          {jurisdiction.fireAhjName}
        </p>
      </div>
    </div>
  );
};

export default JurisdictionInfoPanel;
