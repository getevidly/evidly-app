// ============================================================
// ComplianceOverview — Dual-Pillar Hub (Sprint 5d-1d)
// ============================================================
// Two pillar cards side by side.  Each card shows:
//   1. Header band (navy bg, pillar icon + name)
//   2. Last county inspection result (from inspection_reports)
//   3. Open work count (from corrective_actions)
//   4. "Go deeper" drill tiles (Analysis + Trajectory)
//
// No score, no rating, no aggregate — the county publishes the
// result; operators handle the work.
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Flame, ChevronRight, FileText, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/designSystem';
import { OPEN_CORRECTIVE_ACTION_STATUSES } from '../constants/correctiveActionStatus';

// ── Types ────────────────────────────────────────────────────

interface LocationRow {
  id: string;
  name: string;
}

interface InspectionRow {
  pillar: string;
  inspection_date: string;
  raw_result: string;
  raw_result_type: string;
  inspection_type: string;
}

interface OpenWorkCount {
  food: number;
  fire: number;
}

// ── Role → visible pillars ──────────────────────────────────

const FOOD_ONLY_ROLES = ['chef', 'kitchen_manager', 'kitchen_staff'];
const FIRE_ONLY_ROLES = ['facilities_manager'];
// All other roles (owner_operator, executive, compliance_manager, platform_admin) see both

function visiblePillars(role: string): { food: boolean; fire: boolean } {
  if (FOOD_ONLY_ROLES.includes(role)) return { food: true, fire: false };
  if (FIRE_ONLY_ROLES.includes(role)) return { food: false, fire: true };
  return { food: true, fire: true };
}

// ── Urgency badge for open work ─────────────────────────────

const HIGH_AMBER = '#B45309';

function urgencyBadge(count: number) {
  if (count === 0) return { label: 'None', bg: colors.successSoft, text: colors.success };
  if (count <= 3) return { label: `${count} open`, bg: colors.warningSoft, text: colors.warning };
  return { label: `${count} open`, bg: '#FEF3C7', text: HIGH_AMBER };
}

// ── Date formatting ─────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ── Drill tile ──────────────────────────────────────────────

function DrillTile({
  title,
  description,
  accent,
  onClick,
}: {
  title: string;
  description: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(30,45,77,0.08)',
        backgroundColor: 'white',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(30,45,77,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: accent + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {title === 'Analysis' ? (
          <BarChart3 style={{ width: '18px', height: '18px', color: accent }} />
        ) : (
          <TrendingUp style={{ width: '18px', height: '18px', color: accent }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.navy }}>{title}</div>
        <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>{description}</div>
      </div>
      <ChevronRight style={{ width: '16px', height: '16px', color: colors.textMuted, flexShrink: 0 }} />
    </button>
  );
}

// ── Pillar Card ─────────────────────────────────────────────

function PillarCard({
  pillar,
  lastInspection,
  openCount,
  navigate,
  locationId,
}: {
  pillar: 'food' | 'fire';
  lastInspection: InspectionRow | null;
  openCount: number;
  navigate: (path: string) => void;
  locationId: string | null;
}) {
  const isFood = pillar === 'food';
  const pillarLabel = isFood ? 'Food Safety' : 'Fire Safety';
  const Icon = isFood ? Shield : Flame;
  const iconColor = isFood ? colors.success : colors.fireOrange;
  const accent = isFood ? colors.success : colors.fireOrange;
  const analysisPath = isFood ? '/food-safety/analysis' : '/fire-safety/analysis';
  const trajectoryPath = isFood ? '/food-safety/trajectory' : '/fire-safety/trajectory';
  const openWorkPath = isFood
    ? '/food-safety/analysis?status=open'
    : '/fire-safety/analysis?status=open';

  const badge = urgencyBadge(openCount);

  const locQuery = locationId ? `${locationId.includes('?') ? '&' : '?'}location=${locationId}` : '';

  return (
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid rgba(30,45,77,0.1)',
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      {/* 1. Header band */}
      <div
        style={{
          backgroundColor: colors.navy,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Icon style={{ width: '20px', height: '20px', color: iconColor }} />
        <span style={{ fontSize: '16px', fontWeight: 700, color: colors.cream }}>{pillarLabel}</span>
      </div>

      {/* 2. Last county inspection */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(30,45,77,0.06)' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary, marginBottom: '8px' }}>
          Last County Inspection
        </div>
        {lastInspection ? (
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: colors.navy }}>
              {lastInspection.raw_result}
            </div>
            <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>
              {lastInspection.raw_result_type} — {fmtDate(lastInspection.inspection_date)}
              {lastInspection.inspection_type && (
                <span style={{ marginLeft: '6px', color: colors.textMuted }}>
                  ({lastInspection.inspection_type})
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ width: '16px', height: '16px', color: colors.textMuted }} />
            <span style={{ fontSize: '13px', color: colors.textMuted }}>No inspections on record</span>
          </div>
        )}
        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '8px', fontStyle: 'italic' }}>
          County publishes this result — EvidLY displays it as-is.
        </div>
      </div>

      {/* 3. Open work */}
      <button
        onClick={() => navigate(openWorkPath + locQuery)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(30,45,77,0.06)',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottomStyle: 'solid',
          borderBottomWidth: '1px',
          borderBottomColor: 'rgba(30,45,77,0.06)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 150ms',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.cream;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle style={{ width: '16px', height: '16px', color: badge.text }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: colors.navy }}>Open Work</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: badge.bg,
              color: badge.text,
            }}
          >
            {badge.label}
          </span>
          <ChevronRight style={{ width: '14px', height: '14px', color: colors.textMuted }} />
        </div>
      </button>

      {/* 4. Go deeper */}
      <div style={{ padding: '16px 20px', backgroundColor: '#F8F9FA' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary, marginBottom: '10px' }}>
          Go Deeper
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <DrillTile
            title="Analysis"
            description={`${pillarLabel} trends, pass rates, and open items`}
            accent={accent}
            onClick={() => navigate(analysisPath + locQuery)}
          />
          <DrillTile
            title="Trajectory"
            description={`${pillarLabel} compliance trajectory over time`}
            accent={accent}
            onClick={() => navigate(trajectoryPath + locQuery)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export function ComplianceOverview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const orgId = profile?.organization_id;
  const pillars = visiblePillars(userRole);

  // Location state
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    searchParams.get('location') || null,
  );

  // Data state
  const [lastFoodInspection, setLastFoodInspection] = useState<InspectionRow | null>(null);
  const [lastFireInspection, setLastFireInspection] = useState<InspectionRow | null>(null);
  const [openWork, setOpenWork] = useState<OpenWorkCount>({ food: 0, fire: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch org locations
  useEffect(() => {
    if (!orgId || isDemoMode) return;
    (async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name');
      if (data && data.length > 0) {
        setLocations(data);
        if (!selectedLocationId) setSelectedLocationId(data[0].id);
      }
    })();
  }, [orgId, isDemoMode]);

  // Fetch pillar data when location changes
  useEffect(() => {
    if (!orgId || isDemoMode) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);

      const locationFilter = selectedLocationId || undefined;

      // Last food inspection
      if (pillars.food) {
        const q = supabase
          .from('inspection_reports')
          .select('pillar, inspection_date, raw_result, raw_result_type, inspection_type')
          .eq('organization_id', orgId)
          .eq('pillar', 'food_safety')
          .order('inspection_date', { ascending: false })
          .limit(1);
        if (locationFilter) q.eq('location_id', locationFilter);
        const { data } = await q;
        if (!cancelled) setLastFoodInspection(data && data.length > 0 ? data[0] as InspectionRow : null);
      }

      // Last fire inspection
      if (pillars.fire) {
        const q = supabase
          .from('inspection_reports')
          .select('pillar, inspection_date, raw_result, raw_result_type, inspection_type')
          .eq('organization_id', orgId)
          .eq('pillar', 'fire_safety')
          .order('inspection_date', { ascending: false })
          .limit(1);
        if (locationFilter) q.eq('location_id', locationFilter);
        const { data } = await q;
        if (!cancelled) setLastFireInspection(data && data.length > 0 ? data[0] as InspectionRow : null);
      }

      // Open corrective actions by pillar
      let foodCount = 0;
      let fireCount = 0;

      if (pillars.food) {
        const q = supabase
          .from('corrective_actions')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('pillar', 'food_safety')
          .in('status', [...OPEN_CORRECTIVE_ACTION_STATUSES]);
        if (locationFilter) q.eq('location_id', locationFilter);
        const { count } = await q;
        foodCount = count || 0;
      }

      if (pillars.fire) {
        const q = supabase
          .from('corrective_actions')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('pillar', 'fire_safety')
          .in('status', [...OPEN_CORRECTIVE_ACTION_STATUSES]);
        if (locationFilter) q.eq('location_id', locationFilter);
        const { count } = await q;
        fireCount = count || 0;
      }

      if (!cancelled) {
        setOpenWork({ food: foodCount, fire: fireCount });
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [orgId, selectedLocationId, isDemoMode, pillars.food, pillars.fire]);

  // Demo mode: empty state (no fake data)
  const showEmpty = isDemoMode || (!loading && locations.length === 0 && !orgId);

  return (
    <div style={{ maxWidth: '1100px' }}>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Compliance Overview' },
      ]} />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: colors.navy,
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          Compliance Overview
        </h1>
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '6px', margin: 0 }}>
          Two pillars. The county publishes the result; you handle the work.
        </p>
      </div>

      {/* Location selector */}
      {locations.length > 1 && (
        <div style={{ marginBottom: '20px' }}>
          <select
            value={selectedLocationId || ''}
            onChange={(e) => {
              setSelectedLocationId(e.target.value || null);
              navigate(`/compliance-overview${e.target.value ? `?location=${e.target.value}` : ''}`);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid rgba(30,45,77,0.15)',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: 'white',
              color: colors.navy,
            }}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Empty state */}
      {showEmpty ? (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '14px',
            border: '1px solid rgba(30,45,77,0.1)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <Shield style={{ width: '48px', height: '48px', color: colors.textMuted, margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.navy, marginBottom: '8px' }}>
            No compliance data yet
          </h2>
          <p style={{ fontSize: '14px', color: colors.textSecondary, maxWidth: '400px', margin: '0 auto' }}>
            Add locations and upload inspection reports to see your compliance overview.
          </p>
        </div>
      ) : (
        <>
          {/* Pillar cards — side by side, stack on mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: pillars.food && pillars.fire ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {pillars.food && (
              <PillarCard
                pillar="food"
                lastInspection={lastFoodInspection}
                openCount={openWork.food}
                navigate={navigate}
                locationId={selectedLocationId}
              />
            )}
            {pillars.fire && (
              <PillarCard
                pillar="fire"
                lastInspection={lastFireInspection}
                openCount={openWork.fire}
                navigate={navigate}
                locationId={selectedLocationId}
              />
            )}
          </div>

          {/* Footer note */}
          <div
            style={{
              fontSize: '12px',
              color: colors.textMuted,
              textAlign: 'center',
              padding: '12px 16px',
              backgroundColor: colors.cream,
              borderRadius: '10px',
              border: '1px solid rgba(30,45,77,0.06)',
            }}
          >
            EvidLY does not calculate, blend, or aggregate a compliance score.
            Inspection results are displayed exactly as the jurisdiction publishes them.
          </div>
        </>
      )}
    </div>
  );
}
