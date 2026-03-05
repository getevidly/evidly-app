/**
 * PROMPT-15 — Inspector Arrival Mode: Demo Scenarios
 *
 * Three selectable scenarios for sales demonstrations:
 *   A: Clean location history (Location 1 — Downtown, Fresno County)
 *   B: Location with recent violations (Location 2 — Airport, Merced County)
 *   C: New location with no prior inspection history (Location 3 — University, Stanislaus County)
 */

// ── Types ────────────────────────────────────────────────────────

export interface InspectorRequirement {
  citation: string;
  title: string;
  status: 'pass' | 'fail';
  evidence: string[];
  detail: string;
}

export interface InspectorSection {
  key: string;
  title: string;
  iconKey: 'thermometer' | 'shopping-bag' | 'wrench' | 'users' | 'building' | 'flame';
  calCode: string;
  items: InspectorRequirement[];
}

export interface LastInspectionRecord {
  date: string;
  score: number;
  inspectorName: string;
  agency: string;
  topViolations: string[];
}

export interface OpenCorrectiveAction {
  title: string;
  severity: 'critical' | 'major' | 'minor';
  dueDate: string;
}

export interface OverdueEquipment {
  name: string;
  lastService: string;
  nextDue: string;
}

export interface HACCPAlert {
  ccp: string;
  description: string;
  detectedAt: string;
}

export interface CertRecord {
  name: string;
  certNumber: string;
  issued: string;
  expires: string;
  status: 'Active' | 'Expiring';
}

export interface FoodHandlerRecord {
  name: string;
  loc: string;
  num: string;
  exp: string;
  ok: boolean;
}

export interface FacilitySafetyRecord {
  name: string;
  tr: string;
  done: string;
  next: string;
  ok: boolean;
}

export interface InspectorScenarioData {
  id: string;
  label: string;
  description: string;
  location: { name: string; stateCode: string; county: string };
  reportDate: string;
  lastInspection: LastInspectionRecord | null;
  openCorrectiveActions: OpenCorrectiveAction[];
  overdueEquipment: OverdueEquipment[];
  haccpAlerts: HACCPAlert[];
  sections: InspectorSection[];
  certifications: {
    cfpms: CertRecord[];
    foodHandlers: FoodHandlerRecord[];
    facilitySafety: FacilitySafetyRecord[];
  };
}

// ── Talk-Track Generator ─────────────────────────────────────────

export function generateTalkTrack(data: InspectorScenarioData): string[] {
  const items: string[] = [];
  const failCount = data.sections.reduce(
    (sum, s) => sum + s.items.filter(i => i.status === 'fail').length, 0
  );
  const totalCount = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  const passRate = totalCount > 0 ? Math.round(((totalCount - failCount) / totalCount) * 100) : 0;

  // No prior inspection
  if (!data.lastInspection) {
    items.push(
      'First inspection — walk inspector through documentation binder and digital records',
      'Demonstrate HACCP plan, temperature logs, and employee certifications are in place',
      'Highlight proactive compliance setup before any inspection history exists',
    );
    return items;
  }

  // Overall compliance posture
  if (failCount === 0) {
    items.push(
      `Highlight ${passRate}% compliance rate — all ${totalCount} requirements currently met`,
    );
    if (data.lastInspection.score >= 95) {
      items.push(
        `Reference previous inspection score of ${data.lastInspection.score} — demonstrate consistent track record`,
      );
    }
  } else {
    items.push(
      `Address ${failCount} open issue${failCount !== 1 ? 's' : ''} — show corrective actions already in progress`,
    );
  }

  // Open corrective actions
  if (data.openCorrectiveActions.length > 0) {
    const critical = data.openCorrectiveActions.filter(ca => ca.severity === 'critical').length;
    if (critical > 0) {
      items.push(
        `${critical} critical corrective action${critical !== 1 ? 's' : ''} underway — present timelines and assigned owners`,
      );
    }
    items.push(
      `${data.openCorrectiveActions.length} total open corrective action${data.openCorrectiveActions.length !== 1 ? 's' : ''} — show documentation trail`,
    );
  } else {
    items.push('Zero open corrective actions — demonstrate proactive resolution process');
  }

  // Overdue equipment
  if (data.overdueEquipment.length > 0) {
    items.push(
      `${data.overdueEquipment.length} equipment item${data.overdueEquipment.length !== 1 ? 's' : ''} overdue — present rescheduled service dates`,
    );
  }

  // HACCP alerts
  if (data.haccpAlerts.length > 0) {
    items.push(
      `${data.haccpAlerts.length} active HACCP CCP alert${data.haccpAlerts.length !== 1 ? 's' : ''} — show root cause analysis and containment steps`,
    );
  }

  // Violations from last inspection
  if (data.lastInspection.topViolations.length > 0) {
    items.push(
      `Previous violations addressed: ${data.lastInspection.topViolations.slice(0, 2).join('; ')}`,
    );
  }

  // Certifications
  const expiringCerts = data.certifications.cfpms.filter(c => c.status === 'Expiring').length;
  const expiringHandlers = data.certifications.foodHandlers.filter(h => !h.ok).length;
  if (expiringCerts > 0 || expiringHandlers > 0) {
    items.push(
      `${expiringCerts + expiringHandlers} certification${(expiringCerts + expiringHandlers) !== 1 ? 's' : ''} expiring soon — show renewal plan`,
    );
  } else {
    items.push('All employee certifications current — ready for verification');
  }

  return items;
}

// ── Scenario A: Clean Location History ───────────────────────────

const scenarioA: InspectorScenarioData = {
  id: 'A',
  label: 'Clean History',
  description: 'Location with strong compliance record — all requirements met',
  location: { name: 'Location 1', stateCode: 'CA', county: 'Fresno County' },
  reportDate: 'February 12, 2026',
  lastInspection: {
    date: 'January 15, 2026',
    score: 98,
    inspectorName: 'Margaret Chen',
    agency: 'Fresno County Department of Public Health',
    topViolations: [],
  },
  openCorrectiveActions: [],
  overdueEquipment: [],
  haccpAlerts: [],
  sections: [
    {
      key: 'temp', title: 'Food Temperature Control', iconKey: 'thermometer',
      calCode: '\u00A7113996\u2013\u00A7114014',
      items: [
        { citation: '\u00A7113996', title: 'Cold Holding \u2264 41\u00B0F', status: 'pass',
          evidence: ['Walk-in Cooler #1: 36\u00B0F @ 6:00 AM today', 'Walk-in Cooler #2: 37\u00B0F @ 6:05 AM today', 'Prep Table Cooler: 38\u00B0F @ 6:10 AM today'],
          detail: '7-day compliance: 100% (49/49 readings in range)' },
        { citation: '\u00A7113996', title: 'Hot Holding \u2265 135\u00B0F', status: 'pass',
          evidence: ['Hot Holding Unit: 142\u00B0F @ 11:00 AM today'],
          detail: '7-day compliance: 100% (14/14 readings in range)' },
        { citation: '\u00A7114004', title: 'Cooking temperatures reached', status: 'pass',
          evidence: ['All proteins verified \u2265 165\u00B0F internal before serving'],
          detail: 'Last 7 days: 21 cooking temp checks, all compliant' },
        { citation: '\u00A7114002', title: 'Cooling procedures followed', status: 'pass',
          evidence: ['135\u00B0F\u219270\u00B0F in 1.5 hrs, 70\u00B0F\u219241\u00B0F in 3.5 hrs (yesterday batch)'],
          detail: 'Cooling log completed daily, all within limits' },
        { citation: '\u00A7114014', title: 'Reheating to 165\u00B0F', status: 'pass',
          evidence: ['All reheated items verified \u2265 165\u00B0F within 2 hours'],
          detail: 'Last 7 days: 8 reheat verifications, all compliant' },
        { citation: '\u00A7114059', title: 'Date marking on ready-to-eat foods', status: 'pass',
          evidence: ['All RTE items labeled with 7-day use-by dates'],
          detail: 'Date label compliance checked daily at opening' },
        { citation: '\u00A7113996(d)', title: 'Time as public health control', status: 'pass',
          evidence: ['TPHC items logged with 4-hour discard times when used'],
          detail: 'TPHC policy on file and followed per checklist' },
      ],
    },
    {
      key: 'food', title: 'Food Source & Condition', iconKey: 'shopping-bag',
      calCode: '\u00A7113735\u2013\u00A7114039',
      items: [
        { citation: '\u00A7113735', title: 'Approved food sources', status: 'pass',
          evidence: ['5 active vendors with current licenses on file'],
          detail: 'Valley Fresh Produce, Pacific Seafood, Central Meats, Mission Dairy, Sierra Dry Goods' },
        { citation: '\u00A7113735', title: 'Food received in good condition', status: 'pass',
          evidence: ['Receiving temps checked on every delivery'],
          detail: 'Last 7 days: 12 deliveries received, all temps in range' },
        { citation: '\u00A7114039', title: 'Shellfish tags retained 90 days', status: 'pass',
          evidence: ['Shellfish tag binder current through November 2025'],
          detail: 'Tags filed by date, oldest tag: Nov 14, 2025' },
      ],
    },
    {
      key: 'surfaces', title: 'Food Contact Surfaces', iconKey: 'wrench',
      calCode: '\u00A7114099\u2013\u00A7114074',
      items: [
        { citation: '\u00A7114099', title: 'Equipment clean and sanitized', status: 'pass',
          evidence: ['All prep surfaces sanitized at shift change'],
          detail: 'Sanitizer concentration verified 3x daily (200ppm quat)' },
        { citation: '\u00A7114099.6', title: 'Proper sanitizer concentration', status: 'pass',
          evidence: ['Test strips used at each check \u2014 200 ppm quaternary ammonia'],
          detail: 'Sanitizer bucket refreshed every 4 hours per SOP' },
        { citation: '\u00A7114099', title: 'Ice machine clean (FDA \u00A74-602.11)', status: 'pass',
          evidence: ['Ice Machine (Hoshizaki): cleaned Jan 28, 2026'],
          detail: 'Monthly cleaning on schedule, next due Feb 28. Ice quality: clear, odorless' },
        { citation: '\u00A7114074', title: 'Utensils stored properly', status: 'pass',
          evidence: ['Utensils stored handles-up in clean containers'],
          detail: 'Verified at opening and closing checklists daily' },
      ],
    },
    {
      key: 'employee', title: 'Employee Health & Hygiene', iconKey: 'users',
      calCode: '\u00A7113948\u2013\u00A7113961',
      items: [
        { citation: '\u00A7113948', title: 'Food Handler Cards current', status: 'pass',
          evidence: ['8/8 staff members have current California Food Handler Cards'],
          detail: 'All cards valid through 2027 or later' },
        { citation: '\u00A7113953.3', title: 'Proper handwashing observed', status: 'pass',
          evidence: ['Handwashing stations stocked and accessible'],
          detail: 'Handwashing compliance spot-checked daily at midday' },
        { citation: '\u00A7113961', title: 'No bare hand contact with RTE food', status: 'pass',
          evidence: ['Gloves and utensils used for all RTE food handling'],
          detail: 'Bare hand contact policy posted and enforced' },
        { citation: '\u00A7113949.1', title: 'Employee illness reporting policy', status: 'pass',
          evidence: ['Written illness reporting policy on file'],
          detail: 'Last illness exclusion: none in past 30 days' },
      ],
    },
    {
      key: 'facility', title: 'Facility & Operations', iconKey: 'building',
      calCode: '\u00A7114381\u2013\u00A7114259',
      items: [
        { citation: '\u00A7114381', title: 'Health permit current and posted', status: 'pass',
          evidence: ['Fresno County Health Permit #2026-FHF-04821'],
          detail: 'Valid through Dec 31, 2026. Posted at main entrance.' },
        { citation: '\u00A7114419.1', title: 'HACCP plan on file (if required)', status: 'pass',
          evidence: ['HACCP plan current for all CCP categories'],
          detail: '5 CCPs documented: receiving, cooking, cooling, hot holding, reheating' },
        { citation: '\u00A7114259', title: 'Pest control measures in place', status: 'pass',
          evidence: ['Valley Pest Solutions \u2014 last service Feb 3, 2026'],
          detail: 'Monthly service. Next scheduled: Mar 3, 2026. No activity reported.' },
        { citation: '\u00A7114245', title: 'Proper waste disposal', status: 'pass',
          evidence: ['Waste removal daily, dumpster area clean'],
          detail: 'Organic waste diversion per SB 1383 in place' },
      ],
    },
    {
      key: 'fire', title: 'Ventilation & Facility Safety', iconKey: 'flame',
      calCode: 'NFPA 96',
      items: [
        { citation: 'NFPA 96 \u00A712.4', title: 'Hood system cleaning current', status: 'pass',
          evidence: ['Last hood cleaning: Jan 15, 2026 by ABC Fire Protection'],
          detail: 'Quarterly schedule. Cleaned to bare metal. Before/after photos on file.' },
        { citation: 'NFPA 96-2024 \u00A711.2.2', title: 'Fire suppression system inspected', status: 'pass',
          evidence: ['Semi-annual inspection: Dec 12, 2025 by Valley Fire Systems'],
          detail: 'Next inspection due: Jun 12, 2026. All nozzles clear, agent charged.' },
        { citation: 'NFPA 10-2025 \u00A77.3.1', title: 'Fire extinguishers inspected', status: 'pass',
          evidence: ['Annual inspection: Nov 5, 2025. Monthly visual: Feb 1, 2026.'],
          detail: '3 Class K extinguishers, all current. Tags attached.' },
      ],
    },
  ],
  certifications: {
    cfpms: [
      { name: 'Marcus Johnson', certNumber: 'SM-2025-7721', issued: 'Mar 10, 2025', expires: 'Mar 10, 2030', status: 'Active' },
      { name: 'Sarah Chen', certNumber: 'SM-2025-8832', issued: 'Apr 5, 2025', expires: 'Apr 5, 2030', status: 'Active' },
      { name: 'Maria Garcia', certNumber: 'SM-2025-6643', issued: 'Jul 20, 2025', expires: 'Jul 20, 2030', status: 'Active' },
    ],
    foodHandlers: [
      { name: 'Marcus Johnson', loc: 'Loc 1', num: 'FH-2025-4481', exp: 'Jun 15, 2028', ok: true },
      { name: 'Sarah Chen', loc: 'Loc 1', num: 'FH-2025-5502', exp: 'Aug 20, 2028', ok: true },
      { name: 'Emma Rodriguez', loc: 'Loc 1', num: 'FH-2025-9912', exp: 'Jul 10, 2028', ok: true },
      { name: 'Maria Garcia', loc: 'Loc 2', num: 'FH-2025-3390', exp: 'Sep 1, 2028', ok: true },
      { name: 'David Park', loc: 'Loc 2', num: 'FH-2024-2201', exp: 'Apr 2, 2027', ok: true },
      { name: 'Michael Torres', loc: 'Loc 2', num: 'FH-2025-1100', exp: 'Nov 26, 2028', ok: true },
      { name: 'Alex Thompson', loc: 'Loc 3', num: 'FH-2024-8834', exp: 'Dec 10, 2027', ok: true },
      { name: 'Lisa Wang', loc: 'Loc 3', num: 'FH-2025-1105', exp: 'Jan 25, 2028', ok: true },
    ],
    facilitySafety: [
      { name: 'Marcus Johnson', tr: 'Fire Extinguisher', done: 'Nov 15, 2025', next: 'Nov 15, 2026', ok: true },
      { name: 'Sarah Chen', tr: 'Fire Extinguisher', done: 'Nov 15, 2025', next: 'Nov 15, 2026', ok: true },
      { name: 'Maria Garcia', tr: 'Fire Extinguisher', done: 'Nov 18, 2025', next: 'Nov 18, 2026', ok: true },
      { name: 'David Park', tr: 'Hood Suppression Awareness', done: 'Dec 1, 2025', next: 'Dec 1, 2026', ok: true },
    ],
  },
};

// ── Scenario B: Location with Recent Violations ─────────────────

const scenarioB: InspectorScenarioData = {
  id: 'B',
  label: 'Recent Violations',
  description: 'Location with recent violations and open corrective actions',
  location: { name: 'Location 2', stateCode: 'CA', county: 'Merced County' },
  reportDate: 'February 12, 2026',
  lastInspection: {
    date: 'February 5, 2026',
    score: 82,
    inspectorName: 'Robert Kim',
    agency: 'Merced County Division of Environmental Health',
    topViolations: [
      'Walk-in cooler above 41\u00B0F for 3 consecutive days',
      'Hood cleaning overdue by 2 weeks',
      'One food handler card expired',
    ],
  },
  openCorrectiveActions: [
    { title: 'Walk-in Cooler #2 temperature excursion — compressor repair', severity: 'critical', dueDate: 'Feb 19, 2026' },
    { title: 'Hood system cleaning overdue — schedule with ABC Fire Protection', severity: 'critical', dueDate: 'Feb 15, 2026' },
    { title: 'Food handler card renewal — Michael Torres', severity: 'major', dueDate: 'Mar 1, 2026' },
    { title: 'Sanitizer test strip log — 2 missed entries last week', severity: 'minor', dueDate: 'Feb 28, 2026' },
  ],
  overdueEquipment: [
    { name: 'Walk-in Cooler #2 compressor', lastService: 'Aug 15, 2025', nextDue: 'Feb 1, 2026' },
    { name: 'Type I Hood — exhaust cleaning', lastService: 'Oct 20, 2025', nextDue: 'Jan 20, 2026' },
  ],
  haccpAlerts: [
    { ccp: 'CCP-2: Cold Holding', description: 'Walk-in Cooler #2 logged above 41\u00B0F for 3 consecutive daily checks', detectedAt: 'Feb 8, 2026' },
  ],
  sections: [
    {
      key: 'temp', title: 'Food Temperature Control', iconKey: 'thermometer',
      calCode: '\u00A7113996\u2013\u00A7114014',
      items: [
        { citation: '\u00A7113996', title: 'Cold Holding \u2264 41\u00B0F', status: 'fail',
          evidence: ['Walk-in Cooler #1: 37\u00B0F @ 6:00 AM today \u2014 OK', 'Walk-in Cooler #2: 44\u00B0F @ 6:05 AM today \u2014 ABOVE LIMIT', 'Prep Table Cooler: 39\u00B0F @ 6:10 AM today \u2014 OK'],
          detail: '7-day compliance: 86% (42/49 readings in range). Cooler #2 compressor repair scheduled Feb 14.' },
        { citation: '\u00A7113996', title: 'Hot Holding \u2265 135\u00B0F', status: 'pass',
          evidence: ['Hot Holding Unit: 140\u00B0F @ 11:00 AM today'],
          detail: '7-day compliance: 100% (14/14 readings in range)' },
        { citation: '\u00A7114004', title: 'Cooking temperatures reached', status: 'pass',
          evidence: ['All proteins verified \u2265 165\u00B0F internal before serving'],
          detail: 'Last 7 days: 18 cooking temp checks, all compliant' },
        { citation: '\u00A7114002', title: 'Cooling procedures followed', status: 'pass',
          evidence: ['Cooling logs completed daily, all within limits'],
          detail: '135\u00B0F\u219270\u00B0F in 1.8 hrs, 70\u00B0F\u219241\u00B0F in 3.2 hrs (yesterday batch)' },
        { citation: '\u00A7114014', title: 'Reheating to 165\u00B0F', status: 'pass',
          evidence: ['All reheated items verified \u2265 165\u00B0F within 2 hours'],
          detail: 'Last 7 days: 6 reheat verifications, all compliant' },
        { citation: '\u00A7114059', title: 'Date marking on ready-to-eat foods', status: 'pass',
          evidence: ['All RTE items labeled with 7-day use-by dates'],
          detail: 'Date label compliance checked daily at opening' },
        { citation: '\u00A7113996(d)', title: 'Time as public health control', status: 'pass',
          evidence: ['TPHC items logged with 4-hour discard times when used'],
          detail: 'TPHC policy on file and followed per checklist' },
      ],
    },
    {
      key: 'food', title: 'Food Source & Condition', iconKey: 'shopping-bag',
      calCode: '\u00A7113735\u2013\u00A7114039',
      items: [
        { citation: '\u00A7113735', title: 'Approved food sources', status: 'pass',
          evidence: ['4 active vendors with current licenses on file'],
          detail: 'Pacific Seafood, Central Meats, Mission Dairy, Sierra Dry Goods' },
        { citation: '\u00A7113735', title: 'Food received in good condition', status: 'pass',
          evidence: ['Receiving temps checked on every delivery'],
          detail: 'Last 7 days: 9 deliveries received, all temps in range' },
        { citation: '\u00A7114039', title: 'Shellfish tags retained 90 days', status: 'pass',
          evidence: ['Shellfish tag binder current through December 2025'],
          detail: 'Tags filed by date, oldest tag: Dec 2, 2025' },
      ],
    },
    {
      key: 'surfaces', title: 'Food Contact Surfaces', iconKey: 'wrench',
      calCode: '\u00A7114099\u2013\u00A7114074',
      items: [
        { citation: '\u00A7114099', title: 'Equipment clean and sanitized', status: 'pass',
          evidence: ['All prep surfaces sanitized at shift change'],
          detail: 'Sanitizer concentration verified 3x daily (200ppm quat)' },
        { citation: '\u00A7114099.6', title: 'Proper sanitizer concentration', status: 'fail',
          evidence: ['Test strips used at each check \u2014 200 ppm quaternary ammonia', '2 of 21 checks last week showed no test strip reading recorded'],
          detail: 'Corrective action: retrain staff on sanitizer log completion by Feb 28' },
        { citation: '\u00A7114099', title: 'Ice machine clean (FDA \u00A74-602.11)', status: 'pass',
          evidence: ['Ice Machine (Manitowoc): cleaned Jan 25, 2026'],
          detail: 'Monthly cleaning on schedule, next due Feb 25' },
        { citation: '\u00A7114074', title: 'Utensils stored properly', status: 'pass',
          evidence: ['Utensils stored handles-up in clean containers'],
          detail: 'Verified at opening and closing checklists daily' },
      ],
    },
    {
      key: 'employee', title: 'Employee Health & Hygiene', iconKey: 'users',
      calCode: '\u00A7113948\u2013\u00A7113961',
      items: [
        { citation: '\u00A7113948', title: 'Food Handler Cards current', status: 'fail',
          evidence: ['5/6 staff members have current California Food Handler Cards', 'Michael Torres \u2014 card expired Feb 26, 2026, renewal in progress'],
          detail: 'Renewal exam scheduled for Mar 1, 2026. Employee reassigned to non-food-contact duties.' },
        { citation: '\u00A7113953.3', title: 'Proper handwashing observed', status: 'pass',
          evidence: ['Handwashing stations stocked and accessible'],
          detail: 'Handwashing compliance spot-checked daily at midday' },
        { citation: '\u00A7113961', title: 'No bare hand contact with RTE food', status: 'pass',
          evidence: ['Gloves and utensils used for all RTE food handling'],
          detail: 'Bare hand contact policy posted and enforced' },
        { citation: '\u00A7113949.1', title: 'Employee illness reporting policy', status: 'pass',
          evidence: ['Written illness reporting policy on file'],
          detail: 'Last illness exclusion: Jan 22, 2026 (1 staff member, returned Jan 25)' },
      ],
    },
    {
      key: 'facility', title: 'Facility & Operations', iconKey: 'building',
      calCode: '\u00A7114381\u2013\u00A7114259',
      items: [
        { citation: '\u00A7114381', title: 'Health permit current and posted', status: 'pass',
          evidence: ['Merced County Health Permit #2026-MRC-02194'],
          detail: 'Valid through Dec 31, 2026. Posted at main entrance.' },
        { citation: '\u00A7114419.1', title: 'HACCP plan on file (if required)', status: 'pass',
          evidence: ['HACCP plan current for all CCP categories'],
          detail: '5 CCPs documented: receiving, cooking, cooling, hot holding, reheating' },
        { citation: '\u00A7114259', title: 'Pest control measures in place', status: 'pass',
          evidence: ['Valley Pest Solutions \u2014 last service Jan 28, 2026'],
          detail: 'Monthly service. Next scheduled: Feb 28, 2026. No activity reported.' },
        { citation: '\u00A7114245', title: 'Proper waste disposal', status: 'pass',
          evidence: ['Waste removal daily, dumpster area clean'],
          detail: 'Organic waste diversion per SB 1383 in place' },
      ],
    },
    {
      key: 'fire', title: 'Ventilation & Facility Safety', iconKey: 'flame',
      calCode: 'NFPA 96',
      items: [
        { citation: 'NFPA 96 \u00A712.4', title: 'Hood system cleaning current', status: 'fail',
          evidence: ['Last hood cleaning: Oct 20, 2025 by ABC Fire Protection', 'Quarterly cleaning overdue since Jan 20, 2026'],
          detail: 'Service rescheduled for Feb 15, 2026. Grease buildup observed on filters.' },
        { citation: 'NFPA 96-2024 \u00A711.2.2', title: 'Fire suppression system inspected', status: 'pass',
          evidence: ['Semi-annual inspection: Nov 8, 2025 by Valley Fire Systems'],
          detail: 'Next inspection due: May 8, 2026. All nozzles clear, agent charged.' },
        { citation: 'NFPA 10-2025 \u00A77.3.1', title: 'Fire extinguishers inspected', status: 'pass',
          evidence: ['Annual inspection: Oct 20, 2025. Monthly visual: Feb 1, 2026.'],
          detail: '2 Class K extinguishers, all current. Tags attached.' },
      ],
    },
  ],
  certifications: {
    cfpms: [
      { name: 'Maria Garcia', certNumber: 'SM-2025-3390', issued: 'Jul 20, 2025', expires: 'Jul 20, 2030', status: 'Active' },
      { name: 'David Park', certNumber: 'SM-2024-2201', issued: 'Mar 15, 2024', expires: 'Mar 15, 2029', status: 'Active' },
    ],
    foodHandlers: [
      { name: 'Maria Garcia', loc: 'Loc 2', num: 'FH-2025-3390', exp: 'Sep 1, 2028', ok: true },
      { name: 'David Park', loc: 'Loc 2', num: 'FH-2024-2201', exp: 'Apr 2, 2027', ok: true },
      { name: 'Michael Torres', loc: 'Loc 2', num: 'FH-2023-1188', exp: 'Feb 26, 2026', ok: false },
      { name: 'Carlos Mendez', loc: 'Loc 2', num: 'FH-2025-4412', exp: 'Aug 10, 2028', ok: true },
      { name: 'Jennifer Liu', loc: 'Loc 2', num: 'FH-2025-5501', exp: 'Oct 15, 2028', ok: true },
      { name: 'Robert Singh', loc: 'Loc 2', num: 'FH-2024-9921', exp: 'May 20, 2027', ok: true },
    ],
    facilitySafety: [
      { name: 'Maria Garcia', tr: 'Fire Extinguisher', done: 'Nov 18, 2025', next: 'Nov 18, 2026', ok: true },
      { name: 'David Park', tr: 'Hood Suppression Awareness', done: 'Dec 1, 2025', next: 'Dec 1, 2026', ok: true },
      { name: 'Michael Torres', tr: 'Fire Extinguisher', done: 'Nov 18, 2025', next: 'Nov 18, 2026', ok: true },
    ],
  },
};

// ── Scenario C: New Location — No Prior Inspection History ──────

const scenarioC: InspectorScenarioData = {
  id: 'C',
  label: 'New Location',
  description: 'Newly opened location — no prior inspection history',
  location: { name: 'Location 3', stateCode: 'CA', county: 'Stanislaus County' },
  reportDate: 'February 12, 2026',
  lastInspection: null,
  openCorrectiveActions: [],
  overdueEquipment: [],
  haccpAlerts: [],
  sections: [
    {
      key: 'temp', title: 'Food Temperature Control', iconKey: 'thermometer',
      calCode: '\u00A7113996\u2013\u00A7114014',
      items: [
        { citation: '\u00A7113996', title: 'Cold Holding \u2264 41\u00B0F', status: 'pass',
          evidence: ['Walk-in Cooler: 35\u00B0F @ 6:00 AM today', 'Reach-in Cooler: 38\u00B0F @ 6:05 AM today'],
          detail: 'Monitoring since opening (2 weeks). 100% in range (28/28 readings).' },
        { citation: '\u00A7113996', title: 'Hot Holding \u2265 135\u00B0F', status: 'pass',
          evidence: ['Hot Holding Unit: 145\u00B0F @ 11:00 AM today'],
          detail: '2-week history: 100% compliance (14/14 readings)' },
        { citation: '\u00A7114004', title: 'Cooking temperatures reached', status: 'pass',
          evidence: ['All proteins verified \u2265 165\u00B0F internal before serving'],
          detail: 'Cooking temp logs started at opening, all compliant' },
        { citation: '\u00A7114002', title: 'Cooling procedures followed', status: 'pass',
          evidence: ['Cooling log implemented from day one'],
          detail: '4 cooling cycles logged, all within limits' },
        { citation: '\u00A7114014', title: 'Reheating to 165\u00B0F', status: 'pass',
          evidence: ['Reheating verified per SOP'],
          detail: '3 reheat verifications since opening, all compliant' },
        { citation: '\u00A7114059', title: 'Date marking on ready-to-eat foods', status: 'pass',
          evidence: ['All RTE items labeled with 7-day use-by dates'],
          detail: 'Date marking system set up at opening' },
        { citation: '\u00A7113996(d)', title: 'Time as public health control', status: 'pass',
          evidence: ['TPHC policy on file, not yet used (limited menu)'],
          detail: 'Policy documented, staff trained during pre-opening' },
      ],
    },
    {
      key: 'food', title: 'Food Source & Condition', iconKey: 'shopping-bag',
      calCode: '\u00A7113735\u2013\u00A7114039',
      items: [
        { citation: '\u00A7113735', title: 'Approved food sources', status: 'pass',
          evidence: ['3 active vendors with current licenses on file'],
          detail: 'Central Valley Foods, Sierra Dry Goods, Pacific Seafood' },
        { citation: '\u00A7113735', title: 'Food received in good condition', status: 'pass',
          evidence: ['Receiving temps checked on every delivery'],
          detail: '6 deliveries received since opening, all temps in range' },
        { citation: '\u00A7114039', title: 'Shellfish tags retained 90 days', status: 'pass',
          evidence: ['Shellfish tag binder started at opening, no shellfish received yet'],
          detail: 'Binder set up and ready, no tags to file yet' },
      ],
    },
    {
      key: 'surfaces', title: 'Food Contact Surfaces', iconKey: 'wrench',
      calCode: '\u00A7114099\u2013\u00A7114074',
      items: [
        { citation: '\u00A7114099', title: 'Equipment clean and sanitized', status: 'pass',
          evidence: ['All new equipment installed and sanitized before use'],
          detail: 'Sanitizer concentration verified 3x daily (200ppm quat)' },
        { citation: '\u00A7114099.6', title: 'Proper sanitizer concentration', status: 'pass',
          evidence: ['Test strips used at each check \u2014 200 ppm quaternary ammonia'],
          detail: 'Sanitizer bucket refreshed every 4 hours per SOP' },
        { citation: '\u00A7114099', title: 'Ice machine clean (FDA \u00A74-602.11)', status: 'pass',
          evidence: ['New ice machine (Hoshizaki), installed Jan 28, 2026'],
          detail: 'First monthly cleaning due Feb 28, 2026' },
        { citation: '\u00A7114074', title: 'Utensils stored properly', status: 'pass',
          evidence: ['Utensils stored handles-up in clean containers'],
          detail: 'All new utensil storage set up per plan review' },
      ],
    },
    {
      key: 'employee', title: 'Employee Health & Hygiene', iconKey: 'users',
      calCode: '\u00A7113948\u2013\u00A7113961',
      items: [
        { citation: '\u00A7113948', title: 'Food Handler Cards current', status: 'pass',
          evidence: ['4/4 staff members have current California Food Handler Cards'],
          detail: 'All obtained within 30 days of hire as required' },
        { citation: '\u00A7113953.3', title: 'Proper handwashing observed', status: 'pass',
          evidence: ['Handwashing stations stocked and accessible'],
          detail: 'All staff completed handwashing training at hire' },
        { citation: '\u00A7113961', title: 'No bare hand contact with RTE food', status: 'pass',
          evidence: ['Gloves and utensils used for all RTE food handling'],
          detail: 'Bare hand contact policy posted and enforced' },
        { citation: '\u00A7113949.1', title: 'Employee illness reporting policy', status: 'pass',
          evidence: ['Written illness reporting policy on file'],
          detail: 'Policy signed by all staff at hire' },
      ],
    },
    {
      key: 'facility', title: 'Facility & Operations', iconKey: 'building',
      calCode: '\u00A7114381\u2013\u00A7114259',
      items: [
        { citation: '\u00A7114381', title: 'Health permit current and posted', status: 'pass',
          evidence: ['Stanislaus County Health Permit #2026-STA-00891'],
          detail: 'Issued Jan 28, 2026. Valid through Dec 31, 2026. Posted at main entrance.' },
        { citation: '\u00A7114419.1', title: 'HACCP plan on file (if required)', status: 'pass',
          evidence: ['HACCP plan developed during plan review, on file'],
          detail: '5 CCPs documented: receiving, cooking, cooling, hot holding, reheating' },
        { citation: '\u00A7114259', title: 'Pest control measures in place', status: 'pass',
          evidence: ['Valley Pest Solutions \u2014 initial service Jan 27, 2026'],
          detail: 'Monthly service contract signed. Next service: Feb 27, 2026.' },
        { citation: '\u00A7114245', title: 'Proper waste disposal', status: 'pass',
          evidence: ['Waste removal daily, dumpster area clean'],
          detail: 'Organic waste diversion per SB 1383 in place from opening' },
      ],
    },
    {
      key: 'fire', title: 'Ventilation & Facility Safety', iconKey: 'flame',
      calCode: 'NFPA 96',
      items: [
        { citation: 'NFPA 96 \u00A712.4', title: 'Hood system cleaning current', status: 'pass',
          evidence: ['New Type I hood installed Jan 20, 2026. First cleaning due Apr 20, 2026.'],
          detail: 'Quarterly schedule established with ABC Fire Protection.' },
        { citation: 'NFPA 96-2024 \u00A711.2.2', title: 'Fire suppression system inspected', status: 'pass',
          evidence: ['Initial inspection: Jan 22, 2026 by Valley Fire Systems'],
          detail: 'Next semi-annual inspection due: Jul 22, 2026. All nozzles clear, agent charged.' },
        { citation: 'NFPA 10-2025 \u00A77.3.1', title: 'Fire extinguishers inspected', status: 'pass',
          evidence: ['New extinguishers installed Jan 20, 2026. Annual inspection due Jan 2027.'],
          detail: '2 Class K extinguishers, all current. Tags attached.' },
      ],
    },
  ],
  certifications: {
    cfpms: [
      { name: 'Alex Thompson', certNumber: 'SM-2026-0112', issued: 'Jan 15, 2026', expires: 'Jan 15, 2031', status: 'Active' },
    ],
    foodHandlers: [
      { name: 'Alex Thompson', loc: 'Loc 3', num: 'FH-2026-0112', exp: 'Jan 15, 2029', ok: true },
      { name: 'Lisa Wang', loc: 'Loc 3', num: 'FH-2025-1105', exp: 'Jan 25, 2028', ok: true },
      { name: 'Kevin Nguyen', loc: 'Loc 3', num: 'FH-2026-0198', exp: 'Jan 28, 2029', ok: true },
      { name: 'Amy Patel', loc: 'Loc 3', num: 'FH-2026-0205', exp: 'Feb 1, 2029', ok: true },
    ],
    facilitySafety: [
      { name: 'Alex Thompson', tr: 'Fire Extinguisher', done: 'Jan 20, 2026', next: 'Jan 20, 2027', ok: true },
      { name: 'Lisa Wang', tr: 'Fire Extinguisher', done: 'Jan 20, 2026', next: 'Jan 20, 2027', ok: true },
    ],
  },
};

// ── Exports ──────────────────────────────────────────────────────

export const DEMO_SCENARIOS: Record<string, InspectorScenarioData> = {
  A: scenarioA,
  B: scenarioB,
  C: scenarioC,
};

export const SCENARIO_KEYS = ['A', 'B', 'C'] as const;
export type ScenarioKey = typeof SCENARIO_KEYS[number];
