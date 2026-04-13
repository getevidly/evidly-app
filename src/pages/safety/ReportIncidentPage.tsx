/**
 * ReportIncidentPage -- Full-page safety incident report form.
 * Route: /safety/incidents/new
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { SuggestionPill } from '../../components/ai/SuggestionPill';
import type { SafetyIncidentType, IncidentSeverity } from '../../hooks/api/useIncidents';

// ── Design tokens ────────────────────────────────────────────
const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';

// ── Options ──────────────────────────────────────────────────
const INCIDENT_TYPES: { value: SafetyIncidentType; label: string }[] = [
  { value: 'injury', label: 'Injury' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'vehicle_accident', label: 'Vehicle Accident' },
  { value: 'chemical_exposure', label: 'Chemical Exposure' },
];

const SEVERITY_LEVELS: { value: IncidentSeverity; label: string; color: string }[] = [
  { value: 'minor', label: 'Minor', color: '#64748B' },
  { value: 'moderate', label: 'Moderate', color: '#D97706' },
  { value: 'serious', label: 'Serious', color: '#EA580C' },
  { value: 'critical', label: 'Critical', color: '#DC2626' },
];

// ── Main component ───────────────────────────────────────────
export function ReportIncidentPage() {
  const navigate = useNavigate();

  // Incident details
  const [incidentType, setIncidentType] = useState<SafetyIncidentType>('injury');
  const [severity, setSeverity] = useState<IncidentSeverity>('minor');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // People involved
  const [injuredEmployee, setInjuredEmployee] = useState('');
  const [thirdPartyInvolved, setThirdPartyInvolved] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState('');

  // Immediate response
  const [immediateActions, setImmediateActions] = useState('');
  const [witnesses, setWitnesses] = useState('');

  // Medical (conditional on injury type)
  const [medicalAttention, setMedicalAttention] = useState(false);
  const [medicalFacility, setMedicalFacility] = useState('');

  const canSubmit = description.trim() !== '' && location.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    alert('Safety incident report submitted successfully.');
    navigate('/safety/incidents');
  };

  // ── Shared styles ──────────────────────────────────────────
  const inputClass =
    'w-full px-3 py-2 text-sm rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/30';
  const inputStyle = { background: CARD_BG, borderColor: CARD_BORDER, color: NAVY };
  const labelClass = 'block text-sm font-medium mb-1.5';
  const labelStyle = { color: NAVY };
  const sectionClass = 'rounded-xl p-6 space-y-4';
  const sectionStyle = { background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/safety/incidents')}
          className="p-2 rounded-xl border hover:bg-[#FAF7F0] transition-colors"
          style={{ borderColor: CARD_BORDER }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: NAVY }} />
        </button>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" style={{ color: '#DC2626' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Report Safety Incident</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Incident Details ─────────────────────── */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>Incident Details</h2>

          {/* Type selector */}
          <div>
            <label className={labelClass} style={labelStyle}>Incident Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setIncidentType(t.value)}
                  className="px-3 py-2 text-sm rounded-xl border font-medium transition-colors"
                  style={{
                    borderColor: incidentType === t.value ? '#1E2D4D' : CARD_BORDER,
                    background: incidentType === t.value ? '#1E2D4D0D' : CARD_BG,
                    color: incidentType === t.value ? NAVY : TEXT_TERTIARY,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className={labelClass} style={labelStyle}>Severity</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITY_LEVELS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className="px-3 py-2 text-sm rounded-xl border font-medium transition-colors"
                  style={{
                    borderColor: severity === s.value ? s.color : CARD_BORDER,
                    background: severity === s.value ? `${s.color}0D` : CARD_BG,
                    color: severity === s.value ? s.color : TEXT_TERTIARY,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>Date</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Time</label>
              <input
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={labelClass} style={labelStyle}>
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main Kitchen, Loading Dock, Parking Lot"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass} style={labelStyle}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail..."
              rows={4}
              className={inputClass}
              style={inputStyle}
              required
            />
            <SuggestionPill
              fieldLabel="Description"
              formContext={{ incidentType, severity, location }}
              entityType="incident"
              onAccept={(text) => setDescription(text)}
            />
          </div>
        </div>

        {/* ── Section 2: People Involved ──────────────────────── */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>People Involved</h2>

          {/* Injured employee */}
          <div>
            <label className={labelClass} style={labelStyle}>Injured Employee</label>
            <input
              type="text"
              value={injuredEmployee}
              onChange={(e) => setInjuredEmployee(e.target.value)}
              placeholder="Full name of injured employee (if applicable)"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Third party */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="thirdParty"
              checked={thirdPartyInvolved}
              onChange={(e) => setThirdPartyInvolved(e.target.checked)}
              className="w-4 h-4 rounded border-[#1E2D4D]/15"
            />
            <label htmlFor="thirdParty" className="text-sm" style={{ color: NAVY }}>
              Third party involved
            </label>
          </div>

          {thirdPartyInvolved && (
            <div>
              <label className={labelClass} style={labelStyle}>Third Party Name</label>
              <input
                type="text"
                value={thirdPartyName}
                onChange={(e) => setThirdPartyName(e.target.value)}
                placeholder="Full name of third party"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* ── Section 3: Immediate Response ───────────────────── */}
        <div className={sectionClass} style={sectionStyle}>
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>Immediate Response</h2>

          <div>
            <label className={labelClass} style={labelStyle}>Immediate Actions Taken</label>
            <textarea
              value={immediateActions}
              onChange={(e) => setImmediateActions(e.target.value)}
              placeholder="Describe any immediate actions taken (first aid, area secured, etc.)..."
              rows={3}
              className={inputClass}
              style={inputStyle}
            />
            <SuggestionPill
              fieldLabel="Immediate Actions"
              formContext={{ incidentType, severity, location }}
              entityType="incident"
              onAccept={(text) => setImmediateActions(text)}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Witnesses</label>
            <textarea
              value={witnesses}
              onChange={(e) => setWitnesses(e.target.value)}
              placeholder="List any witnesses (names and contact info)..."
              rows={2}
              className={inputClass}
              style={inputStyle}
            />
            <SuggestionPill
              fieldLabel="Witnesses"
              formContext={{ incidentType, severity }}
              entityType="incident"
              onAccept={(text) => setWitnesses(text)}
            />
          </div>
        </div>

        {/* ── Section 4: Medical (conditional on injury) ──────── */}
        {incidentType === 'injury' && (
          <div className={sectionClass} style={sectionStyle}>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Medical Information</h2>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="medicalAttention"
                checked={medicalAttention}
                onChange={(e) => setMedicalAttention(e.target.checked)}
                className="w-4 h-4 rounded border-[#1E2D4D]/15"
              />
              <label htmlFor="medicalAttention" className="text-sm" style={{ color: NAVY }}>
                Medical attention required
              </label>
            </div>

            {medicalAttention && (
              <div>
                <label className={labelClass} style={labelStyle}>Medical Facility Name</label>
                <input
                  type="text"
                  value={medicalFacility}
                  onChange={(e) => setMedicalFacility(e.target.value)}
                  placeholder="e.g. Cedars-Sinai, Urgent Care on 5th Ave"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Submit ──────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={() => navigate('/safety/incidents')}
            className="px-4 py-2 text-sm font-medium rounded-xl border transition-colors hover:bg-[#FAF7F0]"
            style={{ borderColor: CARD_BORDER, color: NAVY }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-6 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ background: '#DC2626' }}
          >
            Submit Incident Report
          </button>
        </div>
      </form>
    </div>
  );
}
