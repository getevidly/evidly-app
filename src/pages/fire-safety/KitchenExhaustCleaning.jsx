/**
 * KitchenExhaustCleaning — NFPA 96 hood/duct/fan/grease status + Cost Intelligence.
 * Route: /fire-safety/kec
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fan, CheckCircle, AlertTriangle, Clock, Calendar, DollarSign,
  TrendingUp, TrendingDown, Minus, FileText, Upload, ChevronRight,
  Loader2, Building2, Wrench, Shield, Filter, Wind, Flame,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useServiceHistory } from '../../hooks/useServiceHistory';
import { useServiceCostIntelligence } from '../../hooks/useServiceCostIntelligence';
import { useServiceSubscriptions } from '../../hooks/useServiceSubscriptions';
import { supabase } from '../../lib/supabase';
import { colors, shadows, radius, typography } from '../../lib/designSystem';

const UploadServiceRecordModal = lazy(() => import('../../components/services/UploadServiceRecordModal'));
const RequestServiceModal = lazy(() => import('../../components/services/RequestServiceModal').then(m => ({ default: m.RequestServiceModal })));

// ── Constants ────────────────────────────────────────────────
const KEC_SAFEGUARD_TYPES = ['hood_cleaning'];
const COST_ROLES = ['owner_operator', 'executive', 'facilities_manager', 'platform_admin'];

const ADDON_SERVICES = [
  {
    key: 'FPM',
    subKey: 'hasFPM',
    title: 'Fan Performance Management',
    cadence: 'Preventive maintenance \u00b7 semi-annual',
    riskPill: 'PSE AT RISK',
    riskExplanation: 'Fan failure risk unidentified. Belts, bearings, and motor amperage degrade between cleanings \u2014 preventive maintenance catches failure before it shuts down ventilation.',
    priceConfigKey: 'fpm_default_visit_cents',
    fallbackCents: 18500,
    route: '/fire-safety/fpm',
    requestServiceType: 'FPM',
  },
  {
    key: 'RGC',
    subKey: 'hasRGC',
    title: 'Rooftop Grease Containment',
    cadence: 'Grease capture \u00b7 quarterly',
    riskPill: 'PSE + CWA AT RISK',
    riskExplanation: 'Rooftop grease accumulates between cleanings, creates fire spread vector, and discharges into roof drains in violation of CWA wastewater pH requirements.',
    priceConfigKey: 'rgc_default_visit_cents',
    fallbackCents: 14500,
    route: '/fire-safety/rgc',
    requestServiceType: 'RGC',
  },
  {
    key: 'GFX',
    subKey: 'hasGFX',
    title: 'Filter Exchange',
    cadence: 'Clean filter swap \u00b7 quarterly',
    riskPill: 'PSE AT RISK',
    riskExplanation: 'Filters saturate with grease between cleanings, increasing fire load and reducing exhaust capture. CWA-compliant exchange replaces filters off-site without wastewater discharge.',
    priceConfigKey: 'gfx_default_visit_cents',
    fallbackCents: 9500,
    route: '/fire-safety/gfx',
    requestServiceType: 'GFX',
  },
];

const SUB_SYSTEMS = [
  { code: 'KEC', label: 'Hood / Exhaust System', Icon: Fan, ref: 'NFPA 96 §11.4' },
  { code: 'GFX', label: 'Baffle Filters', Icon: Filter, ref: 'NFPA 96 §11.4.1' },
  { code: null, label: 'Ductwork', Icon: Wind, ref: 'NFPA 96 §11.5' },
  { code: 'FPM', label: 'Fan Performance', Icon: Wind, ref: 'NFPA 96 §11.6' },
  { code: 'RGC', label: 'Rooftop Grease Containment', Icon: Shield, ref: 'NFPA 96 §14.4' },
];

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
  const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000);
  return diff;
}

function statusColor(daysLeft) {
  if (daysLeft === null) return { bg: '#F3F4F6', text: '#6B7280', border: colors.border, label: 'No data' };
  if (daysLeft < 0) return { bg: '#FEE2E2', text: '#991B1B', border: colors.danger, label: `${Math.abs(daysLeft)}d overdue` };
  if (daysLeft <= 30) return { bg: '#FEF3C7', text: '#92400E', border: colors.warning, label: `${daysLeft}d remaining` };
  return { bg: '#D1FAE5', text: '#065F46', border: colors.success, label: 'Current' };
}

// ── Component ────────────────────────────────────────────────
export default function KitchenExhaustCleaning() {
  usePageTitle('Kitchen Exhaust Cleaning');
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

  // Schedule data
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  // Sub-system latest records
  const [subSystemStatus, setSubSystemStatus] = useState({});

  // Add-on service subscriptions
  const subs = useServiceSubscriptions(orgId, locationId);
  const [pricingConfig, setPricingConfig] = useState(null);
  const [requestModal, setRequestModal] = useState({ open: false, serviceType: '' });

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

  // Update location meta when selection changes
  const handleLocationChange = useCallback((e) => {
    const id = e.target.value;
    setLocationId(id);
    const loc = locations.find(l => l.id === id);
    setLocationName(loc?.name || '');
    setJurisdictionId(loc?.jurisdiction_id || undefined);
  }, [locations]);

  // Fetch schedule for KEC
  useEffect(() => {
    if (!orgId || !locationId) return;
    setScheduleLoading(true);
    supabase
      .from('location_service_schedules')
      .select('service_type_code, vendor_name, vendor_id, last_service_date, next_due_date, negotiated_price, interval_label')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .in('service_type_code', ['KEC', 'FPM', 'GFX', 'RGC'])
      .eq('is_active', true)
      .then(({ data }) => {
        const rows = data || [];
        const kecRow = rows.find(r => r.service_type_code === 'KEC') || rows[0] || null;
        setSchedule(kecRow);
        setScheduleLoading(false);
      });
  }, [orgId, locationId]);

  // Fetch latest sub-system service records
  useEffect(() => {
    if (!orgId || !locationId) return;
    supabase
      .from('vendor_service_records')
      .select('service_type_code, service_date, next_due_date, vendor_name')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .eq('is_sample', false)
      .eq('safeguard_type', 'hood_cleaning')
      .order('service_date', { ascending: false })
      .then(({ data }) => {
        const map = {};
        for (const r of (data || [])) {
          const code = r.service_type_code || 'KEC';
          if (!map[code]) map[code] = r;
        }
        setSubSystemStatus(map);
      });
  }, [orgId, locationId]);

  // Fetch pricing_config for add-on default prices
  useEffect(() => {
    supabase
      .from('pricing_config')
      .select('fpm_default_visit_cents, rgc_default_visit_cents, gfx_default_visit_cents')
      .eq('id', 1)
      .single()
      .then(({ data }) => { if (data) setPricingConfig(data); });
  }, []);

  // Hooks
  const { data: history, isLoading: historyLoading } = useServiceHistory(orgId, locationId, KEC_SAFEGUARD_TYPES, 5);
  const { data: costData, isLoading: costLoading } = useServiceCostIntelligence(orgId, locationId, KEC_SAFEGUARD_TYPES, jurisdictionId);

  // Derived
  const overallDays = schedule ? daysUntil(schedule.next_due_date) : null;
  const overallStatus = statusColor(overallDays);

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }} className="space-y-4 px-4 pt-4">

      {/* ── 1. Page Header ─────────────────────────────────── */}
      <div>
        <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: '#D85A30', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Fire Safety
        </p>
        <h2 style={{ fontSize: typography.size.h2, fontWeight: typography.weight.bold, color: colors.textPrimary, margin: '2px 0 0' }}>
          Kitchen Exhaust Cleaning
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
          borderLeft: `4px solid ${overallStatus.border}`,
          background: colors.white,
          padding: '12px 14px',
          boxShadow: shadows.sm,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>
              Hood &amp; Duct System
            </p>
            <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginTop: 1 }}>NFPA 96 compliance</p>
          </div>
          <span
            className="rounded-full"
            style={{
              fontSize: typography.size.xs,
              fontWeight: typography.weight.semibold,
              padding: '3px 10px',
              backgroundColor: overallStatus.bg,
              color: overallStatus.text,
            }}
          >
            {overallStatus.label}
          </span>
        </div>
      </div>

      {/* ── 3. Last Service / Next Due ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="rounded-lg" style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}>
          <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 2 }}>Last Service</p>
          <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>
            {scheduleLoading ? '...' : fmtDate(schedule?.last_service_date)}
          </p>
        </div>
        <div className="rounded-lg" style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}>
          <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 2 }}>Next Due</p>
          <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: overallDays != null && overallDays < 0 ? colors.danger : colors.textPrimary }}>
            {scheduleLoading ? '...' : fmtDate(schedule?.next_due_date)}
          </p>
        </div>
      </div>

      {/* ── 4. Cost Intelligence (role-gated) ──────────────── */}
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
              {/* YTD / TTM row */}
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

              {/* Forecast */}
              {costData.forecast && (
                <div style={{ background: '#F9FAFB', borderRadius: radius.md, padding: '8px 10px', marginBottom: 10 }}>
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 2 }}>Next Service Forecast</p>
                  <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>
                    {fmtCurrency(costData.forecast.amount)}
                    <span style={{ fontSize: typography.size.xs, color: colors.textMuted, marginLeft: 6 }}>
                      ({fmtCurrency(costData.forecast.rangeMin)} – {fmtCurrency(costData.forecast.rangeMax)})
                    </span>
                  </p>
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 }}>
                    {costData.forecast.confidence.replace(/_/g, ' ')} · {costData.forecast.sampleCount} services
                  </p>
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
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 }}>
                    {costData.benchmark.sampleSize} services in jurisdiction
                  </p>
                </div>
              )}

              {/* Vendor performance */}
              {costData.vendorName && (
                <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>
                  Top vendor: <strong>{costData.vendorName}</strong> ({costData.vendorServiceCount} services)
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 5. Service Vendor ──────────────────────────────── */}
      {schedule?.vendor_name && (
        <div className="rounded-lg" style={{ background: colors.white, padding: '12px 14px', boxShadow: shadows.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>Service Vendor</p>
              <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>{schedule.vendor_name}</p>
            </div>
            {schedule.vendor_id && (
              <span className="rounded-full" style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, padding: '2px 8px', background: '#D1FAE5', color: '#065F46' }}>
                CPP CONNECTED
              </span>
            )}
          </div>
          {showCost && schedule.negotiated_price != null && Number(schedule.negotiated_price) > 0 && (
            <p style={{ fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 4 }}>
              Contracted rate: {fmtCurrency(schedule.negotiated_price)} / {schedule.interval_label || 'service'}
            </p>
          )}
        </div>
      )}

      {/* ── 6. Equipment & Sub-Systems ─────────────────────── */}
      <div>
        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary, marginBottom: 6 }}>
          Equipment &amp; Sub-Systems
        </p>
        <div className="space-y-2">
          {SUB_SYSTEMS.map((sys) => {
            const rec = sys.code ? subSystemStatus[sys.code] : null;
            const days = rec ? daysUntil(rec.next_due_date) : null;
            const st = statusColor(days);
            return (
              <div
                key={sys.label}
                className="rounded-lg"
                style={{
                  borderLeft: `3px solid ${st.border}`,
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
                      <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>{sys.ref}</p>
                    </div>
                  </div>
                  <span
                    className="rounded-full"
                    style={{ fontSize: 10, fontWeight: typography.weight.semibold, padding: '2px 8px', background: st.bg, color: st.text }}
                  >
                    {st.label}
                  </span>
                </div>
                {rec && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: typography.size.xs, color: colors.textSecondary }}>
                    <span>Last: {fmtDate(rec.service_date)}</span>
                    <span>Next: {fmtDate(rec.next_due_date)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6b. Services Impacting PSE ────────────────────── */}
      {(() => {
        if (subs.loading) return null;
        const allActive = subs.hasFPM && subs.hasRGC && subs.hasGFX;
        const unsubscribed = ADDON_SERVICES.filter(s => !subs[s.subKey]);

        if (allActive) {
          return (
            <div className="rounded-lg" style={{ borderLeft: `3px solid ${colors.success}`, background: colors.white, padding: '10px 14px', boxShadow: shadows.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} color={colors.success} />
                <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>
                  All add-on services active — PSE protected
                </p>
              </div>
            </div>
          );
        }

        return (
          <div>
            <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: '#b3261e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Services Impacting PSE
            </p>
            <p style={{ fontSize: typography.size.xs, color: colors.textSecondary, marginBottom: 8, lineHeight: 1.4 }}>
              Standard KEC no longer includes these services. Adding them protects Protective Safeguards Endorsement (PSE) and Clean Water Act compliance.
            </p>
            <div className="space-y-2">
              {unsubscribed.map((svc) => {
                const cents = pricingConfig?.[svc.priceConfigKey] ?? svc.fallbackCents;
                const priceDisplay = '$' + Math.round(cents / 100);
                return (
                  <div
                    key={svc.key}
                    className="rounded-lg"
                    style={{ borderLeft: '3px solid #b3261e', background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.textPrimary }}>{svc.title}</p>
                        <p style={{ fontSize: 10, color: colors.textSecondary }}>{svc.cadence}</p>
                      </div>
                      <span className="rounded-full" style={{ fontSize: 10, fontWeight: typography.weight.semibold, padding: '2px 8px', background: '#FCEBEB', color: '#501313', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {svc.riskPill}
                      </span>
                    </div>
                    {/* Risk explanation */}
                    <p style={{ fontSize: typography.size.xs, color: '#501313', lineHeight: 1.4, marginBottom: 8 }}>
                      {svc.riskExplanation}
                    </p>
                    {/* Bottom row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: typography.size.xs, color: colors.textSecondary }}>Est. {priceDisplay}/visit</p>
                      <button
                        onClick={() => setRequestModal({ open: true, serviceType: svc.requestServiceType })}
                        style={{
                          padding: '5px 12px',
                          fontSize: typography.size.xs,
                          fontWeight: typography.weight.semibold,
                          color: colors.white,
                          background: colors.navy,
                          border: 'none',
                          borderRadius: radius.md,
                          cursor: 'pointer',
                        }}
                      >
                        Add to plan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── 7. Service History ─────────────────────────────── */}
      <div>
        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary, marginBottom: 6 }}>
          Service History
        </p>
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <Loader2 size={20} className="animate-spin" color={colors.textMuted} />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-lg" style={{ background: colors.white, padding: '16px', boxShadow: shadows.sm, textAlign: 'center' }}>
            <p style={{ fontSize: typography.size.sm, color: colors.textMuted }}>No service records yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((rec) => (
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
                    {rec.vendor_name && (
                      <p style={{ fontSize: typography.size.xs, color: colors.textSecondary }}>{rec.vendor_name}</p>
                    )}
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
                {rec.notes && (
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginTop: 4 }}>{rec.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 8. Action Buttons ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => navigate('/calendar')}
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
          <Calendar size={16} /> Schedule Service
        </button>
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
            color: colors.navy,
            background: colors.white,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            cursor: 'pointer',
          }}
        >
          <Upload size={16} /> Upload Record
        </button>
      </div>

      {/* ── Upload Modal ──────────────────────────────────── */}
      {showUpload && (
        <Suspense fallback={null}>
          <UploadServiceRecordModal
            category="hood_cleaning"
            defaultLocationId={locationId}
            onClose={() => setShowUpload(false)}
            onSuccess={() => { setShowUpload(false); window.location.reload(); }}
          />
        </Suspense>
      )}

      {/* ── Request Service Modal (Add to plan CTA) ───────── */}
      {requestModal.open && orgId && (
        <Suspense fallback={null}>
          <RequestServiceModal
            isOpen
            onClose={() => setRequestModal({ open: false, serviceType: '' })}
            locationId={locationId || ''}
            organizationId={orgId}
            defaultServiceType={requestModal.serviceType}
            vendorId={schedule?.vendor_id || undefined}
            vendorName={schedule?.vendor_name || undefined}
          />
        </Suspense>
      )}
    </div>
  );
}
