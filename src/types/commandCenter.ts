/**
 * COMMAND-CENTER-1 — Intelligence Command Center Types
 *
 * TypeScript interfaces for all 5 tabs of the admin Command Center:
 *   1. Signal Queue
 *   2. Game Plans
 *   3. Platform Updates
 *   4. Client Notifications
 *   5. Crawl Health
 */

// ── Shared enums / unions ────────────────────────────────────

export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low';
export type SignalStatus = 'new' | 'reviewed' | 'approved' | 'dismissed' | 'deferred' | 'escalated';
export type SignalSourceType =
  | 'health_dept' | 'legislative' | 'fda_recall' | 'outbreak'
  | 'regulatory' | 'osha' | 'competitor' | 'weather'
  | 'industry' | 'nps' | 'supply_chain' | 'cdph' | 'fire_code';

export type GamePlanPriority = 'critical' | 'high' | 'medium' | 'low';
export type GamePlanStatus = 'draft' | 'active' | 'completed' | 'archived';
export type GamePlanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type PlatformUpdateType = 'jurisdiction_record' | 'checklist_item' | 'scoring_rule' | 'template';
export type PlatformUpdateStatus = 'pending' | 'applied' | 'rolled_back' | 'failed';

export type NotificationType = 'alert' | 'advisory' | 'update' | 'digest';
export type NotificationStatus = 'draft' | 'approved' | 'sent' | 'failed' | 'cancelled';
export type TargetAudience = 'all' | 'by_jurisdiction' | 'by_pillar' | 'specific_orgs';

export type CrawlStatus = 'running' | 'success' | 'partial' | 'failed' | 'timeout';
export type SourceHealthStatus = 'healthy' | 'degraded' | 'down' | 'error' | 'timeout' | 'unknown';

export type CommandCenterTab = 'signals' | 'game-plans' | 'platform-updates' | 'notifications' | 'crawl-health';

// ── Tab 1: Signal Queue ──────────────────────────────────────

export interface Signal {
  id: string;
  source_id: string;
  source_type: SignalSourceType;
  event_type: string;
  title: string;
  summary: string;
  severity: SignalSeverity;
  jurisdiction: string | null;
  state_code: string | null;
  affected_pillars: string[];
  raw_data: Record<string, unknown>;
  source_url: string | null;
  confidence_score: number;
  status: SignalStatus;
  deferred_until: string | null;
  escalated_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SignalReviewAction = 'approve' | 'dismiss' | 'defer' | 'escalate';

// ── Tab 2: Game Plans ────────────────────────────────────────

export interface GamePlanTask {
  id: string;
  title: string;
  status: GamePlanTaskStatus;
  assignee: string | null;
  due_date: string | null;
  completed_at: string | null;
}

export interface GamePlan {
  id: string;
  signal_id: string | null;
  title: string;
  description: string | null;
  priority: GamePlanPriority;
  status: GamePlanStatus;
  tasks: GamePlanTask[];
  task_status: { total: number; completed: number; in_progress: number };
  completion_notes: string | null;
  platform_update_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Tab 3: Platform Updates ──────────────────────────────────

export interface PlatformUpdate {
  id: string;
  signal_id: string | null;
  title: string;
  description: string | null;
  update_type: PlatformUpdateType;
  target_entity: string | null;
  changes_preview: { before: Record<string, unknown>; after: Record<string, unknown> };
  status: PlatformUpdateStatus;
  applied_by: string | null;
  applied_at: string | null;
  rolled_back_by: string | null;
  rolled_back_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformUpdateLogEntry {
  id: string;
  platform_update_id: string;
  action: 'applied' | 'rolled_back' | 'failed';
  performed_by: string;
  snapshot_before: Record<string, unknown>;
  snapshot_after: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

// ── Tab 4: Client Notifications ──────────────────────────────

export interface ClientNotification {
  id: string;
  signal_id: string | null;
  title: string;
  body: string;
  notification_type: NotificationType;
  severity: SignalSeverity;
  target_audience: TargetAudience;
  target_filter: { jurisdictions?: string[]; pillars?: string[]; org_ids?: string[] };
  status: NotificationStatus;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  sent_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ── Tab 5: Crawl Health ──────────────────────────────────────

export interface CrawlExecution {
  id: string;
  source_id: string;
  source_name: string;
  started_at: string;
  completed_at: string | null;
  status: CrawlStatus;
  events_found: number;
  events_new: number;
  events_duplicate: number;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CrawlSourceHealth {
  source_id: string;
  source_name: string;
  source_type: string;
  status: SourceHealthStatus;
  last_crawl_at: string | null;
  last_success_at: string | null;
  error_count: number;
  uptime_pct: number;
  avg_duration_ms: number;
  events_last_24h: number;
}

// ── Dashboard Stats ──────────────────────────────────────────

export interface CommandCenterStats {
  pending_signals: number;
  active_game_plans: number;
  pending_updates: number;
  unsent_notifications: number;
  signals_today: number;
  signals_this_week: number;
  crawl_success_rate: number;
  sources_healthy: number;
  sources_total: number;
}

// ── Filter State ─────────────────────────────────────────────

export interface SignalFilterState {
  search: string;
  severity: SignalSeverity[];
  source_type: SignalSourceType[];
  status: SignalStatus[];
}

export const EMPTY_SIGNAL_FILTERS: SignalFilterState = {
  search: '',
  severity: [],
  source_type: [],
  status: [],
};
