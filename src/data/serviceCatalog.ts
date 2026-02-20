export interface ServiceProvider {
  id: string;
  name: string;
  phone: string;
  serviceArea: string;
  evidlyPartner: boolean;
  tagline: string;
}

export interface CostDriver {
  id: string;
  label: string;
  inputType: 'number' | 'select' | 'currency';
  unit: string;
  placeholder: string;
  options?: string[];
  helpText: string;
}

export interface RiskCalculation {
  riskLabel: string;
  formula: string;
  regulatoryBasis: string;
  probability: 'High' | 'Medium' | 'Low';
  calculate: (inputs: Record<string, number>) => { low: number; high: number };
}

export interface ServiceLine {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  nfpaReference: string;
  additionalRegs: string[];
  frequency: string;
  businessBenefit: string;
  operationalImpact: string;
  whyOperatorsSkipIt: string;
  rebuttal: string;
  complianceConsequence: string;
  costDrivers: CostDriver[];
  riskCalculations: RiskCalculation[];
}

export const CPP: ServiceProvider = {
  id: 'cpp',
  name: 'Cleaning Pros Plus',
  phone: '(209) 636-6116',
  serviceArea: 'Central Valley & NorCal',
  evidlyPartner: true,
  tagline: 'IKECA-Certified · Documented · EvidLY-Integrated',
};

export const CPP_SERVICES: ServiceLine[] = [

  // ──────────────────────────────────────────────────────
  // 1. HOOD & DUCT CLEANING
  // ──────────────────────────────────────────────────────
  {
    id: 'hood_cleaning',
    name: 'Hood & Duct Cleaning',
    shortDescription: 'NFPA 96 (2024) Table 12.4 compliant exhaust system cleaning with IKECA-certified documentation',
    fullDescription: `Complete cleaning of hood filters, plenum, ducts, and fans per NFPA 96 (2024) Table 12.4 frequency schedules. Includes before/after photography, grease weight documentation, IKECA-certified service certificate, and automatic upload to your EvidLY fire safety record.`,
    nfpaReference: 'NFPA 96 (2024) Table 12.4',
    additionalRegs: [
      'NFPA 96 (2024) Chapter 11 — Procedures for the Use of the System',
      'California Fire Code §904.12',
      'CalCode §114149.1',
    ],
    frequency: 'Monthly, Quarterly, Semi-Annual, or Annual — per NFPA 96 (2024) Table 12.4 based on cooking type and volume',
    businessBenefit: `Hood cleaning is not just a compliance checkbox — it is the foundation of kitchen fire safety. A clean duct system means lower fire risk, lower insurance premiums, and a certificate that protects you when the AHJ or insurance adjuster comes calling. Operators with documented NFPA 96 cleaning history have a measurable advantage in claim disputes.`,
    operationalImpact: `Expired or missing certificate = immediate Fire Safety FAIL in EvidLY. AHJ can issue a closure notice without warning. Insurance carriers can deny fire claims when NFPA 96 maintenance records are absent at the time of loss — turning a covered event into a total business loss.`,
    whyOperatorsSkipIt: `"It looks clean" or extending intervals past NFPA 96 Table 12.4 schedules to reduce costs.`,
    rebuttal: `Grease accumulation in ducts is invisible to the naked eye and irrelevant to inspection — what the AHJ checks is the certificate date and frequency. A duct that "looks fine" can carry significant grease buildup behind the baffle that ignites from a single flare-up. The certificate protects you legally and financially even more than the cleaning protects you physically.`,
    complianceConsequence: `No current certificate = Fire Safety FAIL in EvidLY and on AHJ inspection. Insurance policy may be voided for fire events occurring after certificate expiration.`,
    costDrivers: [
      {
        id: 'daily_revenue',
        label: 'Average Daily Revenue',
        inputType: 'currency',
        unit: 'per day',
        placeholder: '2500',
        helpText: 'Used to calculate lost revenue during closure or forced shutdown',
      },
      {
        id: 'num_hoods',
        label: 'Number of Hood Systems',
        inputType: 'number',
        unit: 'hoods',
        placeholder: '2',
        helpText: 'Each hood section requires separate cleaning documentation',
      },
      {
        id: 'cooking_type',
        label: 'Primary Cooking Type',
        inputType: 'select',
        unit: '',
        placeholder: '',
        options: [
          'Solid fuel (wood/charcoal) — Monthly required',
          'High-volume charbroiling — Monthly required',
          'Medium-volume charbroiling — Quarterly required',
          'Standard cooking — Semi-Annual required',
          'Low-volume / non-grease — Annual required',
        ],
        helpText: 'Determines required cleaning frequency per NFPA 96 (2024) Table 12.4',
      },
      {
        id: 'property_value',
        label: 'Estimated Building / Leasehold Value',
        inputType: 'currency',
        unit: 'total',
        placeholder: '500000',
        helpText: 'Used to calculate potential fire loss and insurance denial exposure',
      },
    ],
    riskCalculations: [
      {
        riskLabel: 'Closure revenue loss — AHJ shutdown for expired certificate',
        formula: 'Daily revenue × closure duration (3–10 days typical for certificate non-compliance)',
        regulatoryBasis: 'California Fire Code §904.12 — authority to close for NFPA 96 non-compliance',
        probability: 'High',
        calculate: (i) => ({ low: (i.daily_revenue || 0) * 3, high: (i.daily_revenue || 0) * 10 }),
      },
      {
        riskLabel: 'Insurance claim denial — fire event with expired certificate',
        formula: 'Property value × denial probability (10%–100% of loss depending on carrier)',
        regulatoryBasis: 'NFPA 96 (2024) Table 12.4 — standard insurer compliance requirement',
        probability: 'High',
        calculate: (i) => ({ low: (i.property_value || 0) * 0.10, high: (i.property_value || 0) * 1.0 }),
      },
      {
        riskLabel: 'Grease duct fire structural damage',
        formula: 'Property value × estimated fire damage (10%–50% depending on suppression response)',
        regulatoryBasis: 'NFPA 96 (2024) — grease accumulation as primary commercial kitchen fire cause',
        probability: 'Medium',
        calculate: (i) => ({ low: (i.property_value || 0) * 0.10, high: (i.property_value || 0) * 0.50 }),
      },
      {
        riskLabel: 'AHJ fine / penalty for non-compliant cleaning interval',
        formula: 'Fixed range — jurisdiction-specific, typically $250–$5,000 per violation',
        regulatoryBasis: 'California Fire Code §904.12',
        probability: 'Medium',
        calculate: () => ({ low: 250, high: 5000 }),
      },
    ],
  },

  // ──────────────────────────────────────────────────────
  // 2. FAN PERFORMANCE MANAGEMENT
  // ──────────────────────────────────────────────────────
  {
    id: 'fan_performance',
    name: 'Fan Performance Management',
    shortDescription: 'Exhaust fan inspection, belt service, bearing lubrication, and airflow verification — prevents unplanned kitchen downtime and accelerated duct buildup',
    fullDescription: `Scheduled exhaust fan service including belt tension and condition check, motor bearing lubrication, fan blade cleaning and balance inspection, airflow performance verification, and written service documentation with EvidLY upload. Identifies worn belts, degraded bearings, and imbalanced blades before they cause fan failure and force an emergency kitchen closure.`,
    nfpaReference: 'NFPA 96 (2024) Chapter 11 — Air Movement. Verify specific section requirements with your AHJ.',
    additionalRegs: [
      'NFPA 96 (2024) Chapter 11 — Air Movement. Verify specific section requirements with your AHJ.',
      'NFPA 96 (2024) Chapter 11 — Air Movement. Verify specific section requirements with your AHJ.',
    ],
    frequency: 'Quarterly recommended; minimum semi-annual per NFPA 96 Chapter 11',
    businessBenefit: `Your exhaust fan is the engine of your kitchen. When it underperforms, your hood loses capture effectiveness — heat, smoke, and grease-laden air escape the capture zone and affect food quality, staff comfort, and fire risk simultaneously. When it fails completely, the kitchen stops. Fan Performance Management prevents the scenario every operator fears: a fan belt snapping at 11am on a Friday during a full house, followed by 1–4 days of zero revenue while a replacement is sourced, installed, and inspected.`,
    operationalImpact: `A failed exhaust fan forces an immediate kitchen shutdown — fire code prohibits cooking under a non-functional hood system. Emergency fan replacement typically takes 1–4 days including sourcing, scheduling, installation, and sign-off. Every one of those days is lost revenue that cannot be recovered. A worn but still-running fan is nearly as costly — reduced airflow increases grease bypass into the ductwork, directly accelerating the rate at which the duct accumulates grease and requires cleaning.`,
    whyOperatorsSkipIt: `"The fan is running so it's fine." Operators wait for complete failure before servicing, unaware that a degraded fan is costing them more in accelerated duct buildup and is one belt snap from a forced closure.`,
    rebuttal: `A running fan is not the same as a performing fan. A worn belt slips under load, reducing airflow by 20–40% while the fan appears to operate normally. This reduced capture velocity means grease that should travel up the duct settles on surfaces around the hood instead — accelerating buildup between cleanings and creating fire risk. Fan failure doesn't announce itself. It happens at the worst possible moment, and the downtime cost exceeds years of preventive service cost in a single event.`,
    complianceConsequence: `Non-performing exhaust system = NFPA 96 Chapter 11 violation. AHJ inspectors increasingly check fan maintenance records during fire safety visits. A fan with no service history in 2+ years is an inspection red flag regardless of visual condition.`,
    costDrivers: [
      {
        id: 'daily_revenue',
        label: 'Average Daily Revenue',
        inputType: 'currency',
        unit: 'per day',
        placeholder: '2500',
        helpText: 'Revenue lost per day during forced kitchen closure from fan failure',
      },
      {
        id: 'num_fans',
        label: 'Number of Exhaust Fans',
        inputType: 'number',
        unit: 'fans',
        placeholder: '2',
        helpText: 'Each fan requires individual service documentation',
      },
      {
        id: 'fan_age_years',
        label: 'Age of Oldest Exhaust Fan',
        inputType: 'number',
        unit: 'years',
        placeholder: '5',
        helpText: 'Fans over 7 years have significantly higher failure probability',
      },
      {
        id: 'hood_cleaning_cost',
        label: 'Current Hood Cleaning Cost per Service',
        inputType: 'currency',
        unit: 'per cleaning',
        placeholder: '450',
        helpText: 'Used to calculate additional cleaning cost from degraded fan performance',
      },
    ],
    riskCalculations: [
      {
        riskLabel: 'Revenue loss from fan failure and emergency kitchen closure',
        formula: 'Daily revenue × closure duration (1–4 days for emergency fan replacement including sourcing, scheduling, installation)',
        regulatoryBasis: 'NFPA 96 (2024) Chapter 11 — kitchen cannot operate without compliant exhaust system',
        probability: 'High',
        calculate: (i) => ({ low: (i.daily_revenue || 0) * 1, high: (i.daily_revenue || 0) * 4 }),
      },
      {
        riskLabel: 'Emergency fan motor/unit replacement (reactive vs. preventive)',
        formula: 'Per fan: $1,500–$6,000 emergency replacement vs. $150–$400 quarterly preventive service',
        regulatoryBasis: 'NFPA 96 (2024) Chapter 11 — fan maintenance requirement',
        probability: 'High',
        calculate: (i) => ({ low: (i.num_fans || 1) * 1500, high: (i.num_fans || 1) * 6000 }),
      },
      {
        riskLabel: 'Additional hood cleaning cycles from degraded fan airflow',
        formula: 'Reduced capture velocity increases grease load in ductwork — typically requires 1–2 additional cleanings per fan per year',
        regulatoryBasis: 'NFPA 96 (2024) Table 12.4 — cleaning frequency tied to system performance',
        probability: 'High',
        calculate: (i) => ({
          low: (i.num_fans || 1) * (i.hood_cleaning_cost || 300) * 1,
          high: (i.num_fans || 1) * (i.hood_cleaning_cost || 300) * 2,
        }),
      },
      {
        riskLabel: 'Fire risk increase from compromised hood capture performance',
        formula: 'Fan underperformance is a contributing factor in commercial kitchen fires. Exposure calculated from daily revenue × operating days × estimated probability increase.',
        regulatoryBasis: 'NFPA 96 (2024) Chapter 11 — airflow performance as fire safety requirement',
        probability: 'Medium',
        calculate: (i) => ({
          low: (i.daily_revenue || 0) * 300 * 0.02,
          high: (i.daily_revenue || 0) * 300 * 0.10,
        }),
      },
    ],
  },

  // ──────────────────────────────────────────────────────
  // 3. FILTER EXCHANGE MANAGEMENT
  // ──────────────────────────────────────────────────────
  {
    id: 'filter_exchange',
    name: 'Filter Exchange Management',
    shortDescription: 'Scheduled replacement of hood baffle filters with professionally cleaned certified units — NFPA 96 Chapter 9 and Clean Water Act §402 compliant',
    fullDescription: `Scheduled exchange of kitchen exhaust hood baffle filters. Used filters are removed and replaced with pre-cleaned certified units on every visit. Removed filters are cleaned at a licensed facility — not in a dish sink or parking lot. Service includes grease weight documentation per filter (a direct fire risk indicator), condition assessment, and EvidLY documentation upload. Eliminates the Clean Water Act exposure from washing grease-laden filters into any drain connected to the sewer or storm system.`,
    nfpaReference: 'NFPA 96 (2024) Chapter 9 — Grease Removal Devices. Verify specific section requirements with your AHJ.',
    additionalRegs: [
      'NFPA 96 (2024) Chapter 9 — Grease Removal Devices. Verify specific section requirements with your AHJ.',
      'Clean Water Act §402 — NPDES permit requirements',
      'Clean Water Act §301 — prohibition on unpermitted pollutant discharge',
      'California Porter-Cologne Water Quality Control Act',
    ],
    frequency: 'Monthly to quarterly based on cooking volume and filter saturation rate',
    businessBenefit: `Clean, properly maintained baffle filters are the first and most cost-effective line of defense in the exhaust system. They capture grease before it enters the duct — reducing duct grease load by 40–60%, directly extending the required cleaning interval under NFPA 96 Table 12.4 and reducing that cost. Filter Exchange also eliminates a federal liability that most operators don't know they have: washing grease-laden filters in any sink connected to a drain is a Clean Water Act violation every time it happens.`,
    operationalImpact: `Saturated filters restrict hood airflow, increase kitchen heat, and allow grease to bypass directly into the duct system — accelerating the rate at which the duct becomes non-compliant. Missing or damaged filters are an immediate NFPA 96 Chapter 9 citation. Every kitchen washing its own filters in a dish sink is generating a potential Clean Water Act violation — a federal issue governed by the same law that applies to industrial discharge, not just a local health code issue.`,
    whyOperatorsSkipIt: `"We wash them ourselves to save money." Operators don't realize on-site filter washing is a federal water quality violation, and that the grease discharged accelerates grease trap failures and municipal surcharges that cost more than filter exchange.`,
    rebuttal: `Washing grease-laden baffle filters in any sink connected to the municipal sewer or a storm drain is an unpermitted discharge of a pollutant under the Clean Water Act — a federal violation with penalties up to $25,000 per day. This is not theoretical or rarely enforced. Beyond the legal exposure, grease discharged from filter washing is the primary driver of grease trap overload, which causes emergency pump-outs and municipal surcharges. Most operators who calculate their annual grease trap costs vs. filter exchange costs find filter exchange is cheaper — before counting the federal liability.`,
    complianceConsequence: `Missing, damaged, or improperly maintained filters = NFPA 96 Chapter 9 violation on fire inspection. On-site filter washing = potential Clean Water Act federal violation + California Regional Water Board enforcement exposure.`,
    costDrivers: [
      {
        id: 'num_filters',
        label: 'Total Number of Hood Filters',
        inputType: 'number',
        unit: 'filters',
        placeholder: '6',
        helpText: 'Count all baffle filters across all hood sections',
      },
      {
        id: 'grease_trap_pumping_cost',
        label: 'Grease Trap Pump-Out Cost',
        inputType: 'currency',
        unit: 'per pump-out',
        placeholder: '450',
        helpText: 'Current cost per grease trap pump-out — used to calculate overload frequency savings',
      },
      {
        id: 'grease_trap_frequency',
        label: 'Current Grease Trap Pump-Out Frequency',
        inputType: 'select',
        unit: '',
        placeholder: '',
        options: ['Weekly', 'Every 2 weeks', 'Monthly', 'Every 2 months', 'Quarterly', 'Only when it backs up'],
        helpText: 'More frequent pump-outs = higher probability of filter-driven overload',
      },
      {
        id: 'daily_revenue',
        label: 'Average Daily Revenue',
        inputType: 'currency',
        unit: 'per day',
        placeholder: '2500',
        helpText: 'Used to calculate closure exposure from enforcement or drain backup',
      },
    ],
    riskCalculations: [
      {
        riskLabel: 'Clean Water Act violation — unpermitted grease discharge from on-site filter washing',
        formula: 'Federal civil penalty range: $2,500–$25,000 per day per violation. Calculated as minimum 1 day to enforcement range of 5 days.',
        regulatoryBasis: 'Clean Water Act §309 — civil penalties for NPDES violations',
        probability: 'Medium',
        calculate: () => ({ low: 2500, high: 125000 }),
      },
      {
        riskLabel: 'Additional grease trap pump-outs from filter grease bypass',
        formula: 'Pump-out cost × additional frequency (saturated filters drive 2–4 extra pump-outs per year vs. maintained filters)',
        regulatoryBasis: 'Municipal FOG pretreatment program requirements',
        probability: 'High',
        calculate: (i) => ({
          low: (i.grease_trap_pumping_cost || 450) * 2,
          high: (i.grease_trap_pumping_cost || 450) * 4,
        }),
      },
      {
        riskLabel: 'Additional hood cleaning frequency from saturated filter grease bypass into ductwork',
        formula: 'Degraded filters allow 40–60% more grease into ductwork — typically requires 1–2 additional cleaning cycles per year',
        regulatoryBasis: 'NFPA 96 (2024) Chapter 9 — filter performance directly affects duct grease accumulation rate',
        probability: 'High',
        calculate: () => ({ low: 300, high: 1200 }),
      },
      {
        riskLabel: 'California Regional Water Board enforcement action',
        formula: 'State water quality enforcement — complaint or monitoring triggered. Range based on Porter-Cologne Act penalties.',
        regulatoryBasis: 'California Porter-Cologne Water Quality Control Act',
        probability: 'Low',
        calculate: () => ({ low: 5000, high: 50000 }),
      },
    ],
  },

  // ──────────────────────────────────────────────────────
  // 4. ROOFTOP GREASE CONTAINMENT
  // ──────────────────────────────────────────────────────
  {
    id: 'rooftop_grease',
    name: 'Rooftop Grease Containment',
    shortDescription: 'Containment system installation and service for exhaust fan rooftop discharge — protects roof membrane from accelerated grease degradation and eliminates stormwater exposure',
    fullDescription: `Installation and scheduled service of rooftop grease containment systems that capture grease discharged onto the roof surface from exhaust fans. Service includes system installation, grease collection and certified disposal, roof surface inspection and condition documentation, and EvidLY service record upload. Prevents the compounding chemical damage that destroys commercial roofing membranes and eliminates the stormwater discharge liability created by grease washing off the roof.`,
    nfpaReference: 'NFPA 96 (2024) Chapter 11 — Air Movement. Verify specific section requirements with your AHJ.',
    additionalRegs: [
      'NFPA 96 (2024) Chapter 11 — Air Movement. Verify specific section requirements with your AHJ.',
      'Clean Water Act §402 — NPDES stormwater permit (grease roof runoff)',
      'Local fire codes — rooftop grease accumulation as fire hazard',
    ],
    frequency: 'Quarterly service; monthly visual inspection recommended',
    businessBenefit: `Your commercial roof is a major capital asset. A properly installed grease containment system costs a fraction of a single membrane patch repair — and a fraction of a percent of a full roof replacement. The containment system also prevents rooftop grease from becoming a fire ignition source and stops the stormwater discharge liability that occurs when grease washes off the roof in rain events. For an operator who already reinvests in their building, this is straightforward asset protection with a clear and calculable ROI.`,
    operationalImpact: `Grease discharged from exhaust fans does not wash away — it accumulates, concentrates during rain events, and chemically attacks petroleum-based roofing membranes (TPO, EPDM, modified bitumen). The degradation is invisible from inside the building until the roof leaks. By the time water intrusion is detected, the membrane damage is already extensive. Rooftop grease accumulation is also increasingly flagged by AHJs during fire safety inspections in California as fire code awareness of this hazard increases.`,
    whyOperatorsSkipIt: `"Out of sight, out of mind." The roof is never inspected by the operator between re-roofing projects. Grease accumulates over years before the damage manifests — by then the repair bill dwarfs what containment service would have cost over the entire period.`,
    rebuttal: `Every exhaust fan on a commercial kitchen roof discharges grease onto the roof surface every hour of operation. That grease doesn't evaporate — it bonds to the membrane, hardens with UV exposure, and creates a chemical reaction that degrades the roofing material beneath it. TPO and EPDM membranes are particularly susceptible. A single affected section costs thousands to cut out and patch. A full roof replacement on a commercial kitchen is a major unplanned capital expenditure. Grease containment service costs less per year than one patch repair — and documents your maintenance posture for insurance purposes.`,
    complianceConsequence: `Visible rooftop grease accumulation = NFPA 96 Chapter 11 violation on fire inspection. AHJs in California are increasingly including rooftop grease in commercial kitchen fire safety reviews. Stormwater grease discharge from roof runoff can trigger NPDES enforcement.`,
    costDrivers: [
      {
        id: 'roof_sqft',
        label: 'Approximate Roof Square Footage',
        inputType: 'number',
        unit: 'sq ft',
        placeholder: '3000',
        helpText: 'Used to estimate replacement and patch repair costs',
      },
      {
        id: 'roof_age_years',
        label: 'Age of Current Roof',
        inputType: 'number',
        unit: 'years',
        placeholder: '8',
        helpText: 'Older roofs have more accumulated damage and higher replacement urgency',
      },
      {
        id: 'num_fans_roof',
        label: 'Number of Exhaust Fans on Roof',
        inputType: 'number',
        unit: 'fans',
        placeholder: '2',
        helpText: 'Each fan creates a grease discharge zone on the roof surface',
      },
      {
        id: 'roof_type',
        label: 'Roofing Membrane Type',
        inputType: 'select',
        unit: '',
        placeholder: '',
        options: [
          'TPO (Thermoplastic) — highly susceptible to grease',
          'EPDM (Rubber) — highly susceptible to grease',
          'Modified Bitumen — moderately susceptible',
          'Built-Up Roof (BUR) — moderately susceptible',
          'Metal — low susceptibility',
          'Unknown',
        ],
        helpText: 'TPO and EPDM degrade significantly faster under grease exposure',
      },
      {
        id: 'hours_per_day',
        label: 'Kitchen Operating Hours per Day',
        inputType: 'number',
        unit: 'hours/day',
        placeholder: '12',
        helpText: 'More operating hours = more grease discharged onto roof per year',
      },
    ],
    riskCalculations: [
      {
        riskLabel: 'Roof membrane patch repair — grease-damaged section per fan',
        formula: 'Number of fans × patch repair cost per affected area ($2,500–$6,000 per section depending on access and membrane type)',
        regulatoryBasis: 'Commercial roofing — NRCA technical bulletins on grease membrane damage',
        probability: 'High',
        calculate: (i) => ({
          low: (i.num_fans_roof || 1) * 2500,
          high: (i.num_fans_roof || 1) * 6000,
        }),
      },
      {
        riskLabel: 'Full roof replacement driven by deferred grease damage',
        formula: 'Roof sq ft × replacement cost per sq ft ($10–$22 depending on membrane type, access, and regional labor)',
        regulatoryBasis: 'NRCA — commercial roofing replacement cost benchmarks',
        probability: 'Medium',
        calculate: (i) => ({
          low: (i.roof_sqft || 3000) * 10,
          high: (i.roof_sqft || 3000) * 22,
        }),
      },
      {
        riskLabel: 'Insurance denial for roof damage citing deferred maintenance',
        formula: 'Replacement cost × denial probability (carriers increasingly request maintenance records before paying commercial kitchen roof claims)',
        regulatoryBasis: 'Commercial property insurance — deferred maintenance exclusion clauses',
        probability: 'Medium',
        calculate: (i) => ({
          low: (i.roof_sqft || 3000) * 10 * 0.40,
          high: (i.roof_sqft || 3000) * 22 * 1.0,
        }),
      },
      {
        riskLabel: 'Stormwater discharge violation — rooftop grease runoff during rain events',
        formula: 'EPA §309 civil penalty range for NPDES violations — complaint or monitoring triggered',
        regulatoryBasis: 'Clean Water Act §402 — NPDES stormwater permit',
        probability: 'Low',
        calculate: () => ({ low: 2500, high: 25000 }),
      },
    ],
  },
];
