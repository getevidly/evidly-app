import React from 'react';
import type { ComplianceSnapshot } from '../../hooks/useBusinessIntelligence';

interface Props {
  snapshots: ComplianceSnapshot[];
}

function scoreToFoodSafetyStatus(score: number | null): { label: string; bg: string; text: string; border: string } {
  if (score === null) return { label: 'No Data', bg: '#EEF1F7', text: '#3D5068', border: '#D1D9E6' };
  if (score >= 85) return { label: 'Compliant', bg: '#14532d20', text: '#4ade80', border: '#166534' };
  if (score >= 70) return { label: 'Satisfactory', bg: '#78350f20', text: '#fbbf24', border: '#92400e' };
  return { label: 'Action Required', bg: '#7f1d1d20', text: '#f87171', border: '#991b1b' };
}

function scoreToFacilitySafetyVerdict(score: number | null): { label: string; bg: string; text: string; border: string } {
  if (score === null) return { label: 'No Data', bg: '#EEF1F7', text: '#3D5068', border: '#D1D9E6' };
  if (score >= 70) return { label: 'Pass', bg: '#14532d20', text: '#4ade80', border: '#166534' };
  return { label: 'Fail', bg: '#7f1d1d20', text: '#f87171', border: '#991b1b' };
}

function overallRiskLevel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'low', color: '#4ade80' };
  if (score >= 70) return { label: 'medium', color: '#fbbf24' };
  if (score >= 55) return { label: 'high', color: '#f97316' };
  return { label: 'critical', color: '#ef4444' };
}

function pctColor(pct: number | null): string {
  if (pct === null) return '#3D5068';
  const v = Math.round(pct * 100);
  if (v >= 90) return '#4ade80';
  if (v >= 75) return '#fbbf24';
  return '#f87171';
}

const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const ComplianceHeatMap: React.FC<Props> = ({ snapshots }) => {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div style={{
        background: '#FFFFFF', border: '1px solid #D1D9E6',
        borderRadius: '12px', padding: '24px', marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: '0 0 8px', fontFamily: F }}>
          {'\uD83D\uDDFA\uFE0F'} Compliance Heat Map
        </h2>
        <p style={{ color: '#3D5068', fontSize: '13px', fontFamily: F, margin: 0 }}>
          No compliance score snapshots available. Scores will appear after the first compliance calculation runs.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #D1D9E6',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      <h2 style={{
        color: '#0B1628', fontSize: '14px', fontWeight: 700,
        margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: F,
      }}>
        <span style={{ fontSize: '16px' }}>{'\uD83D\uDDFA\uFE0F'}</span> Compliance Heat Map
        <span style={{ fontSize: '11px', color: '#3D5068', fontWeight: 400 }}>
          Status by location and pillar
        </span>
      </h2>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 80px 80px 80px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#3D5068', fontWeight: 600, fontFamily: F, textTransform: 'uppercase' }}>Location</span>
        <span style={{ fontSize: '10px', color: '#3D5068', textAlign: 'center', fontWeight: 600, fontFamily: F, textTransform: 'uppercase' }}>Food Safety</span>
        <span style={{ fontSize: '10px', color: '#3D5068', textAlign: 'center', fontWeight: 600, fontFamily: F, textTransform: 'uppercase' }}>Facility Safety</span>
        <span style={{ fontSize: '10px', color: '#3D5068', textAlign: 'center', fontWeight: 600, fontFamily: F, textTransform: 'uppercase' }}>Checklists</span>
        <span style={{ fontSize: '10px', color: '#3D5068', textAlign: 'center', fontWeight: 600, fontFamily: F, textTransform: 'uppercase' }}>Temp Logs</span>
        <span style={{ fontSize: '10px', color: '#3D5068', textAlign: 'center', fontWeight: 600, fontFamily: F, textTransform: 'uppercase' }}>Risk</span>
      </div>

      {snapshots.map(snap => {
        const fs = scoreToFoodSafetyStatus(snap.foodSafetyScore);
        const fire = scoreToFacilitySafetyVerdict(snap.facilitySafetyScore);
        const checkRate = snap.checklistsCompletedPct !== null ? Math.round(snap.checklistsCompletedPct * 100) : null;
        const tempRate = snap.tempInRangePct !== null ? Math.round(snap.tempInRangePct * 100) : null;
        const risk = overallRiskLevel(snap.overallScore);

        return (
          <div key={snap.locationId} style={{
            display: 'grid', gridTemplateColumns: '180px 1fr 1fr 80px 80px 80px',
            gap: '8px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #D1D9E6',
          }}>
            <div>
              <p style={{ color: '#0B1628', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: F }}>{snap.locationName}</p>
              <p style={{ color: '#3D5068', fontSize: '10px', margin: '1px 0 0', fontFamily: F }}>{snap.jurisdictionName}</p>
            </div>
            <div style={{
              background: fs.bg, border: `1px solid ${fs.border}`,
              borderRadius: '6px', padding: '4px 8px', textAlign: 'center',
            }}>
              <span style={{ fontSize: '11px', color: fs.text, fontWeight: 600, fontFamily: F }}>{fs.label}</span>
              {snap.foodSafetyScore !== null && (
                <span style={{ fontSize: '10px', color: fs.text, fontWeight: 400, marginLeft: '4px' }}>
                  ({snap.foodSafetyScore})
                </span>
              )}
            </div>
            <div style={{
              background: fire.bg, border: `1px solid ${fire.border}`,
              borderRadius: '6px', padding: '4px 8px', textAlign: 'center',
            }}>
              <span style={{ fontSize: '11px', color: fire.text, fontWeight: 600, fontFamily: F }}>{fire.label}</span>
              {snap.facilitySafetyScore !== null && (
                <span style={{ fontSize: '10px', color: fire.text, fontWeight: 400, marginLeft: '4px' }}>
                  ({snap.facilitySafetyScore})
                </span>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '13px', fontWeight: 700, fontFamily: F,
                color: pctColor(snap.checklistsCompletedPct),
              }}>
                {checkRate !== null ? `${checkRate}%` : '\u2014'}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '13px', fontWeight: 700, fontFamily: F,
                color: pctColor(snap.tempInRangePct),
              }}>
                {tempRate !== null ? `${tempRate}%` : '\u2014'}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, fontFamily: F,
                color: risk.color, textTransform: 'uppercase',
              }}>
                {risk.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
