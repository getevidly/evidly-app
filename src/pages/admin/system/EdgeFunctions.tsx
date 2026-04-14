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
import { useDemoGuard } from '../../../hooks/useDemoGuard';
import { useEdgeFunctions } from '../../../hooks/useEdgeFunctions';
import AdminBreadcrumb from '../../../components/admin/AdminBreadcrumb';
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

const HEALTH_STYLES: Record<HealthStatus, { bg: string; text: string; dot: string; label: string }> = {
  healthy:   { bg: 'bg-[#f0fdf4]', text: 'text-[#16a34a]', dot: 'bg-[#22c55e]', label: 'Healthy' },
  degraded:  { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]', label: 'Degraded' },
  failed:    { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]', label: 'Failed' },
  inactive:  { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', dot: 'bg-[#94a3b8]', label: 'Inactive' },
  on_demand: { bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]', dot: 'bg-[#3b82f6]', label: 'On-Demand' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  success: { bg: 'bg-[#f0fdf4]', text: 'text-[#16a34a]' },
  error:   { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]' },
  timeout: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]' },
  running: { bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]' },
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
    { label: 'Deployed', value: summary.total_deployed, icon: Server, color: '#1E2D4D', colorClass: 'text-navy' },
    { label: 'Healthy', value: summary.healthy, icon: CheckCircle2, color: '#16a34a', colorClass: 'text-[#16a34a]' },
    { label: 'Degraded', value: summary.degraded, icon: AlertTriangle, color: '#d97706', colorClass: 'text-[#d97706]' },
    { label: 'Failed', value: summary.failed, icon: XCircle, color: '#dc2626', colorClass: 'text-[#dc2626]' },
    { label: 'Inactive / On-Demand', value: summary.inactive, icon: Clock, color: '#64748b', colorClass: 'text-[#64748b]' },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {cards.map(c => (
        <div
          key={c.label}
          className="bg-white border border-[#D1D9E6] rounded-[10px] px-5 py-4 flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: `${c.color}14` }}
          >
            <c.icon size={20} color={c.color} />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#0B1628] leading-none">{c.value}</div>
            <div className="text-[11px] text-[#6B7F96] mt-0.5">{c.label}</div>
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
    <span className={`inline-flex items-center gap-[5px] px-[10px] py-[2px] rounded-xl text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.running;
  return (
    <span className={`inline-flex items-center px-2 py-[2px] rounded-xl text-[11px] font-semibold capitalize ${s.bg} ${s.text}`}>
      {status}
    </span>
  );
}

// ── Category Badge ───────────────────────────────────────────

function CategoryBadge({ category }: { category: FunctionCategory }) {
  return (
    <span className="px-2 py-[2px] rounded-md bg-[#eff6ff] text-navy text-[10px] font-semibold">
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
    <div className="bg-white border border-[#D1D9E6] rounded-[10px] overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-[#D1D9E6] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-navy" />
          <span className="text-sm font-bold text-[#0B1628]">Function Registry</span>
          <span className="text-[11px] text-[#6B7F96] bg-[#EEF1F7] px-2 py-[1px] rounded-[10px]">
            {rows.length} functions
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#F8FAFC]">
              {['Function', 'Category', 'Health', 'Schedule', 'Last Run', 'Avg / P95', '24h Calls', 'Errors', 'Actions'].map(h => (
                <th key={h} className="px-[14px] py-[10px] text-left text-[#6B7F96] font-semibold text-[10px] uppercase tracking-[0.5px] border-b border-[#D1D9E6]">
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
                  className={`cursor-pointer border-b border-[#D1D9E6] transition-[background] duration-100 ${
                    isSelected ? 'bg-[#f0f7ff]' : 'hover:bg-[#fafbfc]'
                  }`}
                >
                  <td className="px-[14px] py-[10px]">
                    <div className="font-semibold text-[#0B1628] font-mono text-xs">
                      {row.function_name}
                    </div>
                    {row.description && (
                      <div className="text-[10px] text-[#6B7F96] mt-0.5 max-w-[280px]">
                        {row.description.length > 60 ? row.description.slice(0, 60) + '...' : row.description}
                      </div>
                    )}
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <CategoryBadge category={row.category} />
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <HealthBadge health={row.health} />
                  </td>
                  <td className="px-[14px] py-[10px] text-[#3D5068] text-[11px]">
                    {formatSchedule(row.cron_schedule)}
                  </td>
                  <td className="px-[14px] py-[10px] text-[#3D5068] text-[11px]">
                    {formatRelativeTime(row.last_invoked)}
                  </td>
                  <td className="px-[14px] py-[10px] text-[#3D5068] text-[11px] font-mono">
                    {formatDuration(row.avg_duration_ms)} / {formatDuration(row.p95_duration_ms)}
                  </td>
                  <td className="px-[14px] py-[10px] text-[#3D5068] text-xs font-semibold">
                    {row.invocations_24h}
                  </td>
                  <td className="px-[14px] py-[10px]">
                    {row.errors_24h > 0 ? (
                      <span className="text-[#dc2626] font-semibold text-xs">
                        {row.errors_24h} ({row.error_rate_24h}%)
                      </span>
                    ) : (
                      <span className="text-[#6B7F96] text-xs">0</span>
                    )}
                  </td>
                  <td className="px-[14px] py-[10px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); onInvoke(row.function_name); }}
                      className="inline-flex items-center gap-1 px-[10px] py-1 rounded-md bg-navy text-white border-none cursor-pointer text-[11px] font-semibold transition-[background] duration-100 hover:bg-navy-light"
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
                <td colSpan={9} className="p-10 text-center text-[#6B7F96]">
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
    <div className="bg-white border border-[#D1D9E6] rounded-[10px] overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-[#D1D9E6] flex items-center gap-2">
        <Activity size={16} className="text-navy" />
        <span className="text-sm font-bold text-[#0B1628]">
          Invocation Timeline
        </span>
        {selectedFunction && (
          <span className="text-[11px] text-navy bg-[#eff6ff] px-2 py-[2px] rounded-[10px] font-mono">
            {selectedFunction}
          </span>
        )}
        <span className="text-[11px] text-[#6B7F96] bg-[#EEF1F7] px-2 py-[1px] rounded-[10px]">
          {filtered.length} shown
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {filtered.map(inv => {
          const isExpanded = expanded === inv.id;
          return (
            <div key={inv.id} className="border-b border-[#D1D9E6]">
              <div
                onClick={() => setExpanded(isExpanded ? null : inv.id)}
                className="flex items-center gap-3 px-5 py-[10px] cursor-pointer transition-[background] duration-100 hover:bg-[#fafbfc]"
              >
                <span className="font-mono text-xs font-semibold text-[#0B1628] min-w-[200px]">
                  {inv.function_name}
                </span>
                <StatusBadge status={inv.status} />
                <span className="text-[11px] text-[#6B7F96] min-w-[80px] font-mono">
                  {formatDuration(inv.duration_ms)}
                </span>
                <span className="text-[10px] text-[#6B7F96] px-1.5 py-[1px] bg-[#EEF1F7] rounded">
                  {inv.trigger_source}
                </span>
                <span className="text-[11px] text-[#6B7F96] ml-auto">
                  {formatRelativeTime(inv.invoked_at)}
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-[#6B7F96]" /> : <ChevronDown size={14} className="text-[#6B7F96]" />}
              </div>

              {isExpanded && (
                <div className="px-5 pb-[14px] bg-[#F8FAFC]">
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <div className="text-[#6B7F96] mb-1 font-semibold">Invoked At</div>
                      <div className="text-[#3D5068]">{formatDateTime(inv.invoked_at)}</div>
                    </div>
                    <div>
                      <div className="text-[#6B7F96] mb-1 font-semibold">Completed At</div>
                      <div className="text-[#3D5068]">{formatDateTime(inv.completed_at)}</div>
                    </div>
                    {inv.triggered_by && (
                      <div>
                        <div className="text-[#6B7F96] mb-1 font-semibold">Triggered By</div>
                        <div className="text-[#3D5068]">{inv.triggered_by}</div>
                      </div>
                    )}
                    {Object.keys(inv.metadata).length > 0 && (
                      <div>
                        <div className="text-[#6B7F96] mb-1 font-semibold">Metadata</div>
                        <pre className="text-[#3D5068] font-mono text-[10px] bg-white p-2 rounded-md m-0 border border-[#D1D9E6]">
                          {JSON.stringify(inv.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  {inv.error_message && (
                    <div className="mt-[10px]">
                      <div className="text-[#dc2626] font-semibold text-[11px] mb-1">
                        Error: {inv.error_type}
                      </div>
                      <div className="text-[#dc2626] text-[11px] bg-[#fef2f2] p-2 rounded-md border border-[#fecaca]">
                        {inv.error_message}
                      </div>
                      {inv.error_stack && (
                        <pre className="text-[#3D5068] text-[10px] font-mono bg-white p-2 rounded-md mt-1.5 border border-[#D1D9E6] whitespace-pre-wrap m-0">
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
          <div className="p-10 text-center text-[#6B7F96]">
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
    <div className="bg-white border border-[#D1D9E6] rounded-[10px] overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-[#D1D9E6] flex items-center gap-2">
        <AlertTriangle size={16} className="text-[#dc2626]" />
        <span className="text-sm font-bold text-[#0B1628]">Error Log</span>
        <span className="text-[11px] text-[#dc2626] bg-[#fef2f2] px-2 py-[1px] rounded-[10px] font-semibold">
          {errors.length} errors
        </span>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {errors.map(err => {
          const isExpanded = expanded === err.id;
          return (
            <div key={err.id} className="border-b border-[#D1D9E6]">
              <div
                onClick={() => setExpanded(isExpanded ? null : err.id)}
                className="flex items-center gap-3 px-5 py-[10px] cursor-pointer hover:bg-[#fef2f2]"
              >
                <XCircle size={14} className="text-[#dc2626]" />
                <span className="font-mono text-xs font-semibold text-[#0B1628]">
                  {err.function_name}
                </span>
                <StatusBadge status={err.status} />
                <span className="text-[11px] text-[#dc2626] flex-1">
                  {err.error_type}: {err.error_message?.slice(0, 60)}
                </span>
                <span className="text-[11px] text-[#6B7F96]">
                  {formatRelativeTime(err.invoked_at)}
                </span>
                {isExpanded ? <ChevronUp size={14} className="text-[#6B7F96]" /> : <ChevronDown size={14} className="text-[#6B7F96]" />}
              </div>

              {isExpanded && (
                <div className="px-5 pb-[14px] bg-[#fffbf5]">
                  <div className="text-[11px] text-[#dc2626] mb-1.5">
                    <strong>Error:</strong> {err.error_message}
                  </div>
                  {err.error_stack && (
                    <pre className="text-[10px] font-mono text-[#3D5068] bg-white p-2 rounded-md border border-[#D1D9E6] whitespace-pre-wrap m-0">
                      {err.error_stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {errors.length === 0 && (
          <div className="p-10 text-center text-[#6B7F96]">
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
    <div className="bg-white border border-[#D1D9E6] rounded-[10px] overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-[#D1D9E6] flex items-center gap-2">
        <Timer size={16} className="text-navy" />
        <span className="text-sm font-bold text-[#0B1628]">pg_cron Schedule</span>
        <span className="text-[11px] text-[#6B7F96] bg-[#EEF1F7] px-2 py-[1px] rounded-[10px]">
          {jobs.length} jobs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#F8FAFC]">
              {['Active', 'Job Name', 'Schedule', 'Function', 'Last Run', 'Next Run'].map(h => (
                <th key={h} className="px-[14px] py-[10px] text-left text-[#6B7F96] font-semibold text-[10px] uppercase tracking-[0.5px] border-b border-[#D1D9E6]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.jobid} className="border-b border-[#D1D9E6]">
                <td className="px-[14px] py-[10px]">
                  <button
                    onClick={() => onToggle(job.jobid, !job.active)}
                    className={`bg-transparent border-none cursor-pointer flex items-center ${
                      job.active ? 'text-[#16a34a]' : 'text-[#94a3b8]'
                    }`}
                  >
                    {job.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                </td>
                <td className="px-[14px] py-[10px] font-mono font-semibold text-[#0B1628]">
                  {job.jobname}
                </td>
                <td className="px-[14px] py-[10px] font-mono text-[#3D5068] text-[11px]">
                  <div>{job.schedule}</div>
                  <div className="text-[10px] text-[#6B7F96]">{formatSchedule(job.schedule)}</div>
                </td>
                <td className="px-[14px] py-[10px] font-mono text-navy text-[11px]">
                  {job.function_name || '—'}
                </td>
                <td className="px-[14px] py-[10px] text-[#3D5068] text-[11px]">
                  {formatRelativeTime(job.last_run)}
                </td>
                <td className="px-[14px] py-[10px] text-[#3D5068] text-[11px]">
                  {job.next_run ? formatDateTime(job.next_run) : '—'}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-[#6B7F96]">
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
    <div className="bg-white border border-[#D1D9E6] rounded-[10px] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-navy" />
          <span className="text-sm font-bold text-[#0B1628]">
            Manual Invoke
          </span>
          <span className="font-mono text-xs text-navy bg-[#eff6ff] px-2 py-[2px] rounded-md">
            {functionName}
          </span>
        </div>
        <button
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer text-[#6B7F96] p-1"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mb-3">
        <label className="text-[11px] font-semibold text-[#6B7F96] block mb-1.5">
          Request Payload (JSON)
        </label>
        <textarea
          value={payloadText}
          onChange={e => { setPayloadText(e.target.value); setParseError(null); }}
          className={`w-full min-h-[120px] p-3 font-mono text-xs rounded-lg bg-[#F8FAFC] text-[#0B1628] resize-y outline-none border ${
            parseError ? 'border-[#fecaca]' : 'border-[#D1D9E6]'
          }`}
        />
        {parseError && (
          <div className="text-[11px] text-[#dc2626] mt-1">{parseError}</div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleInvoke}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-navy text-white border-none cursor-pointer text-xs font-semibold hover:bg-navy-light"
        >
          <Zap size={14} />
          Invoke Function
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[#EEF1F7] text-[#3D5068] border-none cursor-pointer text-xs font-semibold"
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
    <div className="bg-white border border-[#D1D9E6] rounded-[10px] px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
      {/* Tabs */}
      <div className="flex gap-0.5 bg-[#EEF1F7] rounded-lg p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center gap-[5px] px-[14px] py-1.5 rounded-md border-none cursor-pointer text-xs ${
              activeTab === tab.id
                ? 'bg-white text-[#0B1628] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'bg-transparent text-[#6B7F96] font-normal'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-px h-7 bg-[#D1D9E6]" />

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="text-[#6B7F96] absolute left-[10px] top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search functions..."
          value={filters.search}
          onChange={e => onFilterChange({ search: e.target.value })}
          className="w-full py-[7px] pl-[30px] pr-[10px] border border-[#D1D9E6] rounded-md text-xs text-[#0B1628] bg-[#F8FAFC] outline-none"
        />
      </div>

      {/* Category filter */}
      <select
        value={filters.category}
        onChange={e => onFilterChange({ category: e.target.value as FunctionCategory | '' })}
        className="py-[7px] px-[10px] border border-[#D1D9E6] rounded-md text-xs text-[#3D5068] bg-[#F8FAFC] outline-none cursor-pointer"
      >
        {categories.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {/* Health filter */}
      <select
        value={filters.health}
        onChange={e => onFilterChange({ health: e.target.value as HealthStatus | '' })}
        className="py-[7px] px-[10px] border border-[#D1D9E6] rounded-md text-xs text-[#3D5068] bg-[#F8FAFC] outline-none cursor-pointer"
      >
        {healthOptions.map(h => (
          <option key={h.value} value={h.value}>{h.label}</option>
        ))}
      </select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#fef2f2] text-[#dc2626] border-none cursor-pointer text-[11px] font-semibold"
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
  useDemoGuard();
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();

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

  // Guard: admin-only
  if (!isEvidlyAdmin && !isDemoMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleFilterChange = (partial: Partial<FunctionFilterState>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const handleInvoke = (functionName: string) => {
    setInvokeTarget(functionName);
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="w-8 h-8 border-[3px] border-[#D1D9E6] border-t-gold rounded-full animate-spin mx-auto" />
        <p className="text-[#6B7F96] mt-3 text-[13px]">Loading edge function data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      <AdminBreadcrumb crumbs={[{ label: 'Edge Functions' }]} />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0B1628] m-0">
            Edge Function Health Monitor
          </h1>
          <p className="text-[13px] text-[#6B7F96] mt-1 mb-0">
            Monitor, invoke, and manage all {summary.total_deployed} EvidLY Supabase Edge Functions
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#3D5068] border border-[#D1D9E6] cursor-pointer text-xs font-semibold"
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
