/**
 * COMMAND-CENTER-1 — Demo data for Intelligence Command Center
 *
 * Static demo records for all 5 tabs. Pattern follows rfpDemoData.ts.
 */

import type {
  Signal,
  GamePlan,
  PlatformUpdate,
  ClientNotification,
  CrawlExecution,
  CrawlSourceHealth,
  CommandCenterStats,
} from '../types/commandCenter';

// ── Helpers ──────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

function minutesAgo(n: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - n);
  return d.toISOString();
}

// ── Tab 1: Signals ───────────────────────────────────────────

const DEMO_SIGNALS: Signal[] = [
  {
    id: 'sig-001',
    source_id: 'src-fda-recalls',
    source_type: 'fda_recall',
    event_type: 'recall',
    title: 'Class I Recall: Romaine Lettuce — E. coli O157:H7 Contamination',
    summary: 'FDA has issued a Class I recall for romaine lettuce from Salinas Valley. Multiple confirmed E. coli O157:H7 cases linked to distribution in CA, AZ, NV. Affected lot codes: SV-2026-0312 through SV-2026-0318. Immediate removal from all receiving and storage required.',
    severity: 'critical',
    jurisdiction: 'California',
    state_code: 'CA',
    affected_pillars: ['food_safety'],
    raw_data: { recall_number: 'F-0847-2026', classification: 'Class I', firm: 'Central Valley Produce Co.', lot_codes: ['SV-2026-0312', 'SV-2026-0318'] },
    source_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    confidence_score: 0.98,
    status: 'new',
    deferred_until: null,
    escalated_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: hoursAgo(2),
    updated_at: hoursAgo(2),
  },
  {
    id: 'sig-002',
    source_id: 'src-cdph',
    source_type: 'outbreak',
    event_type: 'outbreak',
    title: 'Salmonella Outbreak Investigation — Stanislaus County',
    summary: 'CDPH investigating a cluster of 14 Salmonella Typhimurium cases in Stanislaus County. Epidemiological data suggests a common food service exposure. Two facilities under active investigation. Increased health department scrutiny expected for all food service establishments in the county.',
    severity: 'critical',
    jurisdiction: 'Stanislaus County',
    state_code: 'CA',
    affected_pillars: ['food_safety'],
    raw_data: { case_count: 14, pathogen: 'Salmonella Typhimurium', status: 'active' },
    source_url: null,
    confidence_score: 0.92,
    status: 'new',
    deferred_until: null,
    escalated_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: hoursAgo(5),
    updated_at: hoursAgo(5),
  },
  {
    id: 'sig-003',
    source_id: 'src-fresno-health',
    source_type: 'health_dept',
    event_type: 'enforcement_surge',
    title: 'Fresno County: Hood Cleaning Enforcement Surge (+47% Citations)',
    summary: 'Fresno County Environmental Health has increased hood/exhaust cleaning enforcement. Citations up 47% quarter-over-quarter. 3 closures in last 30 days specifically for exhaust system violations. All facilities should verify hood cleaning schedules and documentation.',
    severity: 'high',
    jurisdiction: 'Fresno County',
    state_code: 'CA',
    affected_pillars: ['facility_safety'],
    raw_data: { citation_increase: 0.47, closures: 3, period: 'Q1 2026' },
    source_url: null,
    confidence_score: 0.88,
    status: 'reviewed',
    deferred_until: null,
    escalated_at: null,
    reviewed_by: 'arthur@getevidly.com',
    reviewed_at: hoursAgo(1),
    review_notes: 'Confirmed with county data. Need to notify affected clients.',
    created_at: daysAgo(1),
    updated_at: hoursAgo(1),
  },
  {
    id: 'sig-004',
    source_id: 'src-ca-legislative',
    source_type: 'legislative',
    event_type: 'regulatory_change',
    title: 'AB-2890: Expanded Food Handler Certification Requirements',
    summary: 'Assembly Bill 2890 passed committee vote. Would require all food handlers (not just managers) to hold ANSI-accredited certification. Effective date: January 2027 if signed. Impacts staffing workflows and training schedules for all California food service operations.',
    severity: 'high',
    jurisdiction: 'California',
    state_code: 'CA',
    affected_pillars: ['food_safety', 'vendor_compliance'],
    raw_data: { bill_number: 'AB-2890', status: 'passed_committee', effective_date: '2027-01-01' },
    source_url: 'https://leginfo.legislature.ca.gov',
    confidence_score: 0.85,
    status: 'approved',
    deferred_until: null,
    escalated_at: null,
    reviewed_by: 'arthur@getevidly.com',
    reviewed_at: daysAgo(1),
    review_notes: 'Create game plan for client advisory + checklist template update.',
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
  {
    id: 'sig-005',
    source_id: 'src-nfpa',
    source_type: 'fire_code',
    event_type: 'regulatory_change',
    title: 'NFPA 96 2025 Edition: Updated Hood Cleaning Frequency Requirements',
    summary: 'New NFPA 96 edition changes hood cleaning frequency from "at minimum semi-annually" to risk-based scheduling. High-volume operations may require quarterly cleaning. Fire authorities having jurisdiction (AHJs) beginning to adopt. Scoring rules may need update.',
    severity: 'medium',
    jurisdiction: null,
    state_code: null,
    affected_pillars: ['facility_safety'],
    raw_data: { edition: '2025', section: '11.4', change_type: 'frequency_requirement' },
    source_url: 'https://www.nfpa.org/codes-and-standards',
    confidence_score: 0.82,
    status: 'deferred',
    deferred_until: daysAgo(-14),
    escalated_at: null,
    reviewed_by: 'arthur@getevidly.com',
    reviewed_at: daysAgo(5),
    review_notes: 'Deferred — monitoring AHJ adoption timeline. Revisit in 2 weeks.',
    created_at: daysAgo(7),
    updated_at: daysAgo(5),
  },
  {
    id: 'sig-006',
    source_id: 'src-competitor',
    source_type: 'competitor',
    event_type: 'competitor_activity',
    title: 'Competitor Closure: 2 Restaurants in Merced County — Critical Violations',
    summary: 'Two competing restaurants in Merced County closed by health department for critical violations (cockroach activity, improper food storage temps). May drive traffic to EvidLY client locations. Opportunity for proactive compliance marketing.',
    severity: 'medium',
    jurisdiction: 'Merced County',
    state_code: 'CA',
    affected_pillars: [],
    raw_data: { businesses: ['Golden Dragon', 'Taco Express'], violation_types: ['pest_activity', 'temperature_abuse'] },
    source_url: null,
    confidence_score: 0.75,
    status: 'new',
    deferred_until: null,
    escalated_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: 'sig-007',
    source_id: 'src-industry',
    source_type: 'industry',
    event_type: 'benchmark_shift',
    title: 'Industry Benchmark Update: Average Compliance Score Down 2.3 Points',
    summary: 'National Restaurant Association Q1 2026 compliance benchmark report shows industry-wide average compliance score dropped 2.3 points to 74.2. Primary drivers: staffing shortages affecting checklist completion rates and temperature monitoring gaps. EvidLY client average: 82.1 (well above benchmark).',
    severity: 'low',
    jurisdiction: null,
    state_code: null,
    affected_pillars: ['food_safety', 'facility_safety'],
    raw_data: { benchmark_score: 74.2, delta: -2.3, evidly_avg: 82.1, period: 'Q1 2026' },
    source_url: null,
    confidence_score: 0.90,
    status: 'new',
    deferred_until: null,
    escalated_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: 'sig-008',
    source_id: 'src-weather',
    source_type: 'weather',
    event_type: 'weather_risk',
    title: 'Extreme Heat Advisory: Central Valley — Power Outage Risk',
    summary: 'NWS issued extreme heat advisory for Central Valley through Friday. Temperatures exceeding 110\u00B0F expected. PG&E has warned of potential rolling blackouts. Food service operations should verify generator readiness and emergency temp monitoring protocols.',
    severity: 'low',
    jurisdiction: 'Central Valley',
    state_code: 'CA',
    affected_pillars: ['food_safety'],
    raw_data: { forecast_high: 112, blackout_risk: 'elevated', duration_days: 4 },
    source_url: 'https://weather.gov',
    confidence_score: 0.95,
    status: 'escalated',
    deferred_until: null,
    escalated_at: hoursAgo(6),
    reviewed_by: 'arthur@getevidly.com',
    reviewed_at: hoursAgo(6),
    review_notes: 'Escalated to ops team. Need emergency notification to all Central Valley clients.',
    created_at: hoursAgo(8),
    updated_at: hoursAgo(6),
  },
];

// ── Tab 2: Game Plans ────────────────────────────────────────

const DEMO_GAME_PLANS: GamePlan[] = [
  {
    id: 'gp-001',
    signal_id: 'sig-001',
    title: 'E. coli Recall Response — Romaine Lettuce',
    description: 'Immediate response plan for the Class I romaine lettuce recall. Notify affected clients, update receiving checklists, and verify cold storage compliance.',
    priority: 'critical',
    status: 'active',
    tasks: [
      { id: 'gp-001-t1', title: 'Send urgent recall alert to all CA/AZ/NV clients', status: 'completed', assignee: 'ops@getevidly.com', due_date: daysAgo(-1), completed_at: hoursAgo(1) },
      { id: 'gp-001-t2', title: 'Update receiving checklist to flag Salinas Valley romaine', status: 'completed', assignee: 'arthur@getevidly.com', due_date: daysAgo(-1), completed_at: hoursAgo(2) },
      { id: 'gp-001-t3', title: 'Add lot code verification step to daily opening checklist', status: 'in_progress', assignee: 'arthur@getevidly.com', due_date: daysAgo(0), completed_at: null },
      { id: 'gp-001-t4', title: 'Draft follow-up advisory for clients who confirmed receiving affected product', status: 'pending', assignee: null, due_date: daysAgo(-2), completed_at: null },
      { id: 'gp-001-t5', title: 'Archive recall when FDA marks as terminated', status: 'pending', assignee: null, due_date: null, completed_at: null },
    ],
    task_status: { total: 5, completed: 2, in_progress: 1 },
    completion_notes: null,
    platform_update_id: null,
    created_by: 'arthur@getevidly.com',
    created_at: hoursAgo(3),
    updated_at: hoursAgo(1),
  },
  {
    id: 'gp-002',
    signal_id: 'sig-004',
    title: 'AB-2890 Preparation — Food Handler Certification Expansion',
    description: 'Prepare clients and platform for expanded food handler certification requirements if AB-2890 passes.',
    priority: 'high',
    status: 'active',
    tasks: [
      { id: 'gp-002-t1', title: 'Draft client advisory about AB-2890 implications', status: 'completed', assignee: 'arthur@getevidly.com', due_date: daysAgo(1), completed_at: daysAgo(1) },
      { id: 'gp-002-t2', title: 'Update training module to include ANSI certification path', status: 'in_progress', assignee: 'ops@getevidly.com', due_date: daysAgo(-7), completed_at: null },
      { id: 'gp-002-t3', title: 'Add certification tracking fields to team management', status: 'pending', assignee: null, due_date: daysAgo(-30), completed_at: null },
    ],
    task_status: { total: 3, completed: 1, in_progress: 1 },
    completion_notes: null,
    platform_update_id: null,
    created_by: 'arthur@getevidly.com',
    created_at: daysAgo(2),
    updated_at: daysAgo(1),
  },
  {
    id: 'gp-003',
    signal_id: 'sig-003',
    title: 'Fresno Hood Cleaning Enforcement Response',
    description: 'Update facility safety checklists and scoring for Fresno County clients in response to the enforcement surge.',
    priority: 'medium',
    status: 'draft',
    tasks: [
      { id: 'gp-003-t1', title: 'Review current hood cleaning checklist items for Fresno jurisdiction', status: 'pending', assignee: null, due_date: daysAgo(-3), completed_at: null },
      { id: 'gp-003-t2', title: 'Increase facility safety weight for Fresno County scoring', status: 'pending', assignee: null, due_date: daysAgo(-5), completed_at: null },
      { id: 'gp-003-t3', title: 'Send advisory to Fresno County clients', status: 'pending', assignee: null, due_date: daysAgo(-7), completed_at: null },
    ],
    task_status: { total: 3, completed: 0, in_progress: 0 },
    completion_notes: null,
    platform_update_id: 'pu-002',
    created_by: 'arthur@getevidly.com',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: 'gp-004',
    signal_id: 'sig-007',
    title: 'Benchmark Report — Q1 2026 Client Communication',
    description: 'Leverage positive benchmark data to create marketing/retention content showing EvidLY client outperformance.',
    priority: 'low',
    status: 'completed',
    tasks: [
      { id: 'gp-004-t1', title: 'Generate per-client benchmark comparison cards', status: 'completed', assignee: 'ops@getevidly.com', due_date: daysAgo(3), completed_at: daysAgo(2) },
      { id: 'gp-004-t2', title: 'Send benchmark email to all active clients', status: 'completed', assignee: 'ops@getevidly.com', due_date: daysAgo(1), completed_at: daysAgo(1) },
      { id: 'gp-004-t3', title: 'Update dashboard benchmark widget with Q1 data', status: 'completed', assignee: 'arthur@getevidly.com', due_date: daysAgo(1), completed_at: daysAgo(1) },
    ],
    task_status: { total: 3, completed: 3, in_progress: 0 },
    completion_notes: 'All tasks completed. Benchmark email sent to 142 active clients.',
    platform_update_id: null,
    created_by: 'arthur@getevidly.com',
    created_at: daysAgo(5),
    updated_at: daysAgo(1),
  },
];

// ── Tab 3: Platform Updates ──────────────────────────────────

const DEMO_PLATFORM_UPDATES: PlatformUpdate[] = [
  {
    id: 'pu-001',
    signal_id: 'sig-005',
    title: 'Update Fresno County Scoring: Facility Safety Weight Adjustment',
    description: 'Increase facility safety weight from 35% to 40% for Fresno County jurisdiction based on enforcement surge data.',
    update_type: 'scoring_rule',
    target_entity: 'jurisdiction:fresno_county',
    changes_preview: {
      before: { facility_safety_weight: 0.35, food_safety_weight: 0.45, vendor_compliance_weight: 0.20 },
      after: { facility_safety_weight: 0.40, food_safety_weight: 0.42, vendor_compliance_weight: 0.18 },
    },
    status: 'applied',
    applied_by: 'arthur@getevidly.com',
    applied_at: daysAgo(2),
    rolled_back_by: null,
    rolled_back_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
  },
  {
    id: 'pu-002',
    signal_id: 'sig-003',
    title: 'Add Hood Cleaning Verification to Daily Opening Checklist',
    description: 'Add a new checklist item requiring visual hood/exhaust verification during opening procedures for all Fresno County locations.',
    update_type: 'checklist_item',
    target_entity: 'checklist:daily_opening',
    changes_preview: {
      before: { items: ['Check walk-in temps', 'Verify sanitizer concentration', 'Review prep list'] },
      after: { items: ['Check walk-in temps', 'Verify sanitizer concentration', 'Review prep list', 'Verify hood/exhaust system clean and operational'] },
    },
    status: 'pending',
    applied_by: null,
    applied_at: null,
    rolled_back_by: null,
    rolled_back_at: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: 'pu-003',
    signal_id: null,
    title: 'Rollback: Stanislaus County Temperature Threshold Change',
    description: 'Previously lowered hot-holding threshold from 135\u00B0F to 130\u00B0F based on draft regulation. Regulation was not adopted — rolling back to 135\u00B0F.',
    update_type: 'jurisdiction_record',
    target_entity: 'jurisdiction:stanislaus_county',
    changes_preview: {
      before: { hot_holding_min: 130 },
      after: { hot_holding_min: 135 },
    },
    status: 'rolled_back',
    applied_by: 'arthur@getevidly.com',
    applied_at: daysAgo(14),
    rolled_back_by: 'arthur@getevidly.com',
    rolled_back_at: daysAgo(3),
    created_at: daysAgo(14),
    updated_at: daysAgo(3),
  },
];

// ── Tab 4: Client Notifications ──────────────────────────────

const DEMO_NOTIFICATIONS: ClientNotification[] = [
  {
    id: 'cn-001',
    signal_id: 'sig-001',
    title: 'URGENT: FDA Class I Recall — Romaine Lettuce',
    body: 'FDA has issued a Class I recall for romaine lettuce from Salinas Valley (lot codes SV-2026-0312 through SV-2026-0318). Immediately check your receiving logs and remove any affected product from storage. Update your daily checklist to include lot code verification for all romaine lettuce received this week.',
    notification_type: 'alert',
    severity: 'critical',
    target_audience: 'by_jurisdiction',
    target_filter: { jurisdictions: ['California', 'Arizona', 'Nevada'] },
    status: 'sent',
    approved_by: 'arthur@getevidly.com',
    approved_at: hoursAgo(3),
    sent_at: hoursAgo(2),
    sent_count: 87,
    error_message: null,
    created_at: hoursAgo(4),
    updated_at: hoursAgo(2),
  },
  {
    id: 'cn-002',
    signal_id: 'sig-002',
    title: 'Health Advisory: Salmonella Investigation — Stanislaus County',
    body: 'CDPH is investigating a Salmonella outbreak in Stanislaus County. While your facility is not implicated, expect heightened scrutiny during upcoming inspections. Ensure all temperature logs are current and food safety checklists are completed daily.',
    notification_type: 'advisory',
    severity: 'high',
    target_audience: 'by_jurisdiction',
    target_filter: { jurisdictions: ['Stanislaus County'] },
    status: 'approved',
    approved_by: 'arthur@getevidly.com',
    approved_at: hoursAgo(1),
    sent_at: null,
    sent_count: 0,
    error_message: null,
    created_at: hoursAgo(4),
    updated_at: hoursAgo(1),
  },
  {
    id: 'cn-003',
    signal_id: 'sig-003',
    title: 'Facility Safety Alert: Fresno County Enforcement Increase',
    body: 'Fresno County has increased hood cleaning enforcement by 47%. Please verify your hood cleaning schedule is current and all documentation is uploaded to EvidLY. Three facilities have been closed in the last 30 days for exhaust system violations.',
    notification_type: 'alert',
    severity: 'high',
    target_audience: 'by_jurisdiction',
    target_filter: { jurisdictions: ['Fresno County'] },
    status: 'sent',
    approved_by: 'arthur@getevidly.com',
    approved_at: daysAgo(1),
    sent_at: daysAgo(1),
    sent_count: 23,
    error_message: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: 'cn-004',
    signal_id: 'sig-004',
    title: 'Legislative Update: AB-2890 Food Handler Certification',
    body: 'AB-2890 has passed committee and would expand food handler certification requirements to all staff, not just managers. If signed, the effective date is January 2027. We recommend beginning to plan training schedules now. EvidLY will update training tracking features accordingly.',
    notification_type: 'update',
    severity: 'medium',
    target_audience: 'all',
    target_filter: {},
    status: 'draft',
    approved_by: null,
    approved_at: null,
    sent_at: null,
    sent_count: 0,
    error_message: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: 'cn-005',
    signal_id: 'sig-008',
    title: 'Weather Alert: Central Valley Extreme Heat — Power Outage Risk',
    body: 'NWS has issued an extreme heat advisory for the Central Valley. Rolling blackouts are possible. Please verify emergency generator readiness and ensure temperature monitoring protocols are in place for power outage scenarios.',
    notification_type: 'alert',
    severity: 'critical',
    target_audience: 'by_jurisdiction',
    target_filter: { jurisdictions: ['Fresno County', 'Merced County', 'Stanislaus County', 'Tulare County', 'Kings County', 'Kern County'] },
    status: 'cancelled',
    approved_by: null,
    approved_at: null,
    sent_at: null,
    sent_count: 0,
    error_message: 'Cancelled — heat advisory downgraded by NWS.',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(4),
  },
];

// ── Tab 5: Crawl Health ──────────────────────────────────────

const SOURCE_NAMES: Record<string, string> = {
  'src-fresno-health': 'Fresno County Environmental Health',
  'src-merced-health': 'Merced County Health Dept',
  'src-stanislaus-health': 'Stanislaus County Health',
  'src-tulare-health': 'Tulare County Health Dept',
  'src-kern-health': 'Kern County Health Dept',
  'src-ca-legislative': 'CA Legislative Tracker',
  'src-fda-recalls': 'FDA Recalls & Safety Alerts',
  'src-cdph': 'CDPH Outbreak Monitoring',
  'src-nfpa': 'NFPA Fire Code Updates',
  'src-calosha': 'CalOSHA Citations',
  'src-weather': 'NWS Weather Risk Monitor',
  'src-competitor': 'Competitor Activity Scanner',
};

function makeCrawl(
  source_id: string,
  minutesBack: number,
  durationMs: number,
  status: 'success' | 'partial' | 'failed',
  found: number,
  newCount: number,
  dupes: number,
  error?: string,
): CrawlExecution {
  const started = minutesAgo(minutesBack);
  return {
    id: `crawl-${source_id}-${minutesBack}`,
    source_id,
    source_name: SOURCE_NAMES[source_id] || source_id,
    started_at: started,
    completed_at: status === 'failed' && error ? minutesAgo(minutesBack - 1) : minutesAgo(minutesBack - Math.round(durationMs / 60000)),
    status,
    events_found: found,
    events_new: newCount,
    events_duplicate: dupes,
    duration_ms: durationMs,
    error_message: error || null,
    metadata: {},
    created_at: started,
  };
}

const DEMO_CRAWL_LOG: CrawlExecution[] = [
  makeCrawl('src-fresno-health', 15, 4200, 'success', 12, 3, 9),
  makeCrawl('src-merced-health', 18, 3800, 'success', 8, 1, 7),
  makeCrawl('src-stanislaus-health', 22, 5100, 'success', 15, 4, 11),
  makeCrawl('src-tulare-health', 30, 3200, 'success', 6, 0, 6),
  makeCrawl('src-kern-health', 35, 12500, 'partial', 22, 5, 14, 'Timeout on page 3 of violation records. Partial data collected.'),
  makeCrawl('src-ca-legislative', 45, 2100, 'success', 3, 1, 2),
  makeCrawl('src-fda-recalls', 60, 1800, 'success', 7, 2, 5),
  makeCrawl('src-cdph', 75, 6400, 'success', 4, 1, 3),
  makeCrawl('src-nfpa', 120, 1500, 'success', 1, 0, 1),
  makeCrawl('src-calosha', 130, 9800, 'failed', 0, 0, 0, 'HTTP 503 — CalOSHA portal maintenance window. Retry scheduled.'),
  makeCrawl('src-weather', 10, 800, 'success', 5, 2, 3),
  makeCrawl('src-competitor', 90, 15200, 'success', 18, 3, 15),
  // Older runs
  makeCrawl('src-fresno-health', 255, 4500, 'success', 10, 2, 8),
  makeCrawl('src-merced-health', 260, 3600, 'success', 7, 1, 6),
  makeCrawl('src-fda-recalls', 300, 1900, 'success', 5, 1, 4),
  makeCrawl('src-cdph', 315, 7200, 'partial', 3, 0, 3, 'Rate limited after 3 pages.'),
  makeCrawl('src-calosha', 370, 11000, 'success', 9, 2, 7),
  makeCrawl('src-weather', 250, 900, 'success', 3, 1, 2),
  makeCrawl('src-ca-legislative', 285, 2300, 'success', 2, 0, 2),
  makeCrawl('src-competitor', 330, 14800, 'success', 20, 4, 16),
];

const DEMO_SOURCE_HEALTH: CrawlSourceHealth[] = [
  { source_id: 'src-fresno-health', source_name: 'Fresno County Environmental Health', source_type: 'health_dept', status: 'healthy', last_crawl_at: minutesAgo(15), last_success_at: minutesAgo(15), error_count: 0, uptime_pct: 99.2, avg_duration_ms: 4350, events_last_24h: 5 },
  { source_id: 'src-merced-health', source_name: 'Merced County Health Dept', source_type: 'health_dept', status: 'healthy', last_crawl_at: minutesAgo(18), last_success_at: minutesAgo(18), error_count: 0, uptime_pct: 98.8, avg_duration_ms: 3700, events_last_24h: 2 },
  { source_id: 'src-stanislaus-health', source_name: 'Stanislaus County Health', source_type: 'health_dept', status: 'healthy', last_crawl_at: minutesAgo(22), last_success_at: minutesAgo(22), error_count: 0, uptime_pct: 99.5, avg_duration_ms: 5100, events_last_24h: 4 },
  { source_id: 'src-tulare-health', source_name: 'Tulare County Health Dept', source_type: 'health_dept', status: 'healthy', last_crawl_at: minutesAgo(30), last_success_at: minutesAgo(30), error_count: 0, uptime_pct: 97.1, avg_duration_ms: 3200, events_last_24h: 0 },
  { source_id: 'src-kern-health', source_name: 'Kern County Health Dept', source_type: 'health_dept', status: 'degraded', last_crawl_at: minutesAgo(35), last_success_at: minutesAgo(275), error_count: 2, uptime_pct: 91.3, avg_duration_ms: 11500, events_last_24h: 5 },
  { source_id: 'src-ca-legislative', source_name: 'CA Legislative Tracker', source_type: 'legislative', status: 'healthy', last_crawl_at: minutesAgo(45), last_success_at: minutesAgo(45), error_count: 0, uptime_pct: 99.9, avg_duration_ms: 2200, events_last_24h: 1 },
  { source_id: 'src-fda-recalls', source_name: 'FDA Recalls & Safety Alerts', source_type: 'fda_recall', status: 'healthy', last_crawl_at: minutesAgo(60), last_success_at: minutesAgo(60), error_count: 0, uptime_pct: 99.7, avg_duration_ms: 1850, events_last_24h: 3 },
  { source_id: 'src-cdph', source_name: 'CDPH Outbreak Monitoring', source_type: 'outbreak', status: 'healthy', last_crawl_at: minutesAgo(75), last_success_at: minutesAgo(75), error_count: 0, uptime_pct: 98.2, avg_duration_ms: 6800, events_last_24h: 1 },
  { source_id: 'src-nfpa', source_name: 'NFPA Fire Code Updates', source_type: 'fire_code', status: 'healthy', last_crawl_at: minutesAgo(120), last_success_at: minutesAgo(120), error_count: 0, uptime_pct: 100, avg_duration_ms: 1500, events_last_24h: 0 },
  { source_id: 'src-calosha', source_name: 'CalOSHA Citations', source_type: 'regulatory', status: 'error', last_crawl_at: minutesAgo(130), last_success_at: minutesAgo(370), error_count: 3, uptime_pct: 85.4, avg_duration_ms: 10400, events_last_24h: 2 },
  { source_id: 'src-weather', source_name: 'NWS Weather Risk Monitor', source_type: 'weather', status: 'healthy', last_crawl_at: minutesAgo(10), last_success_at: minutesAgo(10), error_count: 0, uptime_pct: 99.9, avg_duration_ms: 850, events_last_24h: 3 },
  { source_id: 'src-competitor', source_name: 'Competitor Activity Scanner', source_type: 'competitor', status: 'healthy', last_crawl_at: minutesAgo(90), last_success_at: minutesAgo(90), error_count: 0, uptime_pct: 96.8, avg_duration_ms: 15000, events_last_24h: 7 },
];

// ── Stats ────────────────────────────────────────────────────

const DEMO_STATS: CommandCenterStats = {
  pending_signals: DEMO_SIGNALS.filter(s => s.status === 'new').length,
  active_game_plans: DEMO_GAME_PLANS.filter(p => p.status === 'active').length,
  pending_updates: DEMO_PLATFORM_UPDATES.filter(u => u.status === 'pending').length,
  unsent_notifications: DEMO_NOTIFICATIONS.filter(n => n.status === 'draft' || n.status === 'approved').length,
  signals_today: DEMO_SIGNALS.filter(s => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(s.created_at).getTime() >= today.getTime();
  }).length,
  signals_this_week: DEMO_SIGNALS.length,
  crawl_success_rate: Math.round(
    (DEMO_CRAWL_LOG.filter(c => c.status === 'success').length / DEMO_CRAWL_LOG.length) * 100,
  ),
  sources_healthy: DEMO_SOURCE_HEALTH.filter(s => s.status === 'healthy').length,
  sources_total: DEMO_SOURCE_HEALTH.length,
};

// ── Exports ──────────────────────────────────────────────────

export function getDemoSignals(): Signal[] {
  return [...DEMO_SIGNALS];
}

export function getDemoGamePlans(): GamePlan[] {
  return [...DEMO_GAME_PLANS];
}

export function getDemoPlatformUpdates(): PlatformUpdate[] {
  return [...DEMO_PLATFORM_UPDATES];
}

export function getDemoNotifications(): ClientNotification[] {
  return [...DEMO_NOTIFICATIONS];
}

export function getDemoCrawlLog(): CrawlExecution[] {
  return [...DEMO_CRAWL_LOG];
}

export function getDemoSourceHealth(): CrawlSourceHealth[] {
  return [...DEMO_SOURCE_HEALTH];
}

export function getDemoCommandCenterStats(): CommandCenterStats {
  return { ...DEMO_STATS };
}
