/**
 * EDGE-FN-MONITOR-1 — Edge Function Health Monitor
 *
 * Admin-only dashboard for monitoring all 18 EvidLY Supabase Edge Functions.
 * Route: /admin/system/edge-functions
 * Access: isEvidlyAdmin || isDemoMode
 *
 * Sections:
 * 1. Health Summary Bar — status counts with color indicators
 * 2. Function Registry Table — all 18 functions with health, timing, error rates
 * 3. Invocation Timeline — recent invocations with expandable detail
 * 4. Error Log — filtered error/timeout invocations
 * 5. pg_cron Schedule — cron job management table
 * 6. Manual Invoke — per-function invocation with payload editor
 */

import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDemo } from '../../../contexts/DemoContext';
import { useEdgeFunctions } from '../../../hooks/useEdgeFunctions';
import type {
  FunctionHealthRow,
  EdgeFunctionInvocation,
  CronJob,
  HealthStatus,
  FunctionCategory,
  EdgeFnTab,
  TimeRange,
} from '../../../types/edgeFunctions';
import { CATEGORY_LABELS } from '../../../types/edgeFunctions';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  Server,
  Zap,
  Timer,
  Pause,
  ToggleLeft,
  ToggleRight,
  Terminal,
  X,
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

const HEALTH_STYLES: Record<HealthStatus, { bg: string; text: string; dot: string; label: string }> = {
  healthy:   { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e', label: 'Healthy' },
  degraded:  { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'Degraded' },
  failed:    { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Failed' },
  inactive:  { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', label: 'Inactive' },
  on_demand: { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6', label: 'On-Demand' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  success: { bg: '#f0fdf4', text: '#16a34a' },
  error:   { bg: '#fef2f2', text: '#dc2626' },
  timeout: { bg: '#fffbeb', text: '#d97706' },
  running: { bg: '#eff6ff', text: '#2563eb' },
};

// ── Helpers ──────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatSchedule(cron: string | null): string {
  if (!cron) return 'On-demand';
  const scheduleMap: Record<string, string> = {
    '0 * * * *': 'Every hour',
    '0 */6 * * *': 'Every 6h',
    '0 2 * * *': 'Daily 2:00 AM',
    '0 3 * * 2': 'Weekly Tue 3:00 AM',
    '0 4 * * 0': 'Weekly Sun 4:00 AM',
    '0 4 1 * *': 'Monthly 1st 4:00 AM',
    '0 5 * * *': 'Daily 5:00 AM',
    '0 6 * * *': 'Daily 6:00 AM',
    '0 6 * * 1': 'Weekly Mon 6:00 AM',
    '0 7 * * 1': 'Weekly Mon 7:00 AM',
  };
  return scheduleMap[cron] || cron;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Health Summary Bar ───────────────────────────────────────

function HealthSummaryBar({
  summary,
}: {
  summary: { total_deployed: number; healthy: number; degraded: number; failed: number; inactive: number };
}) {
  const cards = [
    { label: 'Deployed', value: summary.total_deployed, icon: Server, color: BRAND_BLUE },
    { label: 'Healthy', value: summary.healthy, icon: CheckCircle2, color: '#16a34a' },
    { label: 'Degraded', value: summary.degraded, icon: AlertTriangle, color: '#d97706' },
    { label: 'Failed', value: summary.failed, icon: XCircle, color: '#dc2626' },
    { label: 'Inactive / On-Demand', value: summary.inactive, icon: Clock, color: '#64748b' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
      {cards.map(c => (
        <div
          key={c.label}
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${c.color}14`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <c.icon size={20} color={c.color} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: TEXT_TERTIARY, marginTop: 2 }}>{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Health Badge ─────────────────────────────────────────────

function HealthBadge({ health }: { health: HealthStatus }) {
  const s = HEALTH_STYLES[health];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 12,
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 600,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: s.dot, flexShrink: 0,
      }} />
      {s.label}
    </span>
  );
}

// ── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.running;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 12,
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

// ── Category Badge ───────────────────────────────────────────

function CategoryBadge({ category }: { category: FunctionCategory }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6,
      background: '#eff6ff', color: BRAND_BLUE,
      fontSize: 10, fontWeight: 600,
    }}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

// ── Function Registry Table ──────────────────────────────────

function RegistryTable({
  rows,
  selectedFunction,
  onSelect,
  onInvoke,
}: {
  rows: FunctionHealthRow[];
  selectedFunction: string | null;
  onSelect: (name: string | null) => void;
  onInvoke: (name: string) => void;
}) {
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      borderRadius: 10, overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${CARD_BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={16} color={BRAND_BLUE} />
          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>Function Registry</span>
          <span style={{
            fontSize: 11, color: TEXT_TERTIARY, background: '#EEF1F7',
            padding: '1px 8px', borderRadius: 10,
          }}>
            {rows.length} functions
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Function', 'Category', 'Health', 'Schedule', 'Last Run', 'Avg / P95', '24h Calls', 'Errors', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', color: TEXT_TERTIARY,
                  fontWeight: 600, fontSize: 10, textTransform: 'uppercase',
                  letterSpacing: '0.5px', borderBottom: `1px solid ${CARD_BORDER}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isSelected = selectedFunction === row.function_name;
              return (
                <tr
                  key={row.function_name}
                  onClick={() => onSelect(isSelected ? null : row.function_name)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? '#f0f7ff' : 'transparent',
                    borderBottom: `1px solid ${CARD_BORDER}`,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.background = '#fafbfc'); }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = 'transparent'); }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: TEXT_PRIMARY, fontFamily: 'monospace', fontSize: 12 }}>
                      {row.function_name}
                    </div>
                    {row.description && (
                      <div style={{ fontSize: 10, color: TEXT_TERTIARY, marginTop: 2, maxWidth: 280 }}>
                        {row.description.length > 60 ? row.description.slice(0, 60) + '...' : row.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <CategoryBadge category={row.category} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <HealthBadge health={row.health} />
                  </td>
                  <td style={{ padding: '10px 14px', color: TEXT_SECONDARY, fontSize: 11 }}>
                    {formatSchedule(row.cron_schedule)}
                  </td>
                  <td style={{ padding: '10px 14px', color: TEXT_SECONDARY, fontSize: 11 }}>
                    {formatRelativeTime(row.last_invoked)}
                  </td>
                  <td style={{ padding: '10px 14px', color: TEXT_SECONDARY, fontSize: 11, fontFamily: 'monospace' }}>
                    {formatDuration(row.avg_duration_ms)} / {formatDuration(row.p95_duration_ms)}
                  </td>
                  <td style={{ padding: '10px 14px', color: TEXT_SECONDARY, fontSize: 12, fontWeight: 600 }}>
                    {row.invocations_24h}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {row.errors_24h > 0 ? (
                      <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 12 }}>
                        {row.errors_24h} ({row.error_rate_24h}%)
                      </span>
                    ) : (
                      <span style={{ color: TEXT_TERTIARY, fontSize: 12 }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onInvoke(row.function_name); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6,
                        background: BRAND_BLUE, color: '#fff',
                        border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget.style.background = BRAND_BLUE_HOVER); }}
                      onMouseLeave={e => { (e.currentTarget.style.background = BRAND_BLUE); }}
                    >
                      <Play size={11} />
                      Invoke
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: TEXT_TERTIARY }}>
                  No functions match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Invocation Timeline ──────────────────────────────────────

function InvocationTimeline({
  invocations,
  selectedFunction,
}: {
  invocations: EdgeFunctionInvocation[];
  selectedFunction: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = invocations;
    if (selectedFunction) {
      items = items.filter(i => i.function_name === selectedFunction);
    }
    return items.slice(0, 30);
  }, [invocations, selectedFunction]);

  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      borderRadius: 10, overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${CARD_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Activity size={16} color={BRAND_BLUE} />
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>
          Invocation Timeline
        </span>
        {selectedFunction && (
          <span style={{
            fontSize: 11, color: BRAND_BLUE, background: '#eff6ff',
            padding: '2px 8px', borderRadius: 10, fontFamily: 'monospace',
          }}>
            {selectedFunction}
          </span>
        )}
        <span style={{
          fontSize: 11, color: TEXT_TERTIARY, background: '#EEF1F7',
          padding: '1px 8px', borderRadius: 10,
        }}>
          {filtered.length} shown
        </span>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {filtered.map(inv => {
          const isExpanded = expanded === inv.id;
          return (
            <div key={inv.id} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
              <div
                onClick={() => setExpanded(isExpanded ? null : inv.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fafbfc'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY, minWidth: 200 }}>
                  {inv.function_name}
                </span>
                <StatusBadge status={inv.status} />
                <span style={{ fontSize: 11, color: TEXT_TERTIARY, minWidth: 80, fontFamily: 'monospace' }}>
                  {formatDuration(inv.duration_ms)}
                </span>
                <span style={{
                  fontSize: 10, color: TEXT_TERTIARY, padding: '1px 6px',
                  background: '#EEF1F7', borderRadius: 4,
                }}>
                  {inv.trigger_source}
                </span>
                <span style={{ fontSize: 11, color: TEXT_TERTIARY, marginLeft: 'auto' }}>
                  {formatRelativeTime(inv.invoked_at)}
                </span>
                {isExpanded ? <ChevronUp size={14} color={TEXT_TERTIARY} /> : <ChevronDown size={14} color={TEXT_TERTIARY} />}
              </div>

              {isExpanded && (
                <div style={{ padding: '0 20px 14px', background: '#F8FAFC' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11 }}>
                    <div>
                      <div style={{ color: TEXT_TERTIARY, marginBottom: 4, fontWeight: 600 }}>Invoked At</div>
                      <div style={{ color: TEXT_SECONDARY }}>{formatDateTime(inv.invoked_at)}</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT_TERTIARY, marginBottom: 4, fontWeight: 600 }}>Completed At</div>
                      <div style={{ color: TEXT_SECONDARY }}>{formatDateTime(inv.completed_at)}</div>
                    </div>
                    {inv.triggered_by && (
                      <div>
                        <div style={{ color: TEXT_TERTIARY, marginBottom: 4, fontWeight: 600 }}>Triggered By</div>
                        <div style={{ color: TEXT_SECONDARY }}>{inv.triggered_by}</div>
                      </div>
                    )}
                    {Object.keys(inv.metadata).length > 0 && (
                      <div>
                        <div style={{ color: TEXT_TERTIARY, marginBottom: 4, fontWeight: 600 }}>Metadata</div>
                        <pre style={{
                          color: TEXT_SECONDARY, fontFamily: 'monospace', fontSize: 10,
                          background: '#FFFFFF', padding: 8, borderRadius: 6, margin: 0,
                          border: `1px solid ${CARD_BORDER}`,
                        }}>
                          {JSON.stringify(inv.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  {inv.error_message && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#dc2626', fontWeight: 600, fontSize: 11, marginBottom: 4 }}>
                        Error: {inv.error_type}
                      </div>
                      <div style={{
                        color: '#dc2626', fontSize: 11, background: '#fef2f2',
                        padding: 8, borderRadius: 6, border: '1px solid #fecaca',
                      }}>
                        {inv.error_message}
                      </div>
                      {inv.error_stack && (
                        <pre style={{
                          color: TEXT_SECONDARY, fontSize: 10, fontFamily: 'monospace',
                          background: '#FFFFFF', padding: 8, borderRadius: 6, marginTop: 6,
                          border: `1px solid ${CARD_BORDER}`, whiteSpace: 'pre-wrap',
                        }}>
                          {inv.error_stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_TERTIARY }}>
            No invocations to display
          </div>
        )}
      </div>
    </div>
  );
}

// ── Error Log ────────────────────────────────────────────────

function ErrorLog({ errors }: { errors: EdgeFunctionInvocation[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      borderRadius: 10, overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${CARD_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <AlertTriangle size={16} color="#dc2626" />
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>Error Log</span>
        <span style={{
          fontSize: 11, color: '#dc2626', background: '#fef2f2',
          padding: '1px 8px', borderRadius: 10, fontWeight: 600,
        }}>
          {errors.length} errors
        </span>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {errors.map(err => {
          const isExpanded = expanded === err.id;
          return (
            <div key={err.id} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
              <div
                onClick={() => setExpanded(isExpanded ? null : err.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <XCircle size={14} color="#dc2626" />
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY }}>
                  {err.function_name}
                </span>
                <StatusBadge status={err.status} />
                <span style={{ fontSize: 11, color: '#dc2626', flex: 1 }}>
                  {err.error_type}: {err.error_message?.slice(0, 60)}
                </span>
                <span style={{ fontSize: 11, color: TEXT_TERTIARY }}>
                  {formatRelativeTime(err.invoked_at)}
                </span>
                {isExpanded ? <ChevronUp size={14} color={TEXT_TERTIARY} /> : <ChevronDown size={14} color={TEXT_TERTIARY} />}
              </div>

              {isExpanded && (
                <div style={{ padding: '0 20px 14px', background: '#fffbf5' }}>
                  <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 6 }}>
                    <strong>Error:</strong> {err.error_message}
                  </div>
                  {err.error_stack && (
                    <pre style={{
                      fontSize: 10, fontFamily: 'monospace', color: TEXT_SECONDARY,
                      background: '#FFFFFF', padding: 8, borderRadius: 6,
                      border: `1px solid ${CARD_BORDER}`, whiteSpace: 'pre-wrap', margin: 0,
                    }}>
                      {err.error_stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {errors.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: TEXT_TERTIARY }}>
            No errors in the selected time range
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cron Schedule Table ──────────────────────────────────────

function CronScheduleTable({
  jobs,
  onToggle,
}: {
  jobs: CronJob[];
  onToggle: (jobId: number, active: boolean) => void;
}) {
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      borderRadius: 10, overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${CARD_BORDER}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Timer size={16} color={BRAND_BLUE} />
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>pg_cron Schedule</span>
        <span style={{
          fontSize: 11, color: TEXT_TERTIARY, background: '#EEF1F7',
          padding: '1px 8px', borderRadius: 10,
        }}>
          {jobs.length} jobs
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Active', 'Job Name', 'Schedule', 'Function', 'Last Run', 'Next Run'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', color: TEXT_TERTIARY,
                  fontWeight: 600, fontSize: 10, textTransform: 'uppercase',
                  letterSpacing: '0.5px', borderBottom: `1px solid ${CARD_BORDER}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.jobid} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                <td style={{ padding: '10px 14px' }}>
                  <button
                    onClick={() => onToggle(job.jobid, !job.active)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: job.active ? '#16a34a' : '#94a3b8',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {job.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: TEXT_PRIMARY }}>
                  {job.jobname}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: TEXT_SECONDARY, fontSize: 11 }}>
                  <div>{job.schedule}</div>
                  <div style={{ fontSize: 10, color: TEXT_TERTIARY }}>{formatSchedule(job.schedule)}</div>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: BRAND_BLUE, fontSize: 11 }}>
                  {job.function_name || '—'}
                </td>
                <td style={{ padding: '10px 14px', color: TEXT_SECONDARY, fontSize: 11 }}>
                  {formatRelativeTime(job.last_run)}
                </td>
                <td style={{ padding: '10px 14px', color: TEXT_SECONDARY, fontSize: 11 }}>
                  {job.next_run ? formatDateTime(job.next_run) : '—'}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: TEXT_TERTIARY }}>
                  Cron job data is only available in demo mode or via direct database access
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Manual Invoke Drawer ─────────────────────────────────────

function ManualInvokeDrawer({
  functionName,
  defaultPayload,
  onInvoke,
  onClose,
}: {
  functionName: string;
  defaultPayload: Record<string, unknown>;
  onInvoke: (name: string, payload: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [payloadText, setPayloadText] = useState(JSON.stringify(defaultPayload, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const handleInvoke = () => {
    try {
      const parsed = JSON.parse(payloadText);
      setParseError(null);
      onInvoke(functionName, parsed);
      onClose();
    } catch {
      setParseError('Invalid JSON');
    }
  };

  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      borderRadius: 10, padding: 20, marginBottom: 24,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={16} color={BRAND_BLUE} />
          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>
            Manual Invoke
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: 12, color: BRAND_BLUE,
            background: '#eff6ff', padding: '2px 8px', borderRadius: 6,
          }}>
            {functionName}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: TEXT_TERTIARY, padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_TERTIARY, display: 'block', marginBottom: 6 }}>
          Request Payload (JSON)
        </label>
        <textarea
          value={payloadText}
          onChange={e => { setPayloadText(e.target.value); setParseError(null); }}
          style={{
            width: '100%', minHeight: 120, padding: 12,
            fontFamily: 'monospace', fontSize: 12,
            border: `1px solid ${parseError ? '#fecaca' : CARD_BORDER}`,
            borderRadius: 8, background: '#F8FAFC',
            color: TEXT_PRIMARY, resize: 'vertical',
            outline: 'none',
          }}
        />
        {parseError && (
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{parseError}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleInvoke}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: BRAND_BLUE, color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
          }}
          onMouseEnter={e => { (e.currentTarget.style.background = BRAND_BLUE_HOVER); }}
          onMouseLeave={e => { (e.currentTarget.style.background = BRAND_BLUE); }}
        >
          <Zap size={14} />
          Invoke Function
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px', borderRadius: 8,
            background: '#EEF1F7', color: TEXT_SECONDARY,
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Filter Bar ───────────────────────────────────────────────

function FilterBar({
  filters,
  onFilterChange,
  onReset,
  activeTab,
  onTabChange,
}: {
  filters: FunctionFilterState;
  onFilterChange: (f: Partial<FunctionFilterState>) => void;
  onReset: () => void;
  activeTab: EdgeFnTab;
  onTabChange: (tab: EdgeFnTab) => void;
}) {
  const tabs: { id: EdgeFnTab; label: string; icon: React.ReactNode }[] = [
    { id: 'registry', label: 'Registry', icon: <Server size={14} /> },
    { id: 'cron', label: 'Cron Schedule', icon: <Timer size={14} /> },
  ];

  const categories: { value: FunctionCategory | ''; label: string }[] = [
    { value: '', label: 'All Categories' },
    { value: 'intelligence_crawl', label: 'Intelligence Crawl' },
    { value: 'intelligence_processing', label: 'Intelligence Processing' },
    { value: 'intelligence_aggregation', label: 'Intelligence Aggregation' },
    { value: 'intelligence_maintenance', label: 'Intelligence Maintenance' },
    { value: 'notification', label: 'Notification' },
    { value: 'scoring', label: 'Scoring' },
    { value: 'sales_automation', label: 'Sales Automation' },
    { value: 'compliance_generation', label: 'Compliance Generation' },
  ];

  const healthOptions: { value: HealthStatus | ''; label: string }[] = [
    { value: '', label: 'All Status' },
    { value: 'healthy', label: 'Healthy' },
    { value: 'degraded', label: 'Degraded' },
    { value: 'failed', label: 'Failed' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on_demand', label: 'On-Demand' },
  ];

  const hasFilters = filters.search || filters.category || filters.health;

  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      borderRadius: 10, padding: '12px 20px', marginBottom: 16,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#EEF1F7', borderRadius: 8, padding: 2 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 6,
              background: activeTab === tab.id ? CARD_BG : 'transparent',
              color: activeTab === tab.id ? TEXT_PRIMARY : TEXT_TERTIARY,
              border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 28, background: CARD_BORDER }} />

      {/* Search */}
      <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
        <Search size={14} color={TEXT_TERTIARY} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search functions..."
          value={filters.search}
          onChange={e => onFilterChange({ search: e.target.value })}
          style={{
            width: '100%', padding: '7px 10px 7px 30px',
            border: `1px solid ${CARD_BORDER}`, borderRadius: 6,
            fontSize: 12, color: TEXT_PRIMARY, background: '#F8FAFC',
            outline: 'none',
          }}
        />
      </div>

      {/* Category filter */}
      <select
        value={filters.category}
        onChange={e => onFilterChange({ category: e.target.value as FunctionCategory | '' })}
        style={{
          padding: '7px 10px', border: `1px solid ${CARD_BORDER}`,
          borderRadius: 6, fontSize: 12, color: TEXT_SECONDARY,
          background: '#F8FAFC', outline: 'none', cursor: 'pointer',
        }}
      >
        {categories.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {/* Health filter */}
      <select
        value={filters.health}
        onChange={e => onFilterChange({ health: e.target.value as HealthStatus | '' })}
        style={{
          padding: '7px 10px', border: `1px solid ${CARD_BORDER}`,
          borderRadius: 6, fontSize: 12, color: TEXT_SECONDARY,
          background: '#F8FAFC', outline: 'none', cursor: 'pointer',
        }}
      >
        {healthOptions.map(h => (
          <option key={h.value} value={h.value}>{h.label}</option>
        ))}
      </select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={onReset}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 6,
            background: '#fef2f2', color: '#dc2626',
            border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
          }}
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function EdgeFunctions() {
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();

  // Guard: admin-only
  if (!isEvidlyAdmin && !isDemoMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const {
    healthRows,
    filteredHealthRows,
    invocations,
    cronJobs,
    summary,
    errors,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    resetFilters,
    selectedFunction,
    setSelectedFunction,
    loading,
    invokeFunction,
    toggleCronJob,
    refresh,
    getDefaultPayload,
  } = useEdgeFunctions();

  const [invokeTarget, setInvokeTarget] = useState<string | null>(null);

  const handleFilterChange = (partial: Partial<FunctionFilterState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const handleInvoke = (functionName: string) => {
    setInvokeTarget(functionName);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, border: `3px solid ${CARD_BORDER}`,
          borderTopColor: BRAND_GOLD, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto',
        }} />
        <p style={{ color: TEXT_TERTIARY, marginTop: 12, fontSize: 13 }}>Loading edge function data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>
            Edge Function Health Monitor
          </h1>
          <p style={{ fontSize: 13, color: TEXT_TERTIARY, margin: '4px 0 0' }}>
            Monitor, invoke, and manage all {summary.total_deployed} EvidLY Supabase Edge Functions
          </p>
        </div>
        <button
          onClick={refresh}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: CARD_BG, color: TEXT_SECONDARY,
            border: `1px solid ${CARD_BORDER}`, cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Health Summary */}
      <HealthSummaryBar summary={summary} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Manual Invoke Drawer */}
      {invokeTarget && (
        <ManualInvokeDrawer
          functionName={invokeTarget}
          defaultPayload={getDefaultPayload(invokeTarget)}
          onInvoke={invokeFunction}
          onClose={() => setInvokeTarget(null)}
        />
      )}

      {/* Tab Content */}
      {activeTab === 'registry' ? (
        <>
          {/* Registry Table */}
          <RegistryTable
            rows={filteredHealthRows}
            selectedFunction={selectedFunction}
            onSelect={setSelectedFunction}
            onInvoke={handleInvoke}
          />

          {/* Invocation Timeline */}
          <InvocationTimeline
            invocations={invocations}
            selectedFunction={selectedFunction}
          />

          {/* Error Log */}
          <ErrorLog errors={errors} />
        </>
      ) : (
        /* Cron Schedule */
        <CronScheduleTable
          jobs={cronJobs}
          onToggle={toggleCronJob}
        />
      )}
    </div>
  );
}
