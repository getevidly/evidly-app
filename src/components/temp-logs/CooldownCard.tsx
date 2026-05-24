import { useState, useEffect } from 'react';
import { Clock, Thermometer, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, shadows } from '../../lib/designSystem';
import { useCooldownChecks } from '../../hooks/temperatures/useCooldownChecks';
import { getMemberName, type OrgMember } from '../../hooks/useOrgMembers';
import { Avatar } from '../ui/Avatar';
import type { CooldownEventWithState } from '../../hooks/temperatures/useCooldownEvents';

// ── Helpers ─────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function stagePillLabel(ev: CooldownEventWithState): string {
  if (ev.status === 'completed') return 'Complete';
  if (ev.status === 'failed') return `Failed — Stage ${ev.failed_stage ?? '?'}`;
  if (ev.status === 'stage_1_complete') return 'Stage 2';
  return 'Stage 1';
}

function stagePillStyle(ev: CooldownEventWithState): { bg: string; fg: string } {
  if (ev.status === 'completed') return { bg: 'rgba(5,150,105,0.12)', fg: '#059669' };
  if (ev.status === 'failed') return { bg: 'rgba(179,38,30,0.12)', fg: '#b3261e' };
  if (ev.cardState === 'crit') return { bg: 'rgba(179,38,30,0.12)', fg: '#b3261e' };
  if (ev.cardState === 'warn') return { bg: 'rgba(194,115,26,0.12)', fg: '#c2731a' };
  return { bg: `${colors.navy}10`, fg: colors.navy };
}

function progressBarColor(ev: CooldownEventWithState): string {
  if (ev.cardState === 'failed') return '#b3261e';
  if (ev.cardState === 'crit') return '#b3261e';
  if (ev.cardState === 'warn') return '#c2731a';
  if (ev.cardState === 'complete') return '#059669';
  return colors.navy;
}

function borderColor(ev: CooldownEventWithState): string {
  if (ev.cardState === 'failed' && !ev.disposition) return '#b3261e';
  if (ev.cardState === 'crit') return 'rgba(179,38,30,0.4)';
  if (ev.cardState === 'warn') return 'rgba(194,115,26,0.4)';
  return colors.border;
}

// ── Component ───────────────────────────────────────────────

interface CooldownCardProps {
  event: CooldownEventWithState;
  members: OrgMember[];
  onLogCheck: (event: CooldownEventWithState) => void;
  onLogDisposition: (event: CooldownEventWithState) => void;
}

export function CooldownCard({ event, members, onLogCheck, onLogDisposition }: CooldownCardProps) {
  const [showChecks, setShowChecks] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(event.timeRemaining);
  const [pctElapsed, setPctElapsed] = useState(event.pctElapsed);

  const { data: checks } = useCooldownChecks(showChecks ? event.id : null);

  // 30-second timer refresh
  useEffect(() => {
    if (event.status === 'completed' || event.status === 'failed') return;

    const tick = () => {
      const now = Date.now();
      const startMs = new Date(event.started_at).getTime();
      const s1TargetMs = new Date(event.stage_1_target_at).getTime();
      const s2TargetMs = new Date(event.stage_2_target_at).getTime();

      if (event.activeStage === 1) {
        const stageLen = s1TargetMs - startMs;
        setPctElapsed(stageLen > 0 ? Math.min(1, (now - startMs) / stageLen) : 1);
        setTimeRemaining(Math.max(0, s1TargetMs - now));
      } else {
        const s1CompMs = event.stage_1_completed_at ? new Date(event.stage_1_completed_at).getTime() : s1TargetMs;
        const stageLen = s2TargetMs - s1CompMs;
        setPctElapsed(stageLen > 0 ? Math.min(1, (now - s1CompMs) / stageLen) : 1);
        setTimeRemaining(Math.max(0, s2TargetMs - now));
      }
    };

    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [event]);

  const pill = stagePillStyle(event);
  const isFailed = event.status === 'failed';
  const isComplete = event.status === 'completed';
  const needsDispo = isFailed && !event.disposition;
  const isActive = !isFailed && !isComplete;

  // Stage targets for display
  const s1Deadline = formatTime(event.stage_1_target_at);
  const s2Deadline = formatTime(event.stage_2_target_at);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: colors.white,
        borderColor: borderColor(event),
        boxShadow: shadows.sm,
      }}
      data-cooldown-critical={needsDispo ? 'true' : undefined}
    >
      {/* Head row */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: colors.textPrimary }}>
              {event.food_item_name}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                Started by{' '}
                <span className="font-semibold" style={{ color: colors.textPrimary }}>
                  {getMemberName(members, event.created_by)}
                </span>
              </span>
              <span className="text-xs" style={{ color: colors.textMuted }}>·</span>
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                {formatTime(event.started_at)}
              </span>
              {event.cooling_location && (
                <>
                  <span className="text-xs" style={{ color: colors.textMuted }}>·</span>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    {event.cooling_location}
                  </span>
                </>
              )}
            </div>
            {event.assigned_to && event.assigned_to !== event.created_by && (
              <div className="flex items-center gap-1.5 mt-1">
                <Avatar name={getMemberName(members, event.assigned_to)} userId={event.assigned_to} size={16} />
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  Monitored by{' '}
                  <span className="font-semibold" style={{ color: colors.textPrimary }}>
                    {getMemberName(members, event.assigned_to)}
                  </span>
                </span>
              </div>
            )}
          </div>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap flex-shrink-0"
            style={{ backgroundColor: pill.bg, color: pill.fg }}
          >
            {stagePillLabel(event)}
          </span>
        </div>
      </div>

      {/* Progress section */}
      {(isActive || isFailed) && (
        <div className="px-4 pb-3">
          {/* Target line */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium" style={{ color: colors.textMuted }}>
              {event.activeStage === 1 ? '135°F → 70°F' : '70°F → 41°F'}
            </span>
            {event.lastCheck && (
              <span className="text-[10px]" style={{ color: colors.textSecondary }}>
                Last: {event.lastCheck.temperature}°F
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.navy}08` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, pctElapsed * 100)}%`,
                backgroundColor: progressBarColor(event),
              }}
            />
          </div>

          {/* Timer row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-[9px] uppercase" style={{ color: colors.textMuted }}>Stage 1</p>
                <p
                  className="text-xs font-semibold"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: event.activeStage === 1 && isActive ? colors.textPrimary : colors.textMuted,
                  }}
                >
                  {s1Deadline}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase" style={{ color: colors.textMuted }}>Stage 2</p>
                <p
                  className="text-xs font-semibold"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: event.activeStage === 2 && isActive ? colors.textPrimary : colors.textMuted,
                  }}
                >
                  {s2Deadline}
                </p>
              </div>
            </div>

            {isActive && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" style={{ color: progressBarColor(event) }} />
                <span
                  className="text-sm font-bold"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: progressBarColor(event),
                  }}
                >
                  {formatCountdown(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed summary */}
      {isComplete && (
        <div className="px-4 pb-3">
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: colors.successSoft, color: colors.success }}
          >
            <span className="font-semibold">Cooldown complete.</span> Reached 41°F within the 6-hour window.
          </div>
        </div>
      )}

      {/* Recent checks (expandable) */}
      <div
        className="border-t px-4 py-2"
        style={{ borderColor: colors.borderLight, backgroundColor: colors.cream }}
      >
        <button
          type="button"
          onClick={() => setShowChecks(!showChecks)}
          className="flex items-center gap-1.5 w-full text-left"
        >
          <Thermometer className="w-3 h-3" style={{ color: colors.textMuted }} />
          <span className="text-[10px] font-semibold uppercase" style={{ color: colors.textSecondary }}>
            Check log
          </span>
          {showChecks
            ? <ChevronUp className="w-3 h-3 ml-auto" style={{ color: colors.textMuted }} />
            : <ChevronDown className="w-3 h-3 ml-auto" style={{ color: colors.textMuted }} />}
        </button>

        {showChecks && checks && checks.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {checks.slice(0, 5).map(chk => {
              const tempColor = chk.temperature <= 41 ? colors.success
                : chk.temperature <= 70 ? colors.gold
                : '#b3261e';
              const startMs = new Date(event.started_at).getTime();
              const checkMs = new Date(chk.checked_at).getTime();
              const elapsedMs = checkMs - startMs;
              const elapsedMin = Math.round(elapsedMs / 60000);
              const elapsedLabel = elapsedMin < 60
                ? `+${elapsedMin}m`
                : `+${Math.floor(elapsedMin / 60)}h${elapsedMin % 60 > 0 ? ` ${elapsedMin % 60}m` : ''}`;
              return (
                <div key={chk.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="font-bold w-12 text-right flex-shrink-0"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: tempColor }}
                  >
                    {chk.temperature}°F
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Avatar name={getMemberName(members, chk.checked_by)} userId={chk.checked_by ?? undefined} size={18} />
                    <span className="truncate" style={{ color: colors.textSecondary }}>
                      {getMemberName(members, chk.checked_by)} · {formatTime(chk.checked_at)}
                    </span>
                  </div>
                  <span
                    className="flex-shrink-0 text-[10px]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.textMuted }}
                  >
                    {elapsedLabel}
                  </span>
                </div>
              );
            })}
            {checks.length > 5 && (
              <p className="text-[10px] text-center" style={{ color: colors.textMuted }}>
                +{checks.length - 5} more
              </p>
            )}
          </div>
        )}

        {showChecks && checks && checks.length === 0 && (
          <p className="mt-2 text-xs" style={{ color: colors.textMuted }}>
            Only the starting temperature has been recorded.
          </p>
        )}
      </div>

      {/* Action row */}
      <div className="border-t px-4 py-3" style={{ borderColor: colors.borderLight }}>
        {needsDispo ? (
          <button
            type="button"
            onClick={() => onLogDisposition(event)}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            style={{ backgroundColor: '#b3261e', color: 'white', minHeight: '44px' }}
          >
            <AlertTriangle className="w-4 h-4" />
            Log Disposition
          </button>
        ) : isActive ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLogCheck(event)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              style={{
                backgroundColor: event.cardState === 'crit' ? '#b3261e'
                  : event.cardState === 'warn' ? '#c2731a'
                  : colors.navy,
                color: 'white',
                minHeight: '44px',
              }}
            >
              <Thermometer className="w-4 h-4" />
              {event.cardState === 'crit' ? 'Log Check — Urgent' : 'Log Check'}
            </button>
          </div>
        ) : isFailed && event.disposition ? (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: `${colors.navy}06`, color: colors.textSecondary }}
          >
            Disposition: <span className="font-semibold" style={{ color: colors.textPrimary }}>
              {event.disposition === 'discarded' ? 'Discarded'
                : event.disposition === 'reheated_recooled' ? 'Reheated & Recooled'
                : 'Other'}
            </span>
            {event.disposition_notes && ` — ${event.disposition_notes}`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
