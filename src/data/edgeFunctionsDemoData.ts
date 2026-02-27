/**
 * EDGE-FN-MONITOR-1 — Demo data for Edge Function Health Monitor
 */

import type {
  EdgeFunctionEntry,
  EdgeFunctionInvocation,
  FunctionHealthRow,
  CronJob,
  HealthSummary,
  HealthStatus,
} from '../types/edgeFunctions';

// ── Helpers ──────────────────────────────────────────────────

function hoursAgo(n: number): string {
  const d = new Date(); d.setHours(d.getHours() - n); return d.toISOString();
}
function minutesAgo(n: number): string {
  const d = new Date(); d.setMinutes(d.getMinutes() - n); return d.toISOString();
}
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
}
function hoursFromNow(n: number): string {
  const d = new Date(); d.setHours(d.getHours() + n); return d.toISOString();
}
function nextWeekday(day: number, hour: number): string {
  const d = new Date();
  const diff = (day - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ── Registry (18 functions) ──────────────────────────────────

const REGISTRY: EdgeFunctionEntry[] = [
  { id: 'ef-001', function_name: 'crawl-code-monitor', category: 'intelligence_crawl', trigger_type: 'cron', cron_schedule: '0 6 * * *', cron_job_name: 'crawl-code-monitor-daily', description: 'Crawls all intelligence sources, hashes content, creates signals on change', expected_duration_ms: 15000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-002', function_name: 'triage-signal', category: 'intelligence_processing', trigger_type: 'on_demand', cron_schedule: null, cron_job_name: null, description: 'Claude API classifies signal, creates game plan, routes alerts', expected_duration_ms: 8000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-003', function_name: 'route-arthur-alert', category: 'notification', trigger_type: 'on_demand', cron_schedule: null, cron_job_name: null, description: 'Routes game plan to Arthur via SMS/email based on severity', expected_duration_ms: 3000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-004', function_name: 'notify-affected-clients', category: 'notification', trigger_type: 'on_demand', cron_schedule: null, cron_job_name: null, description: 'Matches signal to affected orgs, creates client notifications', expected_duration_ms: 5000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-005', function_name: 'send-arthur-digest', category: 'notification', trigger_type: 'cron', cron_schedule: '0 6 * * 1', cron_job_name: 'send-arthur-digest-mon', description: 'Monday morning intelligence briefing email', expected_duration_ms: 10000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-006', function_name: 'send-client-digest', category: 'notification', trigger_type: 'cron', cron_schedule: '0 7 * * 1', cron_job_name: 'send-client-digest-mon', description: 'Personalized weekly digest to enrolled orgs', expected_duration_ms: 30000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-007', function_name: 'draft-prospect-outreach', category: 'sales_automation', trigger_type: 'on_demand', cron_schedule: null, cron_job_name: null, description: 'Claude API drafts prospect email using signal + penalty data', expected_duration_ms: 10000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-008', function_name: 'generate-haccp-plan', category: 'compliance_generation', trigger_type: 'on_demand', cron_schedule: null, cron_job_name: null, description: 'Claude API generates customized HACCP plan', expected_duration_ms: 15000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-009', function_name: 'calculate-facility-safety-score', category: 'scoring', trigger_type: 'on_demand', cron_schedule: null, cron_job_name: null, description: 'Reads fire inspection data, outputs fire pillar score', expected_duration_ms: 3000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-010', function_name: 'intel-crawl-recalls', category: 'intelligence_crawl', trigger_type: 'cron', cron_schedule: '0 */6 * * *', cron_job_name: 'intel-recalls-6h', description: 'FDA/USDA RSS + API \u2192 intel_recalls', expected_duration_ms: 5000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-011', function_name: 'intel-crawl-inspections', category: 'intelligence_crawl', trigger_type: 'cron', cron_schedule: '0 2 * * *', cron_job_name: 'intel-inspections-daily', description: 'County health dept pages via Firecrawl \u2192 intel_public_inspections', expected_duration_ms: 60000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-012', function_name: 'intel-crawl-environmental', category: 'intelligence_crawl', trigger_type: 'cron', cron_schedule: '0 * * * *', cron_job_name: 'intel-env-hourly', description: 'NOAA API + CalOSHA \u2192 intel_environmental_alerts', expected_duration_ms: 5000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-013', function_name: 'intel-crawl-enforcement', category: 'intelligence_crawl', trigger_type: 'cron', cron_schedule: '0 3 * * 2', cron_job_name: 'intel-enforcement-weekly', description: 'County closure lists + OSHA \u2192 intel_enforcement_actions', expected_duration_ms: 30000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-014', function_name: 'intel-crawl-benchmarks', category: 'intelligence_crawl', trigger_type: 'cron', cron_schedule: '0 4 1 * *', cron_job_name: 'intel-benchmarks-monthly', description: 'BLS API + PDF extraction \u2192 intel_industry_benchmarks', expected_duration_ms: 120000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-015', function_name: 'intel-aggregate-benchmarks', category: 'intelligence_aggregation', trigger_type: 'cron', cron_schedule: '0 5 * * *', cron_job_name: 'intel-agg-benchmarks-daily', description: 'Aggregates inspections \u2192 intel_inspection_benchmarks', expected_duration_ms: 10000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-016', function_name: 'intel-aggregate-penalties', category: 'intelligence_aggregation', trigger_type: 'cron', cron_schedule: '0 4 * * 0', cron_job_name: 'intel-agg-penalties-weekly', description: 'Aggregates enforcement \u2192 intel_penalty_benchmarks', expected_duration_ms: 10000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-017', function_name: 'intel-refresh-freshness', category: 'intelligence_maintenance', trigger_type: 'cron', cron_schedule: '0 6 * * *', cron_job_name: 'intel-freshness-daily', description: 'Updates intel_data_freshness for all streams', expected_duration_ms: 3000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
  { id: 'ef-018', function_name: 'calculate-compliance-score', category: 'scoring', trigger_type: 'on_demand', cron_schedule: null, cron_job_name: null, description: 'Jurisdiction-native inspection readiness score', expected_duration_ms: 5000, max_consecutive_failures: 3, is_monitored: true, created_at: daysAgo(30), updated_at: daysAgo(0) },
];

// ── Invocations (simulated ~60 records) ──────────────────────

function inv(
  fn: string, minutesBack: number, durMs: number, status: 'success' | 'error' | 'timeout',
  src: 'cron' | 'manual' | 'chained' = 'cron',
  errorInfo?: { type: string; message: string; stack?: string },
  meta?: Record<string, unknown>,
): EdgeFunctionInvocation {
  const invAt = minutesAgo(minutesBack);
  return {
    id: `inv-${fn}-${minutesBack}`,
    function_name: fn,
    invoked_at: invAt,
    completed_at: status === 'running' ? null : minutesAgo(minutesBack - Math.max(1, Math.round(durMs / 60000))),
    duration_ms: durMs,
    status,
    trigger_source: src,
    triggered_by: src === 'manual' ? 'arthur@getevidly.com' : null,
    request_payload: src === 'manual' ? { manual_trigger: true } : {},
    response_payload: status === 'success' ? { ok: true } : {},
    error_type: errorInfo?.type || null,
    error_message: errorInfo?.message || null,
    error_stack: errorInfo?.stack || null,
    metadata: meta || {},
    created_at: invAt,
  };
}

const INVOCATIONS: EdgeFunctionInvocation[] = [
  // crawl-code-monitor — healthy, ran today at 6am
  inv('crawl-code-monitor', 120, 12400, 'success', 'cron', undefined, { sources_crawled: 64, signals_detected: 2 }),
  inv('crawl-code-monitor', 1560, 13100, 'success', 'cron', undefined, { sources_crawled: 64, signals_detected: 0 }),
  inv('crawl-code-monitor', 3000, 14200, 'success', 'cron', undefined, { sources_crawled: 64, signals_detected: 1 }),

  // triage-signal — healthy, called on demand
  inv('triage-signal', 115, 7200, 'success', 'chained', undefined, { classification: 'regulatory_change', severity: 'high' }),
  inv('triage-signal', 118, 6800, 'success', 'chained', undefined, { classification: 'recall', severity: 'critical' }),
  inv('triage-signal', 1555, 8100, 'success', 'chained'),

  // route-arthur-alert — healthy
  inv('route-arthur-alert', 114, 2100, 'success', 'chained'),
  inv('route-arthur-alert', 1554, 1800, 'success', 'chained'),

  // notify-affected-clients — healthy
  inv('notify-affected-clients', 113, 4200, 'success', 'chained', undefined, { notifications_sent: 23 }),

  // send-arthur-digest — healthy, ran Monday
  inv('send-arthur-digest', 2880, 9200, 'success', 'cron', undefined, { items_in_digest: 7 }),

  // send-client-digest — healthy, ran Monday
  inv('send-client-digest', 2820, 28400, 'success', 'cron', undefined, { clients_sent: 42 }),

  // draft-prospect-outreach — inactive, never called
  // (no invocations)

  // generate-haccp-plan — on-demand, last called 5 days ago
  inv('generate-haccp-plan', 7200, 14200, 'success', 'manual', undefined, { plan_pages: 12 }),

  // calculate-facility-safety-score — healthy
  inv('calculate-facility-safety-score', 45, 2800, 'success', 'chained'),
  inv('calculate-facility-safety-score', 180, 3100, 'success', 'chained'),
  inv('calculate-facility-safety-score', 360, 2600, 'success', 'manual'),

  // intel-crawl-recalls — healthy, every 6h
  inv('intel-crawl-recalls', 60, 3200, 'success', 'cron', undefined, { recalls_found: 2, new: 1 }),
  inv('intel-crawl-recalls', 420, 2800, 'success', 'cron', undefined, { recalls_found: 0 }),
  inv('intel-crawl-recalls', 780, 3400, 'success', 'cron', undefined, { recalls_found: 1, new: 0 }),
  inv('intel-crawl-recalls', 1140, 3100, 'success', 'cron', undefined, { recalls_found: 0 }),

  // intel-crawl-inspections — FAILED, last run 3 days ago
  inv('intel-crawl-inspections', 4320, 1200, 'error', 'cron',
    { type: '403', message: 'Fresno County portal returned 403 Forbidden', stack: 'FetchError: 403 Forbidden\n  at crawlInspections (file:///src/index.ts:84:15)\n  at handler (file:///src/index.ts:12:5)' }),
  inv('intel-crawl-inspections', 5760, 1100, 'error', 'cron',
    { type: '403', message: 'Fresno County portal returned 403 Forbidden' }),
  inv('intel-crawl-inspections', 7200, 58000, 'success', 'cron', undefined, { inspections_found: 145, new: 12 }),

  // intel-crawl-environmental — degraded, some errors
  inv('intel-crawl-environmental', 30, 1800, 'success', 'cron', undefined, { alerts_found: 3 }),
  inv('intel-crawl-environmental', 90, 30000, 'timeout', 'cron',
    { type: 'timeout', message: 'NOAA API timeout after 30s' }),
  inv('intel-crawl-environmental', 150, 1600, 'success', 'cron', undefined, { alerts_found: 1 }),
  inv('intel-crawl-environmental', 210, 1900, 'success', 'cron'),
  inv('intel-crawl-environmental', 270, 30000, 'timeout', 'cron',
    { type: 'timeout', message: 'NOAA API timeout after 30s' }),
  inv('intel-crawl-environmental', 330, 1500, 'success', 'cron'),
  inv('intel-crawl-environmental', 390, 1700, 'success', 'cron'),
  inv('intel-crawl-environmental', 450, 1400, 'success', 'cron'),
  inv('intel-crawl-environmental', 510, 1800, 'success', 'cron'),
  inv('intel-crawl-environmental', 570, 1600, 'success', 'cron'),
  inv('intel-crawl-environmental', 630, 1500, 'success', 'cron'),
  inv('intel-crawl-environmental', 690, 1900, 'success', 'cron'),

  // intel-crawl-enforcement — healthy, weekly Tuesday
  inv('intel-crawl-enforcement', 8640, 28000, 'success', 'cron', undefined, { actions_found: 8, new: 3 }),

  // intel-crawl-benchmarks — healthy, monthly
  inv('intel-crawl-benchmarks', 43200, 115000, 'success', 'cron', undefined, { benchmarks_updated: 24 }),

  // intel-aggregate-benchmarks — healthy
  inv('intel-aggregate-benchmarks', 180, 8400, 'success', 'cron', undefined, { records_aggregated: 1240 }),
  inv('intel-aggregate-benchmarks', 1620, 9100, 'success', 'cron'),

  // intel-aggregate-penalties — healthy
  inv('intel-aggregate-penalties', 10080, 9800, 'success', 'cron', undefined, { penalties_aggregated: 87 }),

  // intel-refresh-freshness — healthy
  inv('intel-refresh-freshness', 120, 2400, 'success', 'cron', undefined, { streams_refreshed: 12 }),
  inv('intel-refresh-freshness', 1560, 2200, 'success', 'cron'),

  // calculate-compliance-score — healthy
  inv('calculate-compliance-score', 20, 4200, 'success', 'chained'),
  inv('calculate-compliance-score', 85, 3800, 'success', 'manual'),
  inv('calculate-compliance-score', 240, 4500, 'success', 'chained'),
  inv('calculate-compliance-score', 480, 3900, 'success', 'chained'),
];

// ── Health Rows (computed) ───────────────────────────────────

function computeHealth(entry: EdgeFunctionEntry, invocations: EdgeFunctionInvocation[]): FunctionHealthRow {
  const fnInvocations = invocations.filter(i => i.function_name === entry.function_name);
  const last24h = fnInvocations.filter(i => Date.now() - new Date(i.invoked_at).getTime() < 24 * 60 * 60 * 1000);
  const last7d = fnInvocations.filter(i => Date.now() - new Date(i.invoked_at).getTime() < 7 * 24 * 60 * 60 * 1000);

  const invocations24h = last24h.length;
  const errors24h = last24h.filter(i => i.status === 'error' || i.status === 'timeout').length;
  const errorRate = invocations24h > 0 ? errors24h / invocations24h : 0;

  const successes7d = last7d.filter(i => i.status === 'success' && i.duration_ms);
  const avgDuration = successes7d.length > 0 ? Math.round(successes7d.reduce((s, i) => s + (i.duration_ms || 0), 0) / successes7d.length) : null;
  const sortedDurations = successes7d.map(i => i.duration_ms || 0).sort((a, b) => a - b);
  const p95 = sortedDurations.length > 0 ? sortedDurations[Math.floor(sortedDurations.length * 0.95)] : null;

  const lastInvoked = fnInvocations.length > 0 ? fnInvocations[0].invoked_at : null;

  // Consecutive errors
  let consecutive = 0;
  for (const i of fnInvocations) {
    if (i.status === 'error' || i.status === 'timeout') consecutive++;
    else break;
  }

  // Health status
  let health: HealthStatus;
  if (entry.trigger_type === 'on_demand') {
    if (!lastInvoked) health = 'on_demand';
    else if (consecutive >= entry.max_consecutive_failures) health = 'failed';
    else if (errorRate > 0.05) health = 'degraded';
    else health = 'on_demand';
  } else {
    if (!lastInvoked) health = 'inactive';
    else if (consecutive >= entry.max_consecutive_failures || errorRate > 0.5) health = 'failed';
    else if (errorRate > 0.05) health = 'degraded';
    else health = 'healthy';
  }

  return {
    function_name: entry.function_name,
    category: entry.category,
    trigger_type: entry.trigger_type,
    cron_schedule: entry.cron_schedule,
    description: entry.description,
    expected_duration_ms: entry.expected_duration_ms,
    health,
    last_invoked: lastInvoked,
    avg_duration_ms: avgDuration,
    p95_duration_ms: p95,
    invocations_24h: invocations24h,
    errors_24h: errors24h,
    error_rate_24h: Math.round(errorRate * 100),
    consecutive_errors: consecutive,
  };
}

// ── Cron Jobs ────────────────────────────────────────────────

const CRON_JOBS: CronJob[] = [
  { jobid: 1, jobname: 'crawl-code-monitor-daily', schedule: '0 6 * * *', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/crawl-code-monitor'...)", nodename: '', active: true, function_name: 'crawl-code-monitor', next_run: hoursFromNow(8), last_run: hoursAgo(2) },
  { jobid: 2, jobname: 'intel-recalls-6h', schedule: '0 */6 * * *', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-crawl-recalls'...)", nodename: '', active: true, function_name: 'intel-crawl-recalls', next_run: hoursFromNow(5), last_run: hoursAgo(1) },
  { jobid: 3, jobname: 'intel-inspections-daily', schedule: '0 2 * * *', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-crawl-inspections'...)", nodename: '', active: true, function_name: 'intel-crawl-inspections', next_run: hoursFromNow(20), last_run: daysAgo(3) },
  { jobid: 4, jobname: 'intel-env-hourly', schedule: '0 * * * *', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-crawl-environmental'...)", nodename: '', active: true, function_name: 'intel-crawl-environmental', next_run: minutesAgo(-30), last_run: minutesAgo(30) },
  { jobid: 5, jobname: 'intel-enforcement-weekly', schedule: '0 3 * * 2', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-crawl-enforcement'...)", nodename: '', active: true, function_name: 'intel-crawl-enforcement', next_run: nextWeekday(2, 3), last_run: daysAgo(6) },
  { jobid: 6, jobname: 'intel-benchmarks-monthly', schedule: '0 4 1 * *', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-crawl-benchmarks'...)", nodename: '', active: true, function_name: 'intel-crawl-benchmarks', next_run: hoursFromNow(720), last_run: daysAgo(25) },
  { jobid: 7, jobname: 'intel-agg-benchmarks-daily', schedule: '0 5 * * *', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-aggregate-benchmarks'...)", nodename: '', active: true, function_name: 'intel-aggregate-benchmarks', next_run: hoursFromNow(7), last_run: hoursAgo(3) },
  { jobid: 8, jobname: 'intel-agg-penalties-weekly', schedule: '0 4 * * 0', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-aggregate-penalties'...)", nodename: '', active: true, function_name: 'intel-aggregate-penalties', next_run: nextWeekday(0, 4), last_run: daysAgo(7) },
  { jobid: 9, jobname: 'intel-freshness-daily', schedule: '0 6 * * *', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/intel-refresh-freshness'...)", nodename: '', active: true, function_name: 'intel-refresh-freshness', next_run: hoursFromNow(8), last_run: hoursAgo(2) },
  { jobid: 10, jobname: 'send-arthur-digest-mon', schedule: '0 6 * * 1', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/send-arthur-digest'...)", nodename: '', active: true, function_name: 'send-arthur-digest', next_run: nextWeekday(1, 6), last_run: daysAgo(2) },
  { jobid: 11, jobname: 'send-client-digest-mon', schedule: '0 7 * * 1', command: "SELECT net.http_post(url:='...supabase.co/functions/v1/send-client-digest'...)", nodename: '', active: true, function_name: 'send-client-digest', next_run: nextWeekday(1, 7), last_run: daysAgo(2) },
  { jobid: 12, jobname: 'cleanup-invocation-logs', schedule: '0 3 1 * *', command: "DELETE FROM edge_function_invocations WHERE invoked_at < now() - interval '90 days'", nodename: '', active: true, function_name: null, next_run: hoursFromNow(720), last_run: daysAgo(25) },
];

// ── Exports ──────────────────────────────────────────────────

export function getDemoRegistry(): EdgeFunctionEntry[] {
  return [...REGISTRY];
}

export function getDemoInvocations(): EdgeFunctionInvocation[] {
  return [...INVOCATIONS].sort((a, b) => new Date(b.invoked_at).getTime() - new Date(a.invoked_at).getTime());
}

export function getDemoHealthRows(): FunctionHealthRow[] {
  return REGISTRY.map(e => computeHealth(e, INVOCATIONS));
}

export function getDemoCronJobs(): CronJob[] {
  return [...CRON_JOBS];
}

export function getDemoHealthSummary(): HealthSummary {
  const rows = getDemoHealthRows();
  return {
    total_deployed: rows.length,
    healthy: rows.filter(r => r.health === 'healthy').length,
    degraded: rows.filter(r => r.health === 'degraded').length,
    failed: rows.filter(r => r.health === 'failed').length,
    inactive: rows.filter(r => r.health === 'inactive' || r.health === 'on_demand').length,
  };
}

export function getDemoErrors(): EdgeFunctionInvocation[] {
  return INVOCATIONS
    .filter(i => i.status === 'error' || i.status === 'timeout')
    .sort((a, b) => new Date(b.invoked_at).getTime() - new Date(a.invoked_at).getTime());
}
