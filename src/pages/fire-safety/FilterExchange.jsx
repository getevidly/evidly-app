/**
 * FilterExchange — Grease filter swap status + Cost Intelligence.
 * Route: /fire-safety/kec/gfx
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Filter, DollarSign, Calendar,
  TrendingUp, TrendingDown, Minus, FileText, Upload,
  Loader2,
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

const SERVICE_CODE = 'GFX';
const SAFEGUARD_TYPES = ['hood_cleaning'];
const COST_ROLES = ['owner_operator', 'executive', 'facilities_manager', 'platform_admin'];

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

export default function FilterExchange() {
  usePageTitle('Filter Exchange');
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
  const [showRequest, setShowRequest] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [hasRecords, setHasRecords] = useState(null);

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

  useEffect(() => {
    if (!orgId || !locationId) return;
    setScheduleLoading(true);
    supabase
      .from('location_service_schedules')
      .select('service_type_code, vendor_name, vendor_id, last_service_date, next_due_date, negotiated_price, interval_label')
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .eq('service_type_code', SERVICE_CODE)
      .eq('is_active', true)
      .limit(1)
      .single()
      .then(({ data }) => { setSchedule(data || null); setScheduleLoading(false); });
  }, [orgId, locationId]);

  useEffect(() => {
    if (!orgId || !locationId) { setHasRecords(false); return; }
    supabase
      .from('vendor_service_records')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('location_id', locationId)
      .eq('service_type_code', SERVICE_CODE)
      .eq('is_sample', false)
      .then(({ count }) => { setHasRecords((count || 0) > 0); });
  }, [orgId, locationId]);

  const { data: history, isLoading: historyLoading } = useServiceHistory(orgId, locationId, SAFEGUARD_TYPES, 5);
  const gfxHistory = history.filter(r => r.service_type_code === SERVICE_CODE);
  const { data: costData, isLoading: costLoading } = useServiceCostIntelligence(orgId, locationId, SAFEGUARD_TYPES, jurisdictionId);

  const overallDays = schedule ? daysUntil(schedule.next_due_date) : null;
  const overallStatus = hasRecords === false && !schedule
    ? { bg: '#F3F4F6', text: '#6B7280', border: colors.border, label: 'Service not active' }
    : statusColor(overallDays);

  if (!profile) return null;
  const isEmpty = hasRecords === false && !schedule;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }} className="space-y-4 px-4 pt-4">
      <div>
        <p style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, color: '#D85A30', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fire Safety</p>
        <h2 style={{ fontSize: typography.size.h2, fontWeight: typography.weight.bold, color: colors.textPrimary, margin: '2px 0 0' }}>Filter Exchange</h2>
        {locations.length > 1 && (
          <select value={locationId || ''} onChange={handleLocationChange} style={{ marginTop: 6, fontSize: typography.size.sm, color: colors.textSecondary, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        {locations.length === 1 && <p style={{ fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 }}>{locationName}</p>}
      </div>

      <div className="rounded-lg" style={{ borderLeft: `4px solid ${overallStatus.border}`, background: colors.white, padding: '12px 14px', boxShadow: shadows.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>Baffle Filter System</p>
            <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginTop: 1 }}>NFPA 96 Chapter 9 · CWA-402</p>
          </div>
          <span className="rounded-full" style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, padding: '3px 10px', backgroundColor: overallStatus.bg, color: overallStatus.text }}>{overallStatus.label}</span>
        </div>
      </div>

      {isEmpty && (
        <div className="rounded-lg" style={{ background: colors.white, padding: '16px', boxShadow: shadows.sm, textAlign: 'center' }}>
          <p style={{ fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: 8, lineHeight: 1.4 }}>
            This service is not currently active. Activating protects PSE and CWA compliance.
          </p>
          <button onClick={() => setShowRequest(true)} style={{ padding: '8px 20px', fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.white, background: colors.navy, border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>Add to plan</button>
        </div>
      )}

      {!isEmpty && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="rounded-lg" style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}>
              <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 2 }}>Last Service</p>
              <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>{scheduleLoading ? '...' : fmtDate(schedule?.last_service_date)}</p>
            </div>
            <div className="rounded-lg" style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}>
              <p style={{ fontSize: typography.size.xs, color: colors.textMuted, marginBottom: 2 }}>Next Due</p>
              <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: overallDays != null && overallDays < 0 ? colors.danger : colors.textPrimary }}>{scheduleLoading ? '...' : fmtDate(schedule?.next_due_date)}</p>
            </div>
          </div>

          {showCost && (
            <div className="rounded-lg" style={{ background: colors.white, padding: '14px', boxShadow: shadows.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <DollarSign size={16} color="#D85A30" />
                <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>Cost Intelligence</p>
              </div>
              {costLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 size={20} className="animate-spin" color={colors.textMuted} /></div>
              ) : !costData ? (
                <p style={{ fontSize: typography.size.sm, color: colors.textMuted }}>No cost data recorded yet.</p>
              ) : (
                <>
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
                  {costData.yoyDelta !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: typography.size.sm }}>
                      {costData.yoyDirection === 'up' && <TrendingUp size={14} color={colors.danger} />}
                      {costData.yoyDirection === 'down' && <TrendingDown size={14} color={colors.success} />}
                      {costData.yoyDirection === 'flat' && <Minus size={14} color={colors.textMuted} />}
                      <span style={{ color: costData.yoyDirection === 'up' ? colors.danger : costData.yoyDirection === 'down' ? colors.success : colors.textMuted }}>
                        {costData.yoyDelta > 0 ? '+' : ''}{costData.yoyDelta}% YoY
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {schedule?.vendor_name && (
            <div className="rounded-lg" style={{ background: colors.white, padding: '12px 14px', boxShadow: shadows.sm }}>
              <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>Service Vendor</p>
              <p style={{ fontSize: typography.size.body, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>{schedule.vendor_name}</p>
            </div>
          )}

          <div>
            <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary, marginBottom: 6 }}>Equipment Served</p>
            <div className="rounded-lg" style={{ borderLeft: `3px solid ${overallStatus.border}`, background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter size={16} color="#D85A30" />
                <div>
                  <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary }}>Baffle Filters</p>
                  <p style={{ fontSize: typography.size.xs, color: colors.textMuted }}>Off-site cleaned exchange, no wastewater discharge on premises</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.textPrimary, marginBottom: 6 }}>Service History</p>
            {historyLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 size={20} className="animate-spin" color={colors.textMuted} /></div>
            ) : gfxHistory.length === 0 ? (
              <div className="rounded-lg" style={{ background: colors.white, padding: '16px', boxShadow: shadows.sm, textAlign: 'center' }}>
                <p style={{ fontSize: typography.size.sm, color: colors.textMuted }}>No service records yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {gfxHistory.map((rec) => (
                  <div key={rec.id} className="rounded-lg" style={{ background: colors.white, padding: '10px 12px', boxShadow: shadows.sm }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.textPrimary }}>{fmtDate(rec.service_date)}</p>
                        {rec.vendor_name && <p style={{ fontSize: typography.size.xs, color: colors.textSecondary }}>{rec.vendor_name}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {showCost && rec.price_charged != null && Number(rec.price_charged) > 0 && (
                          <span className="rounded-full" style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold, padding: '2px 8px', background: '#EEF2FF', color: '#3730A3' }}>{fmtCurrency(rec.price_charged)}</span>
                        )}
                        {(rec.document_url || rec.certificate_url) && (
                          <FileText size={14} color={colors.textMuted} style={{ cursor: 'pointer' }} onClick={() => { const url = rec.certificate_url || rec.document_url; if (url) window.open(url, '_blank'); }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/calendar')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.white, background: colors.navy, border: 'none', borderRadius: radius.md, cursor: 'pointer' }}>
              <Calendar size={16} /> Schedule Service
            </button>
            <button onClick={() => setShowUpload(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: colors.navy, background: colors.white, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: 'pointer' }}>
              <Upload size={16} /> Upload Record
            </button>
          </div>
        </>
      )}

      {showUpload && (
        <Suspense fallback={null}>
          <UploadServiceRecordModal category="hood_cleaning" defaultLocationId={locationId} onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); window.location.reload(); }} />
        </Suspense>
      )}
      {showRequest && orgId && (
        <Suspense fallback={null}>
          <RequestServiceModal isOpen onClose={() => setShowRequest(false)} locationId={locationId || ''} organizationId={orgId} defaultServiceType="GFX" vendorId={schedule?.vendor_id || undefined} vendorName={schedule?.vendor_name || undefined} />
        </Suspense>
      )}
    </div>
  );
}
