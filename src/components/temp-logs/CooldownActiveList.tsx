import { Snowflake, Clock, Play, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';
import { useCooldownLogs, type CooldownLog } from '../../hooks/api/useCooldownLogs';
import { useRole } from '../../contexts/RoleContext';
import { formatRelativeTime } from '../../lib/formatters';
import { colors, shadows } from '../../lib/designSystem';
import { EmptyState } from '../EmptyState';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────

function deriveStatusInfo(log: CooldownLog): { label: string; color: 'green' | 'red' } {
  if (!log.start_time) return { label: 'On Track', color: 'green' };

  const elapsedMs = Date.now() - new Date(log.start_time).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const stage = log.current_stage ?? 1;

  // FDA Food Code §3-501.14 / CalCode §114002(b):
  // Stage 1: must reach 70°F within 2 hours from 135°F
  // Stage 2: must reach 41°F within 6 hours total from 135°F
  if (stage === 1 && elapsedHours > 2) return { label: 'Overdue — Stage 1', color: 'red' };
  if (stage === 2 && elapsedHours > 6) return { label: 'Overdue — Total', color: 'red' };
  return { label: 'On Track', color: 'green' };
}

function formatElapsed(startTime: string | null): string {
  if (!startTime) return '—';
  const ms = Date.now() - new Date(startTime).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Component ────────────────────────────────────────────────

export function CooldownActiveList() {
  const { getAccessibleLocations } = useRole();
  const locationId = getAccessibleLocations()[0]?.locationId ?? '';

  const { data: cooldownLogs, isLoading, error } = useCooldownLogs(locationId, { isActiveOnly: true });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.textMuted }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft }}
      >
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: colors.danger }} />
        <p className="text-sm font-medium" style={{ color: colors.danger }}>
          Failed to load cooldown data
        </p>
        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
          {error.message}
        </p>
      </div>
    );
  }

  const logs = cooldownLogs ?? [];

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Snowflake}
        title="No active cooldowns"
        description="Start a cooldown to track cooling events and stay compliant with FDA and CalCode requirements."
        action={{
          label: 'Start a New Cooldown',
          onClick: () => toast.info('Start Cooldown form ships in the next update.'),
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* AI suggestion placeholder */}
      <div
        className="rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{
          backgroundColor: `${colors.gold}08`,
          borderColor: `${colors.gold}30`,
        }}
      >
        <Snowflake className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.gold }} />
        <p className="text-sm" style={{ color: colors.textPrimary }}>
          <span className="font-semibold">{logs.length} active cooldown{logs.length !== 1 ? 's' : ''}.</span>{' '}
          AI-powered suggestions will appear here in a future update.
        </p>
      </div>

      {/* Active cooldown rows */}
      <div className="space-y-3">
        {logs.map((log) => {
          const status = deriveStatusInfo(log);
          const statusBg = status.color === 'green' ? colors.successSoft : colors.dangerSoft;
          const statusFg = status.color === 'green' ? colors.success : colors.danger;

          return (
            <div
              key={log.id}
              className="rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{
                backgroundColor: colors.white,
                borderColor: colors.border,
                boxShadow: shadows.sm,
              }}
            >
              {/* Left: item info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: colors.textPrimary }}>
                  {log.food_item_name}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="flex items-center gap-1 text-xs" style={{ color: colors.textSecondary }}>
                    <Clock className="h-3 w-3" />
                    Started {log.start_time ? formatRelativeTime(log.start_time) : '—'}
                  </span>
                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                    Elapsed: {formatElapsed(log.start_time)}
                  </span>
                  <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                    Stage {log.current_stage ?? 1}
                  </span>
                </div>
              </div>

              {/* Middle: mini timeline dots */}
              <div className="flex items-center gap-1.5 px-2">
                {[1, 2].map((stage) => {
                  const currentStage = log.current_stage ?? 1;
                  const dotColor =
                    stage < currentStage ? colors.success :
                    stage === currentStage ? colors.navy :
                    colors.borderLight;
                  return (
                    <div key={stage} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                      {stage < 2 && (
                        <div
                          className="w-6 h-0.5 rounded"
                          style={{ backgroundColor: stage < currentStage ? colors.success : colors.borderLight }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right: status badge + nav hint */}
              <div className="flex items-center gap-3">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={{ backgroundColor: statusBg, color: statusFg }}
                >
                  {status.label}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: colors.textMuted }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Start new cooldown button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => toast.info('Start Cooldown form ships in the next update.')}
          className="px-6 py-3 rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] min-h-[44px] flex items-center gap-2"
          style={{ backgroundColor: colors.navy, color: colors.white }}
        >
          <Play className="h-4 w-4" />
          Start a New Cooldown
        </button>
      </div>
    </div>
  );
}
