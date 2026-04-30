import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Thermometer, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react';
import { useCooldownTempChecks, useLogCooldownCheck, type CooldownTempCheck } from '../../hooks/api/useCooldownTempChecks';
import { type CooldownLog } from '../../hooks/api/useCooldownLogs';
import { colors } from '../../lib/designSystem';
import { toast } from 'sonner';
import Button from '../ui/Button';

// ── Types ──────────────────────────────────────────────────────

interface Props {
  log: CooldownLog;
  onClose: () => void;
  onCheckLogged?: () => void;
}

type CheckpointState = 'done' | 'active' | 'pending';

interface Checkpoint {
  id: number;
  label: string;
  targetTemp: number | null;
  deadline: string | null;
  state: CheckpointState;
  completedAt: string | null;
  reading: number | null;
}

interface PaceProjection {
  estimatedMinutes: number;
  targetTemp: number;
  label: string;
  onTrack: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

function computeCheckpoints(log: CooldownLog, checks: CooldownTempCheck[]): Checkpoint[] {
  const stage1Target = log.stage1_target_temp ?? 70;
  const stage2Target = log.stage2_target_temp ?? 41;

  // CP1: Start — always done once cooldown exists
  const startCheck = checks[0] ?? null;

  // CP2: Stage 1 complete — first non-start check with temp ≤ stage1Target
  const stage1Check = checks.find(
    (c, i) => i > 0 && c.stage === 1 && c.temperature_value <= stage1Target
  ) ?? null;

  // CP3: Stage 2 complete — first stage-2 check with temp ≤ stage2Target
  const stage2Check = checks.find(
    c => c.stage === 2 && c.temperature_value <= stage2Target
  ) ?? null;

  // CP4: Final — log status is 'completed'
  const isFinal = log.status === 'completed';

  // Determine active checkpoint
  const currentStage = log.current_stage ?? 1;

  const cp1State: CheckpointState = 'done';
  const cp2State: CheckpointState = stage1Check ? 'done' : currentStage === 1 ? 'active' : 'done';
  const cp3State: CheckpointState = stage2Check ? 'done' : currentStage === 2 ? 'active' : cp2State === 'done' && !isFinal ? 'active' : 'pending';
  const cp4State: CheckpointState = isFinal ? 'done' : 'pending';

  return [
    {
      id: 1,
      label: 'Start',
      targetTemp: null,
      deadline: null,
      state: cp1State,
      completedAt: startCheck?.check_time ?? log.start_time,
      reading: startCheck?.temperature_value ?? log.starting_temp,
    },
    {
      id: 2,
      label: '2-Hour Check (≤70°F)',
      targetTemp: stage1Target,
      deadline: '2 hours from start',
      state: cp2State,
      completedAt: stage1Check?.check_time ?? null,
      reading: stage1Check?.temperature_value ?? null,
    },
    {
      id: 3,
      label: '6-Hour Check (≤41°F)',
      targetTemp: stage2Target,
      deadline: '6 hours total',
      state: cp3State,
      completedAt: stage2Check?.check_time ?? null,
      reading: stage2Check?.temperature_value ?? null,
    },
    {
      id: 4,
      label: 'Final',
      targetTemp: stage2Target,
      deadline: null,
      state: cp4State,
      completedAt: isFinal ? log.stage2_complete_time : null,
      reading: stage2Check?.temperature_value ?? null,
    },
  ];
}

function computePaceProjection(
  log: CooldownLog,
  checks: CooldownTempCheck[],
  checkpoints: Checkpoint[],
): PaceProjection | null {
  if (checks.length < 2) return null;

  const activeCP = checkpoints.find(cp => cp.state === 'active');
  if (!activeCP || activeCP.targetTemp === null) return null;

  const lastTwo = checks.slice(-2);
  const t1 = new Date(lastTwo[0].check_time ?? lastTwo[0].created_at ?? '').getTime();
  const t2 = new Date(lastTwo[1].check_time ?? lastTwo[1].created_at ?? '').getTime();
  const temp1 = lastTwo[0].temperature_value;
  const temp2 = lastTwo[1].temperature_value;

  const timeDiffMin = (t2 - t1) / 60000;
  if (timeDiffMin <= 0) return null;

  const ratePerMin = (temp2 - temp1) / timeDiffMin;
  if (ratePerMin >= 0) return null;

  const tempRemaining = temp2 - activeCP.targetTemp;
  if (tempRemaining <= 0) return null;

  const minutesToTarget = tempRemaining / Math.abs(ratePerMin);

  let onTrack = true;
  if (activeCP.id === 2 && log.start_time) {
    const deadlineMs = new Date(log.start_time).getTime() + 2 * 60 * 60 * 1000;
    const projectedFinishMs = Date.now() + minutesToTarget * 60000;
    onTrack = projectedFinishMs <= deadlineMs;
  } else if (activeCP.id === 3 && log.start_time) {
    const deadlineMs = new Date(log.start_time).getTime() + 6 * 60 * 60 * 1000;
    const projectedFinishMs = Date.now() + minutesToTarget * 60000;
    onTrack = projectedFinishMs <= deadlineMs;
  }

  return {
    estimatedMinutes: Math.round(minutesToTarget),
    targetTemp: activeCP.targetTemp,
    label: activeCP.label,
    onTrack,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

// ── Component ──────────────────────────────────────────────────

export function CooldownTimelineDetail({ log, onClose, onCheckLogged }: Props) {
  const { data: checks, isLoading, refetch } = useCooldownTempChecks(log.id);
  const { mutate: logCheck, isLoading: isSubmitting } = useLogCooldownCheck();

  const [captureTemp, setCaptureTemp] = useState('');
  const [captureError, setCaptureError] = useState<string | null>(null);

  const allChecks = checks ?? [];
  const checkpoints = computeCheckpoints(log, allChecks);
  const pace = computePaceProjection(log, allChecks, checkpoints);

  const activeCP = checkpoints.find(cp => cp.state === 'active');
  const captureStage = activeCP?.id === 3 ? 2 : 1;

  const tempNumeric = parseFloat(captureTemp);
  const tempValid = !isNaN(tempNumeric) && tempNumeric > 0 && tempNumeric < 300;
  const canSubmit = tempValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setCaptureError(null);
    try {
      await logCheck({
        cooldownLogId: log.id,
        temperatureValue: tempNumeric,
        stage: captureStage,
      });
      toast.success(`Logged ${tempNumeric}°F`);
      setCaptureTemp('');
      refetch();
      onCheckLogged?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log check';
      setCaptureError(message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.textMuted }} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
          {log.food_item_name}
        </h3>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          Cooldown Timeline
        </p>
      </div>

      {/* Pace Projection Banner */}
      {pace && (
        <div
          className="rounded-xl border px-4 py-3 mb-6 flex items-center gap-3"
          style={{
            backgroundColor: pace.onTrack ? colors.successSoft : colors.dangerSoft,
            borderColor: pace.onTrack ? `${colors.success}40` : `${colors.danger}40`,
          }}
        >
          {pace.onTrack ? (
            <TrendingDown className="h-4 w-4 flex-shrink-0" style={{ color: colors.success }} />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: colors.danger }} />
          )}
          <p className="text-sm" style={{ color: pace.onTrack ? colors.success : colors.danger }}>
            At current rate, reaching {pace.targetTemp}°F in {formatDuration(pace.estimatedMinutes)}.
            {' '}{pace.onTrack ? 'On Track.' : 'May exceed deadline.'}
          </p>
        </div>
      )}

      {/* Vertical Timeline */}
      <div className="space-y-0 mb-6">
        {checkpoints.map((cp, idx) => {
          const isLast = idx === checkpoints.length - 1;
          const iconColor =
            cp.state === 'done' ? colors.success :
            cp.state === 'active' ? colors.navy :
            colors.borderLight;

          return (
            <div key={cp.id} className="flex gap-4">
              {/* Left: icon + connector line */}
              <div className="flex flex-col items-center">
                {cp.state === 'done' ? (
                  <CheckCircle2 className="h-6 w-6 flex-shrink-0" style={{ color: iconColor }} />
                ) : (
                  <Circle
                    className="h-6 w-6 flex-shrink-0"
                    style={{ color: iconColor }}
                    strokeWidth={cp.state === 'active' ? 2.5 : 1.5}
                  />
                )}
                {!isLast && (
                  <div
                    className="w-0.5 flex-1 min-h-[32px]"
                    style={{ backgroundColor: cp.state === 'done' ? colors.success : colors.borderLight }}
                  />
                )}
              </div>

              {/* Right: label + metadata */}
              <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                <p
                  className="text-sm font-semibold leading-6"
                  style={{ color: cp.state === 'pending' ? colors.textMuted : colors.textPrimary }}
                >
                  {cp.label}
                </p>
                {cp.state === 'done' && cp.reading !== null && (
                  <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                    {cp.reading}°F
                    {cp.completedAt && ` · ${new Date(cp.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                  </p>
                )}
                {cp.state === 'active' && cp.deadline && (
                  <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                    Deadline: {cp.deadline}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline Capture Form */}
      {activeCP && (
        <div
          className="rounded-xl border p-4 mb-6"
          style={{ borderColor: colors.border, backgroundColor: `${colors.navy}04` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="h-4 w-4" style={{ color: colors.navy }} />
            <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              Log Reading — Stage {captureStage}
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={captureTemp}
              onChange={(e) => setCaptureTemp(e.target.value)}
              className="flex-1 px-4 py-3 border border-navy/15 rounded-xl text-sm text-navy placeholder:text-navy/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              placeholder="Temperature °F"
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!canSubmit}
            >
              Log
            </Button>
          </div>
          {activeCP.targetTemp && (
            <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
              Target: ≤{activeCP.targetTemp}°F
            </p>
          )}
          {captureError && (
            <p className="text-xs mt-2" style={{ color: colors.danger }}>
              {captureError}
            </p>
          )}
        </div>
      )}

      {/* Recent Checks Summary */}
      {allChecks.length > 1 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textMuted }}>
            Recent Readings
          </p>
          <div className="space-y-1.5">
            {allChecks.slice(-5).reverse().map((check) => (
              <div key={check.id} className="flex items-center justify-between text-xs" style={{ color: colors.textSecondary }}>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {check.check_time
                    ? new Date(check.check_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    : '—'}
                </span>
                <span className="font-medium" style={{ color: colors.textPrimary }}>
                  {check.temperature_value}°F
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close button */}
      <div className="flex justify-end">
        <Button variant="secondary" size="md" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
