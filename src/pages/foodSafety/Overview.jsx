// ============================================================
// Food Safety Overview — Phase 4 redesign (C19.4)
// ============================================================
// Identity Card, Open CAs, PRP Outlook, Needs Attention,
// Drifts, Last Inspection, Go Deeper — via FoodOverviewBody.
// No score, no aggregate — county publishes the result.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Breadcrumb } from '../../components/Breadcrumb';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/designSystem';
import { OPEN_CORRECTIVE_ACTION_STATUSES } from '../../constants/correctiveActionStatus';
import { getDriftLabel } from '../../constants/driftTypeLabels';
import FoodOverviewBody from '../../components/foodSafety/FoodOverviewBody';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 };
const QUERY_TIMEOUT = 5000;

// Drift status → CA display status mapping for FoodOverviewBody
const DRIFT_STATUS_MAP = {
  open: 'open',
  reduced: 'in_progress',
  proven: 'in_progress',
  resolved: 'resolved',
};

// Static PRP outlook until engines are wired
const STATIC_PRP_OUTLOOK = {
  predict: { status: 'no_data', summary: 'Engine not connected' },
  reduce:  { status: 'no_data', summary: 'Engine not connected' },
  prove:   { status: 'no_data', summary: 'Engine not connected' },
};

// ── Main Component ──────────────────────────────────────────

export default function FoodSafetyOverview() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getAccessibleLocations } = useRole();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const accessibleLocations = getAccessibleLocations();

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Data
  const [jurisdiction, setJurisdiction] = useState(null);
  const [lastInspection, setLastInspection] = useState(null);
  const [openCAsSummary, setOpenCAsSummary] = useState(null);
  const [needsAttention, setNeedsAttention] = useState([]);
  const [drifts, setDrifts] = useState([]);
  const [orgLocations, setOrgLocations] = useState([]);

  // Fetch org locations for selector (live mode)
  useEffect(() => {
    if (!orgId || isDemoMode) return;
    (async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name');
      if (data) setOrgLocations(data);
    })();
  }, [orgId, isDemoMode]);

  // Build location filter
  const locationFilter = selectedLocations.length > 0 ? selectedLocations : orgLocations.map(l => l.id);

  // Fetch data
  useEffect(() => {
    if (isDemoMode || !orgId) {
      setLoading(false);
      return;
    }
    if (orgLocations.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

    (async () => {
      setLoading(true);

      try {
        // 1. Jurisdiction — via location_jurisdictions junction table
        // TODO(C19): uses first location's food_safety jurisdiction.
        // Multi-location orgs spanning multiple counties will render only the
        // first county's agency on Identity Card. Acceptable for v1; revisit
        // when multi-jurisdiction orgs become a common pattern.
        const locationId = locationFilter[0] || orgLocations[0]?.id;
        console.log('[C19.4-debug] locationId:', locationId, 'locationFilter:', locationFilter, 'orgLocations[0]:', orgLocations[0]);
        if (locationId) {
          const { data: ljRow } = await supabase
            .from('location_jurisdictions')
            .select('jurisdiction_id')
            .eq('location_id', locationId)
            .eq('jurisdiction_layer', 'food_safety')
            .maybeSingle();

          if (!cancelled && ljRow?.jurisdiction_id) {
            const { data: jurisdData } = await supabase
              .from('jurisdictions')
              .select('*')
              .eq('id', ljRow.jurisdiction_id)
              .maybeSingle();
            if (!cancelled) setJurisdiction(jurisdData || null);
          } else if (!cancelled) {
            setJurisdiction(null);
          }
        }

        // 2. Last county inspection
        const inspQ = supabase
          .from('inspection_reports')
          .select('pillar, inspection_date, raw_result, raw_result_type, inspection_type')
          .eq('organization_id', orgId)
          .eq('pillar', 'food_safety')
          .order('inspection_date', { ascending: false })
          .limit(1);
        if (locationFilter.length > 0 && locationFilter.length < orgLocations.length) {
          inspQ.in('location_id', locationFilter);
        }
        const { data: inspData } = await inspQ;
        if (!cancelled) setLastInspection(inspData?.[0] || null);

        // 3. Open corrective actions with severity breakdown
        const caBaseQ = () => {
          const q = supabase
            .from('corrective_actions')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('pillar', 'food_safety')
            .in('status', [...OPEN_CORRECTIVE_ACTION_STATUSES]);
          if (locationFilter.length > 0 && locationFilter.length < orgLocations.length) {
            q.in('location_id', locationFilter);
          }
          return q;
        };
        const [{ count: caTotal }, { count: caCrit }, { count: caHigh }, { count: caMed }] = await Promise.all([
          caBaseQ(),
          caBaseQ().eq('severity', 'critical'),
          caBaseQ().eq('severity', 'high'),
          caBaseQ().eq('severity', 'medium'),
        ]);
        if (!cancelled) {
          const total = caTotal || 0;
          setOpenCAsSummary(total > 0 ? {
            total,
            critical: caCrit || 0,
            high: caHigh || 0,
            medium: caMed || 0,
            analysisUrl: '/food-safety/analysis?status=open',
          } : null);
        }

        // 4. Needs attention — top 5 open CAs by severity
        const naQ = supabase
          .from('corrective_actions')
          .select('id, title, severity, status, due_date')
          .eq('organization_id', orgId)
          .eq('pillar', 'food_safety')
          .in('status', [...OPEN_CORRECTIVE_ACTION_STATUSES])
          .in('severity', ['critical', 'high', 'medium'])
          .order('due_date', { ascending: true })
          .limit(15);
        if (locationFilter.length > 0 && locationFilter.length < orgLocations.length) {
          naQ.in('location_id', locationFilter);
        }
        const { data: naData } = await naQ;
        if (!cancelled && naData) {
          const sorted = naData.sort((a, b) => {
            const sa = SEVERITY_ORDER[a.severity] ?? 3;
            const sb = SEVERITY_ORDER[b.severity] ?? 3;
            if (sa !== sb) return sa - sb;
            return (a.due_date || '').localeCompare(b.due_date || '');
          });
          setNeedsAttention(sorted.slice(0, 5).map(ca => ({
            id: ca.id,
            title: ca.title,
            severity: ca.severity,
            due_date: ca.due_date,
            action_url: `/food-safety/corrective-actions/${ca.id}`,
          })));
        }

        // 5. Drifts — food_safety pillar, open/active only
        //    Uses drift_catches table (first-class entity).
        //    drift_type mapped to human label via getDriftLabel noun form.
        //    category = pillar (always 'food_safety' here).
        const driftQ = supabase
          .from('drift_catches')
          .select('id, drift_type, pillar, detected_at, status')
          .eq('org_id', orgId)
          .eq('pillar', 'food_safety')
          .in('status', ['open', 'reduced', 'proven'])
          .order('detected_at', { ascending: false })
          .limit(20);
        if (locationFilter.length > 0 && locationFilter.length < orgLocations.length) {
          driftQ.in('location_id', locationFilter);
        }
        const { data: driftData } = await driftQ;
        if (!cancelled && driftData) {
          setDrifts(driftData.map(d => ({
            id: d.id,
            name: getDriftLabel(d.drift_type, { form: 'noun' }),
            category: d.pillar,
            last_seen: d.detected_at,
            corrective_action_status: DRIFT_STATUS_MAP[d.status] || 'open',
          })));
        }
      } catch {
        // Timeout or network error — leave empty states
      }

      clearTimeout(timeout);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [orgId, selectedLocations, isDemoMode, orgLocations]);

  const showEmpty = isDemoMode || (!loading && !orgId);

  return (
    <>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Food Safety', href: '/food-safety' },
        { label: 'Overview' },
      ]} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <Shield style={{ width: '24px', height: '24px', color: colors.success }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.navy, margin: 0 }}>
          Food Safety Overview
        </h1>
      </div>
      <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '20px', marginTop: 0 }}>
        Right-now snapshot of food safety operations, plus entry to deeper analysis.
      </p>

      {/* Location selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', padding: '12px 16px', backgroundColor: '#FAF7F0', borderRadius: '10px', border: '1px solid rgba(30,45,77,0.1)' }}>
        <select
          value={selectedLocations.length === 0 ? 'all' : selectedLocations[0]}
          onChange={(e) => setSelectedLocations(e.target.value === 'all' ? [] : [e.target.value])}
          style={{ padding: '8px 12px', border: '1px solid rgba(30,45,77,0.15)', borderRadius: '8px', fontSize: '13px', backgroundColor: 'white' }}
        >
          <option value="all">All Locations</option>
          {(orgLocations.length > 0 ? orgLocations : accessibleLocations).map(loc => (
            <option key={loc.id || loc.locationUrlId} value={loc.id || loc.locationUrlId}>
              {loc.name || loc.locationName}
            </option>
          ))}
        </select>
      </div>

      {showEmpty ? (
        <div style={{
          backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(30,45,77,0.1)',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <Shield style={{ width: '48px', height: '48px', color: colors.textMuted, margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.navy, marginBottom: '8px' }}>No food safety data yet</h2>
          <p style={{ fontSize: '14px', color: colors.textSecondary, maxWidth: '400px', margin: '0 auto' }}>
            Add locations and start logging temperatures, checklists, and inspections.
          </p>
        </div>
      ) : (
        <FoodOverviewBody
          jurisdiction={jurisdiction}
          openCAsSummary={openCAsSummary}
          prpOutlook={STATIC_PRP_OUTLOOK}
          needsAttention={needsAttention}
          drifts={drifts}
          lastInspection={lastInspection}
          onNavigate={navigate}
        />
      )}
    </>
  );
}
