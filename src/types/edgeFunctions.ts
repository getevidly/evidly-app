/**
 * EDGE-FN-MONITOR-1 — Edge Function Health Monitor Types
 */

// ── Enums ────────────────────────────────────────────────────

export type FunctionCategory =
  | 'intelligence_crawl'
  | 'intelligence_processing'
  | 'intelligence_aggregation'
  | 'intelligence_maintenance'
  | 'notification'
  | 'scoring'
  | 'sales_automation'
  | 'compliance_generation';

export type TriggerType = 'cron' | 'on_demand' | 'event';
export type InvocationStatus = 'running' | 'success' | 'error' | 'timeout';
export type TriggerSource = 'cron' | 'manual' | 'event' | 'chained';
export type HealthStatus = 'healthy' | 'degraded' | 'failed' | 'inactive' | 'on_demand';

export type TimeRange = '24h' | '7d' | '30d';
export type EdgeFnTab = 'registry' | 'cron';

// ── Registry ─────────────────────────────────────────────────

export interface EdgeFunctionEntry {
  id: string;
  function_name: string;
  category: FunctionCategory;
  trigger_type: TriggerType;
  cron_schedule: string | null;
  cron_job_name: string | null;
  description: string | null;
  expected_duration_ms: number | null;
  max_consecutive_failures: number;
  is_monitored: boolean;
  created_at: string;
  updated_at: string;
}

// ── Invocations ──────────────────────────────────────────────

export interface EdgeFunctionInvocation {
  id: string;
  function_name: string;
  invoked_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: InvocationStatus;
  trigger_source: TriggerSource;
  triggered_by: string | null;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  error_type: string | null;
  error_message: string | null;
  error_stack: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Aggregated View ──────────────────────────────────────────

export interface FunctionHealthRow {
  function_name: string;
  category: FunctionCategory;
  trigger_type: TriggerType;
  cron_schedule: string | null;
  description: string | null;
  expected_duration_ms: number | null;
  health: HealthStatus;
  last_invoked: string | null;
  avg_duration_ms: number | null;
  p95_duration_ms: number | null;
  invocations_24h: number;
  errors_24h: number;
  error_rate_24h: number;
  consecutive_errors: number;
}

// ── Cron Jobs ────────────────────────────────────────────────

export interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  nodename: string;
  active: boolean;
  function_name: string | null;  // mapped from registry
  next_run: string | null;
  last_run: string | null;
}

// ── Health Summary ───────────────────────────────────────────

export interface HealthSummary {
  total_deployed: number;
  healthy: number;
  degraded: number;
  failed: number;
  inactive: number;
}

// ── Filters ──────────────────────────────────────────────────

export interface FunctionFilterState {
  search: string;
  category: FunctionCategory | '';
  health: HealthStatus | '';
}

export const EMPTY_FUNCTION_FILTERS: FunctionFilterState = {
  search: '',
  category: '',
  health: '',
};

export const CATEGORY_LABELS: Record<FunctionCategory, string> = {
  intelligence_crawl: 'Intelligence Crawl',
  intelligence_processing: 'Intelligence Processing',
  intelligence_aggregation: 'Intelligence Aggregation',
  intelligence_maintenance: 'Intelligence Maintenance',
  notification: 'Notification',
  scoring: 'Scoring',
  sales_automation: 'Sales Automation',
  compliance_generation: 'Compliance Generation',
};

export const DEFAULT_PAYLOADS: Record<string, Record<string, unknown>> = {
  'crawl-code-monitor': { manual_trigger: true },
  'triage-signal': { signal_id: '' },
  'route-arthur-alert': { game_plan_id: '' },
  'notify-affected-clients': { signal_id: '' },
  'send-arthur-digest': { manual_trigger: true },
  'send-client-digest': { manual_trigger: true },
  'draft-prospect-outreach': { signal_id: '', prospect_id: '' },
  'generate-haccp-plan': { location_id: '' },
  'calculate-facility-safety-score': { location_id: '' },
  'intel-crawl-recalls': { manual_trigger: true },
  'intel-crawl-inspections': { manual_trigger: true },
  'intel-crawl-environmental': { manual_trigger: true },
  'intel-crawl-enforcement': { manual_trigger: true },
  'intel-crawl-benchmarks': { manual_trigger: true },
  'intel-aggregate-benchmarks': { manual_trigger: true },
  'intel-aggregate-penalties': { manual_trigger: true },
  'intel-refresh-freshness': { manual_trigger: true },
  'calculate-compliance-score': { location_id: '', dry_run: true },
};
