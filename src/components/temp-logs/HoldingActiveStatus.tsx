import { useState, useEffect, useCallback, useMemo } from 'react';
import { Thermometer, Clock, AlertTriangle, Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useApiQuery } from '../../hooks/api/useApiQuery';
import { useLogTemperature } from '../../hooks/api/useTemperatureLogs';
import { isHoldingCold, isHoldingHot } from '../../lib/equipmentHelpers';
import { TEMP_CHECK_INTERVALS } from '../../config/tempConfig';
import { colors, shadows } from '../../lib/designSystem';
import { EmptyState } from '../EmptyState';
import { AddHoldingReadingModal, type HoldingReadingSaveData } from './AddHoldingReadingModal';
import { LogHoldingCheck } from './LogHoldingCheck';
import { ReadingDetailModal } from './ReadingDetailModal';
import { Modal } from '../ui/Modal';
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
  const { profile } = useAuth();
  const locationId = getAccessibleLocations()[0]?.locationId ?? '';

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultEquipmentId, setDefaultEquipmentId] = useState<string | undefined>(undefined);

  // Optimistic updates: equipmentId → { temp, time, pass }
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<string, { temp: number; time: string; pass: boolean }>
  >(new Map());

  // Reading detail modal — which unit's detail is open
  const [detailEquipmentId, setDetailEquipmentId] = useState<string | null>(null);

  // Queued items per unit (added but not yet probed) — equipmentId → array of menu_items
  const [queuedItems, setQueuedItems] = useState<Map<string, Array<{ menu_item_id: string; menu_item_name: string }>>>(new Map());

  // Active picker state — which unit's add-item picker is open
  const [pickerEquipmentId, setPickerEquipmentId] = useState<string | null>(null);

  // Active log-check sheet state — which unit's log sheet is open
  const [logCheckEquipmentId, setLogCheckEquipmentId] = useState<string | null>(null);

  // In-picker selection (uncommitted) — menu_item_ids checked in the open picker
  const [pickerSelection, setPickerSelection] = useState<Set<string>>(new Set());

  // Reset selection whenever picker closes
  useEffect(() => {
    if (pickerEquipmentId === null) {
      setPickerSelection(new Set());
    }
  }, [pickerEquipmentId]);

  // Menu items for this org filtered by category matching variant
  const [menuItems, setMenuItems] = useState<Array<{ id: string; name: string; category: string }>>([]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      const orgId = profile?.organization_id;
      if (!orgId) return;
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, category')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('category', variant === 'hot' ? 'hot' : 'cold')
        .order('name', { ascending: true });
      if (error) {
        console.warn('[HoldingActiveStatus] menu_items fetch error:', error.message);
        return;
      }
      setMenuItems(data ?? []);
    };
    fetchMenuItems();
  }, [variant, profile?.organization_id]);

  // Fetch holding equipment for this location
  const queryFn = useCallback(async (): Promise<TemperatureEquipment[]> => {
    if (!locationId) return [];

    const { data: eqData, error: eqError } = await supabase
      .from('temperature_equipment')
      .select('id, name, equipment_type, min_temp, max_temp, unit, location_id, default_input_method')
      .eq('location_id', locationId)
      .eq('is_active', true);

    if (eqError) throw eqError;
    if (!eqData || eqData.length === 0) return [];

    const filtered = eqData.filter(eq =>
      variant === 'hot' ? isHoldingHot(eq.equipment_type) : isHoldingCold(eq.equipment_type)
    );

    const heldWindowMs = (variant === 'hot' ? 4 : 8) * 60 * 60 * 1000;
    const heldCutoff = new Date(Date.now() - heldWindowMs).toISOString();

    const withChecks = await Promise.all(
      filtered.map(async (eq) => {
        const { data: lastCheck } = await supabase
          .from('temperature_logs')
          .select('temperature, reading_time, temp_pass, logged_by, input_method, user_profiles:logged_by(full_name)')
          .eq('equipment_id', eq.id)
          .is('menu_item_id', null)
          .is('superseded_by_log_id', null)
          .order('reading_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: foodLogs } = await supabase
          .from('temperature_logs')
          .select('temperature, reading_time, temp_pass, menu_item_id, menu_items:menu_item_id(name)')
          .eq('equipment_id', eq.id)
          .not('menu_item_id', 'is', null)
          .is('superseded_by_log_id', null)
          .gte('reading_time', heldCutoff)
          .order('reading_time', { ascending: false });

        const seenItems = new Set<string>();
        const held_items = (foodLogs ?? [])
          .filter((row: { menu_item_id: string | null; menu_items: { name: string } | null }) => {
            if (!row.menu_item_id || seenItems.has(row.menu_item_id)) return false;
            seenItems.add(row.menu_item_id);
            return true;
          })
          .map((row: { temperature: number; reading_time: string; temp_pass: boolean; menu_item_id: string; menu_items: { name: string } | null }) => ({
            menu_item_id: row.menu_item_id,
            menu_item_name: row.menu_items?.name ?? 'Unknown item',
            temperature: row.temperature,
            reading_time: row.reading_time,
            temp_pass: row.temp_pass,
          }));

        return {
          ...eq,
          last_check: lastCheck
            ? {
                temperature_value: lastCheck.temperature,
                created_at: lastCheck.reading_time,
                is_within_range: lastCheck.temp_pass,
                recorded_by_name: lastCheck.user_profiles?.full_name,
                input_method: lastCheck.input_method,
              }
            : undefined,
          held_items,
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

  const handlePickerDone = () => {
    if (!pickerEquipmentId || pickerSelection.size === 0) return;
    const eqId = pickerEquipmentId;
    const selected = menuItems.filter(item => pickerSelection.has(item.id));
    const additions = selected.map(item => ({ menu_item_id: item.id, menu_item_name: item.name }));
    setQueuedItems(prev => {
      const next = new Map(prev);
      const existing = next.get(eqId) ?? [];
      next.set(eqId, [...existing, ...additions]);
      return next;
    });
    setPickerEquipmentId(null);
    setLogCheckEquipmentId(eqId);
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
    const failCount = equipmentWithStatus.filter(e => e.status === 'fail').length;
    const overdueCount = equipmentWithStatus.filter(e => e.status === 'overdue').length;
    const staleCount = equipmentWithStatus.filter(e => e.status === 'stale').length;
    const setupCount = equipmentWithStatus.filter(e => e.status === 'setup').length;
    const measuredCount = passCount + failCount;
    const totalActive = equipmentWithStatus.length;
    const allMeasured = measuredCount === totalActive;
    const noneMeasured = measuredCount === 0;

    let headerLabel: string;
    if (measuredCount > 0) {
      const parts = [`${passCount}/${measuredCount} in range`];
      if (overdueCount > 0) parts.push(`${overdueCount} awaiting reading`);
      if (staleCount > 0) parts.push(`${staleCount} stale`);
      if (setupCount > 0) parts.push(`${setupCount} awaiting first reading`);
      headerLabel = parts.join(' \u00B7 ');
    } else {
      const parts: string[] = [];
      if (overdueCount > 0) parts.push(`${overdueCount} awaiting reading`);
      if (staleCount > 0) parts.push(`${staleCount} stale`);
      if (setupCount > 0) parts.push(`${setupCount} awaiting first reading`);
      headerLabel = parts.length > 0 ? parts.join(' \u00B7 ') : 'No equipment configured';
    }

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
                {headerLabel}
              </span>
            </div>
          </div>

          {/* Equipment rows */}
          <div className="space-y-2">
            {equipmentWithStatus.map(eq => {
              const cfg = STATUS_CONFIG[eq.status];
              const tempValue = eq.last_check?.temperature_value;
              const hasReading = tempValue != null;
              const tempColor = eq.status === 'pass' ? colors.success
                              : eq.status === 'fail' ? colors.danger
                              : colors.textSecondary;
              const isFail = eq.status === 'fail' || eq.status === 'overdue';
              const isSetup = eq.status === 'setup';
              const threshold = isHot ? 135 : 41;
              const barMin = isHot ? 100 : 20;
              const barMax = isHot ? 180 : 60;
              const dotPercent = hasReading
                ? Math.max(2, Math.min(98, ((tempValue - barMin) / (barMax - barMin)) * 100))
                : null;
              const methodLabel = (eq.default_input_method || 'typed').charAt(0).toUpperCase() + (eq.default_input_method || 'typed').slice(1);
              const cardClick = isSetup
                ? () => setPickerEquipmentId(eq.id)
                : () => setDetailEquipmentId(eq.id);
              const ageMin = eq.last_check
                ? (Date.now() - new Date(eq.last_check.created_at).getTime()) / (1000 * 60)
                : null;
              return (
                <div
                  key={eq.id}
                  className="rounded-xl border p-4 flex flex-col gap-3 cursor-pointer"
                  style={{
                    backgroundColor: colors.white,
                    borderColor: isFail ? `${colors.danger}80` : colors.border,
                    borderWidth: isFail ? '1px' : '0.5px',
                  }}
                  onClick={cardClick}
                  role="button"
                  tabIndex={0}
                  aria-label={isSetup ? `Add first item to ${eq.name}` : `View reading detail for ${eq.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      cardClick();
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium truncate" style={{ color: colors.textPrimary }}>
                        {eq.name}
                      </p>
                      <p className="text-[11px]" style={{ color: colors.textMuted }}>
                        {isSetup ? 'no readings yet' : (ageMin != null ? formatTimeSince(ageMin) : '\u2014')}
                      </p>
                    </div>
                    <span className="text-xl font-semibold whitespace-nowrap" style={{ color: tempColor }}>
                      {hasReading ? `${tempValue}\u00B0F` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
                      style={{ backgroundColor: `${colors.navy}08`, color: colors.textSecondary }}
                    >
                      {eq.equipment_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
                      style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
                    >
                      {methodLabel}
                    </span>
                    {!isSetup && (
                      <span
                        className="text-[11px] ml-auto whitespace-nowrap"
                        style={{ color: cfg.fg, fontWeight: isFail ? 500 : 400 }}
                      >
                        {cfg.label}
                      </span>
                    )}
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
                  {isSetup ? (
                    <div className="text-center py-3 text-sm" style={{ color: colors.textSecondary }}>
                      Tap to add the first item
                    </div>
                  ) : (
                    <div
                      className="pt-3 mt-1 border-t"
                      style={{ borderColor: colors.border }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[10px] uppercase tracking-wide font-medium mb-2" style={{ color: colors.textMuted }}>
                        Food held in this unit
                      </p>
                      {(eq.held_items && eq.held_items.length > 0) ? (
                        <div className="flex flex-col gap-2">
                          {eq.held_items.map((item) => {
                            const itemAgeMin = (Date.now() - new Date(item.reading_time).getTime()) / (1000 * 60);
                            const itemDotPercent = Math.max(2, Math.min(98, ((item.temperature - barMin) / (barMax - barMin)) * 100));
                            const itemColor = item.temp_pass ? colors.success : colors.danger;
                            return (
                              <div key={item.menu_item_id} className="py-1">
                                <div className="flex items-center gap-3 mb-1.5">
                                  <span className="text-sm flex-1 min-w-0 truncate" style={{ color: colors.textPrimary }}>
                                    {item.menu_item_name}
                                  </span>
                                  <span className="text-sm font-medium whitespace-nowrap" style={{ color: itemColor }}>
                                    {item.temperature}°F
                                  </span>
                                  <span className="text-[10px] whitespace-nowrap" style={{ color: colors.textMuted }}>
                                    {formatTimeSince(itemAgeMin)}
                                  </span>
                                </div>
                                <div className="relative h-2.5 rounded-full overflow-hidden flex">
                                  <div
                                    style={{
                                      backgroundColor: isHot ? '#F09595' : '#C0DD97',
                                      flex: isHot ? '0 0 35%' : '1',
                                    }}
                                  />
                                  <div
                                    style={{
                                      backgroundColor: isHot ? '#C0DD97' : '#F09595',
                                      flex: isHot ? '1' : '0 0 35%',
                                    }}
                                  />
                                  <div
                                    className="absolute w-3.5 h-3.5 rounded-full bg-white"
                                    style={{
                                      top: '-2px',
                                      left: `${itemDotPercent}%`,
                                      transform: 'translateX(-50%)',
                                      border: `1.5px solid ${colors.textPrimary}`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (eq.held_items && eq.held_items.length === 0 && (queuedItems.get(eq.id)?.length ?? 0) === 0) ? (
                        <p className="text-xs py-3 text-center" style={{ color: colors.textMuted }}>
                          Nothing held in this unit right now
                        </p>
                      ) : null}

                      {(queuedItems.get(eq.id)?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {queuedItems.get(eq.id)!.map((q) => (
                            <div
                              key={q.menu_item_id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md"
                              style={{ backgroundColor: `${colors.navy}06` }}
                            >
                              <span className="text-sm flex-1" style={{ color: colors.textPrimary }}>
                                {q.menu_item_name}
                              </span>
                              <span className="text-[10px] uppercase tracking-wide" style={{ color: colors.textMuted }}>
                                Queued
                              </span>
                              <button
                                type="button"
                                className="text-[10px] px-1.5"
                                style={{ color: colors.textMuted }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQueuedItems(prev => {
                                    const next = new Map(prev);
                                    const arr = (next.get(eq.id) ?? []).filter(x => x.menu_item_id !== q.menu_item_id);
                                    if (arr.length === 0) next.delete(eq.id);
                                    else next.set(eq.id, arr);
                                    return next;
                                  });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {eq.status !== 'setup' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            className="flex-[0.65] px-3 py-2 rounded-lg text-sm font-medium"
                            style={{
                              backgroundColor: colors.navy,
                              color: 'white',
                              minHeight: '44px',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogCheckEquipmentId(eq.id);
                            }}
                          >
                            Log Check
                          </button>
                          <button
                            type="button"
                            className="flex-[0.35] px-3 py-2 rounded-lg text-xs font-medium"
                            style={{
                              border: `1px dashed ${colors.border}`,
                              color: colors.navy,
                              backgroundColor: 'transparent',
                              minHeight: '44px',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPickerEquipmentId(eq.id);
                            }}
                          >
                            + Add item
                          </button>
                        </div>
                      )}
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
      <LogHoldingCheck
        open={logCheckEquipmentId !== null}
        onClose={() => setLogCheckEquipmentId(null)}
        equipment={equipment?.find(e => e.id === logCheckEquipmentId) ?? null}
        heldItems={equipmentWithStatus.find(e => e.id === logCheckEquipmentId)?.held_items ?? []}
        queuedItems={queuedItems.get(logCheckEquipmentId ?? '') ?? []}
        variant={variant}
        onSaved={() => {
          setQueuedItems(prev => {
            const next = new Map(prev);
            if (logCheckEquipmentId) next.delete(logCheckEquipmentId);
            return next;
          });
          refetch?.();
        }}
      />
      <Modal
        isOpen={pickerEquipmentId !== null}
        onClose={() => setPickerEquipmentId(null)}
        size="sm"
      >
        {(() => {
          const eq = equipment?.find(e => e.id === pickerEquipmentId);
          const alreadyQueuedIds = new Set(
            (queuedItems.get(pickerEquipmentId ?? '') ?? []).map(q => q.menu_item_id)
          );
          const availableItems = menuItems.filter(item => !alreadyQueuedIds.has(item.id));
          return (
            <div className="flex flex-col" style={{ maxHeight: '80vh' }}>
              <div className="p-5 pb-3">
                <p className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: colors.textSecondary }}>
                  Add items to
                </p>
                <h3 className="text-base font-semibold mb-1" style={{ color: colors.textPrimary }}>
                  {eq?.name ?? 'unit'}
                </h3>
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  Select items currently in this unit. Tap Done to queue them for the next log check.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-5">
                {availableItems.length === 0 && alreadyQueuedIds.size === 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: colors.textMuted }}>
                    No items available
                  </p>
                ) : availableItems.length === 0 && alreadyQueuedIds.size > 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: colors.textMuted }}>
                    All items already queued
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {availableItems.map(item => {
                      const isSelected = pickerSelection.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="text-left px-3 py-3 rounded-md text-sm flex items-center gap-3"
                          style={{
                            border: isSelected ? `0.5px solid ${colors.info}` : `0.5px solid ${colors.border}`,
                            borderLeft: isSelected ? `3px solid ${colors.info}` : `3px solid transparent`,
                            color: colors.textPrimary,
                            backgroundColor: isSelected ? colors.infoSoft : 'transparent',
                            minHeight: '44px',
                          }}
                          onClick={() => {
                            setPickerSelection(prev => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            });
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
                            style={{
                              border: isSelected ? 'none' : `1.5px solid ${colors.textSecondary}`,
                              backgroundColor: isSelected ? colors.info : 'transparent',
                            }}
                          >
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {alreadyQueuedIds.size > 0 && availableItems.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-wide font-medium mb-2" style={{ color: colors.textTertiary }}>
                      Already queued
                    </p>
                    <div className="flex flex-col gap-1">
                      {menuItems.filter(item => alreadyQueuedIds.has(item.id)).map(item => (
                        <div
                          key={item.id}
                          className="px-3 py-3 rounded-md text-sm flex items-center gap-3 opacity-50"
                          style={{ border: `0.5px solid ${colors.border}`, minHeight: '44px' }}
                        >
                          <span
                            className="w-4 h-4 rounded-sm flex-shrink-0"
                            style={{ border: `1.5px solid ${colors.textMuted}` }}
                          />
                          <span className="flex-1" style={{ color: colors.textSecondary }}>{item.name}</span>
                          <span className="text-[10px]" style={{ color: colors.textMuted }}>already queued</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: `0.5px solid ${colors.border}` }}
              >
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  {pickerSelection.size} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md text-sm"
                    style={{
                      border: `0.5px solid ${colors.border}`,
                      color: colors.textPrimary,
                      backgroundColor: 'transparent',
                      minHeight: '44px',
                    }}
                    onClick={() => setPickerEquipmentId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md text-sm font-medium"
                    style={{
                      backgroundColor: pickerSelection.size === 0 ? `${colors.navy}40` : colors.navy,
                      color: 'white',
                      minHeight: '44px',
                      cursor: pickerSelection.size === 0 ? 'not-allowed' : 'pointer',
                    }}
                    disabled={pickerSelection.size === 0}
                    onClick={handlePickerDone}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
      <ReadingDetailModal
        isOpen={detailEquipmentId !== null}
        onClose={() => setDetailEquipmentId(null)}
        equipment={detailEquipmentId ? equipment?.find(e => e.id === detailEquipmentId) ?? null : null}
        variant={variant}
      />
    </>
  );
}
