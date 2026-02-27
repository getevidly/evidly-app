/**
 * COMMAND-CENTER-2 — Intelligence Command Center (upgraded)
 *
 * Admin-only dashboard with 5 tabs for managing the intelligence pipeline.
 * Route: /admin/intelligence
 * Access: isEvidlyAdmin || isDemoMode
 *
 * Upgrades over v1:
 *  - Signal Queue: 5-section review drawer, re-triage, create platform update, AI triage, activity log
 *  - Game Plans: 4 kanban columns, linked signal, completion notes
 *  - Platform Updates: validation checklist, impact preview, audit trail
 *  - Notifications: email preview, send test, hold for digest, inline edit
 *  - Crawl Health: alert banner, freshness matrix, run now, source toggle
 *  - URL-synced tabs (?tab=signals)
 *  - Auto-refresh indicator
 */

import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useCommandCenter } from '../../hooks/useCommandCenter';
import type {
  Signal,
  GamePlan,
  PlatformUpdate,
  ClientNotification,
  CrawlExecution,
  CrawlSourceHealth,
  CommandCenterTab,
  SignalSeverity,
  SignalSourceType,
  SignalStatus,
  SignalReviewAction,
  GamePlanStatus,
  PlatformUpdateStatus,
  NotificationStatus,
  SourceHealthStatus,
  ActivityLogEntry,
} from '../../types/commandCenter';
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Shield,
  RefreshCw,
  Play,
  Send,
  Ban,
  ArrowRight,
  Search,
  Target,
  Zap,
  FileText,
  Bell,
  Activity,
  RotateCcw,
  Loader2,
  Users,
  Lightbulb,
  ListChecks,
  History,
  PenLine,
  MailCheck,
  PauseCircle,
  Eye,
  Power,
  Wifi,
  WifiOff,
  CircleDot,
  ClipboardList,
  ExternalLink,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────

const MIDNIGHT_NAVY = '#0B1628';
const BRAND_BLUE = '#1e4d6b';
const BRAND_BLUE_HOVER = '#2a6a8f';
const BRAND_GOLD = '#A08C5A';
const PAGE_BG = '#F4F6FA';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const TEXT_PRIMARY = '#0B1628';
const TEXT_SECONDARY = '#3D5068';
const TEXT_TERTIARY = '#6B7F96';

const SEVERITY_STYLES: Record<SignalSeverity, { dot: string; bg: string; border: string; label: string }> = {
  critical: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
  high:     { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'High' },
  medium:   { dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Medium' },
  low:      { dot: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new:              { bg: '#dbeafe', text: '#1e40af', label: 'New' },
  reviewed:         { bg: '#e0e7ff', text: '#4338ca', label: 'Reviewed' },
  approved:         { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  dismissed:        { bg: '#f3f4f6', text: '#6b7280', label: 'Dismissed' },
  deferred:         { bg: '#fef3c7', text: '#92400e', label: 'Deferred' },
  escalated:        { bg: '#fee2e2', text: '#991b1b', label: 'Escalated' },
  draft:            { bg: '#f3f4f6', text: '#6b7280', label: 'Draft' },
  active:           { bg: '#dbeafe', text: '#1e40af', label: 'Active' },
  completed:        { bg: '#d1fae5', text: '#065f46', label: 'Completed' },
  archived:         { bg: '#f3f4f6', text: '#6b7280', label: 'Archived' },
  pending:          { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
  applied:          { bg: '#d1fae5', text: '#065f46', label: 'Applied' },
  rolled_back:      { bg: '#fee2e2', text: '#991b1b', label: 'Rolled Back' },
  failed:           { bg: '#fee2e2', text: '#991b1b', label: 'Failed' },
  sent:             { bg: '#d1fae5', text: '#065f46', label: 'Sent' },
  cancelled:        { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelled' },
  held_for_digest:  { bg: '#e0e7ff', text: '#4338ca', label: 'Held for Digest' },
  success:          { bg: '#d1fae5', text: '#065f46', label: 'Success' },
  partial:          { bg: '#fef3c7', text: '#92400e', label: 'Partial' },
  timeout:          { bg: '#fee2e2', text: '#991b1b', label: 'Timeout' },
  running:          { bg: '#dbeafe', text: '#1e40af', label: 'Running' },
};

const HEALTH_STYLES: Record<SourceHealthStatus, { dot: string; label: string }> = {
  healthy:  { dot: '#22c55e', label: 'Healthy' },
  degraded: { dot: '#f59e0b', label: 'Degraded' },
  down:     { dot: '#ef4444', label: 'Down' },
  error:    { dot: '#ef4444', label: 'Error' },
  timeout:  { dot: '#d97706', label: 'Timeout' },
  unknown:  { dot: '#94a3b8', label: 'Unknown' },
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  health_dept: 'Health Dept',
  legislative: 'Legislative',
  fda_recall: 'FDA Recall',
  outbreak: 'Outbreak',
  regulatory: 'Regulatory',
  osha: 'OSHA',
  competitor: 'Competitor',
  weather: 'Weather',
  industry: 'Industry',
  nps: 'NPS',
  supply_chain: 'Supply Chain',
  cdph: 'CDPH',
  fire_code: 'Fire Code',
};

const TAB_CONFIG: { id: CommandCenterTab; label: string; icon: typeof Brain }[] = [
  { id: 'signals', label: 'Signal Queue', icon: Zap },
  { id: 'game-plans', label: 'Game Plans', icon: Target },
  { id: 'platform-updates', label: 'Platform Updates', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'crawl-health', label: 'Crawl Health', icon: Activity },
];

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || { bg: '#f3f4f6', text: '#6b7280', label: status };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function SeverityDot({ severity }: { severity: SignalSeverity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }} />
      <span className="text-xs font-medium" style={{ color: s.dot }}>{s.label}</span>
    </span>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Brain; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <Icon size={14} style={{ color: BRAND_BLUE }} />
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_TERTIARY }}>{title}</span>
    </div>
  );
}

// ── Stats Bar ────────────────────────────────────────────────

function StatsBar({ stats }: { stats: import('../../types/commandCenter').CommandCenterStats }) {
  const items = [
    { label: 'Pending Signals', value: stats.pending_signals, color: '#3b82f6', icon: Zap },
    { label: 'Active Plans', value: stats.active_game_plans, color: BRAND_GOLD, icon: Target },
    { label: 'Pending Updates', value: stats.pending_updates, color: '#d97706', icon: FileText },
    { label: 'Unsent Alerts', value: stats.unsent_notifications, color: '#ef4444', icon: Bell },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {items.map(item => (
        <div
          key={item.label}
          className="rounded-lg border px-4 py-3"
          style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
        >
          <div className="flex items-center gap-2 mb-1">
            <item.icon size={14} style={{ color: item.color }} />
            <span className="text-xs font-medium" style={{ color: TEXT_TERTIARY }}>{item.label}</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tab Bar ──────────────────────────────────────────────────

function TabBar({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: CommandCenterTab;
  onTabChange: (tab: CommandCenterTab) => void;
  counts: Record<CommandCenterTab, number>;
}) {
  return (
    <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: CARD_BORDER }}>
      {TAB_CONFIG.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2"
            style={{
              borderColor: isActive ? BRAND_BLUE : 'transparent',
              color: isActive ? BRAND_BLUE : TEXT_SECONDARY,
              backgroundColor: isActive ? `${BRAND_BLUE}08` : 'transparent',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: isActive ? BRAND_BLUE : TEXT_TERTIARY }}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Tab 1: Signal Queue (Enhanced) ──────────────────────────

function SignalQueueTab({
  signals,
  filteredSignals,
  selectedSignalId,
  setSelectedSignalId,
  filters,
  setFilters,
  resetFilters,
  reviewSignal,
  createPlatformUpdateFromSignal,
}: {
  signals: Signal[];
  filteredSignals: Signal[];
  selectedSignalId: string | null;
  setSelectedSignalId: (id: string | null) => void;
  filters: import('../../types/commandCenter').SignalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<import('../../types/commandCenter').SignalFilterState>>;
  resetFilters: () => void;
  reviewSignal: (id: string, action: SignalReviewAction, notes?: string) => void;
  createPlatformUpdateFromSignal: (signalId: string) => void;
}) {
  const [reviewNotes, setReviewNotes] = useState('');

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_TERTIARY }} />
          <input
            type="text"
            placeholder="Search signals..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: CARD_BORDER, color: TEXT_PRIMARY }}
          />
        </div>
        <select
          value={filters.severity[0] || ''}
          onChange={e => setFilters(f => ({ ...f, severity: e.target.value ? [e.target.value as SignalSeverity] : [] }))}
          className="text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: TEXT_PRIMARY }}
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filters.status[0] || ''}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value ? [e.target.value as SignalStatus] : [] }))}
          className="text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: TEXT_PRIMARY }}
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="dismissed">Dismissed</option>
          <option value="deferred">Deferred</option>
          <option value="escalated">Escalated</option>
        </select>
        {(filters.search || filters.severity.length > 0 || filters.status.length > 0) && (
          <button
            onClick={resetFilters}
            className="text-xs px-2 py-1 rounded"
            style={{ color: BRAND_BLUE }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="text-xs mb-3" style={{ color: TEXT_TERTIARY }}>
        {filteredSignals.length} of {signals.length} signals
      </div>

      {/* Signal cards */}
      <div className="space-y-3">
        {filteredSignals.map(signal => {
          const isExpanded = selectedSignalId === signal.id;
          return (
            <div
              key={signal.id}
              className="rounded-lg border transition-shadow"
              style={{
                backgroundColor: CARD_BG,
                borderColor: isExpanded ? BRAND_BLUE : CARD_BORDER,
                boxShadow: isExpanded ? `0 0 0 1px ${BRAND_BLUE}40` : undefined,
              }}
            >
              {/* Header */}
              <button
                onClick={() => setSelectedSignalId(isExpanded ? null : signal.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SeverityDot severity={signal.severity} />
                    <StatusBadge status={signal.status} />
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: TEXT_SECONDARY }}>
                      {SOURCE_TYPE_LABELS[signal.source_type] || signal.source_type}
                    </span>
                    {signal.jurisdiction && (
                      <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{signal.jurisdiction}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{signal.title}</div>
                  <div className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>
                    {timeAgo(signal.created_at)} &middot; Confidence: {Math.round(signal.confidence_score * 100)}%
                    {signal.reviewed_by && <> &middot; Reviewed by {signal.reviewed_by.split('@')[0]}</>}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} style={{ color: TEXT_TERTIARY }} /> : <ChevronDown size={16} style={{ color: TEXT_TERTIARY }} />}
              </button>

              {/* Expanded 5-section review drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: CARD_BORDER }}>
                  {/* Section 1: What Changed */}
                  <SectionHeader icon={AlertTriangle} title="What Changed" />
                  <div className="text-sm" style={{ color: TEXT_SECONDARY }}>{signal.summary}</div>
                  {signal.affected_pillars.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: TEXT_TERTIARY }}>Pillars:</span>
                      {signal.affected_pillars.map(p => (
                        <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {signal.source_url && (
                    <a
                      href={signal.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs"
                      style={{ color: BRAND_BLUE }}
                    >
                      <ExternalLink size={11} /> View source
                    </a>
                  )}

                  {/* Section 2: AI Triage Assessment */}
                  {signal.ai_triage && (
                    <>
                      <SectionHeader icon={Lightbulb} title="AI Triage Assessment" />
                      <div className="rounded-lg border p-3" style={{ backgroundColor: '#f8fafc', borderColor: CARD_BORDER }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium" style={{ color: TEXT_PRIMARY }}>Recommended:</span>
                          <StatusBadge status={signal.ai_triage.recommended_action === 're_triage' ? 'new' : signal.ai_triage.recommended_action === 'approve' ? 'approved' : signal.ai_triage.recommended_action === 'dismiss' ? 'dismissed' : signal.ai_triage.recommended_action === 'defer' ? 'deferred' : 'escalated'} />
                          <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
                            ({signal.ai_triage.affected_client_count} clients affected)
                          </span>
                        </div>
                        <div className="text-xs mb-2" style={{ color: TEXT_SECONDARY }}>
                          {signal.ai_triage.reasoning}
                        </div>
                        <div className="flex gap-4">
                          {Object.entries(signal.ai_triage.confidence_breakdown).map(([key, val]) => (
                            <div key={key} className="text-center">
                              <div className="text-xs font-medium" style={{ color: TEXT_PRIMARY }}>{Math.round(val * 100)}%</div>
                              <div className="text-xs capitalize" style={{ color: TEXT_TERTIARY }}>{key}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Section 3: Suggested Game Plan */}
                  {signal.ai_triage?.suggested_game_plan && (
                    <>
                      <SectionHeader icon={ListChecks} title="Suggested Game Plan" />
                      <div className="text-xs p-3 rounded-lg border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#065f46' }}>
                        {signal.ai_triage.suggested_game_plan}
                      </div>
                    </>
                  )}

                  {/* Section 4: Arthur's Action Panel */}
                  <SectionHeader icon={Shield} title="Actions" />
                  {signal.review_notes && (
                    <div className="mb-2 p-2 rounded text-xs" style={{ backgroundColor: '#f8fafc', color: TEXT_SECONDARY }}>
                      <span className="font-medium">Previous notes:</span> {signal.review_notes}
                    </div>
                  )}
                  {(signal.status === 'new' || signal.status === 'reviewed' || signal.status === 'deferred') && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Add review notes (optional)..."
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-lg border"
                        style={{ borderColor: CARD_BORDER, color: TEXT_PRIMARY }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { reviewSignal(signal.id, 'approve', reviewNotes); setReviewNotes(''); setSelectedSignalId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          onClick={() => { reviewSignal(signal.id, 'dismiss', reviewNotes); setReviewNotes(''); setSelectedSignalId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                        >
                          <XCircle size={13} /> Dismiss
                        </button>
                        <button
                          onClick={() => { reviewSignal(signal.id, 'defer', reviewNotes); setReviewNotes(''); setSelectedSignalId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                        >
                          <Clock size={13} /> Defer
                        </button>
                        <button
                          onClick={() => { reviewSignal(signal.id, 'escalate', reviewNotes); setReviewNotes(''); setSelectedSignalId(null); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          <AlertTriangle size={13} /> Escalate
                        </button>
                        <button
                          onClick={() => createPlatformUpdateFromSignal(signal.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{ backgroundColor: `${BRAND_BLUE}15`, color: BRAND_BLUE }}
                        >
                          <FileText size={13} /> Create Platform Update
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Re-triage for already-reviewed signals */}
                  {(signal.status === 'approved' || signal.status === 'dismissed' || signal.status === 'escalated') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewSignal(signal.id, 're_triage')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                      >
                        <RotateCcw size={13} /> Re-triage
                      </button>
                      <button
                        onClick={() => createPlatformUpdateFromSignal(signal.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ backgroundColor: `${BRAND_BLUE}15`, color: BRAND_BLUE }}
                      >
                        <FileText size={13} /> Create Platform Update
                      </button>
                    </div>
                  )}

                  {/* Section 5: Activity Log */}
                  {signal.activity_log && signal.activity_log.length > 0 && (
                    <>
                      <SectionHeader icon={History} title="Activity Log" />
                      <div className="space-y-1.5">
                        {signal.activity_log.map(entry => (
                          <div key={entry.id} className="flex items-start gap-2 text-xs">
                            <CircleDot size={10} className="mt-1 flex-shrink-0" style={{ color: TEXT_TERTIARY }} />
                            <div>
                              <span style={{ color: TEXT_PRIMARY }}>
                                {entry.performed_by === 'system' ? 'System' : entry.performed_by.split('@')[0]}
                              </span>
                              <span style={{ color: TEXT_TERTIARY }}> {entry.action.replace(/_/g, ' ')} </span>
                              <span style={{ color: TEXT_TERTIARY }}>&middot; {timeAgo(entry.created_at)}</span>
                              {entry.notes && (
                                <div className="mt-0.5" style={{ color: TEXT_SECONDARY }}>{entry.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 2: Game Plans (4-column Kanban) ──────────────────────

function GamePlansTab({
  gamePlans,
  signals,
  updateTaskStatus,
  setActiveTab,
  setSelectedSignalId,
}: {
  gamePlans: GamePlan[];
  signals: Signal[];
  updateTaskStatus: (planId: string, taskId: string, status: string) => void;
  setActiveTab: (tab: CommandCenterTab) => void;
  setSelectedSignalId: (id: string | null) => void;
}) {
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const columns: { status: GamePlanStatus | 'archived'; label: string; color: string }[] = [
    { status: 'draft', label: 'Pending', color: '#6b7280' },
    { status: 'active', label: 'In Progress', color: '#1e40af' },
    { status: 'completed', label: 'Complete', color: '#065f46' },
    { status: 'archived', label: 'Dismissed', color: '#94a3b8' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {columns.map(col => {
        const plans = gamePlans.filter(p => p.status === col.status);
        return (
          <div key={col.status}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{col.label}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f1f5f9', color: TEXT_TERTIARY }}>{plans.length}</span>
            </div>
            <div className="space-y-3">
              {plans.map(plan => {
                const isExpanded = expandedPlanId === plan.id;
                const progress = plan.task_status.total > 0 ? Math.round((plan.task_status.completed / plan.task_status.total) * 100) : 0;
                const linkedSignal = plan.signal_id ? signals.find(s => s.id === plan.signal_id) : null;

                return (
                  <div
                    key={plan.id}
                    className="rounded-lg border p-3"
                    style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
                  >
                    <button
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityDot severity={plan.priority} />
                          </div>
                          <div className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{plan.title}</div>
                        </div>
                        {isExpanded ? <ChevronUp size={14} style={{ color: TEXT_TERTIARY }} /> : <ChevronDown size={14} style={{ color: TEXT_TERTIARY }} />}
                      </div>

                      {/* Linked signal */}
                      {linkedSignal && (
                        <button
                          onClick={e => { e.stopPropagation(); setActiveTab('signals'); setSelectedSignalId(linkedSignal.id); }}
                          className="mt-1 flex items-center gap-1 text-xs hover:underline"
                          style={{ color: BRAND_BLUE }}
                        >
                          <Zap size={10} /> {linkedSignal.title.slice(0, 50)}...
                        </button>
                      )}

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1" style={{ color: TEXT_TERTIARY }}>
                          <span>{plan.task_status.completed}/{plan.task_status.total} tasks</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#e5e7eb' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: progress === 100 ? '#22c55e' : BRAND_BLUE,
                            }}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Expanded tasks */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: CARD_BORDER }}>
                        {plan.description && (
                          <div className="text-xs mb-2" style={{ color: TEXT_SECONDARY }}>{plan.description}</div>
                        )}
                        {plan.tasks.map(task => (
                          <div key={task.id} className="flex items-start gap-2">
                            <button
                              onClick={() => {
                                const nextStatus = task.status === 'completed' ? 'pending' :
                                  task.status === 'pending' ? 'in_progress' : 'completed';
                                updateTaskStatus(plan.id, task.id, nextStatus);
                              }}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                              ) : task.status === 'in_progress' ? (
                                <Loader2 size={16} className="animate-spin" style={{ color: BRAND_BLUE }} />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: CARD_BORDER }} />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-xs"
                                style={{
                                  color: task.status === 'completed' ? TEXT_TERTIARY : TEXT_PRIMARY,
                                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                }}
                              >
                                {task.title}
                              </div>
                              {task.assignee && (
                                <div className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>
                                  {task.assignee.split('@')[0]}
                                  {task.due_date && <> &middot; Due {formatDate(task.due_date)}</>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {plan.completion_notes && (
                          <div className="text-xs p-2 rounded mt-2" style={{ backgroundColor: '#f0fdf4', color: '#065f46' }}>
                            {plan.completion_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {plans.length === 0 && (
                <div className="text-xs text-center py-6 rounded-lg border border-dashed" style={{ color: TEXT_TERTIARY, borderColor: CARD_BORDER }}>
                  No plans
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 3: Platform Updates (Enhanced) ──────────────────────

function PlatformUpdatesTab({
  updates,
  applyUpdate,
  rollbackUpdate,
}: {
  updates: PlatformUpdate[];
  applyUpdate: (id: string) => void;
  rollbackUpdate: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<PlatformUpdateStatus | ''>('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: 'apply' | 'rollback' } | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const filtered = statusFilter
    ? updates.filter(u => u.status === statusFilter)
    : updates;

  const UPDATE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
    jurisdiction_record: { label: 'Jurisdiction', icon: '\u2696\uFE0F' },
    checklist_item: { label: 'Checklist', icon: '\u2705' },
    scoring_rule: { label: 'Scoring', icon: '\uD83D\uDCCA' },
    template: { label: 'Template', icon: '\uD83D\uDCC4' },
  };

  const VALIDATION_ITEMS = [
    'I have reviewed the changes preview',
    'I have confirmed the target entity is correct',
    'I understand the impact on affected clients',
  ];

  const isValidated = (updateId: string) =>
    VALIDATION_ITEMS.every((_, i) => checklist[`${updateId}-${i}`]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as PlatformUpdateStatus | '')}
          className="text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: TEXT_PRIMARY }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="applied">Applied</option>
          <option value="rolled_back">Rolled Back</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{filtered.length} updates</span>
      </div>

      <div className="space-y-3">
        {filtered.map(update => {
          const typeInfo = UPDATE_TYPE_LABELS[update.update_type] || { label: update.update_type, icon: '\uD83D\uDCC1' };
          return (
            <div
              key={update.id}
              className="rounded-lg border p-4"
              style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: TEXT_SECONDARY }}>
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                    <StatusBadge status={update.status} />
                    {update.target_entity && (
                      <span className="text-xs font-mono" style={{ color: TEXT_TERTIARY }}>{update.target_entity}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{update.title}</div>
                  {update.description && (
                    <div className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>{update.description}</div>
                  )}
                </div>
              </div>

              {/* Changes preview (diff) */}
              {update.changes_preview && (
                <div className="mt-3 rounded border p-3 text-xs font-mono" style={{ borderColor: CARD_BORDER, backgroundColor: '#f8fafc' }}>
                  <div className="font-sans font-medium text-xs mb-2" style={{ color: TEXT_TERTIARY }}>Changes Preview</div>
                  {Object.keys(update.changes_preview.after || {}).map(key => {
                    const before = JSON.stringify((update.changes_preview.before as Record<string, unknown>)?.[key]);
                    const after = JSON.stringify((update.changes_preview.after as Record<string, unknown>)?.[key]);
                    const changed = before !== after;
                    return (
                      <div key={key} className="flex gap-2 mb-1 flex-wrap">
                        <span style={{ color: TEXT_TERTIARY }}>{key}:</span>
                        {changed ? (
                          <>
                            <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{before}</span>
                            <ArrowRight size={12} style={{ color: TEXT_TERTIARY }} className="flex-shrink-0 mt-0.5" />
                            <span style={{ color: '#16a34a' }}>{after}</span>
                          </>
                        ) : (
                          <span style={{ color: TEXT_SECONDARY }}>{after}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Metadata */}
              <div className="mt-2 text-xs" style={{ color: TEXT_TERTIARY }}>
                Created {timeAgo(update.created_at)}
                {update.applied_by && <> &middot; Applied by {update.applied_by.split('@')[0]} {timeAgo(update.applied_at)}</>}
                {update.rolled_back_by && <> &middot; Rolled back by {update.rolled_back_by.split('@')[0]} {timeAgo(update.rolled_back_at)}</>}
              </div>

              {/* Validation checklist (only for pending updates) */}
              {update.status === 'pending' && (
                <div className="mt-3 p-3 rounded-lg border" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                  <div className="text-xs font-medium mb-2" style={{ color: '#92400e' }}>
                    <ClipboardList size={12} className="inline mr-1" />
                    Pre-apply validation
                  </div>
                  {VALIDATION_ITEMS.map((item, i) => (
                    <label key={i} className="flex items-center gap-2 text-xs mb-1 cursor-pointer" style={{ color: TEXT_SECONDARY }}>
                      <input
                        type="checkbox"
                        checked={!!checklist[`${update.id}-${i}`]}
                        onChange={e => setChecklist(prev => ({ ...prev, [`${update.id}-${i}`]: e.target.checked }))}
                        className="rounded"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                {update.status === 'pending' && (
                  <>
                    {confirmAction?.id === update.id && confirmAction.type === 'apply' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#d97706' }}>Confirm apply?</span>
                        <button
                          onClick={() => { applyUpdate(update.id); setConfirmAction(null); }}
                          className="px-2 py-1 text-xs font-medium rounded text-white"
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          Yes, Apply
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="px-2 py-1 text-xs font-medium rounded"
                          style={{ color: TEXT_TERTIARY }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ id: update.id, type: 'apply' })}
                        disabled={!isValidated(update.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: BRAND_BLUE }}
                        title={!isValidated(update.id) ? 'Complete the validation checklist first' : undefined}
                      >
                        <Play size={12} /> Apply to Platform
                      </button>
                    )}
                  </>
                )}
                {update.status === 'applied' && (
                  <>
                    {confirmAction?.id === update.id && confirmAction.type === 'rollback' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#dc2626' }}>Confirm rollback?</span>
                        <button
                          onClick={() => { rollbackUpdate(update.id); setConfirmAction(null); }}
                          className="px-2 py-1 text-xs font-medium rounded text-white"
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          Yes, Rollback
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="px-2 py-1 text-xs font-medium rounded"
                          style={{ color: TEXT_TERTIARY }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ id: update.id, type: 'rollback' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                      >
                        <RotateCcw size={12} /> Rollback
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 4: Client Notifications (Enhanced) ──────────────────

function NotificationsTab({
  notifications,
  approveNotification,
  sendNotification,
  sendTestNotification,
  holdForDigest,
  editNotification,
  cancelNotification,
}: {
  notifications: ClientNotification[];
  approveNotification: (id: string) => void;
  sendNotification: (id: string) => void;
  sendTestNotification: (id: string) => void;
  holdForDigest: (id: string) => void;
  editNotification: (id: string, updates: { title?: string; body?: string }) => void;
  cancelNotification: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filtered = statusFilter
    ? notifications.filter(n => n.status === statusFilter)
    : notifications;

  const startEdit = (n: ClientNotification) => {
    setEditingId(n.id);
    setEditTitle(n.title);
    setEditBody(n.body);
  };

  const saveEdit = () => {
    if (editingId) {
      editNotification(editingId, { title: editTitle, body: editBody });
      setEditingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as NotificationStatus | '')}
          className="text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: CARD_BORDER, color: TEXT_PRIMARY }}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
          <option value="held_for_digest">Held for Digest</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{filtered.length} notifications</span>
      </div>

      <div className="space-y-3">
        {filtered.map(notif => {
          const isEditing = editingId === notif.id;
          const isPreviewing = previewId === notif.id;

          return (
            <div
              key={notif.id}
              className="rounded-lg border p-4"
              style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <SeverityDot severity={notif.severity} />
                    <StatusBadge status={notif.status} />
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: TEXT_SECONDARY }}>
                      {notif.notification_type}
                    </span>
                  </div>

                  {/* Title (editable) */}
                  {isEditing ? (
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-sm font-medium px-2 py-1 rounded border mb-1"
                      style={{ borderColor: BRAND_BLUE, color: TEXT_PRIMARY }}
                    />
                  ) : (
                    <div className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{notif.title}</div>
                  )}

                  {/* Body (editable) */}
                  {isEditing ? (
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full text-xs px-2 py-1 rounded border mt-1"
                      style={{ borderColor: BRAND_BLUE, color: TEXT_SECONDARY }}
                    />
                  ) : (
                    <div className="text-xs mt-1" style={{ color: TEXT_SECONDARY }}>{notif.body}</div>
                  )}

                  {/* Target audience */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Users size={12} style={{ color: TEXT_TERTIARY }} />
                    <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
                      {notif.target_audience === 'all' ? 'All clients' :
                        notif.target_audience === 'by_jurisdiction' ? `Jurisdictions: ${notif.target_filter.jurisdictions?.join(', ') || 'none'}` :
                          notif.target_audience === 'by_pillar' ? `Pillars: ${notif.target_filter.pillars?.join(', ') || 'none'}` :
                            `${notif.target_filter.org_ids?.length || 0} specific orgs`}
                    </span>
                  </div>

                  {/* Sent info */}
                  {notif.sent_at && (
                    <div className="mt-1 text-xs" style={{ color: TEXT_TERTIARY }}>
                      Sent {timeAgo(notif.sent_at)} to {notif.sent_count} clients
                    </div>
                  )}
                  {notif.error_message && (
                    <div className="mt-1 text-xs" style={{ color: '#dc2626' }}>{notif.error_message}</div>
                  )}
                </div>
              </div>

              {/* Email preview panel */}
              {isPreviewing && (
                <div className="mt-3 rounded-lg border p-4" style={{ backgroundColor: '#f8fafc', borderColor: CARD_BORDER }}>
                  <div className="text-xs font-medium mb-2" style={{ color: TEXT_TERTIARY }}>Email Preview</div>
                  <div className="rounded border bg-white p-4" style={{ borderColor: CARD_BORDER }}>
                    <div className="text-xs mb-1" style={{ color: TEXT_TERTIARY }}>
                      From: EvidLY Intelligence &lt;alerts@getevidly.com&gt;
                    </div>
                    <div className="text-xs mb-3" style={{ color: TEXT_TERTIARY }}>
                      Subject: {notif.title}
                    </div>
                    <div className="border-t pt-3" style={{ borderColor: CARD_BORDER }}>
                      <div className="text-sm font-medium mb-2" style={{ color: TEXT_PRIMARY }}>{notif.title}</div>
                      <div className="text-xs whitespace-pre-wrap" style={{ color: TEXT_SECONDARY }}>{notif.body}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ backgroundColor: '#16a34a' }}
                    >
                      <CheckCircle2 size={12} /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ color: TEXT_TERTIARY }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {/* Preview toggle */}
                    <button
                      onClick={() => setPreviewId(isPreviewing ? null : notif.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: '#f1f5f9', color: TEXT_SECONDARY }}
                    >
                      <Eye size={12} /> {isPreviewing ? 'Hide Preview' : 'Preview'}
                    </button>

                    {notif.status === 'draft' && (
                      <>
                        <button
                          onClick={() => approveNotification(notif.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button
                          onClick={() => startEdit(notif)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#f1f5f9', color: TEXT_SECONDARY }}
                        >
                          <PenLine size={12} /> Edit
                        </button>
                        <button
                          onClick={() => holdForDigest(notif.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}
                        >
                          <PauseCircle size={12} /> Hold for Digest
                        </button>
                        <button
                          onClick={() => cancelNotification(notif.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                        >
                          <Ban size={12} /> Cancel
                        </button>
                      </>
                    )}
                    {notif.status === 'approved' && (
                      <>
                        <button
                          onClick={() => sendTestNotification(notif.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                        >
                          <MailCheck size={12} /> Send Test
                        </button>
                        <button
                          onClick={() => sendNotification(notif.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ backgroundColor: BRAND_BLUE }}
                        >
                          <Send size={12} /> Send Now
                        </button>
                        <button
                          onClick={() => cancelNotification(notif.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                        >
                          <Ban size={12} /> Cancel
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 5: Crawl Health (Enhanced) ──────────────────────────

function CrawlHealthTab({
  sourceHealth,
  crawlLog,
  runCrawlNow,
  toggleSourceMonitoring,
}: {
  sourceHealth: CrawlSourceHealth[];
  crawlLog: CrawlExecution[];
  runCrawlNow: (sourceId: string) => void;
  toggleSourceMonitoring: (sourceId: string) => void;
}) {
  // Alert banner for sources with 3+ consecutive failures
  const failingSources = sourceHealth.filter(s => s.error_count >= 3);

  // Freshness color coding
  function freshnessColor(lastCrawl: string | null): string {
    if (!lastCrawl) return '#ef4444'; // red — never crawled
    const mins = (Date.now() - new Date(lastCrawl).getTime()) / 60000;
    if (mins < 60) return '#22c55e';     // green — <1 hour
    if (mins < 360) return '#f59e0b';    // yellow — <6 hours
    return '#ef4444';                     // red — >6 hours
  }

  return (
    <div>
      {/* Alert banner */}
      {failingSources.length > 0 && (
        <div className="mb-4 rounded-lg border p-3" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#991b1b' }}>
            <AlertTriangle size={16} />
            {failingSources.length} source{failingSources.length > 1 ? 's' : ''} with consecutive failures
          </div>
          <div className="mt-1 text-xs" style={{ color: '#991b1b' }}>
            {failingSources.map(s => s.source_name).join(', ')}
          </div>
        </div>
      )}

      {/* Data freshness matrix */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Data Freshness</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {sourceHealth.map(source => (
            <div
              key={source.source_id}
              className="rounded-lg border p-2 flex items-center gap-2"
              style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: freshnessColor(source.last_crawl_at) }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: TEXT_PRIMARY }}>{source.source_name}</div>
                <div className="text-xs" style={{ color: TEXT_TERTIARY }}>{timeAgo(source.last_crawl_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source registry */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Source Registry</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sourceHealth.map(source => {
            const health = HEALTH_STYLES[source.status] || HEALTH_STYLES.unknown;
            const isDown = source.status === 'down' || source.status === 'error';
            return (
              <div
                key={source.source_id}
                className="rounded-lg border p-3"
                style={{ backgroundColor: CARD_BG, borderColor: isDown ? '#fecaca' : CARD_BORDER }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: health.dot }} />
                    <span className="text-xs font-medium" style={{ color: TEXT_PRIMARY }}>{source.source_name}</span>
                  </div>
                  <span className="text-xs" style={{ color: health.dot }}>{health.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: TEXT_TERTIARY }}>
                  <div>
                    <div className="font-medium" style={{ color: TEXT_SECONDARY }}>{source.uptime_pct}%</div>
                    <div>Uptime</div>
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: TEXT_SECONDARY }}>{source.events_last_24h}</div>
                    <div>Events/24h</div>
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: TEXT_SECONDARY }}>{source.avg_duration_ms > 1000 ? `${(source.avg_duration_ms / 1000).toFixed(1)}s` : `${source.avg_duration_ms}ms`}</div>
                    <div>Avg Time</div>
                  </div>
                </div>
                <div className="mt-2 text-xs" style={{ color: TEXT_TERTIARY }}>
                  Last crawl: {timeAgo(source.last_crawl_at)}
                  {source.error_count > 0 && <span style={{ color: '#dc2626' }}> &middot; {source.error_count} errors</span>}
                </div>
                {/* Source actions */}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => runCrawlNow(source.source_id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: `${BRAND_BLUE}15`, color: BRAND_BLUE }}
                  >
                    <Play size={10} /> Run Now
                  </button>
                  <button
                    onClick={() => toggleSourceMonitoring(source.source_id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: '#f1f5f9', color: TEXT_SECONDARY }}
                  >
                    {source.status === 'down' ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {source.status === 'down' ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent crawl executions table */}
      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: TEXT_PRIMARY }}>Recent Crawl Runs</div>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: CARD_BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: TEXT_TERTIARY }}>Source</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: TEXT_TERTIARY }}>Status</th>
                  <th className="text-right px-3 py-2 font-medium" style={{ color: TEXT_TERTIARY }}>Events</th>
                  <th className="text-right px-3 py-2 font-medium" style={{ color: TEXT_TERTIARY }}>New</th>
                  <th className="text-right px-3 py-2 font-medium" style={{ color: TEXT_TERTIARY }}>Duration</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: TEXT_TERTIARY }}>When</th>
                </tr>
              </thead>
              <tbody>
                {crawlLog.slice(0, 20).map(crawl => (
                  <tr
                    key={crawl.id}
                    className="border-t"
                    style={{ borderColor: CARD_BORDER, backgroundColor: CARD_BG }}
                  >
                    <td className="px-3 py-2" style={{ color: TEXT_PRIMARY }}>{crawl.source_name}</td>
                    <td className="px-3 py-2"><StatusBadge status={crawl.status} /></td>
                    <td className="px-3 py-2 text-right" style={{ color: TEXT_SECONDARY }}>{crawl.events_found}</td>
                    <td className="px-3 py-2 text-right" style={{ color: crawl.events_new > 0 ? '#16a34a' : TEXT_TERTIARY }}>
                      {crawl.events_new > 0 ? `+${crawl.events_new}` : '0'}
                    </td>
                    <td className="px-3 py-2 text-right" style={{ color: TEXT_SECONDARY }}>
                      {crawl.duration_ms ? (crawl.duration_ms > 1000 ? `${(crawl.duration_ms / 1000).toFixed(1)}s` : `${crawl.duration_ms}ms`) : '\u2014'}
                    </td>
                    <td className="px-3 py-2" style={{ color: TEXT_TERTIARY }}>{timeAgo(crawl.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {crawlLog.length > 20 && (
            <div className="px-3 py-2 text-xs text-center border-t" style={{ borderColor: CARD_BORDER, color: TEXT_TERTIARY }}>
              Showing 20 of {crawlLog.length} runs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function CommandCenter() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();
  const isAdmin = isEvidlyAdmin || isDemoMode;

  const cc = useCommandCenter();

  // Guard
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  // Tab counts for badges
  const tabCounts: Record<CommandCenterTab, number> = {
    signals: cc.stats.pending_signals,
    'game-plans': cc.stats.active_game_plans,
    'platform-updates': cc.stats.pending_updates,
    notifications: cc.stats.unsent_notifications,
    'crawl-health': cc.sourceHealth.filter(s => s.status !== 'healthy').length,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: PAGE_BG }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: TEXT_PRIMARY }}>
              <Brain size={22} style={{ color: BRAND_BLUE }} />
              Intelligence Command Center
            </h1>
            <p className="text-sm mt-1" style={{ color: TEXT_SECONDARY }}>
              Signal triage, game plans, platform updates, and crawl monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            {cc.lastRefreshedAt && (
              <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
                Updated {timeAgo(cc.lastRefreshedAt.toISOString())}
              </span>
            )}
            <button
              onClick={cc.refresh}
              disabled={cc.loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER, border: '1px solid', color: TEXT_PRIMARY }}
            >
              <RefreshCw size={14} className={cc.loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading state */}
        {cc.loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: BRAND_BLUE }} />
          </div>
        )}

        {/* Error state */}
        {cc.error && (
          <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#991b1b' }}>
              <AlertTriangle size={16} />
              {cc.error}
            </div>
          </div>
        )}

        {!cc.loading && (
          <>
            <StatsBar stats={cc.stats} />
            <TabBar activeTab={cc.activeTab} onTabChange={cc.setActiveTab} counts={tabCounts} />

            {cc.activeTab === 'signals' && (
              <SignalQueueTab
                signals={cc.signals}
                filteredSignals={cc.filteredSignals}
                selectedSignalId={cc.selectedSignalId}
                setSelectedSignalId={cc.setSelectedSignalId}
                filters={cc.filters}
                setFilters={cc.setFilters}
                resetFilters={cc.resetFilters}
                reviewSignal={cc.reviewSignal}
                createPlatformUpdateFromSignal={cc.createPlatformUpdateFromSignal}
              />
            )}
            {cc.activeTab === 'game-plans' && (
              <GamePlansTab
                gamePlans={cc.gamePlans}
                signals={cc.signals}
                updateTaskStatus={cc.updateTaskStatus}
                setActiveTab={cc.setActiveTab}
                setSelectedSignalId={cc.setSelectedSignalId}
              />
            )}
            {cc.activeTab === 'platform-updates' && (
              <PlatformUpdatesTab
                updates={cc.platformUpdates}
                applyUpdate={cc.applyUpdate}
                rollbackUpdate={cc.rollbackUpdate}
              />
            )}
            {cc.activeTab === 'notifications' && (
              <NotificationsTab
                notifications={cc.notifications}
                approveNotification={cc.approveNotification}
                sendNotification={cc.sendNotification}
                sendTestNotification={cc.sendTestNotification}
                holdForDigest={cc.holdForDigest}
                editNotification={cc.editNotification}
                cancelNotification={cc.cancelNotification}
              />
            )}
            {cc.activeTab === 'crawl-health' && (
              <CrawlHealthTab
                sourceHealth={cc.sourceHealth}
                crawlLog={cc.crawlLog}
                runCrawlNow={cc.runCrawlNow}
                toggleSourceMonitoring={cc.toggleSourceMonitoring}
              />
            )}
          </>
        )}

        {/* Footer info */}
        <div className="mt-8 text-xs text-center" style={{ color: TEXT_TERTIARY }}>
          Intelligence Command Center &middot; {cc.stats.sources_healthy}/{cc.stats.sources_total} sources healthy &middot; Crawl success rate: {cc.stats.crawl_success_rate}%
          {cc.activeTab === 'signals' && ' \u00B7 Auto-refresh: 30s'}
          {cc.activeTab !== 'signals' && ' \u00B7 Auto-refresh: 60s'}
        </div>
      </div>
    </div>
  );
}
