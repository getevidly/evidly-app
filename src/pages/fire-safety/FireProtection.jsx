/**
 * FireProtection — All fire safety systems: kitchen exhaust, suppression, alarm, sprinkler, extinguisher + Cost Intelligence.
 * Route: /fire-safety/protection
 * Data-driven off service_type_definitions (Phase 1 flags) + location_service_exclusions.
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, DollarSign, TrendingUp, TrendingDown, Minus, FileText, Upload,
  Loader2, Shield, Droplets, FireExtinguisher, Fan, Filter, Info,
  ShieldAlert, BellRing, Calendar,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useServiceHistory } from '../../hooks/useServiceHistory';
import { useServiceCostIntelligence } from '../../hooks/useServiceCostIntelligence';
import { supabase } from '../../lib/supabase';
import { colors, shadows, radius, typography } from '../../lib/designSystem';

const UploadServiceRecordModal = lazy(() => import('../../components/services/UploadServiceRecordModal'));
const RequestServiceModal = lazy(() => import('../../components/services/RequestServiceModal').then(m => ({ default: m.RequestServiceModal })));
const RescheduleServiceModal = lazy(() => import('../../components/services/RescheduleServiceModal').then(m => ({ default: m.RescheduleServiceModal })));

// ── Icon map (DB icon name → lucide component) ──────────────
const ICON_MAP = { Flame, Fan, Filter, Shield, ShieldAlert, BellRing, Droplets, FireExtinguisher };

// ── Constants ────────────────────────────────────────────────
const FP_SAFEGUARD_TYPES = ['fire_suppression', 'fire_alarm', 'sprinklers'];
const HISTORY_SAFEGUARD_TYPES = ['fire_suppression', 'fire_alarm', 'sprinklers', 'hood_cleaning'];
const COST_ROLES = ['owner_operator', 'executive', 'facilities_manager', 'platform_admin'];

const SAFEGUARD_LABEL_MAP = {
  hood_cleaning: 'Kitchen Exhaust System',
  fire_suppression: 'Fire Suppression',
  fire_alarm: 'Automatic Fire Alarm',
  sprinklers: 'Fire Sprinkler',
  fire_extinguisher: 'Fire Extinguishers',
};

// ── Helpers ──────────────────────────────────────────────────
function deriveSystemState(schedule, isSolidFuelKec = false) {
  if (!schedule?.next_due_date) return 'no_schedule';
  const days = Math.ceil((new Date(schedule.next_due_date + 'T00:00:00') - new Date()) / 86400000);
  if (days < 0) return 'overdue';
  const threshold = isSolidFuelKec ? 15 : 7;
  if (days < threshold) return 'due_soon';
  return 'current';
}

function statusPill(state) {
  switch (state) {
    case 'current':  return { bg: '#D1FAE5', text: '#065F46', label: 'Clear' };
    case 'due_soon': return { bg: '#FEF3C7', text: '#92400E', label: 'At risk' };
    case 'overdue':  return { bg: '#FEE2E2', text: '#991B1B', label: 'Needs action' };
    default:         return { bg: '#FEE2E2', text: '#991B1B', label: 'Needs action' };
  }
}

function stateToTriple(state) {
  if (state === 'current') return 'clear';
  if (state === 'due_soon') return 'at_risk';
  return 'needs_action';
}

const TRIPLE_COLORS = {
  needs_action: { bar: '#FCA5A5', pill: '#FEE2E2', text: '#991B1B' },
  at_risk:      { bar: '#FDE68A', pill: '#FEF3C7', text: '#92400E' },
  clear:        { bar: '#6EE7B7', pill: '#D1FAE5', text: '#065F46' },
};

function fmtDate(d) {
  if (!d) return '\u2014';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(n) {
  if (n == null) return '\u2014';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function frequencyLabel(schedule) {
  if (!schedule?.frequency) return 'Not set';
  if (schedule.frequency === 'Other' && schedule.frequency_interval_days) {
    return 'Every ' + schedule.frequency_interval_days + ' days';
  }
  return schedule.frequency;
}

// ── Component ────────────────────────────────────────────────
export default function FireProtection() {
  usePageTitle('Fire Protection');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const showCost = COST_ROLES.includes(userRole);
  const orgId = profile?.organization_id;

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState(undefined);
  const [showUpload, setShowUpload] = useState(false);

  const [fireServices, setFireServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [systemSchedules, setSystemSchedules] = useState({});
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [exclusions, setExclusions] = useState([]);
  const [allFireRecords, setAllFireRecords] = useState([]);
  const [cookingType, setCookingType] = useState(null);

  const [tooltipOpen, setTooltipOpen] = useState(null);
  const [requestModal, setRequestModal] = useState({ open: false, serviceType: '' });
  const [rescheduleModal, setRescheduleModal] = useState(null);

  // ── Fetch service_type_definitions (fire_safety) ──────────
  useEffect(() => {
    supabase
      .from('service_type_definitions')
      .select('code, name, short_name, parent_code, nfpa_citation, is_pse, always_required, counts_toward_coverage, icon, is_cwa, tooltip_risk_copy')
      .eq('category', 'fire_safety')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        setFireServices(error ? [] : (data || []));
        setServicesLoading(false);
      });
  }, []);

  // ── Fetch locations ───────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('locations')
      .select('id, name, jurisdiction_id, cooking_type')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => {
        const locs = data || [];
        setLocations(locs);
        if (locs.length > 0 && !locationId) {
          setLocationId(locs[0].id);
          setLocationName(locs[0].name);
          setJurisdictionId(locs[0].jurisdiction_id || undefined);
          setCookingType(locs[0].cooking_type || null);
        }
      });
  }, [orgId]);

  const handleLocationChange = useCallback((e) => {
    const id = e.target.value;
    setLocationId(id);
    const loc = locations.find(l => l.id === id);
    setLocationName(loc?.name || '');
    setJurisdictionId(loc?.jurisdiction_id || undefined);
    setCookingType(loc?.cooking_type || null);
  }, [locations]);

  // ── Fetch schedules ───────────────────────────────────────
  useEffect(() => {
    console.log('[FP-DIAG] schedule effect entry', { orgId, locationId, fireServicesLen: fireServices.length });
    if (!orgId || !locationId) { console.log('[FP-DIAG] BAIL: orgId or locationId falsy', { orgId, locationId }); return; }
    const codes = fireServices.map(s => s.code);
    if (codes.length === 0) { console.log('[FP-DIAG] BAIL: codes empty'); setScheduleLoading(false); return; }
    setScheduleLoading(true);
    console.log('[FP-DIAG] schedule query firing', { orgId, locationId, codes });
    supabase
      .from('location_service_schedules')
      .select('id, service_type_code, vendor_name, vendor_id, last_service_date, next_due_date, negotiated_price, frequency, frequency_interval_days')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .in('service_type_code', codes)
      .eq('is_active', true)
      .then(({ data, error }) => {
        console.log('[FP-DIAG] schedule response', { rowCount: (data || []).length, data, error });
        const map = {};
        for (const r of (data || [])) map[r.service_type_code] = r;
        console.log('[FP-DIAG] systemSchedules map', map);
        setSystemSchedules(map);
        setScheduleLoading(false);
      });
  }, [orgId, locationId, fireServices]);

  // ── Fetch exclusions ──────────────────────────────────────
  useEffect(() => {
    if (!orgId || !locationId) { setExclusions([]); return; }
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('location_service_exclusions')
      .select('service_type_code, source')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .eq('status', 'active')
      .or(`expiration_date.is.null,expiration_date.gte.${today}`)
      .then(({ data, error }) => setExclusions(error ? [] : (data || [])));
  }, [orgId, locationId]);

  // ── Fetch ALL fire service records (page total) ───────────
  useEffect(() => {
    if (!orgId || !locationId) return;
    supabase
      .from('vendor_service_records')
      .select('price_charged')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .eq('is_sample', false)
      .in('safeguard_type', ['fire_suppression', 'fire_alarm', 'sprinklers', 'fire_extinguisher', 'hood_cleaning'])
      .then(({ data }) => setAllFireRecords(data || []));
  }, [orgId, locationId]);

  // ── Existing hooks (Cost Intelligence untouched) ──────────
  const { data: history, isLoading: historyLoading } = useServiceHistory(orgId, locationId, HISTORY_SAFEGUARD_TYPES, 5);
  const { data: costData, isLoading: costLoading } = useServiceCostIntelligence(orgId, locationId, FP_SAFEGUARD_TYPES, jurisdictionId);

  // ── Derived data ──────────────────────────────────────────
  const exclusionMap = {};
  for (const ex of exclusions) {
    if (!exclusionMap[ex.service_type_code]) exclusionMap[ex.service_type_code] = [];
    if (!exclusionMap[ex.service_type_code].includes(ex.source)) {
      exclusionMap[ex.service_type_code].push(ex.source);
    }
  }

  const topLevel = fireServices.filter(s => !s.parent_code);
  const kecChildren = fireServices.filter(s => s.parent_code === 'KEC');
  const pseSystems = topLevel.filter(s => s.is_pse || s.counts_toward_coverage);
  const requiredSystems = topLevel.filter(s => s.always_required && !s.is_pse);

  // Coverage hero
  const coverageSystems = topLevel.filter(s => s.counts_toward_coverage);
  const excludedCodes = new Set(coverageSystems.filter(s => exclusionMap[s.code]).map(s => s.code));
  const countedSystems = coverageSystems.filter(s => !excludedCodes.has(s.code));
  const denominatorM = countedSystems.length;
  const countedStates = countedSystems.map(sys => ({ ...sys, state: deriveSystemState(systemSchedules[sys.code]) }));
  const numeratorN = countedStates.filter(s => s.state === 'current').length;
  const tally = { needs_action: 0, at_risk: 0, clear: 0 };
  for (const cs of countedStates) tally[stateToTriple(cs.state)]++;

  const pageTotal = allFireRecords.reduce((sum, rec) => sum + (Number(rec.price_charged) || 0), 0);
  const getIcon = (iconName) => ICON_MAP[iconName] || Shield;
  const isExcluded = (code) => !!exclusionMap[code];
  const exclusionLabel = (code) => {
    const sources = exclusionMap[code];
    if (!sources) return null;
    return 'Excluded by ' + sources.join(' + ');
  };
  const citationTag = (sys) => {
    const parts = [];
    if (sys.nfpa_citation) parts.push(sys.nfpa_citation);
    if (sys.is_cwa) parts.push('CWA-required');
    if (sys.is_pse) parts.push('PSE');
    if (sys.always_required && !sys.is_pse) parts.push('Always required');
    return parts.join(' \u00b7 ');
  };

  if (!profile) return null;

  // ── Row renderer ──────────────────────────────────────────
  const renderSystemRow = (sys) => {
    const excluded = isExcluded(sys.code);
    const sched = systemSchedules[sys.code];
    if (sys.code === 'KEC') console.log('[FP-DIAG] KEC render', { sched, allKeys: Object.keys(systemSchedules) });
    const isSolidFuelKec = sys.code === 'KEC' && cookingType === 'solid_fuel';
    const state = deriveSystemState(sched, isSolidFuelKec);
    const pill = excluded
      ? { bg: '#F3F4F6', text: '#6B7280', label: exclusionLabel(sys.code) }
      : statusPill(state);
    const SysIcon = getIcon(sys.icon);
    const isKec = sys.code === 'KEC';
    const borderColor = excluded ? colors.border
      : state === 'overdue' || state === 'no_schedule' ? '#C0392B'
      : state === 'due_soon' ? '#D9862B'
      : state === 'current' ? '#2E9E6B' : colors.border;

    return (
      <div
        key={sys.code}
        className="rounded-lg"
        role={isKec ? 'button' : undefined}
        tabIndex={isKec ? 0 : undefined}
        onClick={isKec ? () => navigate('/fire-safety/kec') : undefined}
        onKeyDown={isKec ? (e) => { if (e.key === 'Enter') navigate('/fire-safety/kec'); } : undefined}
        style={{
          borderLeft: `3px solid ${borderColor}`,
          background: colors.white,
          padding: '10px 12px',
          boxShadow: shadows.sm,
          opacity: excluded ? 0.55 : 1,
          cursor: isKec ? 'pointer' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <SysIcon size={16} color={excluded ? colors.textMuted : '#D85A30'} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: excluded ? colors.textMuted : colors.textPrimary, margin: 0 }}>{sys.name}</p>
                {isSolidFuelKec && (
                  <span className="rounded-full" style={{ fontSize: 9, fontWeight: typography.weight.semibold, padding: '1px 6px', background: '#FEE2E2', color: '#991B1B', whiteSpace: 'nowrap' }}>
                    Solid fuel &middot; high risk
                  </span>
                )}
              </div>
              <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>{citationTag(sys)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="rounded-full" style={{ fontSize: 10, fontWeight: typography.weight.semibold, padding: '2px 8px', background: pill.bg, color: pill.text, whiteSpace: 'nowrap' }}>
              {pill.label}
            </span>
            {!excluded && (
              sched ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setRescheduleModal({ code: sys.code, name: sys.name, dueDate: sched.next_due_date || '', scheduleId: sched.id }); }}
                  style={{ padding: '3px 8px', fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.white, background: colors.navy, border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Request different date
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setRequestModal({ open: true, serviceType: sys.code }); }}
                  style={{ padding: '3px 8px', fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.white, background: colors.navy, border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Request schedule
                </button>
              )
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: typography.size.xs, color: colors.textSecondary }}>
          <span>Last: {sched ? fmtDate(sched.last_service_date) : '\u2014'}</span>
          <span>Next: {sched ? fmtDate(sched.next_due_date) : '\u2014'}</span>
          <span>{frequencyLabel(sched)}</span>
          {sched?.vendor_name && <span>Vendor: {sched.vendor_name}</span>}
        </div>
      </div>
    );
  };

  // ── KEC sub-row renderer (nested inside KEC card, on beige connector rail) ──
  const renderSubRow = (sub, isLast) => {
    const sched = systemSchedules[sub.code];
    const state = deriveSystemState(sched);
    const pill = statusPill(state);
    return (
      <div
        key={sub.code}
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/fire-safety/kec/${sub.code.toLowerCase()}`)}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/fire-safety/kec/${sub.code.toLowerCase()}`); }}
        style={{ padding: '13px 0', borderBottom: isLast ? 'none' : '1px solid #F4EFE3', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{sub.name}</p>
              {sub.tooltip_risk_copy && (
                <button
                  onClick={(e) => { e.stopPropagation(); setTooltipOpen(tooltipOpen === sub.code ? null : sub.code); }}
                  style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', flexShrink: 0 }}
                  aria-label={'Info about ' + sub.name}
                >
                  <Info size={14} color={colors.textMuted} />
                </button>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#9A968C', margin: 0 }}>{citationTag(sub)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="rounded-full" style={{ fontSize: 10, fontWeight: typography.weight.semibold, padding: '2px 8px', background: pill.bg, color: pill.text, whiteSpace: 'nowrap' }}>
              {pill.label}
            </span>
            {sched ? (
              <button
                onClick={(e) => { e.stopPropagation(); setRescheduleModal({ code: sub.code, name: sub.name, dueDate: sched.next_due_date || '', scheduleId: sched.id }); }}
                style={{ padding: '3px 8px', fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.white, background: colors.navy, border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Request different date
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setRequestModal({ open: true, serviceType: sub.code }); }}
                style={{ padding: '3px 8px', fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.white, background: colors.navy, border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Request schedule
              </button>
            )}
          </div>
        </div>
        {tooltipOpen === sub.code && sub.tooltip_risk_copy && (
          <div style={{ fontSize: 12, color: '#9A968C', background: '#F9FAFB', borderRadius: 6, padding: '8px 10px', marginTop: 6, lineHeight: 1.4 }}>
            {sub.tooltip_risk_copy}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, fontSize: 11.5, color: '#B0AB9F' }}>
          <span>Last: {sched ? fmtDate(sched.last_service_date) : '\u2014'}</span>
          <span>Next: {sched ? fmtDate(sched.next_due_date) : '\u2014'}</span>
          <span>{frequencyLabel(sched)}</span>
          {sched?.vendor_name && <span>Vendor: {sched.vendor_name}</span>}
        </div>
      </div>
    );
  };

  // ── Vendor lookup for RequestServiceModal ──────────────────
  const modalVendorId = (() => {
    const code = requestModal.serviceType;
    if (systemSchedules[code]?.vendor_id) return systemSchedules[code].vendor_id;
    const child = fireServices.find(s => s.code === code);
    if (child?.parent_code === 'KEC' && systemSchedules['KEC']?.vendor_id) return systemSchedules['KEC'].vendor_id;
    return undefined;
  })();
  const modalVendorName = (() => {
    const code = requestModal.serviceType;
    if (systemSchedules[code]?.vendor_name) return systemSchedules[code].vendor_name;
    const child = fireServices.find(s => s.code === code);
    if (child?.parent_code === 'KEC' && systemSchedules['KEC']?.vendor_name) return systemSchedules['KEC'].vendor_name;
    return undefined;
  })();

  return (
    <div style={{ paddingBottom: 100 }} className="space-y-4 px-4 pt-4">

      {/* ── 1. Page Header ─────────────────────────────────── */}
      <div>
        <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: '#D85A30', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Fire Safety
        </p>
        <h2 style={{ fontSize: typography.size.h2, fontWeight: typography.weight.bold, color: colors.textPrimary, margin: '2px 0 0' }}>
          Fire Protection
        </h2>
        {locations.length > 1 && (
          <select
            value={locationId || ''}
            onChange={handleLocationChange}
            style={{ marginTop: 6, fontSize: typography.size.sm, color: colors.textSecondary, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
          >
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        {locations.length === 1 && (
          <p style={{ fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 }}>{locationName}</p>
        )}
      </div>

      {/* ── 2. Coverage Hero ───────────────────────────────── */}
      <div className="rounded-lg" style={{ background: colors.white, padding: '14px', boxShadow: shadows.sm }}>
        <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>
          Protection Systems
        </p>
        <p style={{ fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 }}>
          {numeratorN} of {denominatorM} systems have current records
        </p>
        {/* Segmented bar */}
        {denominatorM > 0 && (
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, background: '#E5E7EB' }}>
            {countedStates.map((cs, i) => (
              <div key={cs.code} style={{ flex: 1, background: TRIPLE_COLORS[stateToTriple(cs.state)].bar, borderRight: i < countedStates.length - 1 ? '1px solid white' : undefined }} />
            ))}
          </div>
        )}
        {/* Tally */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: typography.size.xs }}>
          <span style={{ color: TRIPLE_COLORS.needs_action.text }}>{tally.needs_action} Needs action</span>
          <span style={{ color: TRIPLE_COLORS.at_risk.text }}>{tally.at_risk} At risk</span>
          <span style={{ color: TRIPLE_COLORS.clear.text }}>{tally.clear} Clear</span>
        </div>
      </div>

      {/* ── 3. Cost Intelligence (role-gated — UNCHANGED) ──── */}
      {showCost && (
        <div className="rounded-lg" style={{ background: colors.white, padding: '14px', boxShadow: shadows.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <DollarSign size={16} color="#D85A30" />
            <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>
              Cost Intelligence
            </p>
          </div>

          {costLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <Loader2 size={20} className="animate-spin" color={colors.textMuted} />
            </div>
          ) : !costData ? (
            <p style={{ fontSize: typography.size.sm, color: colors.textMuted }}>No cost data recorded yet.</p>
          ) : (
            <>
              {/* YTD / TTM */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ borderLeft: `3px solid ${colors.navy}`, paddingLeft: 8 }}>
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>YTD Spend</p>
                  <p style={{ fontSize: typography.size.h3, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>{fmtCurrency(costData.ytdTotal)}</p>
                </div>
                <div style={{ borderLeft: `3px solid ${colors.navy}`, paddingLeft: 8 }}>
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>TTM Spend</p>
                  <p style={{ fontSize: typography.size.h3, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>{fmtCurrency(costData.ttmTotal)}</p>
                </div>
              </div>

              {/* YoY */}
              {costData.yoyDelta !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: typography.size.sm }}>
                  {costData.yoyDirection === 'up' && <TrendingUp size={14} color={colors.danger} />}
                  {costData.yoyDirection === 'down' && <TrendingDown size={14} color={colors.success} />}
                  {costData.yoyDirection === 'flat' && <Minus size={14} color={colors.textMuted} />}
                  <span style={{ color: costData.yoyDirection === 'up' ? colors.danger : costData.yoyDirection === 'down' ? colors.success : colors.textMuted }}>
                    {costData.yoyDelta > 0 ? '+' : ''}{costData.yoyDelta}% YoY
                  </span>
                </div>
              )}

              {/* Per-system breakdown */}
              {costData.perSystem.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 4 }}>Per-system breakdown (TTM)</p>
                  {costData.perSystem.map(ps => {
                    const sysLabel = SAFEGUARD_LABEL_MAP[ps.safeguardType] || ps.safeguardType;
                    return (
                      <div key={ps.safeguardType} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: typography.size.sm }}>
                        <span style={{ color: colors.textSecondary }}>{sysLabel}</span>
                        <span style={{ fontWeight: typography.weight.medium, color: colors.textPrimary }}>{fmtCurrency(ps.ttm)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Benchmark */}
              {costData.benchmark && (
                <div style={{ background: '#F9FAFB', borderRadius: radius.md, padding: '8px 10px', marginBottom: 10 }}>
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 2 }}>Jurisdiction Benchmark</p>
                  <div style={{ display: 'flex', gap: 12, fontSize: typography.size.sm }}>
                    <span><strong>P25</strong> {fmtCurrency(costData.benchmark.p25)}</span>
                    <span><strong>P50</strong> {fmtCurrency(costData.benchmark.p50)}</span>
                    <span><strong>P75</strong> {fmtCurrency(costData.benchmark.p75)}</span>
                  </div>
                </div>
              )}

              {/* No forecast micro-copy */}
              <p style={{ fontSize: typography.size.xs, color: colors.textMuted, fontStyle: 'italic' }}>
                Forecast unavailable — protection services vary by system type and service cycle.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── 4. PSE Systems ─────────────────────────────────── */}
      <div className="space-y-2">
        <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2, marginTop: 4 }}>
          Protection systems &middot; Protective Safeguards Endorsement (PSE)
        </p>
        {pseSystems.map((sys) => (
          <div key={sys.code}>
            {renderSystemRow(sys)}
            {sys.code === 'KEC' && kecChildren.length > 0 && (
              <div style={{ padding: '4px 18px 12px 30px' }}>
                <div style={{ borderLeft: '2px solid #E4DCCB', paddingLeft: 18 }}>
                  {kecChildren.map((sub, i) => renderSubRow(sub, i === kecChildren.length - 1))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── 5. Required · not PSE ────────────────────────── */}
        {requiredSystems.length > 0 && (
          <>
            <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2, marginTop: 12 }}>
              Required &middot; not PSE
            </p>
            {requiredSystems.map((sys) => renderSystemRow(sys))}
          </>
        )}
      </div>

      {/* ── 6. Vendor Service Records ────────────────────── */}
      <div>
        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary, marginBottom: 6 }}>
          Vendor Service Records
        </p>
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Loader2 size={20} className="animate-spin" color={colors.textMuted} />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-lg" style={{ background: colors.white, padding: '16px', boxShadow: shadows.sm, textAlign: 'center' }}>
            <p style={{ fontSize: typography.size.sm, color: colors.textMuted }}>No vendor service records yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((rec) => {
              const sysLabel = SAFEGUARD_LABEL_MAP[rec.safeguard_type] || rec.safeguard_type;
              return (
                <div key={rec.id} className="rounded-lg" style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.textPrimary }}>{fmtDate(rec.service_date)}</p>
                      <p style={{ fontSize: typography.size.xs, color: colors.textSecondary }}>
                        {sysLabel}{rec.vendor_name ? ` \u00b7 ${rec.vendor_name}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {showCost && rec.price_charged != null && Number(rec.price_charged) > 0 && (
                        <span className="rounded-full" style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, padding: '2px 8px', background: '#EEF2FF', color: '#3730A3' }}>
                          {fmtCurrency(rec.price_charged)}
                        </span>
                      )}
                      {(rec.document_url || rec.certificate_url) && (
                        <FileText size={14} color={colors.textMuted} style={{ cursor: 'pointer' }} onClick={() => {
                          const url = rec.certificate_url || rec.document_url;
                          if (url) window.open(url, '_blank');
                        }} />
                      )}
                    </div>
                  </div>
                  {rec.cert_number && (
                    <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 }}>Cert #{rec.cert_number}</p>
                  )}
                </div>
              );
            })}
            {showCost && pageTotal > 0 && (
              <div className="rounded-lg" style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary, margin: 0 }}>Total</p>
                <span className="rounded-full" style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, padding: '2px 8px', background: '#EEF2FF', color: '#3730A3' }}>
                  {fmtCurrency(pageTotal)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 7. Upload Button ─────────────────────────────── */}
      <div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
            color: colors.white, background: colors.navy, border: 'none', borderRadius: radius.md, cursor: 'pointer',
          }}
        >
          <Upload size={16} /> Upload Vendor Service Record
        </button>
      </div>

      {/* ── Upload Modal ─────────────────────────────────── */}
      {showUpload && (
        <Suspense fallback={null}>
          <UploadServiceRecordModal
            category="fire_protection"
            defaultLocationId={locationId}
            onClose={() => setShowUpload(false)}
            onSuccess={() => { setShowUpload(false); window.location.reload(); }}
          />
        </Suspense>
      )}

      {/* ── Request Service Modal ────────────────────────── */}
      {requestModal.open && orgId && (
        <Suspense fallback={null}>
          <RequestServiceModal
            isOpen
            onClose={() => setRequestModal({ open: false, serviceType: '' })}
            locationId={locationId || ''}
            organizationId={orgId}
            defaultServiceType={requestModal.serviceType}
            vendorId={modalVendorId}
            vendorName={modalVendorName}
            requestSubtype="schedule"
          />
        </Suspense>
      )}

      {/* ── Reschedule Service Modal ──────────────────────── */}
      {rescheduleModal && orgId && (
        <Suspense fallback={null}>
          <RescheduleServiceModal
            isOpen
            onClose={() => setRescheduleModal(null)}
            locationId={locationId || ''}
            organizationId={orgId}
            serviceTypeCode={rescheduleModal.code}
            serviceName={rescheduleModal.name}
            currentDueDate={rescheduleModal.dueDate}
            scheduleId={rescheduleModal.scheduleId}
          />
        </Suspense>
      )}
    </div>
  );
}
