import React, { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────

export interface ScenarioField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'date' | 'select' | 'textarea';
  options?: string[];
  required: boolean;
}

export interface Scenario {
  id: string;
  category: string;
  icon: string;
  label: string;
  description: string;
  contextFields: ScenarioField[];
  aiPromptModifier: string;
}

// ── Scenario Catalog ───────────────────────────────────

export const SCENARIOS: Scenario[] = [
  // ── RISK SCENARIOS ────────────────────────────────────
  {
    id: 'failed_inspection_recovery',
    category: 'Risk Scenarios',
    icon: '\u26A0\uFE0F',
    label: 'Failed Inspection \u2014 Cost of Inaction',
    description: 'What happens if violations from a failed inspection are not resolved before reinspection.',
    contextFields: [
      { key: 'location',        label: 'Location That Failed',        placeholder: 'e.g. University Dining',            type: 'text',     required: true },
      { key: 'violationType',   label: 'Violation Type',              placeholder: '',                                  type: 'select',   required: true,
        options: ['Food Safety \u2014 Major Violation', 'Food Safety \u2014 Multiple Minor Violations', 'Fire Safety \u2014 NFPA 96 (2024) Non-Compliance', 'Both Food and Fire Safety', 'Permit / Documentation'] },
      { key: 'reinspectionDate',label: 'Reinspection Date',           placeholder: 'Select date',                       type: 'date',     required: true },
      { key: 'dailyRevenue',    label: 'Daily Revenue at This Location', placeholder: 'e.g. 2500',                      type: 'text',     required: true },
    ],
    aiPromptModifier: `RISK SCENARIO: FAILED INSPECTION \u2014 COST OF INACTION.
Location: {location}. Violation: {violationType}. Reinspection: {reinspectionDate}. Daily revenue: {dailyRevenue}.

Present THREE escalating cost-of-inaction pathways if violations are NOT resolved:

PATHWAY 1 \u2014 CLOSURE: Daily revenue \u00D7 estimated closure days (3\u201314 days). Include reinspection fees, staff wages, vendor penalties.
PATHWAY 2 \u2014 ENFORCEMENT ESCALATION: Fines, mandatory compliance plan, 12-month increased inspection frequency, permit revocation risk, legal fees.
PATHWAY 3 \u2014 INSURANCE AND REPUTATION: Expired violations at time of covered incident give carrier grounds to contest claim. Public posting of scores. Revenue impact from reputation.

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
      { key: 'dailyRevenue',      label: 'Combined Daily Revenue \u2014 Affected Locations', placeholder: 'e.g. 5000',    type: 'text',   required: false },
    ],
    aiPromptModifier: `RISK SCENARIO: PERMIT EXPIRATION CASCADE.
Permits expiring: {expiringPermits}. Days until earliest expiry: {daysUntilExpiry}. Locations: {affectedLocations}. Daily revenue: {dailyRevenue}.

THREE escalating risk levels:

LEVEL 1 \u2014 INSPECTION CATCH: AHJ finds expired documentation. Specific consequences by document type: expired health permit = closure notice; expired hood cleaning certificate = Fire Safety FAIL + AHJ notice; expired suppression inspection = Fire Safety FAIL. Compounded multi-fail impact.

LEVEL 2 \u2014 ENFORCEMENT ACTION: If operator does not proactively address. Fines + closure duration + remediation + documentation to reopen + inspection fee cascade.

LEVEL 3 \u2014 INSURANCE EXPOSURE: Expired permits at time of covered incident (fire, illness, injury) give carrier grounds to contest. Calculate as percentage of coverage value. Reference NFPA 96 (2024) Table 12.4 for hood cleaning certificate requirements.

For each level: probability, timeline, single action that breaks the cascade.`,
  },
  {
    id: 'deferred_maintenance',
    category: 'Risk Scenarios',
    icon: '\uD83D\uDD27',
    label: 'Deferred Maintenance Compounding',
    description: 'The real cost of delaying hood cleaning, fan service, or roof containment by 6\u201312 months.',
    contextFields: [
      { key: 'deferredService', label: 'Service Being Deferred', placeholder: '', type: 'select', required: true,
        options: ['Hood & Duct Cleaning \u2014 past NFPA 96 (2024) Table 12.4 schedule', 'Fan Performance Management \u2014 12+ months no service', 'Filter Exchange \u2014 filters washed on-site', 'Rooftop Grease Containment \u2014 no system installed', 'Multiple services deferred'] },
      { key: 'monthsDeferred',  label: 'Months Since Last Service (or Never)', placeholder: 'e.g. 18',       type: 'text',   required: true },
      { key: 'dailyRevenue',    label: 'Average Daily Revenue',                placeholder: 'e.g. 3000',     type: 'text',   required: false },
      { key: 'propertyValue',   label: 'Building / Leasehold Value',           placeholder: 'e.g. 400000',   type: 'text',   required: false },
    ],
    aiPromptModifier: `RISK SCENARIO: DEFERRED MAINTENANCE COMPOUNDING.
Service deferred: {deferredService}. Months deferred: {monthsDeferred}. Daily revenue: {dailyRevenue}. Property value: {propertyValue}.

THREE time horizons:

30-DAY: Specific immediate risk \u2014 AHJ visit probability, equipment failure probability, incident probability. Cost to resolve NOW vs. cost if incident occurs in 30 days.

90-DAY: How does deferral compound? Additional cleaning cost from buildup (hood/filter). Increased fan failure probability (fan service). Additional membrane degradation (rooftop). Dollar difference between acting now vs. 90 days.

12-MONTH: Full annual cost of continued deferral \u2014 additional service frequency to return to compliance, equipment replacement probability, insurance premium impact, regulatory exposure. Compare to annual cost if maintained on schedule. Reference NFPA 96 (2024) Table 12.4 for hood cleaning intervals.

End with specific breakeven: when does cost of deferral exceed cost of the service?`,
  },

  // ── BUSINESS DEVELOPMENT ──────────────────────────────
  {
    id: 'contract_renewal',
    category: 'Business Development',
    icon: '\uD83D\uDCCB',
    label: 'Contract Renewal / Bid',
    description: 'Preparing to renew an existing contract or submit a bid for a new account.',
    contextFields: [
      { key: 'client', label: 'Client / Account Name', placeholder: 'e.g. Aramark, Compass Group, County School District', type: 'text', required: true },
      { key: 'renewalDate', label: 'Renewal / Bid Deadline', placeholder: 'Select date', type: 'date', required: true },
      { key: 'contractValue', label: 'Estimated Contract Value', placeholder: 'e.g. $2.4M annually', type: 'text', required: false },
      { key: 'requirements', label: 'Known Client Requirements', placeholder: 'e.g. All locations must have clean health inspections, zero fire violations, HACCP plans on file', type: 'textarea', required: false },
    ],
    aiPromptModifier: `The user is preparing for a CONTRACT RENEWAL or BID with a specific client. This is a business development scenario. Your analysis must:
    - Lead with the current compliance posture as it would appear to the prospective client
    - Identify every compliance gap that could jeopardize the bid or give the client leverage to negotiate lower rates
    - Quantify the risk of losing the contract due to compliance issues
    - Provide a prioritized action list to strengthen the compliance posture before the deadline
    - End with a "Contract Readiness Score" narrative \u2014 not a number, but a qualitative assessment of readiness
    The client they are pitching is: {client}. Deadline: {renewalDate}. Contract value: {contractValue}. Client requirements: {requirements}.`,
  },
  {
    id: 'insurance_renewal',
    category: 'Financial',
    icon: '\uD83D\uDEE1\uFE0F',
    label: 'Insurance Renewal / Audit',
    description: 'Insurance policy renewal or carrier audit is approaching.',
    contextFields: [
      { key: 'carrier', label: 'Insurance Carrier', placeholder: 'e.g. Zurich, Hartford, CNA', type: 'text', required: false },
      { key: 'renewalDate', label: 'Renewal Date', placeholder: 'Select date', type: 'date', required: true },
      { key: 'currentPremium', label: 'Current Annual Premium', placeholder: 'e.g. $48,000', type: 'text', required: false },
      { key: 'coverageType', label: 'Coverage Type', placeholder: '', type: 'select', options: ['General Liability', 'Property + Liability', 'Umbrella', 'Full Commercial Package', 'Other'], required: false },
      { key: 'priorClaims', label: 'Any Prior Claims in Last 3 Years?', placeholder: 'Describe briefly or type None', type: 'text', required: false },
    ],
    aiPromptModifier: `The user is preparing for an INSURANCE RENEWAL or CARRIER AUDIT. Your analysis must:
    - Frame compliance posture specifically in terms of underwriting risk \u2014 what will a carrier see in this data?
    - Identify which compliance gaps are most likely to result in premium increases or coverage denials
    - Highlight the locations and issues that represent the highest liability exposure to the carrier
    - Quantify the potential premium impact of unresolved compliance issues vs. the cost of resolving them
    - Provide documentation strategy \u2014 what evidence EvidLY can provide to support favorable underwriting
    - Suggest specific talking points for the broker meeting
    Carrier: {carrier}. Renewal date: {renewalDate}. Current premium: {currentPremium}. Prior claims: {priorClaims}.`,
  },
  {
    id: 'acquisition_dd',
    category: 'M&A / Growth',
    icon: '\uD83D\uDD0D',
    label: 'Acquisition Due Diligence',
    description: 'Company is being acquired or acquiring another operation. Compliance data is under scrutiny.',
    contextFields: [
      { key: 'ddType', label: 'Due Diligence Type', placeholder: '', type: 'select', options: ['Being Acquired (Sell-Side)', 'Acquiring (Buy-Side)', 'Investment / Funding Round', 'Partnership / Joint Venture'], required: true },
      { key: 'acquirerName', label: 'Acquirer / Investor Name', placeholder: 'e.g. Private Equity firm, Strategic buyer (optional)', type: 'text', required: false },
      { key: 'closingDate', label: 'Expected Close Date', placeholder: 'Select date', type: 'date', required: false },
      { key: 'dealValue', label: 'Estimated Deal Value', placeholder: 'e.g. $12M', type: 'text', required: false },
      { key: 'concerns', label: 'Known Concerns / Red Flags', placeholder: 'e.g. Two locations had closure notices in prior 2 years', type: 'textarea', required: false },
    ],
    aiPromptModifier: `The user is preparing for ACQUISITION DUE DILIGENCE. This is a high-stakes scenario. Your analysis must:
    - Assess compliance posture from the perspective of an acquirer's legal and operational due diligence team
    - Identify every compliance issue that could reduce valuation, trigger indemnification clauses, or derail the deal
    - Highlight locations or issues that represent contingent liabilities the acquirer will need to price in
    - Quantify the total compliance risk that could be subtracted from the deal valuation
    - Provide a "clean-up" roadmap \u2014 what to resolve before close to maximize valuation
    - Note what EvidLY's documentation trail provides in terms of compliance history and audit trail value
    DD type: {ddType}. Acquirer: {acquirerName}. Close date: {closingDate}. Deal value: {dealValue}. Known concerns: {concerns}.`,
  },
  {
    id: 'post_incident',
    category: 'Crisis Management',
    icon: '\uD83D\uDEA8',
    label: 'Post-Incident Recovery',
    description: 'A food safety incident, fire, closure notice, or regulatory action has occurred.',
    contextFields: [
      { key: 'incidentType', label: 'Incident Type', placeholder: '', type: 'select', options: ['Failed Health Inspection', 'Foodborne Illness Complaint', 'Temporary Closure Notice', 'Fire / Fire Safety Violation', 'NFPA Non-Compliance Notice', 'Regulatory Warning Letter', 'Insurance Claim Filed', 'Media / Public Incident'], required: true },
      { key: 'location', label: 'Affected Location(s)', placeholder: 'Which location(s) were affected?', type: 'text', required: true },
      { key: 'incidentDate', label: 'Incident Date', placeholder: 'Select date', type: 'date', required: true },
      { key: 'currentStatus', label: 'Current Status', placeholder: 'e.g. Reinspection scheduled for March 1, closure lifted, under investigation', type: 'textarea', required: true },
      { key: 'regulatoryContact', label: 'Regulatory Agency Involved', placeholder: 'e.g. Stanislaus County DER, Modesto Fire Marshal', type: 'text', required: false },
    ],
    aiPromptModifier: `The user is managing POST-INCIDENT RECOVERY. This is a crisis management scenario. Your analysis must:
    - Lead with a clear-eyed assessment of the current compliance risk at the affected location(s) and what it means for the organization
    - Identify the minimum actions required to achieve compliance before reinspection, with urgency ranking
    - Analyze whether other locations show similar risk patterns that could indicate a systemic issue vs. isolated incident
    - Provide a regulatory communication strategy \u2014 what documentation to prepare, what posture to take with the agency
    - Assess reputational and financial exposure if the incident becomes public or escalates
    - Create a 30-day recovery roadmap with specific milestones
    Incident type: {incidentType}. Location(s): {location}. Date: {incidentDate}. Current status: {currentStatus}. Agency: {regulatoryContact}.`,
  },
  {
    id: 'new_location',
    category: 'Operations',
    icon: '\uD83C\uDFD7\uFE0F',
    label: 'New Location Opening',
    description: 'Opening a new location and need to establish compliance baseline.',
    contextFields: [
      { key: 'locationName', label: 'New Location Name', placeholder: 'e.g. Fresno Stadium Concessions', type: 'text', required: true },
      { key: 'jurisdiction', label: 'Jurisdiction / County', placeholder: 'e.g. Fresno County, City of Fresno', type: 'text', required: true },
      { key: 'openDate', label: 'Target Opening Date', placeholder: 'Select date', type: 'date', required: true },
      { key: 'cuisineType', label: 'Operation Type', placeholder: '', type: 'select', options: ['Full Service Restaurant', 'Fast Casual', 'Cafeteria / Institutional', 'Concessions', 'Catering', 'Food Truck', 'Ghost Kitchen', 'Healthcare / Senior Living', 'K-12 School', 'University / College'], required: true },
      { key: 'staffCount', label: 'Expected Staff Count', placeholder: 'e.g. 25 FT, 15 PT', type: 'text', required: false },
    ],
    aiPromptModifier: `The user is OPENING A NEW LOCATION. Your analysis must:
    - Use the existing locations' compliance patterns to predict likely compliance challenges at the new location
    - Identify jurisdiction-specific requirements for {jurisdiction} that the new location must meet from day one
    - Create a pre-opening compliance checklist prioritized by inspection risk
    - Analyze staffing patterns at existing locations to recommend hiring and training strategy
    - Identify the permits, certifications, and documentation that must be in place before opening
    - Provide a 90-day compliance ramp-up plan for the new location
    New location: {locationName}. Jurisdiction: {jurisdiction}. Opening date: {openDate}. Operation type: {cuisineType}. Staff: {staffCount}.`,
  },
  {
    id: 'seasonal_surge',
    category: 'Operations',
    icon: '\uD83D\uDCC8',
    label: 'Seasonal Volume Surge',
    description: 'Preparing for high-volume period \u2014 summer, holidays, school year start, special events.',
    contextFields: [
      { key: 'seasonType', label: 'Surge Type', placeholder: '', type: 'select', options: ['Summer Peak', 'Holiday Season', 'School Year Start', 'Special Event', 'Catering Contract', 'Tourism Season', 'Other'], required: true },
      { key: 'startDate', label: 'Surge Start Date', placeholder: 'Select date', type: 'date', required: true },
      { key: 'endDate', label: 'Surge End Date', placeholder: 'Select date', type: 'date', required: false },
      { key: 'volumeIncrease', label: 'Expected Volume Increase', placeholder: 'e.g. 40% more covers, 3\u00D7 meal volume', type: 'text', required: false },
      { key: 'additionalStaff', label: 'Additional Staff Being Hired?', placeholder: 'e.g. 15 seasonal hires across 2 locations', type: 'text', required: false },
    ],
    aiPromptModifier: `The user is preparing for a SEASONAL VOLUME SURGE. Your analysis must:
    - Assess which locations are most at risk of compliance breakdown under increased volume based on current data
    - Identify the specific compliance areas (temperature logs, checklists, food handling) most likely to fail under surge conditions
    - Analyze the staffing correlation data \u2014 which locations have turnover patterns that will be amplified by seasonal hiring?
    - Create a pre-surge compliance hardening plan: what to fix, train, and document before volume increases
    - Recommend monitoring frequency increases during the surge period
    - Identify the regulatory risk of a failed inspection during peak volume vs. slow period
    Surge type: {seasonType}. Start: {startDate}. Volume increase: {volumeIncrease}. Additional staff: {additionalStaff}.`,
  },
  {
    id: 'board_presentation',
    category: 'Executive',
    icon: '\uD83D\uDCCA',
    label: 'Board / Investor Presentation',
    description: 'Presenting compliance posture to board of directors, investors, or lenders.',
    contextFields: [
      { key: 'audienceType', label: 'Audience', placeholder: '', type: 'select', options: ['Board of Directors', 'Private Equity Investors', 'Lenders / Bank', 'Franchisor', 'Corporate Parent', 'Government Procurement'], required: true },
      { key: 'presentationDate', label: 'Presentation Date', placeholder: 'Select date', type: 'date', required: true },
      { key: 'primaryMessage', label: 'Primary Message You Want to Convey', placeholder: 'e.g. We have strong compliance infrastructure, we are acquisition-ready, we deserve a higher credit rating', type: 'textarea', required: false },
      { key: 'concerns', label: 'Known Concerns the Audience Has', placeholder: 'e.g. Board is worried about the University Dining location, investors want to see consistency across all sites', type: 'textarea', required: false },
    ],
    aiPromptModifier: `The user is preparing a BOARD OR INVESTOR PRESENTATION on compliance posture. Your analysis must:
    - Frame compliance data as a business asset and competitive advantage, not a cost or burden
    - Lead with organizational strengths \u2014 what is working well and why it matters to this audience
    - Acknowledge weaknesses briefly and present a credible remediation narrative
    - Quantify the financial value of EvidLY's compliance infrastructure (risk avoided, savings generated)
    - Provide 3 key talking points the user should emphasize to this specific audience type: {audienceType}
    - Address known concerns directly with data: {concerns}
    - Suggest how to present the compliance data visually for maximum boardroom impact
    Audience: {audienceType}. Presentation date: {presentationDate}. Primary message: {primaryMessage}.`,
  },
  {
    id: 'custom',
    category: 'Custom',
    icon: '\u270F\uFE0F',
    label: 'Custom Scenario',
    description: 'Describe your specific situation and get tailored intelligence.',
    contextFields: [
      { key: 'scenario', label: 'Describe Your Situation', placeholder: 'Be as specific as possible. Include: what is happening, who is involved, what the deadline or trigger event is, and what outcome you need.', type: 'textarea', required: true },
      { key: 'industry', label: 'Your Industry / Segment', placeholder: 'e.g. Healthcare foodservice, K-12 nutrition, Casino hospitality, University dining, Corrections foodservice', type: 'text', required: false },
      { key: 'urgency', label: 'Urgency', placeholder: '', type: 'select', options: ['Immediate (within 48 hours)', 'Urgent (within 1 week)', 'Important (within 1 month)', 'Planning ahead (1-3 months)'], required: true },
      { key: 'outcome', label: 'Desired Outcome', placeholder: 'What does success look like? e.g. Pass reinspection, close the contract, reduce insurance premium, satisfy investor concerns', type: 'text', required: true },
    ],
    aiPromptModifier: `The user has a CUSTOM SCENARIO. Read their specific situation carefully and generate a completely tailored intelligence brief.
    Situation: {scenario}
    Industry segment: {industry}
    Urgency: {urgency}
    Desired outcome: {outcome}

    Your analysis must:
    - Address their specific situation directly \u2014 not generic compliance advice
    - Use their compliance data to assess whether they can achieve their desired outcome and what stands in the way
    - Provide a prioritized action plan specific to their timeline and urgency level
    - Identify risks they may not have considered given their situation
    - End with a direct answer: "Based on your current compliance posture, here is what you need to know to achieve [outcome]."`,
  },
];

// ── Session persistence key ────────────────────────────

const SESSION_KEY = 'evidly_active_scenario';

// ── Component ──────────────────────────────────────────

interface ScenarioEngineProps {
  onScenarioChange: (scenario: Scenario | null, fieldValues: Record<string, string>) => void;
}

export const ScenarioEngine: React.FC<ScenarioEngineProps> = ({ onScenarioChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const { scenario, fields } = JSON.parse(stored);
        setSelectedScenario(scenario);
        setFieldValues(fields);
        setApplied(true);
        onScenarioChange(scenario, fields);
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  const handleScenarioSelect = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setFieldValues({});
    setApplied(false);
  };

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    if (!selectedScenario) return;
    // Validate required fields
    const missing = selectedScenario.contextFields.filter(f => f.required && !fieldValues[f.key]?.trim());
    if (missing.length > 0) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      scenario: selectedScenario,
      fields: fieldValues,
      appliedAt: new Date().toISOString(),
    }));
    onScenarioChange(selectedScenario, fieldValues);
    setApplied(true);
  };

  const handleClear = () => {
    setSelectedScenario(null);
    setFieldValues({});
    setApplied(false);
    sessionStorage.removeItem(SESSION_KEY);
    onScenarioChange(null, {});
  };

  const requiredFieldsFilled = selectedScenario
    ? selectedScenario.contextFields.filter(f => f.required).every(f => fieldValues[f.key]?.trim())
    : false;

  const categories = [...new Set(SCENARIOS.map(s => s.category))];

  const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";

  return (
    <div style={{
      background: '#FFFFFF',
      border: applied ? '1px solid #A08C5A' : '1px solid #D1D9E6',
      borderRadius: '12px',
      padding: '0',
      marginBottom: '20px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      {/* Header — always visible, toggles expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>{'\u26A1'}</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{
              color: applied ? '#A08C5A' : '#0B1628',
              fontSize: '14px', fontWeight: 700, margin: 0,
              fontFamily: F,
            }}>
              {applied && selectedScenario
                ? `Scenario Active: ${selectedScenario.label}`
                : 'Scenario Intelligence Engine'
              }
            </p>
            <p style={{
              color: '#3D5068', fontSize: '11px', margin: '2px 0 0',
              fontFamily: F,
            }}>
              {applied
                ? 'AI briefings are customized to your scenario. Click to modify.'
                : 'Analyze your compliance posture through a specific business lens \u2014 contract renewal, insurance audit, board presentation, and more'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {applied && (
            <>
              <span style={{
                background: '#A08C5A', borderRadius: '10px', padding: '2px 10px',
                color: '#ffffff', fontSize: '11px', fontWeight: 700,
                fontFamily: F,
              }}>
                Scenario Active
              </span>
              <span
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                style={{
                  background: 'transparent',
                  border: '1px solid #D1D9E6',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  color: '#3D5068',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: F,
                }}
              >
                Clear
              </span>
            </>
          )}
          <span style={{ color: '#3D5068', fontSize: '16px' }}>
            {expanded ? '\u25B2' : '\u25BC'}
          </span>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid #D1D9E6', padding: '20px' }}>
          {/* Scenario grid — shown when no scenario is selected */}
          {!selectedScenario && (
            <>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: '16px' }}>
                  <p style={{
                    color: '#3D5068', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '1px',
                    margin: '0 0 8px',
                    fontFamily: F,
                  }}>
                    {cat}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {SCENARIOS.filter(s => s.category === cat).map(scenario => (
                      <button
                        key={scenario.id}
                        onClick={() => handleScenarioSelect(scenario)}
                        style={{
                          background: '#EEF1F7',
                          border: '1px solid #D1D9E6',
                          borderRadius: '8px',
                          padding: '12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#A08C5A')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#D1D9E6')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px' }}>{scenario.icon}</span>
                          <span style={{
                            color: '#0B1628', fontSize: '12px', fontWeight: 600,
                            fontFamily: F,
                          }}>
                            {scenario.label}
                          </span>
                        </div>
                        <p style={{
                          color: '#3D5068', fontSize: '11px', margin: 0, lineHeight: 1.4,
                          fontFamily: F,
                        }}>
                          {scenario.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Selected scenario — context form */}
          {selectedScenario && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <button
                  onClick={() => { setSelectedScenario(null); setFieldValues({}); }}
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#3D5068', cursor: 'pointer', fontSize: '14px', padding: '0',
                  }}
                >
                  {'\u2190'} Back
                </button>
                <span style={{ fontSize: '16px' }}>{selectedScenario.icon}</span>
                <p style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: 0, fontFamily: F }}>
                  {selectedScenario.label}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {selectedScenario.contextFields.map(field => (
                  <div
                    key={field.key}
                    style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}
                  >
                    <label style={{
                      display: 'block',
                      color: '#3D5068', fontSize: '11px', fontWeight: 600,
                      marginBottom: '4px',
                      fontFamily: F,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {field.label}
                      {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={fieldValues[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        style={{
                          width: '100%', background: '#FFFFFF',
                          border: '1px solid #D1D9E6', borderRadius: '6px',
                          padding: '8px 10px', color: '#0B1628',
                          fontSize: '12px', fontFamily: F,
                        }}
                      >
                        <option value="">Select...</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={fieldValues[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        style={{
                          width: '100%', background: '#FFFFFF',
                          border: '1px solid #D1D9E6', borderRadius: '6px',
                          padding: '8px 10px', color: '#0B1628',
                          fontSize: '12px', fontFamily: F,
                          resize: 'vertical', boxSizing: 'border-box' as const,
                        }}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={fieldValues[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        style={{
                          width: '100%', background: '#FFFFFF',
                          border: '1px solid #D1D9E6', borderRadius: '6px',
                          padding: '8px 10px', color: '#0B1628',
                          fontSize: '12px', fontFamily: F,
                          boxSizing: 'border-box' as const,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setSelectedScenario(null); setFieldValues({}); }}
                  style={{
                    background: 'transparent', border: '1px solid #D1D9E6',
                    borderRadius: '6px', padding: '8px 16px',
                    color: '#3D5068', fontSize: '12px', cursor: 'pointer',
                    fontFamily: F,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleApply(); setExpanded(false); }}
                  disabled={!requiredFieldsFilled}
                  style={{
                    background: requiredFieldsFilled ? '#A08C5A' : '#D1D9E6',
                    border: 'none',
                    borderRadius: '6px', padding: '8px 20px',
                    color: requiredFieldsFilled ? '#ffffff' : '#3D5068',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: requiredFieldsFilled ? 'pointer' : 'not-allowed',
                    fontFamily: F,
                  }}
                >
                  {'\uD83C\uDFAF'} Analyze This Scenario
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
