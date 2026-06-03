import { useState } from 'react';
import { ModalShell, FormField, INPUT_CLASS, BTN_PRIMARY, BTN_CANCEL } from '../temp-logs/shared';
import {
  DAY_LABELS,
  generateOpeningTimes,
  generateClosingTimes,
} from '../../contexts/OperatingHoursContext';
import { US_STATES } from '../../types/rfp';
import { GhostInput } from '../ai/GhostInput';
import { JurisdictionSelect } from '../jurisdiction/JurisdictionSelect';

// ── Types ────────────────────────────────────────────────────

export interface NewLocationData {
  name: string;
  code: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  jurisdictionId: string;
  days: boolean[];
  openTime: string;
  closeTime: string;
}

interface AddLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewLocationData) => void;
  existingCodes?: string[];
  /** Plan tier for pricing subtitle. */
  planTier?: 'trial' | 'essentials' | 'founder' | 'standard' | 'enterprise';
}

// ── Component ────────────────────────────────────────────────

const TIER_SUBTITLES: Record<string, string> = {
  trial: 'Add a new location to your organization.',
  essentials: 'Each additional location adds $39/mo to your Essentials subscription.',
  founder: 'Each additional location adds $49/mo to your Founder subscription. Rate locked for 36 months.',
  standard: 'Each additional location adds $99/mo to your Standard subscription.',
  enterprise: 'Contact your account representative for location pricing.',
};

export function AddLocationModal({ open, onClose, onSave, existingCodes = [], planTier }: AddLocationModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [zip, setZip] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [jurisdictionTouched, setJurisdictionTouched] = useState(false);
  const [days, setDays] = useState<boolean[]>([false, true, true, true, true, true, false]);
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');

  const openingTimes = generateOpeningTimes();
  const closingTimes = generateClosingTimes();

  const codeConflict = code.length > 0 && existingCodes.includes(code.toUpperCase());
  const canSubmit = name.trim().length > 0 && code.trim().length > 0 && !codeConflict && !!jurisdictionId;

  const resetForm = () => {
    setName('');
    setCode('');
    setStreet('');
    setCity('');
    setState('CA');
    setZip('');
    setJurisdictionId('');
    setJurisdictionTouched(false);
    setDays([false, true, true, true, true, true, false]);
    setOpenTime('06:00');
    setCloseTime('22:00');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJurisdictionTouched(true);
    if (!canSubmit) return;
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      street: street.trim(),
      city: city.trim(),
      state,
      zip: zip.trim(),
      jurisdictionId,
      days,
      openTime,
      closeTime,
    });
    resetForm();
  };

  const toggleDay = (index: number) => {
    setDays(prev => prev.map((v, i) => (i === index ? !v : v)));
  };

  return (
    <ModalShell open={open} onClose={handleClose} title="Add Location" subtitle={planTier ? TIER_SUBTITLES[planTier] || TIER_SUBTITLES.trial : 'Add a new location to your organization.'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Location Name */}
        <FormField label="Location Name" required>
          <GhostInput
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Downtown Kitchen"
            className={INPUT_CLASS}
            fieldLabel="Location Name"
            formContext={{ city, state }}
            entityType="location"
          />
        </FormField>

        {/* Location Code */}
        <FormField label="Location Code" required>
          <GhostInput
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="e.g., DK"
            maxLength={6}
            className={`${INPUT_CLASS} ${codeConflict ? 'border-red-400 focus:ring-red-300' : ''}`}
            fieldLabel="Location Code"
            formContext={{ name }}
            entityType="location"
          />
          {codeConflict && (
            <p className="text-xs text-red-600 mt-1">Code already in use</p>
          )}
        </FormField>

        {/* Street Address */}
        <FormField label="Street Address">
          <input
            type="text"
            value={street}
            onChange={e => setStreet(e.target.value)}
            placeholder="123 Main St"
            className={INPUT_CLASS}
          />
        </FormField>

        {/* City / State / Zip */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] gap-3">
          <FormField label="City">
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Fresno"
              className={INPUT_CLASS}
            />
          </FormField>
          <FormField label="State">
            <select value={state} onChange={e => setState(e.target.value)} className={`${INPUT_CLASS} bg-white`}>
              {Object.entries(US_STATES).map(([abbr]) => (
                <option key={abbr} value={abbr}>{abbr}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Zip">
            <input
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="93721"
              maxLength={5}
              className={INPUT_CLASS}
            />
          </FormField>
        </div>

        {/* Jurisdiction */}
        <FormField label="Governing Jurisdiction" required>
          <JurisdictionSelect
            value={jurisdictionId || null}
            onChange={(id) => setJurisdictionId(id || '')}
            prefilter={{ city }}
            touched={jurisdictionTouched}
          />
        </FormField>

        {/* Operating Days */}
        <div>
          <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Operating Days</label>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  days[i]
                    ? 'bg-[#1E2D4D] text-white'
                    : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/50 border border-[#1E2D4D]/15 hover:bg-[#1E2D4D]/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Open / Close Times */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Opening Time">
            <select value={openTime} onChange={e => setOpenTime(e.target.value)} className={`${INPUT_CLASS} bg-white`}>
              {openingTimes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Closing Time">
            <select value={closeTime} onChange={e => setCloseTime(e.target.value)} className={`${INPUT_CLASS} bg-white`}>
              {closingTimes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleClose} className={`${BTN_CANCEL} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`${BTN_PRIMARY} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Add Location
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
