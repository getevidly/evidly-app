/**
 * JurisdictionSelect — searchable grouped selector backed by the live
 * jurisdictions table. Wraps the shared Combobox primitive.
 *
 * Shows a two-pillar preview (EHD + AHJ) when a jurisdiction is selected.
 */

import { useState, useMemo, useCallback } from 'react';
import { Combobox, type ComboboxSection } from '../ui/Combobox';
import { useJurisdictionOptions, type JurisdictionOption } from '../../lib/jurisdictions/useJurisdictionOptions';
import { colors } from '../../lib/designSystem';

// ── Props ────────────────────────────────────────────────────

export interface JurisdictionSelectProps {
  value: string | null;
  onChange: (id: string | null, option: JurisdictionOption | null) => void;
  prefilter?: { county?: string; city?: string };
  touched?: boolean;
}

// ── Sections ─────────────────────────────────────────────────

const SECTIONS: ComboboxSection<JurisdictionOption>[] = [
  { title: 'Counties', filter: (o) => o.group === 'counties' },
  { title: 'Independent Cities', filter: (o) => o.group === 'cities' },
  { title: 'Tribal Authorities', filter: (o) => o.group === 'tribal' },
];

// ── Component ────────────────────────────────────────────────

export function JurisdictionSelect({ value, onChange, prefilter, touched }: JurisdictionSelectProps) {
  const { options, loading, error } = useJurisdictionOptions();
  const [searchText, setSearchText] = useState('');

  // Find selected option by id
  const selected = useMemo(
    () => (value ? options.find(o => o.id === value) ?? null : null),
    [value, options],
  );

  // Apply prefilter: matching items sort to top within their group
  const sortedOptions = useMemo(() => {
    if (!prefilter?.county && !prefilter?.city) return options;

    const countyLower = prefilter.county?.trim().toLowerCase() || '';
    const cityLower = prefilter.city?.trim().toLowerCase() || '';

    return [...options].sort((a, b) => {
      // Same group — sort matches first
      if (a.group === b.group) {
        const aMatch =
          (countyLower && a.county.toLowerCase().includes(countyLower)) ||
          (cityLower && a.city?.toLowerCase().includes(cityLower));
        const bMatch =
          (countyLower && b.county.toLowerCase().includes(countyLower)) ||
          (cityLower && b.city?.toLowerCase().includes(cityLower));

        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return a.label.localeCompare(b.label);
      }
      const order = { counties: 0, cities: 1, tribal: 2 };
      return order[a.group] - order[b.group];
    });
  }, [options, prefilter?.county, prefilter?.city]);

  const getItemLabel = useCallback((o: JurisdictionOption) => o.label, []);
  const getItemMeta = useCallback((o: JurisdictionOption) => {
    // Show agency name as meta when it differs from label
    if (o.group !== 'tribal' && o.agencyName !== o.label) return o.agencyName;
    return undefined;
  }, []);

  const handleSelect = useCallback((item: JurisdictionOption | string) => {
    if (typeof item === 'string') return; // should not happen with allowFreeText=false
    onChange(item.id, item);
    setSearchText(item.label);
  }, [onChange]);

  const handleTextChange = useCallback((text: string) => {
    setSearchText(text);
    // If user clears or edits text, deselect
    if (value && text !== selected?.label) {
      onChange(null, null);
    }
  }, [value, selected, onChange]);

  // ── Error state ──────────────────────────────────────────
  if (error) {
    return (
      <div>
        <p className="text-xs text-red-600">
          Failed to load jurisdictions: {error}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Combobox<JurisdictionOption>
        value={searchText}
        onChange={handleTextChange}
        onSelect={handleSelect}
        items={sortedOptions}
        getItemLabel={getItemLabel}
        getItemMeta={getItemMeta}
        placeholder={loading ? 'Loading jurisdictions…' : 'Search jurisdiction…'}
        sections={SECTIONS}
        allowFreeText={false}
        emptyMessage="No jurisdictions match your search"
      />

      {/* Two-pillar preview when selected */}
      {selected && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* EHD card */}
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: '#FAF7F0', border: '1px solid #E2DDD4' }}
          >
            <div className="text-[9px] uppercase font-semibold tracking-wider mb-1" style={{ color: colors.textMuted }}>
              Environmental Health
            </div>
            <div className="text-xs font-medium" style={{ color: colors.textPrimary }}>
              {selected.agencyName}
            </div>
          </div>

          {/* AHJ card */}
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: selected.fireAhjName ? '#FAF7F0' : '#FFFBEB',
              border: `1px solid ${selected.fireAhjName ? '#E2DDD4' : '#FDE68A'}`,
            }}
          >
            <div className="text-[9px] uppercase font-semibold tracking-wider mb-1" style={{ color: colors.textMuted }}>
              Fire AHJ
            </div>
            {selected.fireAhjName ? (
              <div>
                <div className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                  {selected.fireAhjName}
                </div>
                {selected.nfpa96Edition && (
                  <div className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
                    NFPA 96 ({selected.nfpa96Edition})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[10px] leading-snug" style={{ color: '#92400E' }}>
                AHJ not yet on file for this jurisdiction — pending JIE verification.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation error */}
      {touched && !value && (
        <p className="text-xs text-red-600 mt-1">
          Jurisdiction is required — select the governing authority for this location.
        </p>
      )}
    </div>
  );
}
