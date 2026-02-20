import { useState } from 'react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────

interface ContextField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'select' | 'date';
  required: boolean;
  options?: string[];
}

interface Scenario {
  id: string;
  category: string;
  icon: string;
  label: string;
  description: string;
  contextFields: ContextField[];
  aiPromptModifier: string;
}

// ── Scenarios ──────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: 'failed_inspection_recovery',
    category: 'Risk Scenarios',
    icon: '\u26A0\uFE0F',
    label: 'Failed Inspection — Cost of Inaction',
    description: 'What happens if violations from a failed inspection are not resolved before reinspection.',
    contextFields: [
      { key: 'location',        label: 'Location That Failed',        placeholder: 'e.g. University Dining',            type: 'text',     required: true },
      { key: 'violationType',   label: 'Violation Type',              placeholder: '',                                  type: 'select',   required: true,
        options: ['Food Safety — Major Violation', 'Food Safety — Multiple Minor Violations', 'Fire Safety — NFPA 96 (2024) Non-Compliance', 'Both Food and Fire Safety', 'Permit / Documentation'] },
      { key: 'reinspectionDate',label: 'Reinspection Date',           placeholder: 'Select date',                       type: 'date',     required: true },
      { key: 'dailyRevenue',    label: 'Daily Revenue at This Location', placeholder: 'e.g. 2500',                      type: 'text',     required: true },
    ],
    aiPromptModifier: `RISK SCENARIO: FAILED INSPECTION — COST OF INACTION.
Location: {location}. Violation: {violationType}. Reinspection: {reinspectionDate}. Daily revenue: {dailyRevenue}.

Present THREE escalating cost-of-inaction pathways if violations are NOT resolved:

PATHWAY 1 — CLOSURE: Daily revenue x estimated closure days (3–14 days). Include reinspection fees, staff wages, vendor penalties.
PATHWAY 2 — ENFORCEMENT ESCALATION: Fines, mandatory compliance plan, 12-month increased inspection frequency, permit revocation risk, legal fees.
PATHWAY 3 — INSURANCE AND REPUTATION: Expired violations at time of covered incident give carrier grounds to contest claim. Public posting of scores. Revenue impact from reputation.

For each pathway: dollar range, probability, timeline, and single action that prevents it. End with: cost to resolve today vs. cost of each scenario.`,
  },

  {
    id: 'permit_expiration_cascade',
    category: 'Risk Scenarios',
    icon: '\uD83D\uDCC5',
    label: 'Permit Expiration Cascade',
    description: 'What happens when multiple permits expire in the same 30-day window.',
    contextFields: [
      { key: 'expiringPermits',   label: 'Which Permits Are Expiring?',             placeholder: 'e.g. Health Permit, Hood Cleaning Certificate, Fire Suppression Inspection', type: 'textarea', required: true },
      { key: 'daysUntilExpiry',   label: 'Days Until Earliest Expiration',          placeholder: 'e.g. 14',          type: 'text',   required: true },
      { key: 'affectedLocations', label: 'Affected Location(s)',                    placeholder: 'e.g. Airport Cafe', type: 'text',   required: true },
      { key: 'dailyRevenue',      label: 'Combined Daily Revenue — Affected Locations', placeholder: 'e.g. 5000',    type: 'text',   required: false },
    ],
    aiPromptModifier: `RISK SCENARIO: PERMIT EXPIRATION CASCADE.
Permits expiring: {expiringPermits}. Days until earliest expiry: {daysUntilExpiry}. Locations: {affectedLocations}. Daily revenue: {dailyRevenue}.

THREE escalating risk levels:

LEVEL 1 — INSPECTION CATCH: AHJ finds expired documentation. Specific consequences by document type: expired health permit = closure notice; expired hood cleaning certificate = Fire Safety FAIL + AHJ notice; expired suppression inspection = Fire Safety FAIL. Compounded multi-fail impact.

LEVEL 2 — ENFORCEMENT ACTION: If operator does not proactively address. Fines + closure duration + remediation + documentation to reopen + inspection fee cascade.

LEVEL 3 — INSURANCE EXPOSURE: Expired permits at time of covered incident (fire, illness, injury) give carrier grounds to contest. Calculate as percentage of coverage value. Reference NFPA 96 (2024) Table 12.4 for hood cleaning certificate requirements.

For each level: probability, timeline, single action that breaks the cascade.`,
  },

  {
    id: 'deferred_maintenance',
    category: 'Risk Scenarios',
    icon: '\uD83D\uDD27',
    label: 'Deferred Maintenance Compounding',
    description: 'The real cost of delaying hood cleaning, fan service, or roof containment by 6–12 months.',
    contextFields: [
      { key: 'deferredService', label: 'Service Being Deferred', placeholder: '', type: 'select', required: true,
        options: ['Hood & Duct Cleaning — past NFPA 96 (2024) Table 12.4 schedule', 'Fan Performance Management — 12+ months no service', 'Filter Exchange — filters washed on-site', 'Rooftop Grease Containment — no system installed', 'Multiple services deferred'] },
      { key: 'monthsDeferred',  label: 'Months Since Last Service (or Never)', placeholder: 'e.g. 18',       type: 'text',   required: true },
      { key: 'dailyRevenue',    label: 'Average Daily Revenue',                placeholder: 'e.g. 3000',     type: 'text',   required: false },
      { key: 'propertyValue',   label: 'Building / Leasehold Value',           placeholder: 'e.g. 400000',   type: 'text',   required: false },
    ],
    aiPromptModifier: `RISK SCENARIO: DEFERRED MAINTENANCE COMPOUNDING.
Service deferred: {deferredService}. Months deferred: {monthsDeferred}. Daily revenue: {dailyRevenue}. Property value: {propertyValue}.

THREE time horizons:

30-DAY: Specific immediate risk — AHJ visit probability, equipment failure probability, incident probability. Cost to resolve NOW vs. cost if incident occurs in 30 days.

90-DAY: How does deferral compound? Additional cleaning cost from buildup (hood/filter). Increased fan failure probability (fan service). Additional membrane degradation (rooftop). Dollar difference between acting now vs. 90 days.

12-MONTH: Full annual cost of continued deferral — additional service frequency to return to compliance, equipment replacement probability, insurance premium impact, regulatory exposure. Compare to annual cost if maintained on schedule. Reference NFPA 96 (2024) Table 12.4 for hood cleaning intervals.

End with specific breakeven: when does cost of deferral exceed cost of the service?`,
  },
];

// ── Component ──────────────────────────────────────────

export const ScenarioEngine: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const selected = SCENARIOS.find(s => s.id === selectedId);

  const updateInput = (key: string, value: string) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const runScenario = () => {
    if (!selected) return;
    const missing = selected.contextFields.filter(f => f.required && !inputs[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    toast.info('Scenario analysis requires EvidLY AI Advisor — available on Professional plan');
  };

  const categories = [...new Set(SCENARIOS.map(s => s.category))];

  return (
    <div style={{
      background: '#1E2D4D', border: '1px solid #334155',
      borderRadius: '12px', padding: '20px', marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '18px' }}>{'\u26A1'}</span>
        <div>
          <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>
            Risk Scenario Engine
          </p>
          <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
            Model specific risk scenarios with your actual numbers
          </p>
        </div>
      </div>

      {/* Scenario cards */}
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: '12px' }}>
          <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px', fontFamily: 'system-ui' }}>
            {cat}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
            {SCENARIOS.filter(s => s.category === cat).map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedId(selectedId === s.id ? null : s.id); setInputs({}); }}
                style={{
                  background: selectedId === s.id ? '#0f172a' : '#1e293b',
                  border: `1px solid ${selectedId === s.id ? '#A08C5A' : '#334155'}`,
                  borderRadius: '8px', padding: '12px', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>{s.icon}</span>
                  <p style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{s.label}</p>
                </div>
                <p style={{ color: '#64748b', fontSize: '11px', margin: 0, fontFamily: 'system-ui' }}>{s.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Selected scenario input form */}
      {selected && (
        <div style={{
          background: '#0f172a', border: '1px solid #A08C5A40',
          borderRadius: '10px', padding: '16px', marginTop: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px' }}>{selected.icon}</span>
            <div>
              <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{selected.label}</p>
              <p style={{ color: '#64748b', fontSize: '11px', margin: '1px 0 0', fontFamily: 'system-ui' }}>{selected.description}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {selected.contextFields.map(field => (
              <div key={field.key} style={field.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                <label style={{
                  color: '#94a3b8', fontSize: '10px', fontWeight: 700, display: 'block',
                  marginBottom: '3px', fontFamily: 'system-ui', textTransform: 'uppercase',
                }}>
                  {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={inputs[field.key] || ''}
                    onChange={e => updateInput(field.key, e.target.value)}
                    style={{
                      width: '100%', background: '#1e293b', border: '1px solid #334155',
                      borderRadius: '6px', padding: '8px 10px', color: '#ffffff',
                      fontSize: '12px', fontFamily: 'system-ui',
                    }}
                  >
                    <option value="">Select...</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={inputs[field.key] || ''}
                    onChange={e => updateInput(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={2}
                    style={{
                      width: '100%', background: '#1e293b', border: '1px solid #334155',
                      borderRadius: '6px', padding: '8px 10px', color: '#ffffff',
                      fontSize: '12px', fontFamily: 'system-ui', resize: 'vertical',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={inputs[field.key] || ''}
                    onChange={e => updateInput(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%', background: '#1e293b', border: '1px solid #334155',
                      borderRadius: '6px', padding: '8px 10px', color: '#ffffff',
                      fontSize: '12px', fontFamily: 'system-ui', boxSizing: 'border-box' as const,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={runScenario}
            style={{
              background: '#A08C5A', border: 'none', borderRadius: '6px',
              padding: '10px 20px', color: '#ffffff', fontSize: '12px',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui',
            }}
          >
            Run Scenario Analysis &rarr;
          </button>
        </div>
      )}
    </div>
  );
};
