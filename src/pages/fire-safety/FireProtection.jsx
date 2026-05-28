/**
 * FireProtection — Fire suppression, alarm, sprinkler, and extinguisher status + Cost Intelligence.
 * Route: /fire-safety/protection
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, CheckCircle, AlertTriangle, Clock, DollarSign,
  TrendingUp, TrendingDown, Minus, FileText, Upload, Calendar,
  Loader2, Shield, Bell, Droplets, FireExtinguisher,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useServiceHistory } from '../../hooks/useServiceHistory';
import { useServiceCostIntelligence } from '../../hooks/useServiceCostIntelligence';
import { supabase } from '../../lib/supabase';
import { colors, shadows, radius, typography } from '../../lib/designSystem';

const UploadServiceRecordModal = lazy(() => import('../../components/services/UploadServiceRecordModal'));
const EquipmentFormModal = lazy(() => import('../../components/equipment/EquipmentFormModal').then(m => ({ default: m.EquipmentFormModal })));

// ── Constants ────────────────────────────────────────────────
const FP_SAFEGUARD_TYPES = ['fire_suppression', 'fire_alarm', 'sprinklers'];
const COST_ROLES = ['owner_operator', 'executive', 'facilities_manager', 'platform_admin'];

const PROTECTION_SYSTEMS = [
  { safeguardType: 'fire_suppression',  code: 'FS', label: 'Fire Suppression',      Icon: Flame,            subDetail: 'NFPA 17A \u00b7 NFPA 96 \u00b7 PSE-required', group: 'pse' },
  { safeguardType: 'fire_alarm',        code: 'FA', label: 'Automatic Fire Alarm',   Icon: Bell,             subDetail: 'NFPA 72 \u00b7 PSE-required',                  group: 'pse' },
  { safeguardType: 'sprinklers',        code: 'SP', label: 'Fire Sprinkler',         Icon: Droplets,         subDetail: 'NFPA 25 \u00b7 PSE-required',                  group: 'pse' },
  { safeguardType: 'fire_extinguisher', code: 'FE', label: 'Fire Extinguishers',     Icon: FireExtinguisher,  subDetail: 'NFPA 10',                                     group: 'other' },
];

const FP_CYCLE_DAYS = 365; // default annual inspection cycle
const FP_GRACE_DAYS = 30;

function deriveSystemState(record) {
  if (!record?.service_date) return 'not_monitored';
  const daysSince = Math.ceil((new Date() - new Date(record.service_date + 'T00:00:00')) / 86400000);
  if (daysSince <= FP_CYCLE_DAYS) return 'current';
  if (daysSince <= FP_CYCLE_DAYS + FP_GRACE_DAYS) return 'due_soon';
  return 'overdue';
}

function systemStatePill(state) {
  switch (state) {
    case 'current':  return { bg: '#D1FAE5', text: '#065F46', label: 'Current' };
    case 'due_soon': return { bg: '#FEF3C7', text: '#92400E', label: 'Due soon' };
    case 'overdue':  return { bg: '#FEE2E2', text: '#991B1B', label: 'Overdue' };
    default:         return { bg: '#F3F4F6', text: '#6B7280', label: 'Not yet monitored' };
  }
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000);
}

function statusColor(daysLeft) {
  if (daysLeft === null) return { bg: '#F3F4F6', text: '#6B7280', border: colors.border, label: 'No data' };
  if (daysLeft < 0) return { bg: '#FEE2E2', text: '#991B1B', border: colors.danger, label: `${Math.abs(daysLeft)}d overdue` };
  if (daysLeft <= 30) return { bg: '#FEF3C7', text: '#92400E', border: colors.warning, label: `${daysLeft}d remaining` };
  return { bg: '#D1FAE5', text: '#065F46', border: colors.success, label: 'Current' };
}

// ── Component ────────────────────────────────────────────────
export default function FireProtection() {
  usePageTitle('Fire Protection');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const showCost = COST_ROLES.includes(userRole);
  const orgId = profile?.organization_id;

  // Location state
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState(undefined);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddEquipment, setShowAddEquipment] = useState(false);

  // Per-system schedule data
  const [systemSchedules, setSystemSchedules] = useState({});
  const [scheduleLoading, setScheduleLoading] = useState(true);

  // Per-system latest vendor_service_records (for status derivation)
  const [fpServiceRecords, setFpServiceRecords] = useState({});

  // Fetch locations
  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('locations')
      .select('id, name, jurisdiction_id')
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
        }
      });
  }, [orgId]);

  const handleLocationChange = useCallback((e) => {
    const id = e.target.value;
    setLocationId(id);
    const loc = locations.find(l => l.id === id);
    setLocationName(loc?.name || '');
    setJurisdictionId(loc?.jurisdiction_id || undefined);
  }, [locations]);

  // Fetch schedules for FS/FA/SP
  useEffect(() => {
    if (!orgId || !locationId) return;
    setScheduleLoading(true);
    supabase
      .from('location_service_schedules')
      .select('service_type_code, vendor_name, last_service_date, next_due_date, negotiated_price')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .in('service_type_code', ['FS', 'FA', 'SP', 'FE'])
      .eq('is_active', true)
      .then(({ data }) => {
        const map = {};
        for (const r of (data || [])) {
          map[r.service_type_code] = r;
        }
        setSystemSchedules(map);
        setScheduleLoading(false);
      });
  }, [orgId, locationId]);

  // Fetch latest vendor_service_records per protection system
  useEffect(() => {
    if (!orgId || !locationId) return;
    supabase
      .from('vendor_service_records')
      .select('safeguard_type, service_date, vendor_name')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .eq('is_sample', false)
      .in('safeguard_type', ['fire_suppression', 'fire_alarm', 'sprinklers', 'fire_extinguisher'])
      .order('service_date', { ascending: false })
      .then(({ data }) => {
        const map = {};
        for (const r of (data || [])) {
          if (!map[r.safeguard_type]) map[r.safeguard_type] = r;
        }
        setFpServiceRecords(map);
      });
  }, [orgId, locationId]);

  // Hooks
  const { data: history, isLoading: historyLoading } = useServiceHistory(orgId, locationId, FP_SAFEGUARD_TYPES, 5);
  const { data: costData, isLoading: costLoading } = useServiceCostIntelligence(orgId, locationId, FP_SAFEGUARD_TYPES, jurisdictionId);

  // Derive per-system state from vendor_service_records
  const systemStates = PROTECTION_SYSTEMS.map(sys => ({
    ...sys,
    state: deriveSystemState(fpServiceRecords[sys.safeguardType]),
  }));

  const overdueCount = systemStates.filter(s => s.state === 'overdue').length;
  const dueSoonCount = systemStates.filter(s => s.state === 'due_soon').length;
  const notMonitoredCount = systemStates.filter(s => s.state === 'not_monitored').length;
  const monitoredCount = 4 - notMonitoredCount;

  // Aggregate banner status — priority: overdue > due soon > not yet monitored > all current
  const bannerStatus = (() => {
    if (overdueCount > 0) return { bg: '#FEE2E2', text: '#991B1B', border: colors.danger, label: `${overdueCount} overdue` };
    if (dueSoonCount > 0) return { bg: '#FEF3C7', text: '#92400E', border: colors.warning, label: `${dueSoonCount} due soon` };
    if (notMonitoredCount > 0) return { bg: '#F3F4F6', text: '#6B7280', border: colors.border, label: `${notMonitoredCount} not yet monitored` };
    return { bg: '#D1FAE5', text: '#065F46', border: colors.success, label: 'All systems current' };
  })();

  // Banner sub-detail
  const bannerSubParts = [`${monitoredCount} active`];
  if (notMonitoredCount > 0) bannerSubParts.push(`${notMonitoredCount} not yet monitored`);
  const bannerSubDetail = bannerSubParts.join(' \u00b7 ');

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }} className="space-y-4 px-4 pt-4">

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

      {/* ── 2. System Status Banner ────────────────────────── */}
      <div
        className="rounded-lg"
        style={{
          borderLeft: `4px solid ${bannerStatus.border}`,
          background: colors.white,
          padding: '12px 14px',
          boxShadow: shadows.sm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>
              Protection Systems
            </p>
            <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginTop: 1 }}>{bannerSubDetail}</p>
          </div>
          <span
            className="rounded-full"
            style={{
              fontSize: typography.size.xs,
              fontWeight: typography.weight.semibold,
              padding: '3px 10px',
              backgroundColor: bannerStatus.bg,
              color: bannerStatus.text,
            }}
          >
            {bannerStatus.label}
          </span>
        </div>
      </div>

      {/* ── 3. Cost Intelligence (role-gated) ──────────────── */}
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
                    const sysLabel = PROTECTION_SYSTEMS.find(s => s.safeguardType === ps.safeguardType)?.label || ps.safeguardType;
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
                Forecast unavailable — protection services vary by system type and inspection cycle.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── 4. Protection Systems ──────────────────────────── */}
      <div className="space-y-2">
        {/* PSE Systems sub-header */}
        <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2, marginTop: 4 }}>
          PSE Systems
        </p>
        {systemStates.filter(s => s.group === 'pse').map((sys) => {
          const sched = systemSchedules[sys.code];
          const pill = systemStatePill(sys.state);
          return (
            <div
              key={sys.label}
              className="rounded-lg"
              style={{
                borderLeft: `3px solid ${sys.state === 'overdue' ? colors.danger : sys.state === 'due_soon' ? colors.warning : sys.state === 'current' ? colors.success : colors.border}`,
                background: colors.white,
                padding: '10px 12px',
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <sys.Icon size={16} color="#D85A30" />
                  <div>
                    <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>{sys.label}</p>
                    <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>{sys.subDetail}</p>
                  </div>
                </div>
                <span
                  className="rounded-full"
                  style={{ fontSize: 10, fontWeight: typography.weight.semibold, padding: '2px 8px', background: pill.bg, color: pill.text }}
                >
                  {pill.label}
                </span>
              </div>
              {sched && (
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: typography.size.xs, color: colors.textSecondary }}>
                  <span>Last: {fmtDate(sched.last_service_date)}</span>
                  <span>Next: {fmtDate(sched.next_due_date)}</span>
                  {sched.vendor_name && <span>Vendor: {sched.vendor_name}</span>}
                </div>
              )}
            </div>
          );
        })}

        {/* Other Fire Safety sub-header */}
        <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: colors.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2, marginTop: 12 }}>
          Other Fire Safety
        </p>
        {systemStates.filter(s => s.group === 'other').map((sys) => {
          const sched = systemSchedules[sys.code];
          const pill = systemStatePill(sys.state);
          return (
            <div
              key={sys.label}
              className="rounded-lg"
              style={{
                borderLeft: `3px solid ${sys.state === 'overdue' ? colors.danger : sys.state === 'due_soon' ? colors.warning : sys.state === 'current' ? colors.success : colors.border}`,
                background: colors.white,
                padding: '10px 12px',
                boxShadow: shadows.sm,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <sys.Icon size={16} color="#D85A30" />
                  <div>
                    <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>{sys.label}</p>
                    <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>{sys.subDetail}</p>
                  </div>
                </div>
                <span
                  className="rounded-full"
                  style={{ fontSize: 10, fontWeight: typography.weight.semibold, padding: '2px 8px', background: pill.bg, color: pill.text }}
                >
                  {pill.label}
                </span>
              </div>
              {sched && (
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: typography.size.xs, color: colors.textSecondary }}>
                  <span>Last: {fmtDate(sched.last_service_date)}</span>
                  <span>Next: {fmtDate(sched.next_due_date)}</span>
                  {sched.vendor_name && <span>Vendor: {sched.vendor_name}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 5. Inspection History ──────────────────────────── */}
      <div>
        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary, marginBottom: 6 }}>
          Inspection History
        </p>
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Loader2 size={20} className="animate-spin" color={colors.textMuted} />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-lg" style={{ background: colors.white, padding: '16px', boxShadow: shadows.sm, textAlign: 'center' }}>
            <p style={{ fontSize: typography.size.sm, color: colors.textMuted }}>No inspection records yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((rec) => {
              const sysLabel = PROTECTION_SYSTEMS.find(s => s.safeguardType === rec.safeguard_type)?.label || rec.safeguard_type;
              return (
                <div
                  key={rec.id}
                  className="rounded-lg"
                  style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.textPrimary }}>
                        {fmtDate(rec.service_date)}
                      </p>
                      <p style={{ fontSize: typography.size.xs, color: colors.textSecondary }}>
                        {sysLabel}{rec.vendor_name ? ` · ${rec.vendor_name}` : ''}
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
          </div>
        )}
      </div>

      {/* ── 6. Action Buttons ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 0',
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold,
            color: colors.white,
            background: colors.navy,
            border: 'none',
            borderRadius: radius.md,
            cursor: 'pointer',
          }}
        >
          <Upload size={16} /> Upload Inspection Report
        </button>
        <button
          onClick={() => setShowAddEquipment(true)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 0',
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold,
            color: colors.navy,
            background: colors.borderLight,
            border: '1px solid transparent',
            borderRadius: radius.md,
            cursor: 'pointer',
          }}
        >
          <Shield size={16} /> Add Protection System
        </button>
      </div>

      {/* ── Upload Modal ──────────────────────────────────── */}
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

      {/* ── Add Equipment Modal ──────────────────────────── */}
      {showAddEquipment && (
        <Suspense fallback={null}>
          <EquipmentFormModal
            defaultEquipmentType="suppression"
            onClose={() => setShowAddEquipment(false)}
            onSuccess={() => setShowAddEquipment(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
