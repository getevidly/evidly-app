import { useState, useEffect } from 'react';
import { ModalShell, FormField, INPUT_CLASS, BTN_PRIMARY, BTN_CANCEL } from '../temp-logs/shared';
import {
  DAY_LABELS,
  generateOpeningTimes,
  generateClosingTimes,
} from '../../contexts/OperatingHoursContext';
import { US_STATES } from '../../types/rfp';
import { JurisdictionSelect } from '../jurisdiction/JurisdictionSelect';

// ── Types ────────────────────────────────────────────────────

export interface EditLocationData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  jurisdictionId: string;
  status: string;
  kitchenType: string;
  cookingType: string;
  industrySegment: string;
  days: boolean[];
  openTime: string;
  closeTime: string;
}

interface EditLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: EditLocationData) => void;
  initialData: EditLocationData | null;
}

// ── Options ──────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const COOKING_TYPE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'solid_fuel', label: 'Solid Fuel' },
  { value: 'high_volume', label: 'High Volume' },
  { value: 'low_volume', label: 'Low Volume' },
];

const INDUSTRY_SEGMENT_OPTIONS = [
  { value: 'other', label: 'Other' },
  { value: 'casual_dining', label: 'Casual Dining' },
  { value: 'quick_service', label: 'Quick Service' },
  { value: 'fine_dining', label: 'Fine Dining' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'education_k12', label: 'Education (K-12)' },
  { value: 'education_university', label: 'Education (University)' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'corporate_dining', label: 'Corporate Dining' },
  { value: 'catering', label: 'Catering' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'grocery_deli', label: 'Grocery / Deli' },
  { value: 'convenience', label: 'Convenience' },
];

// ── Component ────────────────────────────────────────────────

export function EditLocationModal({ open, onClose, onSave, initialData }: EditLocationModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [status, setStatus] = useState('active');
  const [kitchenType, setKitchenType] = useState('');
  const [cookingType, setCookingType] = useState('');
  const [industrySegment, setIndustrySegment] = useState('other');
  const [days, setDays] = useState<boolean[]>([false, true, true, true, true, true, false]);
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');

  const openingTimes = generateOpeningTimes();
  const closingTimes = generateClosingTimes();

  // Sync form when initialData changes (modal opens with new location)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAddress(initialData.address);
      setCity(initialData.city);
      setState(initialData.state || 'CA');
      setZip(initialData.zip);
      setPhone(initialData.phone);
      setJurisdictionId(initialData.jurisdictionId);
      setStatus(initialData.status || 'active');
      setKitchenType(initialData.kitchenType);
      setCookingType(initialData.cookingType);
      setIndustrySegment(initialData.industrySegment || 'other');
      setDays([...initialData.days]);
      setOpenTime(initialData.openTime);
      setCloseTime(initialData.closeTime);
    }
  }, [initialData]);

  const canSubmit = name.trim().length > 0;

  const toggleDay = (index: number) => {
    setDays(prev => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state,
      zip: zip.trim(),
      phone: phone.trim(),
      jurisdictionId,
      status,
      kitchenType: kitchenType.trim(),
      cookingType,
      industrySegment,
      days,
      openTime,
      closeTime,
    });
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Edit Location" subtitle="Update location details. Changes are saved to the database.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Location Name */}
        <FormField label="Location Name" required>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Downtown Kitchen"
            className={INPUT_CLASS}
          />
        </FormField>

        {/* Address */}
        <FormField label="Street Address">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
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

        {/* Phone */}
        <FormField label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className={INPUT_CLASS}
          />
        </FormField>

        {/* Jurisdiction */}
        <FormField label="Governing Jurisdiction">
          <JurisdictionSelect
            value={jurisdictionId || null}
            onChange={(id) => setJurisdictionId(id || '')}
            prefilter={{ city }}
          />
        </FormField>

        {/* Classification row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)} className={`${INPUT_CLASS} bg-white`}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Industry Segment">
            <select value={industrySegment} onChange={e => setIndustrySegment(e.target.value)} className={`${INPUT_CLASS} bg-white`}>
              {INDUSTRY_SEGMENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Kitchen Type">
            <input
              type="text"
              value={kitchenType}
              onChange={e => setKitchenType(e.target.value)}
              placeholder="e.g., Commercial, Commissary"
              className={INPUT_CLASS}
            />
          </FormField>
          <FormField label="Cooking Type">
            <select value={cookingType} onChange={e => setCookingType(e.target.value)} className={`${INPUT_CLASS} bg-white`}>
              {COOKING_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
        </div>

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
          <button type="button" onClick={onClose} className={`${BTN_CANCEL} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`${BTN_PRIMARY} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Save Changes
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
