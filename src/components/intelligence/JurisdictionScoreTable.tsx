import React, { useState } from 'react';
import { EvidlyLogo } from '../ui/EvidlyLogo';
import type { JurisdictionInfo } from '../../hooks/useBusinessIntelligence';

interface Props {
  jurisdictions: JurisdictionInfo[];
}

const layerConfig: Record<string, { icon: string; label: string; color: string; border: string; bg: string }> = {
  food_safety:  { icon: '\uD83E\uDD57', label: 'Food Safety', color: '#4ade80', border: '#166534', bg: '#14532d20' },
  facility_safety:  { icon: '\uD83D\uDD25', label: 'Facility Safety', color: '#f97316', border: '#92400e', bg: '#78350f20' },
  federal:      { icon: '\uD83C\uDFDB\uFE0F', label: 'Federal', color: '#93c5fd', border: '#1e40af', bg: '#1e3a5f20' },
};

const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const JurisdictionScoreTable: React.FC<Props> = ({ jurisdictions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by location
  const byLocation = new Map<string, JurisdictionInfo[]>();
  (jurisdictions || []).forEach(j => {
    const existing = byLocation.get(j.locationId) || [];
    existing.push(j);
    byLocation.set(j.locationId, existing);
  });

  const locationEntries = Array.from(byLocation.entries());

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <EvidlyLogo size="sm" showTagline={false} />
          <div>
            <p style={{ color: '#0B1628', fontSize: '14px', fontWeight: 800, margin: 0, fontFamily: F }}>
              Jurisdiction Intelligence
            </p>
            <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', fontFamily: F }}>
              Food &amp; Facility Safety scoring by jurisdiction &middot; {locationEntries.length} location{locationEntries.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {locationEntries.length === 0 && (
        <div style={{
          background: '#FFFFFF', border: '1px solid #D1D9E6',
          borderRadius: '10px', padding: '24px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
        }}>
          <p style={{ color: '#3D5068', fontSize: '13px', fontFamily: F, margin: 0 }}>
            No jurisdictions assigned. Jurisdictions are auto-detected when locations are added via the JIE pipeline.
          </p>
        </div>
      )}

      {/* Jurisdiction cards by location */}
      {locationEntries.map(([locationId, juris]) => {
        const locationName = juris[0]?.locationName || 'Unknown';
        return (
          <div key={locationId} style={{ marginBottom: '12px' }}>
            <p style={{
              color: '#0B1628', fontSize: '12px', fontWeight: 700, margin: '0 0 8px', fontFamily: F,
            }}>
              {locationName}
            </p>
            {juris.map(j => {
              const layer = layerConfig[j.jurisdictionLayer] || layerConfig.food_safety;
              const cardKey = `${j.locationId}-${j.jurisdictionId}-${j.jurisdictionLayer}`;
              const isExpanded = expandedId === cardKey;

              return (
                <div key={cardKey} style={{
                  background: '#FFFFFF',
                  border: '1px solid #D1D9E6',
                  borderRadius: '10px', marginBottom: '8px', overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
                }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : cardKey)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      padding: '14px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{ fontSize: '16px' }}>{layer.icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <p style={{ color: '#0B1628', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: F }}>
                            {j.agencyName}
                          </p>
                          <span style={{
                            background: layer.bg, border: `1px solid ${layer.border}`,
                            borderRadius: '4px', padding: '1px 6px',
                            fontSize: '10px', color: layer.color, fontWeight: 600, fontFamily: F,
                          }}>{layer.label}</span>
                        </div>
                        <p style={{ color: '#3D5068', fontSize: '11px', margin: '2px 0 0', fontFamily: F }}>
                          {j.gradingType ? `${j.gradingType} \u00B7 ` : ''}{j.scoringType || 'Standard scoring'}
                        </p>
                      </div>
                    </div>
                    <span style={{ color: '#3D5068' }}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #D1D9E6', padding: '14px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        {[
                          { label: 'Grading System', value: j.gradingType || 'Not specified' },
                          { label: 'Scoring Method', value: j.scoringType || 'Not specified' },
                          { label: 'Agency Type', value: j.agencyType?.replace(/_/g, ' ') || 'Not specified' },
                        ].map((m, i) => (
                          <div key={i} style={{ background: '#EEF1F7', borderRadius: '6px', padding: '10px' }}>
                            <p style={{ color: '#3D5068', fontSize: '10px', margin: '0 0 3px', fontFamily: F, textTransform: 'uppercase', fontWeight: 700 }}>{m.label}</p>
                            <p style={{ color: '#0B1628', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: F }}>{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {j.fireAhjName && (
                        <div style={{
                          background: '#78350f20', border: '1px solid #92400e',
                          borderRadius: '6px', padding: '10px 12px', marginBottom: '12px',
                        }}>
                          <p style={{ color: '#fdba74', fontSize: '11px', fontWeight: 700, margin: '0 0 2px', fontFamily: F }}>Fire Authority (AHJ)</p>
                          <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, fontFamily: F }}>
                            {j.fireAhjName}
                            {j.fireCodeEdition && ` \u00B7 ${j.fireCodeEdition}`}
                            {j.nfpa96Edition && ` \u00B7 NFPA 96 (${j.nfpa96Edition})`}
                          </p>
                        </div>
                      )}

                      {j.lastSyncAt && (
                        <p style={{ color: '#3D5068', fontSize: '11px', fontFamily: F, margin: 0 }}>
                          Last data sync: {new Date(j.lastSyncAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Data notice */}
      <div style={{
        marginTop: '12px', padding: '8px 12px', background: '#EEF1F7',
        borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '12px' }}>&#x1F512;</span>
        <p style={{ color: '#3D5068', fontSize: '10px', margin: 0, fontFamily: F }}>
          EvidLY jurisdiction data is verified through direct agency contact. Always confirm current requirements with your local AHJ. Last update: February 2026.
        </p>
      </div>
    </div>
  );
};
