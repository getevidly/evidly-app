// src/components/compliance/ScoringBreakdown.tsx
// Role-aware scoring breakdown — adapts display for pass_reinspect & three_tier_rating
// Replaces ScoringBreakdownPanel.tsx with RBAC + 8 grading type support
import React, { useState } from 'react';
import { UserRole, canViewScoringBreakdown, getDefaultViolationFilter } from '../../utils/roleAccess';

interface Violation {
  calcodeSection: string;
  title: string;
  severity: string;
  pointsDeducted: number;
  module: string;
  cdcRiskFactor: boolean;
  status: string;
  correctedOnSite?: boolean;
}

interface ScoringBreakdownProps {
  startingScore: number;
  finalScore: number;
  violations: Violation[];
  scoringType: string;
  gradingType: string;
  jurisdictionName: string;
  opsWeight: number;
  docsWeight: number;
  role?: UserRole;
  // pass_reinspect fields
  majorViolations?: number;
  minorViolations?: number;
  uncorrectedMajors?: number;
  // three_tier_rating fields
  totalPoints?: number;
}

export const ScoringBreakdown: React.FC<ScoringBreakdownProps> = ({
  startingScore,
  finalScore,
  violations,
  scoringType,
  gradingType,
  jurisdictionName,
  opsWeight,
  docsWeight,
  role = 'demo',
  majorViolations = 0,
  minorViolations = 0,
  uncorrectedMajors = 0,
  totalPoints = 0,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Role check — kitchen_manager and staff cannot see breakdown
  if (!canViewScoringBreakdown(role)) {
    return null;
  }

  const defaultFilter = getDefaultViolationFilter(role);
  const nonCompliant = violations.filter(v => v.status === 'non_compliant');
  const compliant = violations.filter(v => v.status === 'compliant');

  // Apply role-based violation filter
  const filteredViolations = defaultFilter === 'all'
    ? nonCompliant
    : defaultFilter === 'critical_major'
      ? nonCompliant.filter(v => v.severity === 'critical' || v.severity === 'major')
      : [];

  const displayed = showAll ? filteredViolations : filteredViolations.slice(0, 5);

  const severityColors: Record<string, string> = {
    critical: '#C62828',
    major: '#E65100',
    minor: '#F57F17',
    grp: '#757575',
  };

  // ── pass_reinspect display ──
  if (gradingType === 'pass_reinspect') {
    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e4d6b' }}>
            Inspection Breakdown
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#757575' }}>
            {jurisdictionName} — Pass / Reinspection Required (CalCode ORFIR)
          </p>
        </div>

        {/* Major / Minor / Corrected badges */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{
            backgroundColor: uncorrectedMajors > 0 ? '#FFEBEE' : '#E8F5E9',
            borderRadius: '8px',
            padding: '10px 16px',
            flex: 1,
            textAlign: 'center',
            minWidth: '100px',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: uncorrectedMajors > 0 ? '#C62828' : '#2E7D32' }}>
              {majorViolations}
            </div>
            <div style={{ fontSize: '0.75rem', color: uncorrectedMajors > 0 ? '#C62828' : '#2E7D32', fontWeight: 500 }}>
              Major
            </div>
          </div>
          <div style={{
            backgroundColor: '#FFF8E1',
            borderRadius: '8px',
            padding: '10px 16px',
            flex: 1,
            textAlign: 'center',
            minWidth: '100px',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F57F17' }}>
              {minorViolations}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#F57F17', fontWeight: 500 }}>
              Minor
            </div>
          </div>
          <div style={{
            backgroundColor: uncorrectedMajors > 0 ? '#FFEBEE' : '#E8F5E9',
            borderRadius: '8px',
            padding: '10px 16px',
            flex: 1,
            textAlign: 'center',
            minWidth: '100px',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: uncorrectedMajors > 0 ? '#C62828' : '#2E7D32' }}>
              {uncorrectedMajors}
            </div>
            <div style={{ fontSize: '0.75rem', color: uncorrectedMajors > 0 ? '#C62828' : '#2E7D32', fontWeight: 500 }}>
              Uncorrected
            </div>
          </div>
          {majorViolations > uncorrectedMajors && (
            <div style={{
              backgroundColor: '#E3F2FD',
              borderRadius: '8px',
              padding: '10px 16px',
              flex: 1,
              textAlign: 'center',
              minWidth: '100px',
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1565C0' }}>
                {majorViolations - uncorrectedMajors}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#1565C0', fontWeight: 500 }}>
                Corrected On-Site
              </div>
            </div>
          )}
        </div>

        {/* Determination */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: uncorrectedMajors > 0 ? '#FFEBEE' : '#E8F5E9',
          border: `1px solid ${uncorrectedMajors > 0 ? '#EF9A9A' : '#A5D6A7'}`,
          marginBottom: '16px',
        }}>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: uncorrectedMajors > 0 ? '#C62828' : '#2E7D32',
          }}>
            {uncorrectedMajors > 0 ? 'Reinspection Required' : 'Pass'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#616161', marginLeft: '8px' }}>
            {uncorrectedMajors > 0
              ? `${uncorrectedMajors} major violation${uncorrectedMajors > 1 ? 's' : ''} remain uncorrected`
              : majorViolations > 0
                ? `All ${majorViolations} major violation${majorViolations > 1 ? 's' : ''} corrected on-site`
                : 'No major violations found'}
          </span>
        </div>

        {/* Violation list */}
        {renderViolationList(displayed, filteredViolations, severityColors, showAll, setShowAll)}
      </div>
    );
  }

  // ── three_tier_rating display ──
  if (gradingType === 'three_tier_rating') {
    const tier = totalPoints >= 14 ? 'Unsatisfactory' : totalPoints >= 7 ? 'Satisfactory' : 'Good';
    const tierColor = tier === 'Good' ? '#2E7D32' : tier === 'Satisfactory' ? '#F57F17' : '#C62828';
    const tierBg = tier === 'Good' ? '#E8F5E9' : tier === 'Satisfactory' ? '#FFF8E1' : '#FFEBEE';

    return (
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e4d6b' }}>
              Inspection Rating
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#757575' }}>
              {jurisdictionName} — Three-Tier Rating
            </p>
          </div>
          <div style={{
            backgroundColor: tierBg,
            borderRadius: '8px',
            padding: '8px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: tierColor }}>
              {totalPoints}
            </div>
            <div style={{ fontSize: '0.75rem', color: tierColor, fontWeight: 500 }}>
              Points
            </div>
          </div>
        </div>

        {/* Tier indicator */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: tierBg,
          border: `1px solid ${tierColor}40`,
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: tierColor }}>
            {tier}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#616161', marginLeft: '8px' }}>
            {tier === 'Good' ? '0-6 points — Excellent compliance'
              : tier === 'Satisfactory' ? '7-13 points — Acceptable with corrections needed'
              : '14+ points — Requires immediate remediation'}
          </span>
        </div>

        {/* Point scale visualization */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#F5F5F5' }}>
            <div style={{ width: '30%', backgroundColor: '#4CAF50' }} />
            <div style={{ width: '30%', backgroundColor: '#FFC107' }} />
            <div style={{ width: '40%', backgroundColor: '#EF5350' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: '#4CAF50' }}>Good (0-6)</span>
            <span style={{ fontSize: '0.7rem', color: '#FFC107' }}>Satisfactory (7-13)</span>
            <span style={{ fontSize: '0.7rem', color: '#EF5350' }}>Unsatisfactory (14+)</span>
          </div>
        </div>

        {/* Violation list */}
        {renderViolationList(displayed, filteredViolations, severityColors, showAll, setShowAll)}
      </div>
    );
  }

  // ── Default (weighted/score-based) display ──
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
      {renderViolationList(displayed, filteredViolations, severityColors, showAll, setShowAll)}
    </div>
  );
};

// Shared violation list renderer
function renderViolationList(
  displayed: Violation[],
  allFiltered: Violation[],
  severityColors: Record<string, string>,
  showAll: boolean,
  setShowAll: (val: boolean) => void,
) {
  return (
    <>
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
              {v.correctedOnSite && ' | Corrected On-Site'}
            </div>
          </div>
          <div style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: severityColors[v.severity] || '#757575',
            marginLeft: '12px',
          }}>
            -{v.pointsDeducted}
          </div>
        </div>
      ))}

      {allFiltered.length > 5 && !showAll && (
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
          Show all {allFiltered.length} issues
        </button>
      )}
    </>
  );
}

export default ScoringBreakdown;
