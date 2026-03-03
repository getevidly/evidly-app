/**
 * Demo Data Generation Engine
 *
 * Generates 30 days of realistic, jurisdiction-aware demo data for prospect demos.
 * Every generated row is tracked for clean deletion on conversion.
 *
 * In demo mode (no Supabase), this generates data structures in memory.
 * In auth mode, this would write to Supabase and track in demo_generated_data.
 */

export interface GenerationProgress {
  step: string;
  label: string;
  status: 'pending' | 'in_progress' | 'complete';
}

export interface DemoGenerationConfig {
  companyName: string;
  companyType: string;
  operationType: 'light' | 'moderate' | 'heavy' | 'institutional';
  city: string;
  county: string;
  state: string;
  zipCode: string;
  healthAuthority: string;
  fireAuthority: string;
  numLocations: number;
  durationDays: number;
  includeInsights: string[];
}

export interface GeneratedTempReading {
  id: string;
  equipment_name: string;
  equipment_type: string;
  reading_f: number;
  recorded_at: string;
  is_excursion: boolean;
  shift: 'morning' | 'midday' | 'evening';
}

export interface GeneratedChecklist {
  id: string;
  name: string;
  type: string;
  completed: boolean;
  completed_at: string | null;
  completion_rate: number;
  items_total: number;
  items_completed: number;
  date: string;
}

export interface GeneratedComplianceSnapshot {
  date: string;
  overall_score: number;
  food_safety_ops: number;
  food_safety_docs: number;
  facility_safety_ops: number;
  facility_safety_docs: number;
}

export interface GeneratedVendorService {
  id: string;
  vendor_name: string;
  service_type: string;
  last_service: string;
  next_due: string;
  is_overdue: boolean;
  frequency: string;
}

export interface GeneratedDocument {
  id: string;
  name: string;
  type: string;
  issued_date: string;
  expiry_date: string;
  status: 'current' | 'expiring_soon' | 'expired';
}

export interface GeneratedInsight {
  id: string;
  text: string;
  category: 'temperature' | 'compliance' | 'inspection' | 'vendor' | 'certification' | 'general';
  severity: 'info' | 'warning' | 'success';
  created_at: string;
}

export interface GeneratedCorrectiveAction {
  id: string;
  title: string;
  description: string;
  status: 'in_progress' | 'resolved';
  category: string;
  created_at: string;
  resolved_at: string | null;
}

export interface GeneratedTeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active';
}

export interface GeneratedDemoData {
  tempReadings: GeneratedTempReading[];
  checklists: GeneratedChecklist[];
  complianceSnapshots: GeneratedComplianceSnapshot[];
  vendorServices: GeneratedVendorService[];
  documents: GeneratedDocument[];
  insights: GeneratedInsight[];
  correctiveActions: GeneratedCorrectiveAction[];
  teamMembers: GeneratedTeamMember[];
}

// ── Helpers ──

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 86400000);
}

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 86400000);
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

// ── Equipment definitions by operation type ──

function getEquipment(opType: string) {
  const base = [
    { name: 'Walk-in Cooler #1', type: 'storage_cold', normalMin: 36, normalMax: 40, excursionTemp: 44 },
    { name: 'Walk-in Freezer', type: 'storage_frozen', normalMin: -2, normalMax: 4, excursionTemp: 12 },
    { name: 'Prep Cooler', type: 'storage_cold', normalMin: 38, normalMax: 41, excursionTemp: 44 },
    { name: 'Hot Hold Station', type: 'holding_hot', normalMin: 140, normalMax: 165, excursionTemp: 128 },
  ];
  if (opType === 'heavy' || opType === 'institutional') {
    base.push(
      { name: 'Walk-in Cooler #2', type: 'storage_cold', normalMin: 36, normalMax: 40, excursionTemp: 45 },
      { name: 'Blast Chiller', type: 'storage_cold', normalMin: 33, normalMax: 38, excursionTemp: 42 },
    );
  }
  return base;
}

// ── Temperature Reading Generation ──

function generateTempReadings(config: DemoGenerationConfig): GeneratedTempReading[] {
  const readings: GeneratedTempReading[] = [];
  const equipment = getEquipment(config.operationType);
  const shifts: Array<'morning' | 'midday' | 'evening'> = ['morning', 'midday', 'evening'];
  const shiftHours = { morning: 7, midday: 12, evening: 18 };

  // Predetermine excursion days
  const excursionDays = new Set<number>();
  const numExcursions = config.operationType === 'heavy' ? 4 : config.operationType === 'light' ? 2 : 3;
  while (excursionDays.size < numExcursions) {
    excursionDays.add(Math.floor(Math.random() * config.durationDays));
  }

  for (let day = 0; day < config.durationDays; day++) {
    const date = daysAgo(config.durationDays - day);

    for (const equip of equipment) {
      for (const shift of shifts) {
        const isExcursionDay = excursionDays.has(day);
        const isExcursion = isExcursionDay && shift === 'midday' && Math.random() < 0.3;

        const temp = isExcursion
          ? equip.excursionTemp + randomBetween(-1, 1)
          : randomBetween(equip.normalMin, equip.normalMax);

        const recordedAt = new Date(date);
        recordedAt.setHours(shiftHours[shift], Math.floor(Math.random() * 45), 0);

        readings.push({
          id: uuid(),
          equipment_name: equip.name,
          equipment_type: equip.type,
          reading_f: temp,
          recorded_at: recordedAt.toISOString(),
          is_excursion: isExcursion,
          shift,
        });
      }
    }
  }

  return readings;
}

// ── Checklist Generation ──

function generateChecklists(config: DemoGenerationConfig): GeneratedChecklist[] {
  const checklists: GeneratedChecklist[] = [];
  const types = [
    { name: 'Daily Opening Checklist', type: 'opening', items: 12, completionTarget: 0.9 },
    { name: 'Daily Closing Checklist', type: 'closing', items: 10, completionTarget: 0.85 },
    { name: 'Weekly Equipment Inspection', type: 'weekly', items: 8, completionTarget: 0.95, frequency: 7 },
    { name: 'HACCP Cooking Temp Log', type: 'haccp', items: 6, completionTarget: 0.92 },
    { name: 'HACCP Cooling Log', type: 'haccp', items: 4, completionTarget: 0.88 },
  ];

  if (config.operationType === 'institutional') {
    types.push(
      { name: 'Allergen Control Checklist', type: 'safety', items: 8, completionTarget: 0.95 },
      { name: 'Receiving Inspection Log', type: 'receiving', items: 6, completionTarget: 0.9 },
    );
  }

  for (let day = 0; day < config.durationDays; day++) {
    const date = daysAgo(config.durationDays - day);
    const dateStr = date.toISOString().split('T')[0];

    for (const cl of types) {
      // Weekly checklists only on day % 7
      if (cl.frequency === 7 && day % 7 !== 0) continue;

      const completed = Math.random() < cl.completionTarget;
      const itemsCompleted = completed
        ? cl.items
        : Math.floor(cl.items * (0.5 + Math.random() * 0.4));

      checklists.push({
        id: uuid(),
        name: cl.name,
        type: cl.type,
        completed,
        completed_at: completed
          ? new Date(date.getTime() + (cl.type === 'closing' ? 72000000 : 36000000)).toISOString()
          : null,
        completion_rate: Math.round((itemsCompleted / cl.items) * 100),
        items_total: cl.items,
        items_completed: itemsCompleted,
        date: dateStr,
      });
    }
  }

  return checklists;
}

// ── Compliance Score Generation ──

function generateComplianceSnapshots(config: DemoGenerationConfig): GeneratedComplianceSnapshot[] {
  const snapshots: GeneratedComplianceSnapshot[] = [];
  // Start at ~72%, improve to ~85% over 30 days
  const startScore = 72;
  const endScore = 85;

  for (let day = 0; day < config.durationDays; day++) {
    const date = daysAgo(config.durationDays - day);
    const progress = day / config.durationDays;
    const baseScore = startScore + (endScore - startScore) * progress;

    // Add some daily variance
    const variance = randomBetween(-2, 2);
    const overall = Math.min(100, Math.max(50, Math.round(baseScore + variance)));

    snapshots.push({
      date: date.toISOString().split('T')[0],
      overall_score: overall,
      food_safety_ops: Math.min(100, Math.round(overall + randomBetween(-5, 5))),
      food_safety_docs: Math.min(100, Math.round(overall + randomBetween(-8, 3))),
      facility_safety_ops: Math.min(100, Math.round(overall + randomBetween(-3, 7))),
      facility_safety_docs: Math.min(100, Math.round(overall + randomBetween(-10, 2))),
    });
  }

  return snapshots;
}

// ── Vendor Service Schedule Generation ──

function generateVendorServices(config: DemoGenerationConfig): GeneratedVendorService[] {
  const nfpaFrequency = {
    light: { label: 'Annual', days: 365 },
    moderate: { label: 'Quarterly', days: 90 },
    heavy: { label: 'Monthly', days: 30 },
    institutional: { label: 'Quarterly', days: 90 },
  };

  const hoodFreq = nfpaFrequency[config.operationType];

  const services: GeneratedVendorService[] = [
    {
      id: uuid(),
      vendor_name: 'Valley Hood Cleaning Co.',
      service_type: 'Hood Cleaning',
      last_service: daysAgo(hoodFreq.days - 12).toISOString().split('T')[0],
      next_due: daysFromNow(12).toISOString().split('T')[0],
      is_overdue: false,
      frequency: `${hoodFreq.label} (NFPA 96)`,
    },
    {
      id: uuid(),
      vendor_name: 'ABC Fire Protection',
      service_type: 'Fire Extinguisher Inspection',
      last_service: daysAgo(340).toISOString().split('T')[0],
      next_due: daysFromNow(25).toISOString().split('T')[0],
      is_overdue: false,
      frequency: 'Annual',
    },
    {
      id: uuid(),
      vendor_name: 'ABC Fire Protection',
      service_type: 'Fire Suppression (Ansul) Inspection',
      last_service: daysAgo(200).toISOString().split('T')[0],
      next_due: daysAgo(17).toISOString().split('T')[0],
      is_overdue: true,
      frequency: 'Semi-Annual',
    },
    {
      id: uuid(),
      vendor_name: 'Orkin Pest Control',
      service_type: 'Pest Control',
      last_service: daysAgo(22).toISOString().split('T')[0],
      next_due: daysFromNow(8).toISOString().split('T')[0],
      is_overdue: false,
      frequency: 'Monthly',
    },
    {
      id: uuid(),
      vendor_name: 'Valley Grease Services',
      service_type: 'Grease Trap Pumping',
      last_service: daysAgo(80).toISOString().split('T')[0],
      next_due: daysAgo(5).toISOString().split('T')[0],
      is_overdue: true,
      frequency: 'Quarterly',
    },
  ];

  return services;
}

// ── Document Generation ──

function generateDocuments(config: DemoGenerationConfig): GeneratedDocument[] {
  const docs: GeneratedDocument[] = [
    {
      id: uuid(),
      name: 'Health Permit',
      type: 'permit',
      issued_date: daysAgo(300).toISOString().split('T')[0],
      expiry_date: daysFromNow(60).toISOString().split('T')[0],
      status: 'expiring_soon',
    },
    {
      id: uuid(),
      name: 'Business License',
      type: 'license',
      issued_date: daysAgo(180).toISOString().split('T')[0],
      expiry_date: daysFromNow(185).toISOString().split('T')[0],
      status: 'current',
    },
    {
      id: uuid(),
      name: 'Hood Cleaning Certificate',
      type: 'certificate',
      issued_date: daysAgo(60).toISOString().split('T')[0],
      expiry_date: daysFromNow(30).toISOString().split('T')[0],
      status: 'current',
    },
    {
      id: uuid(),
      name: 'Fire Inspection Certificate',
      type: 'certificate',
      issued_date: daysAgo(90).toISOString().split('T')[0],
      expiry_date: daysFromNow(275).toISOString().split('T')[0],
      status: 'current',
    },
    {
      id: uuid(),
      name: 'Food Handler Card — Maria G.',
      type: 'certification',
      issued_date: daysAgo(700).toISOString().split('T')[0],
      expiry_date: daysFromNow(25).toISOString().split('T')[0],
      status: 'expiring_soon',
    },
    {
      id: uuid(),
      name: 'Food Handler Card — Jose R.',
      type: 'certification',
      issued_date: daysAgo(600).toISOString().split('T')[0],
      expiry_date: daysFromNow(18).toISOString().split('T')[0],
      status: 'expiring_soon',
    },
    {
      id: uuid(),
      name: 'Food Handler Card — Lisa T.',
      type: 'certification',
      issued_date: daysAgo(200).toISOString().split('T')[0],
      expiry_date: daysFromNow(520).toISOString().split('T')[0],
      status: 'current',
    },
    {
      id: uuid(),
      name: 'Food Handler Card — David K.',
      type: 'certification',
      issued_date: daysAgo(400).toISOString().split('T')[0],
      expiry_date: daysFromNow(320).toISOString().split('T')[0],
      status: 'current',
    },
    {
      id: uuid(),
      name: 'Food Handler Card — Amy W.',
      type: 'certification',
      issued_date: daysAgo(350).toISOString().split('T')[0],
      expiry_date: daysFromNow(370).toISOString().split('T')[0],
      status: 'current',
    },
  ];

  return docs;
}

// ── Insight Generation ──

function generateInsights(config: DemoGenerationConfig): GeneratedInsight[] {
  const county = config.county || config.city;
  const insights: GeneratedInsight[] = [
    {
      id: uuid(),
      text: `Walk-in Cooler #1 has trended 2°F higher over the past week. Consider scheduling maintenance.`,
      category: 'temperature',
      severity: 'warning',
      created_at: daysAgo(1).toISOString(),
    },
    {
      id: uuid(),
      text: `Based on ${county} County inspection cycle, your next health inspection is estimated in approximately 45 days.`,
      category: 'inspection',
      severity: 'info',
      created_at: daysAgo(2).toISOString(),
    },
    {
      id: uuid(),
      text: `3 food handler certifications expire within 30 days. Schedule renewals now.`,
      category: 'certification',
      severity: 'warning',
      created_at: daysAgo(3).toISOString(),
    },
    {
      id: uuid(),
      text: `Hood cleaning is due in 12 days based on your ${config.operationType === 'heavy' ? 'monthly' : 'quarterly'} NFPA 96 schedule.`,
      category: 'vendor',
      severity: 'info',
      created_at: daysAgo(4).toISOString(),
    },
    {
      id: uuid(),
      text: `Your compliance score improved 13% this month. Key driver: consistent temperature logging.`,
      category: 'compliance',
      severity: 'success',
      created_at: daysAgo(5).toISOString(),
    },
    {
      id: uuid(),
      text: `Fire suppression (Ansul) inspection is overdue by 17 days. Contact your vendor immediately.`,
      category: 'vendor',
      severity: 'warning',
      created_at: daysAgo(1).toISOString(),
    },
  ];

  if (config.includeInsights.includes('inspection_predictions')) {
    insights.push({
      id: uuid(),
      text: `${config.healthAuthority} typically conducts inspections on a 6-month cycle. Your operation was last inspected 4.5 months ago.`,
      category: 'inspection',
      severity: 'info',
      created_at: daysAgo(6).toISOString(),
    });
  }

  return insights;
}

// ── Corrective Action Generation ──

function generateCorrectiveActions(config: DemoGenerationConfig): GeneratedCorrectiveAction[] {
  return [
    {
      id: uuid(),
      title: 'Temperature Excursion — Walk-in Cooler #1',
      description: `Walk-in cooler reached 44°F during midday check. Adjusted thermostat, verified temp returned to safe range (38°F) within 2 hours. Scheduled preventive maintenance inspection with ${config.county || config.city} HVAC vendor.`,
      status: 'resolved',
      category: 'temperature',
      created_at: daysAgo(8).toISOString(),
      resolved_at: daysAgo(7).toISOString(),
    },
    {
      id: uuid(),
      title: 'Missed Closing Checklist — Feb 15',
      description: 'Evening shift did not complete closing checklist. Retrained staff on closing procedures. Added backup assignee to prevent recurrence.',
      status: 'resolved',
      category: 'checklist',
      created_at: daysAgo(13).toISOString(),
      resolved_at: daysAgo(12).toISOString(),
    },
    {
      id: uuid(),
      title: 'Overdue Ansul Inspection',
      description: 'Fire suppression system semi-annual inspection overdue by 17 days. Vendor contacted, inspection scheduled for next week.',
      status: 'in_progress',
      category: 'vendor',
      created_at: daysAgo(3).toISOString(),
      resolved_at: null,
    },
  ];
}

// ── Team Member Generation ──

function generateTeamMembers(config: DemoGenerationConfig): GeneratedTeamMember[] {
  const members: GeneratedTeamMember[] = [
    { id: uuid(), name: 'Maria Garcia', role: 'Kitchen Manager', email: 'maria@' + config.companyName.toLowerCase().replace(/[^a-z]/g, '') + '.com', status: 'active' },
    { id: uuid(), name: 'Jose Rodriguez', role: 'Kitchen Staff', email: 'jose@' + config.companyName.toLowerCase().replace(/[^a-z]/g, '') + '.com', status: 'active' },
    { id: uuid(), name: 'Lisa Tran', role: 'Kitchen Staff', email: 'lisa@' + config.companyName.toLowerCase().replace(/[^a-z]/g, '') + '.com', status: 'active' },
  ];

  if (config.operationType === 'moderate' || config.operationType === 'heavy' || config.operationType === 'institutional') {
    members.push(
      { id: uuid(), name: 'David Kim', role: 'Chef', email: 'david@' + config.companyName.toLowerCase().replace(/[^a-z]/g, '') + '.com', status: 'active' },
    );
  }

  if (config.operationType === 'heavy' || config.operationType === 'institutional') {
    members.push(
      { id: uuid(), name: 'Amy Williams', role: 'Kitchen Staff', email: 'amy@' + config.companyName.toLowerCase().replace(/[^a-z]/g, '') + '.com', status: 'active' },
    );
  }

  return members;
}

// ── Main Generation Function ──

const GENERATION_STEPS: { step: string; label: string }[] = [
  { step: 'location', label: 'Location configured' },
  { step: 'jurisdiction', label: 'Jurisdiction identified' },
  { step: 'compliance', label: 'Compliance requirements loaded' },
  { step: 'temperature', label: 'Generating temperature readings' },
  { step: 'checklists', label: 'Generating checklists' },
  { step: 'scores', label: 'Calculating compliance scores' },
  { step: 'vendors', label: 'Setting up vendor services' },
  { step: 'documents', label: 'Creating sample documents' },
  { step: 'insights', label: 'Creating insights and alerts' },
  { step: 'actions', label: 'Adding corrective actions' },
  { step: 'team', label: 'Setting up demo team' },
];

export { GENERATION_STEPS };

/**
 * Generate all demo data for a prospect.
 * Calls onProgress with step updates for the loading screen.
 */
export async function generateDemoData(
  config: DemoGenerationConfig,
  onProgress?: (steps: GenerationProgress[]) => void,
): Promise<GeneratedDemoData> {
  const progress: GenerationProgress[] = GENERATION_STEPS.map(s => ({
    ...s,
    status: 'pending' as const,
  }));

  const updateStep = async (stepName: string, status: 'in_progress' | 'complete') => {
    const idx = progress.findIndex(p => p.step === stepName);
    if (idx >= 0) {
      progress[idx].status = status;
      onProgress?.([...progress]);
      // Small delay to show progress
      if (status === 'complete') {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      }
    }
  };

  // Step 1-3: Location, jurisdiction, compliance
  await updateStep('location', 'in_progress');
  await updateStep('location', 'complete');
  await updateStep('jurisdiction', 'in_progress');
  await updateStep('jurisdiction', 'complete');
  await updateStep('compliance', 'in_progress');
  await updateStep('compliance', 'complete');

  // Step 4: Temperature readings
  await updateStep('temperature', 'in_progress');
  const tempReadings = generateTempReadings(config);
  await updateStep('temperature', 'complete');

  // Step 5: Checklists
  await updateStep('checklists', 'in_progress');
  const checklists = generateChecklists(config);
  await updateStep('checklists', 'complete');

  // Step 6: Compliance scores
  await updateStep('scores', 'in_progress');
  const complianceSnapshots = generateComplianceSnapshots(config);
  await updateStep('scores', 'complete');

  // Step 7: Vendor services
  await updateStep('vendors', 'in_progress');
  const vendorServices = generateVendorServices(config);
  await updateStep('vendors', 'complete');

  // Step 8: Documents
  await updateStep('documents', 'in_progress');
  const documents = generateDocuments(config);
  await updateStep('documents', 'complete');

  // Step 9: Insights
  await updateStep('insights', 'in_progress');
  const insights = generateInsights(config);
  await updateStep('insights', 'complete');

  // Step 10: Corrective actions
  await updateStep('actions', 'in_progress');
  const correctiveActions = generateCorrectiveActions(config);
  await updateStep('actions', 'complete');

  // Step 11: Team
  await updateStep('team', 'in_progress');
  const teamMembers = generateTeamMembers(config);
  await updateStep('team', 'complete');

  return {
    tempReadings,
    checklists,
    complianceSnapshots,
    vendorServices,
    documents,
    insights,
    correctiveActions,
    teamMembers,
  };
}
