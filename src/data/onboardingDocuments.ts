// ---------------------------------------------------------------------------
// Onboarding Document Checklist Definitions
// ---------------------------------------------------------------------------

export interface OnboardingDocument {
  id: string;
  name: string;
  pillar: 'facility_safety' | 'food_safety' | 'vendor' | 'facility';
  required: boolean;
  description: string;
  whoProvides: string;
  renewalFrequency: string;
  helpText: string;
}

// ---------------------------------------------------------------------------
// Pillar metadata
// ---------------------------------------------------------------------------

export const PILLAR_META: Record<
  OnboardingDocument['pillar'],
  { label: string; icon: string }
> = {
  facility_safety: { label: 'Facility Safety', icon: '🔥' },
  food_safety: { label: 'Food Safety', icon: '🍽️' },
  vendor: { label: 'Vendor Documents', icon: '👥' },
  facility: { label: 'Facility Documents', icon: '🏢' },
};

// ---------------------------------------------------------------------------
// Base document list (22 items)
// ---------------------------------------------------------------------------

export const BASE_DOCUMENTS: OnboardingDocument[] = [
  // ── Facility Safety (6) ─────────────────────────────────────────────────────
  {
    id: 'hood_cleaning_cert',
    name: 'Hood Cleaning Certificate',
    pillar: 'facility_safety',
    required: true,
    description:
      'Proof that kitchen exhaust hoods, ducts, and fans have been professionally cleaned and degreased to NFPA 96 standards.',
    whoProvides: 'Hood cleaning vendor',
    renewalFrequency: 'Quarterly to monthly',
    helpText:
      'Ask your hood cleaning company for the certificate immediately after each service. Most fire marshals check this first during inspections.',
  },
  {
    id: 'fire_suppression_report',
    name: 'Fire Suppression Inspection Report',
    pillar: 'facility_safety',
    required: true,
    description:
      'Documented inspection of the kitchen fire suppression system confirming all nozzles, links, and agent levels meet code.',
    whoProvides: 'Fire suppression vendor',
    renewalFrequency: 'Semi-annual',
    helpText:
      'Schedule inspections every six months. Your vendor should leave a dated tag on the system and provide a written report you can file here.',
  },
  {
    id: 'fire_extinguisher_tags',
    name: 'Fire Extinguisher Inspection Tags',
    pillar: 'facility_safety',
    required: true,
    description:
      'Current inspection tags on all portable fire extinguishers showing they have been serviced and are in working order.',
    whoProvides: 'Facility safety vendor',
    renewalFrequency: 'Annual',
    helpText:
      'Take a clear photo of each extinguisher tag after the annual service visit. Monthly visual checks should also be logged internally.',
  },
  {
    id: 'ansul_cert',
    name: 'Ansul System Certification',
    pillar: 'facility_safety',
    required: true,
    description:
      'Certification that the Ansul (or equivalent) wet-chemical fire suppression system has been inspected and recharged as needed.',
    whoProvides: 'Fire suppression vendor',
    renewalFrequency: 'Semi-annual',
    helpText:
      'This is often bundled with your fire suppression inspection. Confirm with your vendor that the Ansul-specific cert is included in the report.',
  },
  {
    id: 'building_fire_inspection',
    name: 'Building Fire Inspection Report',
    pillar: 'facility_safety',
    required: false,
    description:
      'Report from the local fire department after a scheduled or surprise inspection of the building and kitchen areas.',
    whoProvides: 'Fire department',
    renewalFrequency: 'Annual',
    helpText:
      'Not every jurisdiction issues a formal report. If the fire marshal leaves a copy, upload it here to keep a complete compliance history.',
  },
  {
    id: 'exhaust_fan_service',
    name: 'Exhaust Fan Service Record',
    pillar: 'facility_safety',
    required: false,
    description:
      'Service records for rooftop and inline exhaust fans, including belt replacement, bearing lubrication, and hinge-kit cleaning.',
    whoProvides: 'Hood cleaning / HVAC vendor',
    renewalFrequency: 'Quarterly',
    helpText:
      'Exhaust fan maintenance is often included in hood cleaning contracts. Ask your vendor to document fan condition each visit.',
  },

  // ── Facility Safety — Elevator (3) ─────────────────────────────────────
  {
    id: 'elevator_inspection_cert',
    name: 'Elevator Inspection Certificate',
    pillar: 'facility_safety',
    required: false,
    description:
      'Current inspection certificate from a licensed elevator inspector confirming the elevator meets ASME A17.1 safety standards.',
    whoProvides: 'Elevator inspection vendor',
    renewalFrequency: 'Annual (varies by state)',
    helpText:
      'Required for multi-story buildings with elevators. Your inspector should provide a certificate after each annual inspection.',
  },
  {
    id: 'elevator_maintenance_record',
    name: 'Elevator Maintenance Record',
    pillar: 'facility_safety',
    required: false,
    description:
      'Maintenance logs documenting routine elevator service, repairs, and safety checks performed by a licensed elevator technician.',
    whoProvides: 'Elevator maintenance vendor',
    renewalFrequency: 'Monthly',
    helpText:
      'Keep monthly maintenance logs on file. Most state codes require a maintenance log book in the machine room.',
  },
  {
    id: 'elevator_permit',
    name: 'Elevator Operating Permit',
    pillar: 'facility_safety',
    required: false,
    description:
      'Operating permit issued by the state or local jurisdiction allowing the elevator to carry passengers.',
    whoProvides: 'State elevator safety division',
    renewalFrequency: 'Annual',
    helpText:
      'Must be posted in the elevator cab. Renew before expiration — an expired permit can result in a shutdown order.',
  },

  // ── Facility Safety — Pest Control (2 additional) ────────────────────
  {
    id: 'pest_control_contract',
    name: 'Pest Control Service Contract',
    pillar: 'facility_safety',
    required: false,
    description:
      'Active service contract with a licensed pest control operator covering regular inspections, treatments, and emergency callbacks.',
    whoProvides: 'Pest control vendor',
    renewalFrequency: 'Annual',
    helpText:
      'Having a contract on file demonstrates proactive pest management. Ensure it specifies monthly service visits at minimum.',
  },
  {
    id: 'pest_activity_log',
    name: 'Pest Activity Log',
    pillar: 'facility_safety',
    required: false,
    description:
      'Internal log tracking pest sightings, trap counts, and corrective actions taken between scheduled pest control visits.',
    whoProvides: 'Internal',
    renewalFrequency: 'Ongoing',
    helpText:
      'Log any pest activity between vendor visits. This helps your pest control operator target problem areas and satisfies inspector questions.',
  },

  // ── Facility Safety — Grease Trap / FOG Compliance (4) ──────────────────
  {
    id: 'grease_trap_pumping_receipt',
    name: 'Grease Trap Pumping Receipt / Manifest',
    pillar: 'facility_safety',
    required: true,
    description:
      'Service manifest from grease trap pumping showing date, gallons collected, hauler license, and receiving facility — required chain of custody for FOG compliance.',
    whoProvides: 'Licensed FOG hauler',
    renewalFrequency: 'Per service (monthly typical)',
    helpText:
      'Never let the hauler leave without a manifest. Many jurisdictions fine operators $10K-$50K+ for sewer overflows caused by undocumented grease disposal.',
  },
  {
    id: 'grease_trap_inspection_report',
    name: 'Grease Trap Inspection Report',
    pillar: 'facility_safety',
    required: false,
    description:
      'Periodic inspection report documenting trap condition, lid integrity, baffles, and structural integrity of grease traps or interceptors.',
    whoProvides: 'Grease trap vendor or plumber',
    renewalFrequency: 'Quarterly',
    helpText:
      'Inspections catch issues before they cause blockages. Document trap condition with photos if possible.',
  },
  {
    id: 'grease_interceptor_maintenance_log',
    name: 'Grease Interceptor Maintenance Log',
    pillar: 'facility_safety',
    required: false,
    description:
      'Ongoing maintenance log for large grease interceptors, tracking pumping frequency, volumes collected, and fill rate trends.',
    whoProvides: 'Internal / grease trap vendor',
    renewalFrequency: 'Ongoing',
    helpText:
      'Track fill rates to optimize pumping schedules. Interceptors at >75% capacity between pumpings may need more frequent service.',
  },
  {
    id: 'fog_compliance_report',
    name: 'FOG Compliance Report',
    pillar: 'facility_safety',
    required: false,
    description:
      'Compliance report for the local sewer district demonstrating proper Fats, Oil, and Grease management including disposal manifests and maintenance records.',
    whoProvides: 'Internal / consultant',
    renewalFrequency: 'Annual or per district request',
    helpText:
      'Some sewer districts require periodic FOG compliance reports. EvidLY can generate a downloadable report from your grease trap service history.',
  },

  // ── Facility Safety — Backflow Prevention (2 additional) ───────────────
  {
    id: 'backflow_preventer_certification',
    name: 'Backflow Preventer Certification',
    pillar: 'facility_safety',
    required: false,
    description:
      'Annual certification that all backflow prevention devices (RPZ valves, double check valves) on your potable water supply are functioning correctly.',
    whoProvides: 'Certified backflow tester',
    renewalFrequency: 'Annual',
    helpText:
      'Most water districts require annual testing by an ABPA-certified tester. Non-compliance can result in water shutoff — immediate business closure risk.',
  },
  {
    id: 'backflow_compliance_letter',
    name: 'Backflow Annual Compliance Letter',
    pillar: 'facility_safety',
    required: false,
    description:
      'Letter from the water district confirming your backflow prevention devices have been tested and are in compliance for the current year.',
    whoProvides: 'Water district',
    renewalFrequency: 'Annual',
    helpText:
      'After your tester files results with the water district, request a compliance letter for your records. This proves compliance during health inspections.',
  },

  // ── Food Safety (6) ─────────────────────────────────────────────────────
  {
    id: 'health_permit',
    name: 'Health Department Permit',
    pillar: 'food_safety',
    required: true,
    description:
      'Current operating permit issued by the local health authority allowing the establishment to prepare and serve food.',
    whoProvides: 'Local health department',
    renewalFrequency: 'Annual',
    helpText:
      'Renew before the expiration date printed on your permit. Most departments send a renewal notice 60 days in advance.',
  },
  {
    id: 'food_handler_certs',
    name: 'Food Handler Certifications (all staff)',
    pillar: 'food_safety',
    required: true,
    description:
      'Individual food handler cards or certificates for every team member who handles, prepares, or serves food.',
    whoProvides: 'Training provider',
    renewalFrequency: 'Per state (2-5 years)',
    helpText:
      'Keep a copy on file for each employee. New hires in most states must obtain their card within 30 days of starting.',
  },
  {
    id: 'food_manager_cert',
    name: 'Food Manager Certification (ServSafe)',
    pillar: 'food_safety',
    required: true,
    description:
      'A certified food protection manager credential (e.g., ServSafe) for at least one manager per shift or location.',
    whoProvides: 'Training provider',
    renewalFrequency: '5 years',
    helpText:
      'Most jurisdictions require at least one certified manager on duty at all times. Plan recertification well before the expiry date.',
  },
  {
    id: 'haccp_plan',
    name: 'HACCP Plan',
    pillar: 'food_safety',
    required: false,
    description:
      'A written Hazard Analysis and Critical Control Points plan identifying food safety hazards and the controls in place.',
    whoProvides: 'Internal / consultant',
    renewalFrequency: 'Annual review',
    helpText:
      'Required if preparing TCS foods on-site. Even if not mandated, a HACCP plan strengthens your food safety program and can reduce liability.',
  },
  {
    id: 'allergen_training',
    name: 'Allergen Awareness Training Records',
    pillar: 'food_safety',
    required: false,
    description:
      'Documentation that staff have completed training on major food allergens, cross-contact prevention, and emergency response.',
    whoProvides: 'Training provider',
    renewalFrequency: 'Annual',
    helpText:
      'Even where not legally required, allergen training reduces risk. Upload completion certificates for each team member.',
  },
  {
    id: 'pest_control_report',
    name: 'Pest Control Service Report',
    pillar: 'food_safety',
    required: true,
    description:
      'Monthly service report from a licensed pest control operator documenting findings, treatments, and recommendations.',
    whoProvides: 'Pest control vendor',
    renewalFrequency: 'Monthly',
    helpText:
      'Keep every monthly report on file. Health inspectors commonly ask to see the last three months of pest control documentation.',
  },

  // ── Vendor (3) ──────────────────────────────────────────────────────────
  {
    id: 'vendor_coi',
    name: 'Vendor Insurance Certificates (COI)',
    pillar: 'vendor',
    required: true,
    description:
      'Certificates of insurance from each vendor working on-site, confirming general liability and workers compensation coverage.',
    whoProvides: 'Each vendor',
    renewalFrequency: 'Annual',
    helpText:
      'Request updated COIs whenever a vendor renews their policy. Set calendar reminders 30 days before each certificate expires.',
  },
  {
    id: 'vendor_licenses',
    name: 'Vendor Business Licenses',
    pillar: 'vendor',
    required: false,
    description:
      'Copies of valid business licenses for vendors providing services at your location, confirming they are legally authorized to operate.',
    whoProvides: 'Each vendor',
    renewalFrequency: 'Annual',
    helpText:
      'Collecting vendor licenses is a best practice that protects your business. Ask for a copy when you first engage any new vendor.',
  },
  {
    id: 'service_agreements',
    name: 'Service Agreements / Contracts',
    pillar: 'vendor',
    required: false,
    description:
      'Signed service agreements or contracts outlining scope of work, pricing, frequency, and cancellation terms for each vendor.',
    whoProvides: 'Each vendor',
    renewalFrequency: 'Per contract',
    helpText:
      'Upload each signed contract so your team can quickly reference terms. Review agreements annually even if they auto-renew.',
  },

  // ── Facility (4) ────────────────────────────────────────────────────────
  {
    id: 'business_license',
    name: 'Business License',
    pillar: 'facility',
    required: true,
    description:
      'General business license issued by your city or county permitting you to operate a food service establishment at this address.',
    whoProvides: 'City / county',
    renewalFrequency: 'Annual',
    helpText:
      'Display the original at your location as required by law. Upload a copy here so it is always accessible digitally.',
  },
  {
    id: 'certificate_occupancy',
    name: 'Certificate of Occupancy',
    pillar: 'facility',
    required: false,
    description:
      'Document issued by the building department certifying that the premises meets zoning, building code, and facility safety requirements for its intended use.',
    whoProvides: 'Building department',
    renewalFrequency: 'One-time',
    helpText:
      'You typically receive this when you first open or after a major renovation. Keep it on file permanently — landlords and insurers may request it.',
  },
  {
    id: 'grease_trap_records',
    name: 'Grease Trap Pumping Records',
    pillar: 'facility',
    required: true,
    description:
      'Service manifests from grease trap pumping showing date, volume removed, and hauler information as required by the local sewer authority.',
    whoProvides: 'Grease trap vendor',
    renewalFrequency: 'Per service',
    helpText:
      'Most municipalities require pumping every 30-90 days. Your hauler must provide a manifest — never let them leave without one.',
  },
  {
    id: 'backflow_test',
    name: 'Backflow Preventer Test Report',
    pillar: 'facility',
    required: false,
    description:
      'Annual test report for backflow prevention devices on your water supply, confirming they function correctly and protect public water.',
    whoProvides: 'Plumbing vendor',
    renewalFrequency: 'Annual',
    helpText:
      'Your water utility may require this test annually. A licensed plumber or certified tester must perform it and file results with the utility.',
  },
];

// ---------------------------------------------------------------------------
// State-specific additional documents
// ---------------------------------------------------------------------------

export const STATE_ADDITIONAL_DOCS: Record<string, OnboardingDocument[]> = {
  CA: [
    {
      id: 'ca_food_handler_card',
      name: 'California Food Handler Card',
      pillar: 'food_safety',
      required: true,
      description:
        'California-specific food handler card issued by an ANSI-accredited training provider, required for all food employees within 30 days of hire.',
      whoProvides: 'ANSI-accredited training provider',
      renewalFrequency: '3 years',
      helpText:
        'California does not accept generic out-of-state food handler cards. Make sure the provider is on the approved ANSI list.',
    },
    {
      id: 'ca_calcode_postings',
      name: 'CalCode Required Postings',
      pillar: 'food_safety',
      required: true,
      description:
        'Mandatory consumer advisory notices, choking-hazard signage, and handwashing posters required under California Retail Food Code.',
      whoProvides: 'Operator / local health department',
      renewalFrequency: 'Ongoing',
      helpText:
        'Download the latest templates from your county health department website. Post them where customers and staff can see them.',
    },
  ],
  TX: [
    {
      id: 'tx_cfm_certificate',
      name: 'Texas CFM Certificate',
      pillar: 'food_safety',
      required: true,
      description:
        'Texas Certified Food Manager certificate required by DSHS for at least one manager at each food establishment.',
      whoProvides: 'DSHS-approved training provider',
      renewalFrequency: '5 years',
      helpText:
        'Texas accepts any ANSI-CFP accredited exam. Register through DSHS after passing to receive your official Texas CFM number.',
    },
  ],
  FL: [
    {
      id: 'fl_dbpr_license',
      name: 'Florida DBPR License',
      pillar: 'facility',
      required: true,
      description:
        'Public food service establishment license issued by the Florida Department of Business and Professional Regulation (DBPR).',
      whoProvides: 'Florida DBPR',
      renewalFrequency: 'Annual',
      helpText:
        'Apply or renew through the DBPR online portal. Your license must be displayed in a conspicuous location on the premises.',
    },
  ],
  NY: [
    {
      id: 'nyc_food_protection',
      name: 'NYC Food Protection Certificate',
      pillar: 'food_safety',
      required: true,
      description:
        'Certificate issued by the NYC Department of Health confirming that a supervisory employee has passed the Food Protection Course.',
      whoProvides: 'NYC DOHMH-approved course provider',
      renewalFrequency: '5 years',
      helpText:
        'At least one certified supervisor must be on-site during all hours of operation. The certificate is non-transferable between individuals.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Combine base + state-specific documents
// ---------------------------------------------------------------------------

export function getDocumentsForState(
  stateCode?: string,
): OnboardingDocument[] {
  const base = [...BASE_DOCUMENTS];

  if (stateCode) {
    const upper = stateCode.toUpperCase();
    const extras = STATE_ADDITIONAL_DOCS[upper];
    if (extras) {
      return [...base, ...extras];
    }
  }

  return base;
}

// ---------------------------------------------------------------------------
// Demo checklist status (~62% completion)
// ---------------------------------------------------------------------------
// Of the 19 base documents (11 required, 8 optional), we mark 10 as
// 'uploaded', 7 as 'pending', and 2 as 'not_applicable' — giving roughly
// 10/17 applicable = 59% raw, or ~62% when weighted by required-item priority.

export const DEMO_CHECKLIST_STATUS: Record<
  string,
  {
    status: 'uploaded' | 'pending' | 'not_applicable';
    uploadedAt?: string;
    expiresAt?: string;
  }
> = {
  // ── Facility Safety ─────────────────────────────────────────────────────────
  hood_cleaning_cert: {
    status: 'uploaded',
    uploadedAt: '2025-11-14',
    expiresAt: '2026-02-14',
  },
  fire_suppression_report: {
    status: 'uploaded',
    uploadedAt: '2025-09-20',
    expiresAt: '2026-03-20',
  },
  fire_extinguisher_tags: {
    status: 'pending',
  },
  ansul_cert: {
    status: 'uploaded',
    uploadedAt: '2025-09-20',
    expiresAt: '2026-03-20',
  },
  building_fire_inspection: {
    status: 'not_applicable',
  },
  exhaust_fan_service: {
    status: 'uploaded',
    uploadedAt: '2025-11-14',
    expiresAt: '2026-02-14',
  },
  elevator_inspection_cert: {
    status: 'not_applicable',
  },
  elevator_maintenance_record: {
    status: 'not_applicable',
  },
  elevator_permit: {
    status: 'not_applicable',
  },
  pest_control_contract: {
    status: 'uploaded',
    uploadedAt: '2026-01-05',
    expiresAt: '2027-01-05',
  },
  pest_activity_log: {
    status: 'pending',
  },

  // ── Facility Safety — Grease Trap / FOG ─────────────────────────────────
  grease_trap_pumping_receipt: {
    status: 'uploaded',
    uploadedAt: '2026-01-25',
    expiresAt: '2026-02-25',
  },
  grease_trap_inspection_report: {
    status: 'pending',
  },
  grease_interceptor_maintenance_log: {
    status: 'not_applicable',
  },
  fog_compliance_report: {
    status: 'pending',
  },

  // ── Facility Safety — Backflow Prevention ──────────────────────────────
  backflow_preventer_certification: {
    status: 'pending',
  },
  backflow_compliance_letter: {
    status: 'not_applicable',
  },

  // ── Food Safety ─────────────────────────────────────────────────────────
  health_permit: {
    status: 'uploaded',
    uploadedAt: '2025-07-01',
    expiresAt: '2026-06-30',
  },
  food_handler_certs: {
    status: 'pending',
  },
  food_manager_cert: {
    status: 'uploaded',
    uploadedAt: '2024-03-15',
    expiresAt: '2029-03-15',
  },
  haccp_plan: {
    status: 'pending',
  },
  allergen_training: {
    status: 'pending',
  },
  pest_control_report: {
    status: 'uploaded',
    uploadedAt: '2026-01-10',
    expiresAt: '2026-02-10',
  },

  // ── Vendor ──────────────────────────────────────────────────────────────
  vendor_coi: {
    status: 'uploaded',
    uploadedAt: '2025-12-01',
    expiresAt: '2026-11-30',
  },
  vendor_licenses: {
    status: 'not_applicable',
  },
  service_agreements: {
    status: 'pending',
  },

  // ── Facility ────────────────────────────────────────────────────────────
  business_license: {
    status: 'pending',
  },
  certificate_occupancy: {
    status: 'uploaded',
    uploadedAt: '2022-04-10',
  },
  grease_trap_records: {
    status: 'uploaded',
    uploadedAt: '2026-01-25',
    expiresAt: '2026-04-25',
  },
  backflow_test: {
    status: 'pending',
  },
};
