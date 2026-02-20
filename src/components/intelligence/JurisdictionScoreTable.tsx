import { useState, useEffect } from 'react';
import { EvidlyLogo } from '../ui/EvidlyLogo';
import {
  JURISDICTION_DATABASE, type JurisdictionScore, type UserJurisdiction,
  searchJurisdictions, getJurisdictionById,
} from '../../data/jurisdictionData';

const pillarConfig = {
  food_safety: { icon: '\uD83E\uDD57', label: 'Food Safety', color: '#4ade80', border: '#166534', bg: '#14532d20' },
  fire_safety: { icon: '\uD83D\uDD25', label: 'Fire Safety', color: '#f97316', border: '#92400e', bg: '#78350f20' },
};

const transparencyConfig = {
  high:   { label: 'Public Records', color: '#4ade80', bg: '#14532d30' },
  medium: { label: 'Limited Public', color: '#fbbf24', bg: '#78350f30' },
  low:    { label: 'FOIA Required',  color: '#f87171', bg: '#7f1d1d30' },
};

interface Props {
  userJurisdictions: UserJurisdiction[];
  onChange: (v: UserJurisdiction[]) => void;
}

export const JurisdictionScoreTable: React.FC<Props> = ({ userJurisdictions, onChange }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JurisdictionScore[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const [pendingLocation, setPendingLocation] = useState('');

  useEffect(() => {
    setResults(query.length >= 2 ? searchJurisdictions(query) : []);
  }, [query]);

  const add = (j: JurisdictionScore, isPrimary: boolean) => {
    if (userJurisdictions.find(u => u.jurisdictionId === j.id)) return;
    onChange([...userJurisdictions, {
      jurisdictionId: j.id,
      locationName: pendingLocation || (isPrimary ? 'Current Location' : 'Expansion Planning'),
      isPrimary,
      addedDate: new Date().toISOString(),
      notes: pendingNote,
    }]);
    setShowAdd(false);
    setQuery('');
    setPendingNote('');
    setPendingLocation('');
  };

  const remove = (id: string) =>
    onChange(userJurisdictions.filter(u => u.jurisdictionId !== id));

  const active = userJurisdictions
    .map(u => ({ ...u, data: getJurisdictionById(u.jurisdictionId) }))
    .filter((u): u is typeof u & { data: JurisdictionScore } => !!u.data);

  const primary = active.filter(u => u.isPrimary);
  const expansion = active.filter(u => !u.isPrimary);

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <EvidlyLogo size="sm" showTagline={false} />
          <div>
            <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 800, margin: 0, fontFamily: 'system-ui' }}>
              Jurisdiction Intelligence
            </p>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
              Food &amp; Fire Safety scoring by jurisdiction &middot; {active.length} active
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: '#A08C5A', border: 'none', borderRadius: '6px',
            padding: '7px 14px', color: '#ffffff', fontSize: '12px',
            fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui',
          }}
        >
          + Add Jurisdiction
        </button>
      </div>

      {/* Add panel */}
      {showAdd && (
        <div style={{
          background: '#0f172a', border: '1px solid #A08C5A40',
          borderRadius: '10px', padding: '16px', marginBottom: '16px',
        }}>
          <p style={{ color: '#A08C5A', fontSize: '12px', fontWeight: 700, margin: '0 0 10px', fontFamily: 'system-ui' }}>
            Add Jurisdiction — Current Operations or Expansion Planning
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '3px', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
                Search County or City
              </label>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Fresno, Merced, Sacramento..."
                style={{
                  width: '100%', background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '6px', padding: '8px 10px', color: '#ffffff',
                  fontSize: '12px', fontFamily: 'system-ui', boxSizing: 'border-box' as const,
                }}
              />
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '3px', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
                Location Name (Optional)
              </label>
              <input
                type="text"
                value={pendingLocation}
                onChange={e => setPendingLocation(e.target.value)}
                placeholder="e.g. Downtown Kitchen, Expansion Site A"
                style={{
                  width: '100%', background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '6px', padding: '8px 10px', color: '#ffffff',
                  fontSize: '12px', fontFamily: 'system-ui', boxSizing: 'border-box' as const,
                }}
              />
            </div>
          </div>

          {results.map(j => {
            const p = pillarConfig[j.pillar];
            const already = !!userJurisdictions.find(u => u.jurisdictionId === j.id);
            return (
              <div key={j.id} style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', padding: '10px 12px', marginBottom: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{p.icon}</span>
                  <div>
                    <p style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>
                      {j.agencyName}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '11px', margin: '1px 0 0', fontFamily: 'system-ui' }}>
                      {j.county} County &middot; {p.label} &middot; {j.gradingScale}
                    </p>
                  </div>
                </div>
                {already ? (
                  <span style={{ color: '#4ade80', fontSize: '11px', fontFamily: 'system-ui' }}>&check; Added</span>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => add(j, true)} style={{
                      background: '#14532d', border: '1px solid #166534', borderRadius: '4px',
                      padding: '4px 8px', color: '#4ade80', fontSize: '10px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'system-ui',
                    }}>+ Current</button>
                    <button onClick={() => add(j, false)} style={{
                      background: '#1e3a5f', border: '1px solid #1e40af', borderRadius: '4px',
                      padding: '4px 8px', color: '#93c5fd', fontSize: '10px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'system-ui',
                    }}>+ Expansion</button>
                  </div>
                )}
              </div>
            );
          })}

          {query.length >= 2 && results.length === 0 && (
            <p style={{ color: '#64748b', fontSize: '12px', fontFamily: 'system-ui' }}>
              No results for &ldquo;{query}&rdquo;. EvidLY is continuously expanding its jurisdiction database — contact support to request a jurisdiction.
            </p>
          )}

          <textarea
            value={pendingNote}
            onChange={e => setPendingNote(e.target.value)}
            placeholder="Notes (optional) — e.g. Evaluating expansion here Q3 2026"
            rows={2}
            style={{
              width: '100%', background: '#1e293b', border: '1px solid #334155',
              borderRadius: '6px', padding: '8px 10px', color: '#ffffff',
              fontSize: '12px', fontFamily: 'system-ui', resize: 'vertical',
              boxSizing: 'border-box' as const, marginTop: '8px',
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && (
        <div style={{
          background: '#1E2D4D', border: '1px solid #334155',
          borderRadius: '10px', padding: '24px', textAlign: 'center',
        }}>
          <p style={{ color: '#64748b', fontSize: '13px', fontFamily: 'system-ui', margin: 0 }}>
            No jurisdictions added. Click <strong style={{ color: '#A08C5A' }}>+ Add Jurisdiction</strong> to see your scoring requirements.
          </p>
        </div>
      )}

      {/* Primary jurisdictions */}
      {primary.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', fontFamily: 'system-ui' }}>
            Current Operations
          </p>
          {primary.map(uj => (
            <JurisdictionCard
              key={uj.jurisdictionId}
              uj={uj}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      {/* Expansion jurisdictions */}
      {expansion.length > 0 && (
        <div>
          <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', fontFamily: 'system-ui' }}>
            Expansion Planning
          </p>
          {expansion.map(uj => (
            <JurisdictionCard
              key={uj.jurisdictionId}
              uj={uj}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      {/* Data notice */}
      <div style={{
        marginTop: '12px', padding: '8px 12px', background: '#0f172a',
        borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '12px' }}>&#x1F512;</span>
        <p style={{ color: '#475569', fontSize: '10px', margin: 0, fontFamily: 'system-ui' }}>
          EvidLY jurisdiction data is verified through direct agency contact. Always confirm current requirements with your local AHJ. Last update: February 2026.
        </p>
      </div>
    </div>
  );
};

// ── Card sub-component ──────────────────────────────────────
const JurisdictionCard: React.FC<{
  uj: UserJurisdiction & { data: JurisdictionScore };
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onRemove: (id: string) => void;
}> = ({ uj, expandedId, setExpandedId, onRemove }) => {
  const j = uj.data;
  const isExpanded = expandedId === j.id;
  const p = pillarConfig[j.pillar];
  const t = transparencyConfig[j.transparencyLevel];

  return (
    <div style={{
      background: '#1E2D4D',
      border: `1px solid ${uj.isPrimary ? '#334155' : '#1e3a5f'}`,
      borderRadius: '10px', marginBottom: '8px', overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpandedId(isExpanded ? null : j.id)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <span style={{ fontSize: '16px' }}>{p.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>
                {j.agencyName}
              </p>
              <span style={{
                background: p.bg, border: `1px solid ${p.border}`,
                borderRadius: '4px', padding: '1px 6px',
                fontSize: '10px', color: p.color, fontWeight: 600, fontFamily: 'system-ui',
              }}>{p.label}</span>
              {!uj.isPrimary && (
                <span style={{
                  background: '#1e3a5f', border: '1px solid #1e40af',
                  borderRadius: '4px', padding: '1px 6px',
                  fontSize: '10px', color: '#93c5fd', fontWeight: 600, fontFamily: 'system-ui',
                }}>Expansion</span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
              {j.county} County &middot; {j.gradingScale} &middot; {j.inspectionFrequency}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: t.bg, borderRadius: '4px', padding: '2px 6px',
            fontSize: '10px', color: t.color, fontWeight: 600, fontFamily: 'system-ui',
          }}>{t.label}</span>
          <span style={{ color: '#64748b' }}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      {isExpanded && (
        <div style={{ borderTop: '1px solid #1e293b', padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {[
              { label: 'Grading Scale', value: j.gradingScale },
              { label: 'Passing Threshold', value: j.passingThreshold },
              { label: 'Inspection Frequency', value: j.inspectionFrequency },
            ].map((m, i) => (
              <div key={i} style={{ background: '#0f172a', borderRadius: '6px', padding: '10px' }}>
                <p style={{ color: '#64748b', fontSize: '10px', margin: '0 0 3px', fontFamily: 'system-ui', textTransform: 'uppercase', fontWeight: 700 }}>{m.label}</p>
                <p style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600, margin: 0, fontFamily: 'system-ui' }}>{m.value}</p>
              </div>
            ))}
          </div>

          {j.pillar === 'fire_safety' && j.nfpaAdoption && (
            <div style={{
              background: '#78350f20', border: '1px solid #92400e',
              borderRadius: '6px', padding: '10px 12px', marginBottom: '12px',
            }}>
              <p style={{ color: '#fdba74', fontSize: '11px', fontWeight: 700, margin: '0 0 2px', fontFamily: 'system-ui' }}>Fire Code</p>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, fontFamily: 'system-ui' }}>{j.nfpaAdoption}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[
              { label: 'Agency Website', href: j.agencyWebsite },
              { label: 'Inspection Records', href: j.publicResultsUrl },
            ].map((link, i) => (
              <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', padding: '6px 12px',
                color: '#93c5fd', fontSize: '12px', fontWeight: 600,
                textDecoration: 'none', fontFamily: 'system-ui',
              }}>{link.label} &rarr;</a>
            ))}
            <a href={`tel:${j.agencyPhone.replace(/\D/g, '')}`} style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '6px', padding: '6px 12px',
              color: '#94a3b8', fontSize: '12px',
              textDecoration: 'none', fontFamily: 'system-ui',
            }}>{j.agencyPhone}</a>
          </div>

          {uj.notes && (
            <p style={{ color: '#64748b', fontSize: '11px', fontFamily: 'system-ui', margin: '0 0 10px' }}>
              Note: {uj.notes}
            </p>
          )}

          <button onClick={() => onRemove(j.id)} style={{
            background: 'transparent', border: '1px solid #7f1d1d',
            borderRadius: '4px', padding: '4px 10px',
            color: '#fca5a5', fontSize: '11px', cursor: 'pointer', fontFamily: 'system-ui',
          }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
};
