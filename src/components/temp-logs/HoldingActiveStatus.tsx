import { useState, useEffect, useCallback, useMemo } from 'react';
import { Thermometer, Clock, AlertTriangle, Loader2, Plus, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRole } from '../../contexts/RoleContext';
import { useApiQuery } from '../../hooks/api/useApiQuery';
import { useLogTemperature } from '../../hooks/api/useTemperatureLogs';
import { isHoldingCold, isHoldingHot } from '../../lib/equipmentHelpers';
import { TEMP_CHECK_INTERVALS } from '../../config/tempConfig';
import { colors, shadows } from '../../lib/designSystem';
import { EmptyState } from '../EmptyState';
import { AddHoldingReadingModal, type HoldingReadingSaveData } from './AddHoldingReadingModal';
import { toast } from 'sonner';
import type { TemperatureEquipment } from './types';

// ── Types ──────────────────────────────────────────────────────

type EquipmentStatus = 'pass' | 'fail' | 'overdue' | 'stale' | 'setup';

interface EquipmentWithStatus extends TemperatureEquipment {
  status: EquipmentStatus;
  lastReadingAge: number | null;
}

// ── Helpers ─────────────────────────────────────────────────────

function deriveStatus(eq: TemperatureEquipment): EquipmentStatus {
  if (!eq.last_check) return 'setup';
  const ageMin = (Date.now() - new Date(eq.last_check.created_at).getTime()) / (1000 * 60);
  const overdueMin = isHoldingHot(eq.equipment_type)
    ? TEMP_CHECK_INTERVALS.HOT_HOLDING_OVERDUE_MINUTES
    : TEMP_CHECK_INTERVALS.COLD_HOLDING_OVERDUE_MINUTES;
  if (ageMin > 24 * 60) return 'stale';

  // Recompute pass/fail against CURRENT equipment range
  const temp = eq.last_check.temperature_value;
  const inRange = temp != null && temp >= eq.min_temp && temp <= eq.max_temp;

  if (!inRange) return 'fail';
  if (ageMin > overdueMin) return 'overdue';
  return 'pass';
}

function formatTimeSince(minutes: number | null): string {
  if (minutes === null) return 'never';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${Math.floor(minutes % 60)}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; bg: string; fg: string }> = {
  pass:    { label: 'In Range',     bg: colors.successSoft, fg: colors.success },
  fail:    { label: 'Out of Range', bg: colors.dangerSoft,  fg: colors.danger },
  overdue: { label: 'Overdue',      bg: colors.warningSoft, fg: colors.warning },
  stale:   { label: 'Stale',        bg: `${colors.navy}10`, fg: colors.textSecondary },
  setup:   { label: 'Setup',        bg: `${colors.navy}08`, fg: colors.textMuted },
};

// ── AI Insight Banner ───────────────────────────────────────────

interface HoldingInsightBannerProps {
  locationId: string;
  variant: 'hot' | 'cold';
}

function HoldingInsightBanner({ locationId, variant }: HoldingInsightBannerProps) {
  const [insightText, setInsightText] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const step = variant === 'hot' ? 'hot_holding' : 'cold_holding';
  const label = variant === 'hot' ? 'Hot Holding' : 'Cold Holding';

  useEffect(() => {
    if (!locationId) { setLoading(false); return; }
    let cancelled = false;

    const generate = async () => {
      try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: readings } = await supabase
          .from('temperature_logs')
          .select('equipment_id, temperature, temp_pass, reading_time, corrective_action, step')
          .eq('step', step)
          .eq('facility_id', locationId)
          .gte('reading_time', yesterday)
          .order('reading_time', { ascending: false })
          .limit(200);

        if (cancelled) return;

        if (!readings || readings.length === 0) {
          setInsightText(`No ${label.toLowerCase()} readings recorded in the last 24 hours.`);
          setLoading(false);
          return;
        }

        const total = readings.length;
        const passing = readings.filter(r => r.temp_pass).length;
        const failing = readings.filter(r => !r.temp_pass).length;
        const uncorrected = readings.filter(r => !r.temp_pass && !r.corrective_action).length;

        const { data: aiResult } = await supabase.functions.invoke('ai-text-assist', {
          body: {
            type: 'holding_insight',
            context: {
              mode: step,
              date: new Date().toLocaleDateString(),
              total_readings: total,
              passing,
              failing,
              pass_rate: total > 0 ? Math.round((passing / total) * 100) : 0,
              uncorrected_violations: uncorrected,
            },
          },
        });

        if (cancelled) return;
        setInsightText(
          aiResult?.text || aiResult?.result ||
          `${total} ${label.toLowerCase()} readings today. ${passing} passed, ${failing} failed. ${uncorrected} uncorrected.`
        );
      } catch {
        if (!cancelled) setInsightText(`${label} intelligence unavailable.`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [locationId, step, label]);

  if (loading) return null;

  return (
    <div
      className="rounded-xl border px-4 py-3 mb-4"
      style={{ backgroundColor: colors.infoSoft, borderColor: `${colors.info}30` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4" style={{ color: colors.info }} />
          <span className="text-xs font-bold" style={{ color: colors.navy }}>
            {label} Intelligence
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded hover:bg-white/50 transition-colors"
          style={{ color: colors.info }}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {isOpen && (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: colors.textPrimary }}>
          {insightText}
        </p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

interface HoldingActiveStatusProps {
  variant: 'hot' | 'cold';
}

export function HoldingActiveStatus({ variant }: HoldingActiveStatusProps) {
  const { getAccessibleLocations } = useRole();
  const locationId = getAccessibleLocations()[0]?.locationId ?? '';

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultEquipmentId, setDefaultEquipmentId] = useState<string | undefined>(undefined);

  // Optimistic updates: equipmentId → { temp, time, pass }
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<string, { temp: number; time: string; pass: boolean }>
  >(new Map());

  // Expanded unit ids — smart default: 1-2 units expanded, 3+ collapsed, failures always expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch holding equipment for this location
  const queryFn = useCallback(async (): Promise<TemperatureEquipment[]> => {
    if (!locationId) return [];

    const { data: eqData, error: eqError } = await supabase
      .from('temperature_equipment')
      .select('id, name, equipment_type, min_temp, max_temp, unit, default_input_method')
      .eq('location_id', locationId)
      .eq('is_active', true);

    if (eqError) throw eqError;
    if (!eqData || eqData.length === 0) return [];

    const filtered = eqData.filter(eq =>
      variant === 'hot' ? isHoldingHot(eq.equipment_type) : isHoldingCold(eq.equipment_type)
    );

    const withChecks = await Promise.all(
      filtered.map(async (eq) => {
        const { data: lastCheck } = await supabase
          .from('temperature_logs')
          .select('temperature, reading_time, temp_pass')
          .eq('equipment_id', eq.id)
          .is('superseded_by_log_id', null)
          .order('reading_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...eq,
          last_check: lastCheck
            ? {
                temperature_value: lastCheck.temperature,
                created_at: lastCheck.reading_time,
                is_within_range: lastCheck.temp_pass,
              }
            : undefined,
        } as TemperatureEquipment;
      })
    );

    return withChecks;
  }, [locationId, variant]);

  const { data: equipment, isLoading, error, refetch } = useApiQuery(
    locationId ? `holding-equip:${locationId}:${variant}` : 'holding-equip:empty',
    queryFn,
    [],
  );

  // Mutation hook
  const { mutate: logTemperature } = useLogTemperature();

  // Derive statuses with optimistic overlay
  const equipmentWithStatus: EquipmentWithStatus[] = useMemo(() => {
    if (!equipment) return [];
    return equipment.map(eq => {
      const optimistic = optimisticUpdates.get(eq.id);
      const effectiveEq: TemperatureEquipment = optimistic
        ? {
            ...eq,
            last_check: {
              temperature_value: optimistic.temp,
              created_at: optimistic.time,
              is_within_range: optimistic.pass,
            },
          }
        : eq;
      const ageMin = effectiveEq.last_check
        ? (Date.now() - new Date(effectiveEq.last_check.created_at).getTime()) / (1000 * 60)
        : null;
      return {
        ...effectiveEq,
        status: deriveStatus(effectiveEq),
        lastReadingAge: ageMin,
      };
    });
  }, [equipment, optimisticUpdates]);

  // Initial expansion: 1-2 units → all expanded, 3+ → all collapsed, failures always expanded
  useEffect(() => {
    if (hasInitialized || equipmentWithStatus.length === 0) return;
    const initial = new Set<string>();
    const totalUnits = equipmentWithStatus.length;
    const expandAll = totalUnits <= 2;
    equipmentWithStatus.forEach(eq => {
      const isFailing = eq.status === 'fail' || eq.status === 'overdue';
      if (expandAll || isFailing) initial.add(eq.id);
    });
    setExpandedIds(initial);
    setHasInitialized(true);
  }, [equipmentWithStatus, hasInitialized]);

  // Auto-expand any unit that newly enters fail/overdue after initial render
  useEffect(() => {
    if (!hasInitialized) return;
    setExpandedIds(prev => {
      let changed = false;
      const next = new Set(prev);
      equipmentWithStatus.forEach(eq => {
        const isFailing = eq.status === 'fail' || eq.status === 'overdue';
        if (isFailing && !next.has(eq.id)) {
          next.add(eq.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [equipmentWithStatus, hasInitialized]);

  // Handle log save — optimistic + persist
  const handleSaveReading = async (data: HoldingReadingSaveData) => {
    const eq = equipment?.find(e => e.id === data.equipmentId);
    if (!eq) return;

    const inRange = data.temperature >= eq.min_temp && data.temperature <= eq.max_temp;

    // Optimistic update
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(data.equipmentId, {
        temp: data.temperature,
        time: data.readingTime,
        pass: inRange,
      });
      return next;
    });

    try {
      await logTemperature({
        locationId,
        equipmentId: data.equipmentId,
        step: variant === 'hot' ? 'hot_holding' : 'cold_holding',
        temperature: data.temperature,
        requiredMin: eq.min_temp,
        requiredMax: eq.max_temp,
        tempPass: inRange,
        readingTime: data.readingTime,
        inputMethod: 'manual',
        notes: data.notes || null,
        correctiveAction: data.correctiveAction || null,
      });

      if (inRange) {
        toast.success(`${data.temperature}\u00B0F logged for ${eq.name} \u2014 Within safe range`);
      } else {
        toast.warning(`${data.temperature}\u00B0F logged for ${eq.name} \u2014 Outside safe range`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log temperature';
      toast.error(message);
    } finally {
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.delete(data.equipmentId);
        return next;
      });
      refetch();
    }
  };

  const handleRowLog = (equipmentId: string) => {
    setDefaultEquipmentId(equipmentId);
    setShowAddModal(true);
  };

  const handleAddReading = () => {
    setDefaultEquipmentId(undefined);
    setShowAddModal(true);
  };

  // ── Theme ──────────────────────────────────────

  const isHot = variant === 'hot';
  const themeColor = isHot ? '#EA580C' : colors.info;
  const themeBg = isHot ? '#FFF7ED' : colors.infoSoft;
  const title = isHot ? 'Hot Holding' : 'Cold Holding';
  const subtitle = isHot
    ? 'Must remain \u2265 135\u00B0F \u2014 check every 4 hours'
    : 'Must remain \u2264 41\u00B0F \u2014 check every 4 hours';
  const regulation = isHot
    ? 'FDA \u00A73-501.16(A)(1) \u00B7 CalCode \u00A7113996(a)'
    : 'FDA \u00A73-501.16(A)(2) \u00B7 CalCode \u00A7113996(b)';

  // ── Render branches ────────────────────────────

  let content;

  if (!locationId) {
    content = (
      <EmptyState
        icon={Thermometer}
        iconClassName={`w-8 h-8 ${isHot ? 'text-[#EA580C]' : 'text-[#2563EB]'}`}
        title={`No ${title.toLowerCase()} equipment`}
        description="Configure equipment in your location settings to start tracking holding temperatures."
      />
    );
  } else if (isLoading) {
    content = (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.textMuted }} />
      </div>
    );
  } else if (error) {
    content = (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft }}
      >
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: colors.danger }} />
        <p className="text-sm font-medium" style={{ color: colors.danger }}>
          Failed to load {title.toLowerCase()} data
        </p>
        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
          {error.message}
        </p>
      </div>
    );
  } else if (equipmentWithStatus.length === 0) {
    content = (
      <EmptyState
        icon={Thermometer}
        iconClassName={`w-8 h-8 ${isHot ? 'text-[#EA580C]' : 'text-[#2563EB]'}`}
        title={`No ${title.toLowerCase()} equipment`}
        description="Configure equipment in your location settings to start tracking holding temperatures."
      />
    );
  } else {
    const passCount = equipmentWithStatus.filter(e => e.status === 'pass').length;
    const measuredCount = equipmentWithStatus.filter(e => e.last_check?.temperature_value != null).length;
    const totalActive = equipmentWithStatus.length;
    const allMeasured = measuredCount === totalActive;
    const noneMeasured = measuredCount === 0;

    content = (
      <div className="space-y-4">
        {/* AI Insight Banner — scoped to this variant */}
        <HoldingInsightBanner locationId={locationId} variant={variant} />

        {/* Header card */}
        <div
          className="rounded-xl border p-4 sm:p-5"
          style={{ backgroundColor: colors.white, borderColor: colors.border, boxShadow: shadows.sm }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: themeBg }}
              >
                <Thermometer className="h-5 w-5" style={{ color: themeColor }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: colors.textPrimary }}>
                  {title}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  {subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 text-xs font-semibold rounded"
                style={{ backgroundColor: `${colors.navy}10`, color: colors.navy }}
              >
                {regulation}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: noneMeasured
                    ? colors.bgPanel
                    : (allMeasured && passCount === totalActive)
                      ? colors.successSoft
                      : colors.warningSoft,
                  color: noneMeasured
                    ? colors.textSecondary
                    : (allMeasured && passCount === totalActive)
                      ? colors.success
                      : colors.warning,
                }}
              >
                {noneMeasured
                  ? `Awaiting readings`
                  : `${passCount}/${measuredCount} in range`}
              </span>
            </div>
          </div>

          {/* Equipment rows */}
          <div className="space-y-2">
            {equipmentWithStatus.map(eq => {
              const cfg = STATUS_CONFIG[eq.status];
              const expanded = expandedIds.has(eq.id);
              const toggleExpanded = () => {
                setExpandedIds(prev => {
                  const next = new Set(prev);
                  if (next.has(eq.id)) next.delete(eq.id);
                  else next.add(eq.id);
                  return next;
                });
              };
              const tempValue = eq.last_check?.temperature_value;
              const hasReading = tempValue != null;
              const tempColor = eq.status === 'pass' ? colors.success
                              : eq.status === 'fail' ? colors.danger
                              : colors.textSecondary;
              const isFail = eq.status === 'fail' || eq.status === 'overdue';
              const threshold = isHot ? 135 : 41;
              const barMin = isHot ? 100 : 20;
              const barMax = isHot ? 180 : 60;
              const dotPercent = hasReading
                ? Math.max(2, Math.min(98, ((tempValue - barMin) / (barMax - barMin)) * 100))
                : null;
              const methodLabel = (eq.default_input_method || 'typed').charAt(0).toUpperCase() + (eq.default_input_method || 'typed').slice(1);
              return (
                <div
                  key={eq.id}
                  className="rounded-xl border p-4 flex flex-col gap-3 cursor-pointer"
                  style={{
                    backgroundColor: colors.white,
                    borderColor: isFail ? `${colors.danger}80` : colors.border,
                    borderWidth: isFail ? '1px' : '0.5px',
                  }}
                  onClick={toggleExpanded}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpanded();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <p className="text-base font-medium flex-1 min-w-0 truncate" style={{ color: colors.textPrimary }}>
                      {eq.name}
                    </p>
                    <span className="text-xl font-semibold whitespace-nowrap" style={{ color: tempColor }}>
                      {hasReading ? `${tempValue}\u00B0F` : '--'}
                    </span>
                    {expanded
                      ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: colors.textTertiary }} />
                      : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: colors.textTertiary }} />
                    }
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
                      style={{ backgroundColor: colors.bgPanel, color: colors.textSecondary }}
                    >
                      {eq.equipment_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
                      style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
                    >
                      {methodLabel}
                    </span>
                    <span
                      className="text-[11px] ml-auto whitespace-nowrap"
                      style={{ color: cfg.fg, fontWeight: isFail ? 500 : 400 }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <div className="relative h-3.5 rounded-full overflow-hidden flex">
                    <div
                      className="flex items-center justify-center text-[9px] font-medium tracking-wide"
                      style={{
                        backgroundColor: isHot ? '#F09595' : '#C0DD97',
                        color: isHot ? '#501313' : '#173404',
                        flex: isHot ? '0 0 35%' : '1',
                      }}
                    >
                      {isHot ? 'UNSAFE' : `SAFE \u2264 ${threshold}\u00B0F`}
                    </div>
                    <div
                      className="flex items-center justify-center text-[9px] font-medium tracking-wide"
                      style={{
                        backgroundColor: isHot ? '#C0DD97' : '#F09595',
                        color: isHot ? '#173404' : '#501313',
                        flex: isHot ? '1' : '0 0 35%',
                      }}
                    >
                      {isHot ? `SAFE \u2265 ${threshold}\u00B0F` : 'UNSAFE'}
                    </div>
                    {dotPercent != null && (
                      <div
                        className="absolute w-5 h-5 rounded-full bg-white"
                        style={{
                          top: '-3px',
                          left: `${dotPercent}%`,
                          transform: 'translateX(-50%)',
                          border: `2px solid ${colors.textPrimary}`,
                        }}
                      />
                    )}
                  </div>
                  {expanded && (
                    <div
                      className="pt-3 mt-1 border-t"
                      style={{ borderColor: colors.border }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs" style={{ color: colors.textMuted }}>
                        Food items held in this unit will appear here.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Reading button */}
        <div className="flex justify-center pt-1">
          <button
            onClick={handleAddReading}
            className="px-6 py-3 rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] min-h-[44px] flex items-center gap-2"
            style={{ backgroundColor: colors.navy, color: colors.white }}
          >
            <Plus className="h-4 w-4" />
            Add {title} Reading
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      <AddHoldingReadingModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setDefaultEquipmentId(undefined); }}
        equipment={equipment ?? []}
        isHoldingHot={isHoldingHot}
        onSave={handleSaveReading}
        defaultEquipmentId={defaultEquipmentId}
      />
    </>
  );
}
