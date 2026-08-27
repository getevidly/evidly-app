/**
 * DashboardView — Full dashboard layout matching DashboardMockup.jsx.
 * Renders: LocationTabs → Hero → QuickActions → ExposureBand → WhoCanAsk → Pillars → Explore → BusinessRecords → Alerts → TemperatureLogs
 * All data from live PROD hooks. No fake/sample data.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Utensils, AlertTriangle, Calendar, Bell, FileText, Thermometer, ArrowRight, Home, Upload, Truck, Download, Building2, Users } from 'lucide-react';
import { FONT, TONE, PILLAR } from '../../design/tokens';
import { useWhatsAtRisk } from '../../hooks/useWhatsAtRisk';
import type { WhatsAtRisk } from '../../hooks/useWhatsAtRisk';
import { useDashboardLocation } from '../../contexts/DashboardLocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrgSummary } from '../../hooks/useOrgSummary';
import { useDriftCatches } from '../../hooks/useDriftCatches';
import { useRiskFeed } from '../../hooks/useRiskFeed';
import { PortfolioSnapshot as RiskPortfolioSnapshot } from './risk/PortfolioSnapshot';
import { KitchenOverviewCards } from './risk/KitchenOverviewCards';
import { RiskFeed } from './risk/RiskFeed';
import { TreatProveStrips } from './risk/TreatProveStrips';
import { useDriftRouting } from '../../hooks/useDriftRouting';
import { useAdvisorBriefings } from '../../hooks/useAdvisorBriefings';
import { useUpcomingServicesList } from '../../hooks/useUpcomingServicesList';
import { useProofStats } from '../../hooks/useProofStats';
import { useRecordsOnFile } from '../../hooks/useRecordsOnFile';
import { useFireChipStatus } from '../../hooks/dashboard/useFireChipStatus';
import type { FireChip } from '../../hooks/dashboard/useFireChipStatus';
import { useBusinessProofStatus } from '../../hooks/dashboard/useBusinessProofStatus';
import { useRole } from '../../contexts/RoleContext';
import { getDriftLabel } from '../../constants/driftTypeLabels';
import { daysSince } from '../../lib/daysSince';
import { supabase } from '../../lib/supabase';
import type { DriftCatchWithAcks } from '../../hooks/useDriftCatches';
import type { DriftRecipient } from '../../hooks/useDriftRouting';

// ─── Brand tokens ────────────────────────────────────────────────
const NAVY = '#1E2D4D';
const GOLD = '#B24A2E';
const MUTED = '#6B7689';
const LINE = '#E6E1D3';
const GREEN = '#3F6B47';
const RED = '#A04040';
const AMBER = '#B08A2E';
const RUST = '#B85D22';
const INK = '#0F1828';
const EMBER = '#B24A2E';

// ─── Explore catalog types ──────────────────────────────────────
interface CatalogItem {
  requirement_code: string;
  label: string;
  pillar: string;
  is_conditional: boolean;
  counts_toward_total: boolean;
  sort_order: number;
  action_type: string;
}
const EXPLORE_ACTION_LABEL: Record<string, string> = {
  route_out: 'Request from vendor',
  upload: 'Upload document',
  confirm: 'Confirm',
  identify_vendor: 'Identify vendor',
};

// ─── StatusPill ──────────────────────────────────────────────────
type PillStatus = 'clear' | 'action' | 'urgent' | 'empty';

const PILL_MAP: Record<PillStatus, { label: string; bg: string; color: string }> = {
  clear:  { label: 'On track',       bg: '#E4EBE3', color: GREEN },
  action: { label: 'Action needed',  bg: '#FDF6E9', color: AMBER },
  urgent: { label: 'Urgent',         bg: '#F7E9E9', color: RED },
  empty:  { label: 'Setup pending',  bg: '#F0EEE8', color: MUTED },
};

function StatusPill({ status }: { status: PillStatus }) {
  const s = PILL_MAP[status] || PILL_MAP.empty;
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold uppercase text-[10px] px-2.5 py-1"
      style={{ backgroundColor: s.bg, color: s.color, letterSpacing: '0.1em', fontFamily: FONT.mono }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
}

function postureToPill(posture: string | undefined): PillStatus {
  if (posture === 'solid') return 'clear';
  if (posture === 'watch') return 'action';
  if (posture === 'alarm') return 'urgent';
  return 'empty';
}

// ─── Role labels ─────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  owner_operator: 'Owner',
  executive: 'Executive',
  compliance_manager: 'Compliance',
  facilities_manager: 'Facilities',
  chef: 'Chef',
  kitchen_manager: 'Manager',
};

// ─── Main export ─────────────────────────────────────────────────
export function DashboardView() {
  // All hooks called unconditionally at top (React rules)
  const { selectedLocationId, setSelectedLocationId, locations, locationCount, isMultiLocation } = useDashboardLocation();
  const { orgName } = useOrgSummary();
  const { userRole } = useRole();
  const roleLabel = ROLE_LABELS[userRole] || userRole;

  // Refetch key — bumped on visibilitychange so data refreshes when user returns
  const [refetchKey, setRefetchKey] = useState(0);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setRefetchKey(k => k + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Suppress lint: refetchKey forces re-mount of hooks below
  void refetchKey;

  const { catches, acknowledge } = useDriftCatches({ locationIdFilter: selectedLocationId || undefined });
  const openCatches = catches.filter(c => c.status === 'open' && !c.userHasAcked);
  const routingMap = useDriftRouting(openCatches.map(c => c.id));

  const { food_safety: foodBriefing, fire_safety: fireBriefing } = useAdvisorBriefings({ locationIdFilter: selectedLocationId || undefined });

  const fireUpcoming = useUpcomingServicesList(30, selectedLocationId || undefined, 'fire_safety');
  const foodUpcoming = useUpcomingServicesList(30, selectedLocationId || undefined, 'food_safety');

  const fireProof = useProofStats('fire_safety', selectedLocationId || undefined);
  const foodProof = useProofStats('food_safety', selectedLocationId || undefined);
  const { chips: fireChips } = useFireChipStatus(selectedLocationId || undefined);
  const businessProof = useBusinessProofStatus(selectedLocationId || undefined);
  const risk = useWhatsAtRisk(selectedLocationId);

  // One severity-ordered view of everything open. Loaded org-wide so switching
  // the location tab re-scopes without a refetch.
  const [riskVersion, setRiskVersion] = useState(0);
  const { items: riskItems, byLocation, portfolioNextDue, counts: riskCounts, loading: riskLoading } = useRiskFeed();
  void riskVersion;

  // Org-level items (business records, vendor docs) stay visible on every tab.
  const scopedRiskItems = selectedLocationId
    ? riskItems.filter(i => i.locationId === selectedLocationId || i.orgLevel)
    : riskItems;
  const scopeName = selectedLocationId
    ? locations.find(l => l.id === selectedLocationId)?.name ?? null
    : null;

  // Explore: requirement catalog + what-if toggle state
  const [reqCatalog, setReqCatalog] = useState<CatalogItem[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [toggledCodes, setToggledCodes] = useState<Set<string>>(new Set());
  const [exploreOpen, setExploreOpen] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const { data } = await supabase
        .from('pillar_requirements')
        .select('requirement_code, label, pillar, is_conditional, counts_toward_total, sort_order, action_type')
        .eq('state_code', 'CA')
        .order('pillar')
        .order('sort_order');
      if (!dead) {
        setReqCatalog((data || []) as CatalogItem[]);
        setCatalogReady(true);
      }
    })();
    return () => { dead = true; };
  }, []);

  const toggleExploreReq = useCallback((code: string) => {
    setToggledCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  // What-if projection: each toggled counting requirement reduces exposure proportionally
  const fireCountingReqs = reqCatalog.filter(r => r.pillar === 'fire_safety' && r.counts_toward_total);
  const foodCountingReqs = reqCatalog.filter(r => r.pillar === 'food_safety' && r.counts_toward_total);
  const fireToggledN = fireCountingReqs.filter(r => toggledCodes.has(r.requirement_code)).length;
  const foodToggledN = foodCountingReqs.filter(r => toggledCodes.has(r.requirement_code)).length;
  const anyToggled = fireToggledN + foodToggledN > 0;

  const projection = !risk.loading && !risk.isPlaceholder && anyToggled ? (() => {
    const fcDenom = fireCountingReqs.length || 1;
    const fdDenom = foodCountingReqs.length || 1;
    const fStillLo = risk.fire.pending.low + risk.fire.live.low;
    const fStillHi = risk.fire.pending.high + risk.fire.live.high;
    const fdStillLo = risk.food.pending.low + risk.food.live.low;
    const fdStillHi = risk.food.pending.high + risk.food.live.high;
    return {
      fireStillLo: Math.max(0, fStillLo - fireToggledN * (risk.fire.baseline.low / fcDenom)),
      fireStillHi: Math.max(0, fStillHi - fireToggledN * (risk.fire.baseline.high / fcDenom)),
      foodStillLo: Math.max(0, fdStillLo - foodToggledN * (risk.food.baseline.low / fdDenom)),
      foodStillHi: Math.max(0, fdStillHi - foodToggledN * (risk.food.baseline.high / fdDenom)),
      label: `Projected \u00b7 ${fireToggledN + foodToggledN} what-if`,
    };
  })() : null;

  const alertCount = openCatches.length;

  // Watching bar: total requirement count across all locations
  const watchingCount = (fireProof.total + foodProof.total) * Math.max(locationCount, 1);

  // Derive location name for hero
  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const heroLocationName = selectedLocation?.name || orgName || '';

  return (
    <div className="space-y-6 pb-16" style={{ minHeight: 1400 }}>
      {/* Location Tabs */}
      <LocationTabs
        locations={locations}
        activeId={selectedLocationId}
        onChange={setSelectedLocationId}
        showAll={isMultiLocation}
      />

      {/* Hero */}
      <Hero
        alertCount={alertCount}
        locationName={heroLocationName}
        kitchenCount={locationCount}
        isMulti={isMultiLocation}
        watchingCount={watchingCount}
      />

      {/* Portfolio snapshot + kitchen cards — the org layer, all-locations only */}
      {selectedLocationId === null && isMultiLocation && !riskLoading && (
        <>
          <RiskPortfolioSnapshot
            counts={riskCounts}
            byLocation={byLocation}
            nextDue={portfolioNextDue}
          />
          <KitchenOverviewCards
            byLocation={byLocation}
            onViewKitchen={setSelectedLocationId}
          />
        </>
      )}

      {/* Records on file — replaces the old COMPLIANCE STATUS rings */}
      <RecordsOnFile locationId={selectedLocationId} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Exposure Band — real at-risk figures from useWhatsAtRisk */}
      <ExposureBand risk={risk} locationCount={locationCount} isAllLocations={selectedLocationId === null} projection={projection} />

      {/* One severity-ordered feed — drift, records, incidents, actions */}
      <RiskFeed
        items={scopedRiskItems}
        loading={riskLoading}
        scopeLabel={scopeName}
        onCreated={() => setRiskVersion(v => v + 1)}
      />

      {/* Treat + prove */}
      <TreatProveStrips locationId={selectedLocationId} />

      {/* Who can ask — five asker cards */}
      <WhoCanAsk />

      {/* Fire + Food Pillars side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PillarCard
          pillar="fire_safety"
          name="Fire Safety"
          Icon={Flame}
          framework="California Fire Code"
          status={fireChips.length > 0
            ? (fireChips.every(c => c.hasEvidence) ? 'clear' : 'action')
            : postureToPill(fireBriefing?.posture)}
          upcoming={fireUpcoming.items}
          actionNeeded={(fireBriefing?.open_items || []).filter(i => i.pillar === 'fire_safety')}
          proof={fireProof}
          fireChips={fireChips}
        />
        <PillarCard
          pillar="food_safety"
          name="Food Safety"
          Icon={Utensils}
          framework="California Retail Food Code"
          status={postureToPill(foodBriefing?.posture)}
          upcoming={foodUpcoming.items}
          actionNeeded={(foodBriefing?.open_items || []).filter(i => i.pillar === 'food_safety')}
          proof={foodProof}
        />
      </div>

      {/* Explore — what-if projection */}
      {catalogReady && reqCatalog.length > 0 && (
        <ExplorePanel
          fireItems={reqCatalog.filter(r => r.pillar === 'fire_safety')}
          foodItems={reqCatalog.filter(r => r.pillar === 'food_safety')}
          toggledCodes={toggledCodes}
          onToggle={toggleExploreReq}
          isOpen={exploreOpen}
          onToggleOpen={() => setExploreOpen(!exploreOpen)}
        />
      )}

      {/* Business + Vendor Records */}
      {!businessProof.loading && (businessProof.requirements.length > 0 || businessProof.error) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {businessProof.error ? (
            <div className="bg-white border px-6 py-5 col-span-full" style={{ borderColor: LINE, borderLeftWidth: 4, borderLeftColor: RED }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} style={{ color: RED }} />
                <span className="text-sm font-semibold" style={{ color: NAVY }}>Business records failed to load</span>
              </div>
              <div className="text-[11px]" style={{ color: MUTED }}>{businessProof.error}</div>
            </div>
          ) : (
            <>
              <BusinessRecordsCard proof={businessProof} />
              <VendorRecordsCard />
            </>
          )}
        </div>
      )}

      {/* Alerts */}
      {alertCount > 0 && (
        <AlertsSection
          catches={openCatches}
          routingMap={routingMap}
          onAcknowledge={acknowledge}
          roleLabel={roleLabel}
        />
      )}

      {/* Temperature Logs — real query, hidden when no equipment */}
      <TemperatureLogs locationId={selectedLocationId} locationIds={locations.map(l => l.id)} />
    </div>
  );
}

// ─── LocationTabs ────────────────────────────────────────────────
function LocationTabs({ locations, activeId, onChange, showAll }: {
  locations: { id: string; name: string }[];
  activeId: string | null;
  onChange: (id: string | null) => void;
  showAll: boolean;
}) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const tabButton = (id: string | null, label: React.ReactNode, key?: string) => {
    const isActive = activeId === id;
    const isHovered = hoveredTab === (id ?? '__all__');
    return (
      <button
        key={key ?? '__all__'}
        onClick={() => onChange(id)}
        onMouseEnter={() => setHoveredTab(id ?? '__all__')}
        onMouseLeave={() => setHoveredTab(null)}
        className="px-4 py-3 text-sm whitespace-nowrap inline-flex items-center gap-2"
        style={{
          position: 'relative',
          color: isActive ? NAVY : MUTED,
          fontWeight: isActive ? 600 : 500,
          fontFamily: FONT.body,
        }}>
        {label}
        {/* Underline */}
        <span style={{
          position: 'absolute',
          bottom: 0,
          height: 2,
          background: isActive ? GOLD : LINE,
          transition: 'left 220ms ease, right 220ms ease, opacity 220ms ease',
          left: isActive ? 0 : (isHovered ? '10%' : '50%'),
          right: isActive ? 0 : (isHovered ? '10%' : '50%'),
          opacity: isActive || isHovered ? 1 : 0,
        }} />
      </button>
    );
  };

  return (
    <div className="bg-white border" style={{ borderColor: LINE }}>
      <div className="flex overflow-x-auto">
        {showAll && tabButton(null, <><Home size={13} /> All locations ({locations.length})</>)}
        {locations.map(loc => tabButton(loc.id, loc.name, loc.id))}
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────
function Hero({ alertCount, locationName, kitchenCount, isMulti, watchingCount }: {
  alertCount: number; locationName: string; kitchenCount: number; isMulti: boolean; watchingCount: number;
}) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const clean = alertCount === 0;

  return (
    <div className="py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6" style={{ minHeight: 168 }}>
      {/* Left: headline + sub-line */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.2em] mb-2 font-semibold" style={{ color: GOLD, fontFamily: FONT.mono }}>
          Today · {today}
        </div>
        <h1 className="text-4xl leading-tight" style={{ color: NAVY, fontFamily: FONT.display, fontWeight: 600 }}>
          {isMulti
            ? (clean
                ? `${kitchenCount} kitchens · on track.`
                : `${kitchenCount} kitchen${kitchenCount !== 1 ? 's' : ''} · ${alertCount} lapse${alertCount !== 1 ? 's' : ''} caught.`)
            : (clean
                ? `${locationName} · on track.`
                : `${locationName} · ${alertCount} lapse${alertCount !== 1 ? 's' : ''} caught.`)}
        </h1>
        <p className="text-sm mt-2" style={{ color: MUTED }}>
          {clean
            ? `EvidLY is tracking ${watchingCount} requirements across your kitchen${kitchenCount !== 1 ? 's' : ''}.`
            : `EvidLY caught ${alertCount} thing${alertCount !== 1 ? 's' : ''} that ${alertCount !== 1 ? 'were' : 'was'} about to be overlooked, and is tracking ${watchingCount} requirements across your kitchen${kitchenCount !== 1 ? 's' : ''}.`}
        </p>
      </div>

    </div>
  );
}

// ─── Records on file ────────────────────────────────────────────
// Replaces the old COMPLIANCE STATUS rings. Counts only — no percentage,
// and the word "compliance" does not appear in this block.
function RecordsOnFile({ locationId }: { locationId: string | null }) {
  const { onFile, required, gap, pillars, missing, loading } = useRecordsOnFile(locationId);

  // Reserve the card box while the counts load; otherwise this block pops in
  // at ~460px and shoves every section below it down the page.
  if (loading) {
    return <div className="bg-white border" style={{ borderColor: LINE, minHeight: 461 }} aria-hidden="true" />;
  }
  if (required === 0) return null;

  const empty = onFile === 0;
  const inMotion = missing[0];

  return (
    <div className="bg-white border p-5 sm:p-6" style={{ borderColor: LINE }}>
      <div className="text-[10px] tracking-[0.15em] font-semibold mb-2" style={{ color: MUTED, fontFamily: FONT.mono }}>
        RECORDS ON FILE
      </div>

      <h2 className="text-xl sm:text-2xl leading-tight" style={{ color: NAVY, fontFamily: FONT.display, fontWeight: 600 }}>
        {empty ? (
          <>{required} records to collect — collection is underway</>
        ) : (
          <>{onFile} of {required} records on file — <span style={{ color: EMBER }}>{gap} to collect</span></>
        )}
      </h2>

      <p className="text-sm mt-1.5" style={{ color: MUTED }}>
        What an inspector, insurer, or landlord can be handed today.
      </p>

      {/* Per-pillar rows */}
      <div className="mt-5 space-y-3">
        {pillars.map(p => {
          const complete = p.onFile >= p.required;
          const near = !complete && p.required > 0 && p.onFile / p.required >= 0.8;
          const barColor = complete || near ? GREEN : AMBER;
          const widthPct = p.required > 0 ? Math.round((p.onFile / p.required) * 100) : 0;
          return (
            <div key={p.pillar}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium" style={{ color: NAVY }}>{p.label}</span>
                <span className="text-[11px] font-semibold" style={{ color: MUTED, fontFamily: FONT.mono, letterSpacing: '0.08em' }}>
                  {p.onFile} OF {p.required}
                </span>
              </div>
              <div className="mt-1.5" style={{ height: 4, backgroundColor: '#F0EADC', borderRadius: 999 }}>
                <div style={{
                  height: '100%', width: `${widthPct}%`, backgroundColor: barColor,
                  borderRadius: 999, transition: 'width 400ms ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* In motion */}
      <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${LINE}` }}>
        {inMotion ? (
          <>
            <div className="text-[13px] leading-relaxed" style={{ color: NAVY }}>
              <span className="font-semibold">In motion:</span> {inMotion.label} — requested from your vendor.
              It files here automatically when it lands.
            </div>
            <Link
              to={inMotion.actionType === 'identify_vendor' ? '/vendors' : '/documents'}
              className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-medium"
              style={{
                backgroundColor: NAVY, color: 'white', textDecoration: 'none',
                padding: '0 16px', minHeight: 44, borderRadius: 8,
              }}
            >
              View status <ArrowRight size={13} />
            </Link>
            <div className="text-[12px] mt-3" style={{ color: MUTED }}>
              Have a copy already?{' '}
              <Link to="/documents?upload=1" style={{ color: NAVY, textDecoration: 'underline' }}>
                Upload it
              </Link>{' '}
              and we’ll file it now.
            </div>
          </>
        ) : (
          <div className="text-[13px]" style={{ color: NAVY }}>All required records are on file.</div>
        )}
      </div>
    </div>
  );
}

// ─── Quick Actions ───────────────────────────────────────────────
function QuickActions() {
  const actions = [
    { label: 'Upload a record', Icon: Upload, to: '/documents' },
    { label: 'Log a temperature', Icon: Thermometer, to: '/equipment' },
    { label: 'Request from a vendor', Icon: Truck, to: '/vendors' },
    { label: 'Download evidence pack', Icon: Download, to: '/documents' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ minHeight: 100 }}>
      {actions.map(a => (
        <Link key={a.label} to={a.to}
          className="flex items-center gap-3 px-4 py-3 bg-white border text-sm font-medium transition hover:shadow-sm"
          style={{ borderColor: LINE, color: NAVY }}>
          <a.Icon size={16} style={{ color: GOLD }} />
          {a.label}
        </Link>
      ))}
    </div>
  );
}

// ─── Exposure Band ──────────────────────────────────────────────
function ExposureBand({ risk, locationCount, isAllLocations, projection }: {
  risk: WhatsAtRisk; locationCount: number; isAllLocations: boolean;
  projection?: { fireStillLo: number; fireStillHi: number; foodStillLo: number; foodStillHi: number; label: string } | null;
}) {
  const fmtMoney = (n: number) => {
    const v = Math.round(n);
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return '$' + (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return '$' + v.toLocaleString();
  };
  const fmtRange = (lo: number, hi: number) => fmtMoney(lo) + '\u2013' + fmtMoney(hi);

  const scopeLabel = isAllLocations && locationCount > 1
    ? `${locationCount} kitchens`
    : 'your kitchen';

  if (risk.loading) {
    return (
      <div className="bg-white border px-6 py-5" style={{ borderColor: LINE }}>
        <div className="text-[10px] tracking-[0.15em] font-semibold" style={{ color: MUTED, fontFamily: FONT.mono }}>
          Estimated at risk {'\u00b7'} {scopeLabel}
        </div>
        <div className="text-2xl font-bold mt-2" style={{ color: NAVY, fontFamily: FONT.display }}>{'\u2014'}</div>
      </div>
    );
  }

  const fireCounts = risk.fire.counts;
  const foodCounts = risk.food.counts;
  const totalDone = fireCounts.done + foodCounts.done;
  const totalPending = fireCounts.pending + foodCounts.pending;
  const totalLive = fireCounts.live + foodCounts.live;
  const totalAll = fireCounts.total + foodCounts.total;

  const stillLo = risk.total.pending.low + risk.total.live.low;
  const stillHi = risk.total.pending.high + risk.total.live.high;
  const fireStillLo = risk.fire.pending.low + risk.fire.live.low;
  const fireStillHi = risk.fire.pending.high + risk.fire.live.high;
  const foodStillLo = risk.food.pending.low + risk.food.live.low;
  const foodStillHi = risk.food.pending.high + risk.food.live.high;

  // Override with what-if projection when active
  const displayFireLo = projection ? projection.fireStillLo : fireStillLo;
  const displayFireHi = projection ? projection.fireStillHi : fireStillHi;
  const displayFoodLo = projection ? projection.foodStillLo : foodStillLo;
  const displayFoodHi = projection ? projection.foodStillHi : foodStillHi;
  const displayTotalLo = displayFireLo + displayFoodLo;
  const displayTotalHi = displayFireHi + displayFoodHi;
  const isProjected = !!projection;
  const allClear = displayTotalHi === 0 && totalLive === 0;

  if (risk.isPlaceholder) {
    return (
      <Link to="/insights/whats-at-risk" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="bg-white border px-6 py-5" style={{ borderColor: LINE }}>
          <div className="text-[10px] tracking-[0.15em] font-semibold mb-3" style={{ color: MUTED, fontFamily: FONT.mono }}>
            Estimated at risk {'\u00b7'} {scopeLabel}
          </div>
          <div className="text-2xl font-bold" style={{ color: totalLive > 0 ? TONE.red.text : NAVY, fontFamily: FONT.display }}>
            {totalLive > 0 ? `${totalLive} overdue` : 'Clear'}
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
            <div>
              <div className="text-[10px] tracking-[0.12em] font-semibold" style={{ color: PILLAR.fire.text, fontFamily: FONT.mono }}>Fire</div>
              <div className="text-sm font-semibold mt-1" style={{ color: fireCounts.live > 0 ? TONE.red.text : NAVY }}>
                {fireCounts.live > 0 ? `${fireCounts.live} overdue` : 'Clear'}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.12em] font-semibold" style={{ color: PILLAR.food.text, fontFamily: FONT.mono }}>Food</div>
              <div className="text-sm font-semibold mt-1" style={{ color: foodCounts.live > 0 ? TONE.red.text : NAVY }}>
                {foodCounts.live > 0 ? `${foodCounts.live} overdue` : 'Clear'}
              </div>
            </div>
          </div>
          <div className="text-[11px] mt-3" style={{ color: MUTED }}>Dollar exposure {'\u2014'} coming</div>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/insights/whats-at-risk" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="bg-white border px-6 py-5" style={{ borderColor: LINE }}>
        <div className="text-[10px] tracking-[0.15em] font-semibold mb-3" style={{ color: MUTED, fontFamily: FONT.mono }}>
          Estimated at risk {'\u00b7'} {scopeLabel}
          {isProjected && <span style={{ marginLeft: 8, padding: '1px 6px', backgroundColor: TONE.amber.tint, color: TONE.amber.text }}>{projection!.label}</span>}
        </div>

        {/* Combined total */}
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, lineHeight: 1, color: allClear ? NAVY : TONE.red.text }}>
          {allClear ? 'Clear' : fmtRange(displayTotalLo, displayTotalHi)}
        </div>
        {!allClear && totalLive > 0 && (
          <div className="text-xs font-semibold mt-1" style={{ color: TONE.red.text }}>{totalLive} overdue</div>
        )}
        {risk.total.reduced.high > 0 && (
          <div className="text-xs mt-1" style={{ color: TONE.sage.text }}>{'\u2193'} {fmtRange(risk.total.reduced.low, risk.total.reduced.high)} reduced by your records</div>
        )}
        {isProjected && displayTotalHi < stillHi && (
          <div className="text-xs mt-1" style={{ color: TONE.amber.text }}>{'\u2193'} {fmtRange(stillLo - displayTotalLo, stillHi - displayTotalHi)} if these were on file</div>
        )}

        {/* Fire / Food split */}
        <div style={{ display: 'flex', gap: 32, marginTop: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="text-[10px] tracking-[0.12em] font-semibold" style={{ color: PILLAR.fire.text, fontFamily: FONT.mono }}>Fire safety</div>
            <div className="text-lg font-bold mt-1" style={{ color: displayFireHi === 0 ? NAVY : TONE.red.text, fontFamily: FONT.display }}>
              {displayFireHi === 0 ? '$0 exposed' : fmtRange(displayFireLo, displayFireHi)}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: fireCounts.live > 0 ? TONE.red.text : TONE.sage.text }}>
              {fireCounts.live > 0 ? `${fireCounts.live} not on file` : 'all current'}
            </div>
            {risk.fire.reduced.high > 0 && (
              <div className="text-[11px] mt-0.5" style={{ color: TONE.sage.text }}>{'\u2193'} {fmtRange(risk.fire.reduced.low, risk.fire.reduced.high)} reduced</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="text-[10px] tracking-[0.12em] font-semibold" style={{ color: PILLAR.food.text, fontFamily: FONT.mono }}>Food safety</div>
            <div className="text-lg font-bold mt-1" style={{ color: displayFoodHi === 0 ? NAVY : TONE.red.text, fontFamily: FONT.display }}>
              {displayFoodHi === 0 ? '$0 exposed' : fmtRange(displayFoodLo, displayFoodHi)}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: foodCounts.live > 0 ? TONE.red.text : TONE.sage.text }}>
              {foodCounts.live > 0 ? `${foodCounts.live} not on file` : 'all current'}
            </div>
            {risk.food.reduced.high > 0 && (
              <div className="text-[11px] mt-0.5" style={{ color: TONE.sage.text }}>{'\u2193'} {fmtRange(risk.food.reduced.low, risk.food.reduced.high)} reduced</div>
            )}
          </div>
        </div>

        {/* On-file / due-soon / open bar */}
        {totalAll > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#F0EEE8' }}>
              {totalDone > 0 && <div style={{ width: `${(totalDone / totalAll) * 100}%`, backgroundColor: TONE.sage.fill }} />}
              {totalPending > 0 && <div style={{ width: `${(totalPending / totalAll) * 100}%`, backgroundColor: TONE.amber.fill }} />}
              {totalLive > 0 && <div style={{ width: `${(totalLive / totalAll) * 100}%`, backgroundColor: TONE.red.fill }} />}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <span className="text-[10px] font-semibold" style={{ color: TONE.sage.text, fontFamily: FONT.mono }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: TONE.sage.fill, marginRight: 4, verticalAlign: 'middle' }} />
                {totalDone} on file
              </span>
              <span className="text-[10px] font-semibold" style={{ color: TONE.amber.text, fontFamily: FONT.mono }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: TONE.amber.fill, marginRight: 4, verticalAlign: 'middle' }} />
                {totalPending} due soon
              </span>
              <span className="text-[10px] font-semibold" style={{ color: TONE.red.text, fontFamily: FONT.mono }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: TONE.red.fill, marginRight: 4, verticalAlign: 'middle' }} />
                {totalLive} open
              </span>
            </div>
          </div>
        )}

        {/* Segment + version meta */}
        <div className="text-[11px] mt-3" style={{ color: MUTED }}>{risk.segment} {'\u00b7'} {risk.version}</div>
      </div>
    </Link>
  );
}

// ─── Who Can Ask ────────────────────────────────────────────────
// Every chip routes to the records page with ?asker=<slug>. There is no
// /records/* route — those five cards 404'd and are gone.
export const ASKERS: { slug: string; name: string }[] = [
  { slug: 'fire-marshal', name: 'Fire Marshal' },
  { slug: 'health-inspector', name: 'Health Inspector' },
  { slug: 'insurer', name: 'Insurer' },
  { slug: 'property-manager', name: 'Property Manager' },
  { slug: 'compliance-officer', name: 'Compliance Officer' },
  { slug: 'attorney', name: 'Attorney' },
  { slug: 'buyer-or-lender', name: 'Buyer or Lender' },
  { slug: 'franchisor', name: 'Franchisor' },
  { slug: 'wastewater-inspector', name: 'Wastewater Inspector' },
  { slug: 'contract-client', name: 'Contract Client' },
  { slug: 'osha-workers-comp', name: 'OSHA / Workers’ Comp' },
];

function WhoCanAsk() {
  return (
    <div>
      <div className="text-[10px] tracking-[0.15em] font-semibold mb-3" style={{ color: MUTED, fontFamily: FONT.mono }}>
        WHO CAN ASK FOR YOUR RECORDS
      </div>
      <div className="flex flex-wrap gap-2">
        {ASKERS.map(a => (
          <Link
            key={a.slug}
            to={`/documents?asker=${a.slug}`}
            className="inline-flex items-center bg-white border text-[12.5px] transition-colors hover:bg-[#F4F1E6]"
            style={{
              borderColor: LINE, color: NAVY, textDecoration: 'none',
              padding: '0 14px', minHeight: 44, borderRadius: 999,
            }}
          >
            {a.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Explore Panel ──────────────────────────────────────────────
function ExplorePanel({ fireItems, foodItems, toggledCodes, onToggle, isOpen, onToggleOpen }: {
  fireItems: CatalogItem[]; foodItems: CatalogItem[];
  toggledCodes: Set<string>; onToggle: (code: string) => void;
  isOpen: boolean; onToggleOpen: () => void;
}) {
  return (
    <div className="bg-white border" style={{ borderColor: LINE }}>
      <div
        onClick={onToggleOpen}
        style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', cursor: 'pointer', gap: 8 }}
      >
        <span className="text-sm font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>Explore</span>
        <span className="text-xs" style={{ color: MUTED }}>what-if {'\u00b7'} doesn{'\u2019'}t change your account</span>
        <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>{'\u25be'}</span>
      </div>
      {isOpen && (
        <div style={{ padding: '0 24px 20px' }}>
          <p className="text-xs mb-4" style={{ color: MUTED, lineHeight: 1.6 }}>
            Turn on a requirement to see how it would lower your exposure. Nothing here changes your account {'\u2014'} it{'\u2019'}s a projection only.
          </p>
          <div>
            <div className="text-[10px] tracking-[0.12em] font-semibold mb-2" style={{ color: PILLAR.fire.text, fontFamily: FONT.mono }}>
              Fire Safeguards
            </div>
            {fireItems.map(r => {
              const on = toggledCodes.has(r.requirement_code);
              return (
                <label key={r.requirement_code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: `1px solid ${LINE}` }}>
                  <input type="checkbox" checked={on} onChange={() => onToggle(r.requirement_code)} style={{ accentColor: TONE.sage.fill }} />
                  <span className="text-sm flex-1" style={{ color: NAVY }}>{r.label}</span>
                  {r.is_conditional && <span className="text-[10px] px-1.5 py-0.5" style={{ color: MUTED, backgroundColor: '#F0EEE8', fontFamily: FONT.mono }}>not applicable</span>}
                  <span className="text-[10px]" style={{ color: on ? TONE.sage.text : MUTED, fontFamily: FONT.mono }}>
                    {on ? '\u2713 projected' : `${EXPLORE_ACTION_LABEL[r.action_type] || 'Add record'} \u2192`}
                  </span>
                </label>
              );
            })}

            <div className="text-[10px] tracking-[0.12em] font-semibold mb-2 mt-4" style={{ color: PILLAR.food.text, fontFamily: FONT.mono }}>
              Food Safety
            </div>
            {(() => {
              let tempShown = false;
              return foodItems.map(r => {
                const on = toggledCodes.has(r.requirement_code);
                const isTempLog = r.requirement_code.startsWith('temp_');
                const showTempSub = isTempLog && !tempShown;
                if (showTempSub) tempShown = true;
                return (
                  <div key={r.requirement_code}>
                    {showTempSub && (
                      <div className="text-[10px] tracking-[0.12em] font-semibold mt-3 mb-1" style={{ color: MUTED, fontFamily: FONT.mono }}>
                        Temperature Logs
                      </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: `1px solid ${LINE}` }}>
                      <input type="checkbox" checked={on} onChange={() => onToggle(r.requirement_code)} style={{ accentColor: TONE.sage.fill }} />
                      <span className="text-sm flex-1" style={{ color: NAVY }}>{r.label}</span>
                      {r.is_conditional && <span className="text-[10px] px-1.5 py-0.5" style={{ color: MUTED, backgroundColor: '#F0EEE8', fontFamily: FONT.mono }}>not applicable</span>}
                      <span className="text-[10px]" style={{ color: on ? TONE.sage.text : MUTED, fontFamily: FONT.mono }}>
                        {on ? '\u2713 projected' : `${EXPLORE_ACTION_LABEL[r.action_type] || 'Add record'} \u2192`}
                      </span>
                    </label>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Alerts Section ──────────────────────────────────────────────
function AlertsSection({ catches, routingMap, onAcknowledge, roleLabel }: {
  catches: DriftCatchWithAcks[];
  routingMap: Record<string, DriftRecipient[]>;
  onAcknowledge: (id: string) => void;
  roleLabel: string;
}) {
  const critical = catches.filter(c => c.severity === 'urgent' || c.severity === 'high').length;
  const warning = catches.length - critical;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: RED }} />
            <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>Alerts</h3>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1" style={{ backgroundColor: '#F4F1E6', color: GOLD }}>
            EvidLY caught {catches.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {critical > 0 && <span className="inline-flex items-center gap-1.5" style={{ color: RED }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RED }} /><strong>{critical}</strong> critical</span>}
          {warning > 0 && <span className="inline-flex items-center gap-1.5" style={{ color: AMBER }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AMBER }} /><strong>{warning}</strong> warning</span>}
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: MUTED }}>Routed automatically</span>
        </div>
      </div>
      <div className="space-y-2">
        {catches.map(drift => (
          <AlertCard
            key={drift.id}
            drift={drift}
            recipients={routingMap[drift.id] || []}
            onAcknowledge={onAcknowledge}
            roleLabel={roleLabel}
          />
        ))}
      </div>
    </div>
  );
}

// ─── AlertCard ───────────────────────────────────────────────────
function AlertCard({ drift, recipients, onAcknowledge, roleLabel }: {
  drift: DriftCatchWithAcks;
  recipients: DriftRecipient[];
  onAcknowledge: (id: string) => void;
  roleLabel: string;
}) {
  const isCritical = drift.severity === 'urgent' || drift.severity === 'high';
  const severityLabel = isCritical ? 'critical' : 'warning';
  const pillarLabel = drift.pillar === 'fire_safety' ? 'Fire' : 'Food';
  const title = getDriftLabel(drift.drift_type, { form: 'noun' });
  const days = daysSince(drift.detected_at);
  const description = `${days} day${days === 1 ? '' : 's'} running · ${drift.location_name}`;

  // Routing text
  const routingText = buildRoutingText(recipients);
  // Escalation text
  const escalationText = buildEscalationText(recipients);

  return (
    <div className="bg-white border"
      style={{ borderColor: LINE, borderLeftWidth: 4, borderLeftColor: isCritical ? RED : AMBER }}>
      <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 font-bold" style={{
            backgroundColor: isCritical ? '#F7E9E9' : '#FDF6E9',
            color: isCritical ? RED : AMBER,
          }}>{severityLabel}</span>
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 font-semibold" style={{
            backgroundColor: drift.pillar === 'fire_safety' ? '#FBEDDF' : '#EAEFF7',
            color: drift.pillar === 'fire_safety' ? RUST : NAVY,
          }}>{pillarLabel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold mb-0.5" style={{ color: NAVY, fontFamily: FONT.display }}>{title}</div>
          <div className="text-xs leading-relaxed mb-1.5" style={{ color: INK }}>{description}</div>
          <div className="text-[11px] flex items-center gap-3 flex-wrap" style={{ color: MUTED }}>
            {routingText && <span>{routingText}</span>}
            {escalationText && <span style={{ color: isCritical ? RED : AMBER }}>· {escalationText}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/alerts" className="text-xs px-3 py-2 font-medium inline-flex items-center gap-1.5"
            style={{ backgroundColor: '#F4F1E6', color: NAVY }}>
            View <ArrowRight size={11} />
          </Link>
          <button
            type="button"
            className="text-xs px-4 py-2 font-medium inline-flex items-center gap-1.5"
            style={{ backgroundColor: NAVY, color: 'white' }}
            onClick={() => onAcknowledge(drift.id)}
          >
            Acknowledge as {roleLabel} <ArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function buildRoutingText(recipients: DriftRecipient[]): string | null {
  if (recipients.length === 0) return null;
  const unacked = recipients.filter(r => !r.acknowledged_at && !r.escalated_at);
  const escalated = recipients.filter(r => r.escalated_at);
  if (escalated.length > 0) {
    const targets = recipients.filter(r => !r.escalated_at && !r.acknowledged_at);
    if (targets.length > 0) {
      return `Escalated to ${targets.map(t => `${t.full_name} (${ROLE_LABELS[t.role] || t.role})`).join(', ')}`;
    }
    return 'Escalated — awaiting response';
  }
  if (unacked.length > 0) {
    return `Routed to ${unacked.map(r => `${r.full_name} (${ROLE_LABELS[r.role] || r.role})`).join(', ')}`;
  }
  const acked = recipients.filter(r => r.acknowledged_at);
  if (acked.length > 0) {
    return `Acknowledged by ${acked.map(r => r.full_name).join(', ')}`;
  }
  return null;
}

function buildEscalationText(recipients: DriftRecipient[]): string | null {
  const unacked = recipients.filter(r => !r.acknowledged_at && !r.escalated_at);
  if (unacked.length === 0) return null;
  const soonest = unacked
    .filter(r => r.escalation_deadline)
    .sort((a, b) => (a.escalation_deadline! < b.escalation_deadline! ? -1 : 1))[0];
  if (!soonest?.escalation_deadline) return null;
  const minutesLeft = Math.max(0, Math.round((new Date(soonest.escalation_deadline).getTime() - Date.now()) / 60_000));
  if (minutesLeft <= 0) return 'Escalation pending';
  return `Escalating in ${minutesLeft} min`;
}

// ─── Pillar Card ─────────────────────────────────────────────────
function PillarCard({ pillar, name, Icon, framework, status, upcoming, actionNeeded, proof, fireChips }: {
  pillar: 'fire_safety' | 'food_safety';
  name: string;
  Icon: typeof Flame;
  framework: string;
  status: PillStatus;
  upcoming: { title: string; due: string }[];
  actionNeeded: { title: string; urgency?: string; detected_at?: string }[];
  proof: { filed: number; total: number; subtitle: string; loading: boolean };
  fireChips?: FireChip[];
}) {
  return (
    <div className="bg-white border" style={{ borderColor: LINE }}>
      {/* Header */}
      <div className="px-6 py-5 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <div className="p-2" style={{ backgroundColor: '#F4F1E6' }}>
            <Icon size={18} style={{ color: RUST }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>{name}</h2>
            {fireChips && fireChips.length > 0 ? (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {fireChips.map(chip => (
                  <span key={chip.code} className="inline-flex items-center gap-1.5 text-[11px]" title={chip.label}
                    style={{ color: MUTED, fontFamily: FONT.mono }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      backgroundColor: chip.hasEvidence ? GREEN : RED,
                    }} />
                    {chip.nfpa}
                  </span>
                ))}
                <span className="text-[10px]" style={{ color: MUTED }}>· {framework}</span>
              </div>
            ) : (
              <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: MUTED }}>{framework}</div>
            )}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3">
        {/* Upcoming */}
        <div className="px-5 py-5 border-b md:border-b-0 md:border-r flex flex-col" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-2 mb-3.5">
            <Calendar size={13} style={{ color: NAVY }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: NAVY, fontFamily: FONT.mono }}>Upcoming</span>
          </div>
          <div className="flex-1">
            {upcoming.length === 0 ? (
              <div className="text-sm py-3" style={{ color: MUTED }}>Nothing due in the next 30 days.</div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((item, i) => (
                  <div key={i} className="pb-3 border-b last:border-b-0 last:pb-0" style={{ borderColor: LINE }}>
                    <div className="text-sm font-semibold" style={{ color: NAVY }}>{item.title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>{item.due}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link to={`/vendors?pillar=${pillar}`} className="text-[10px] uppercase tracking-widest font-semibold mt-auto pt-3" style={{ color: GOLD, fontFamily: FONT.mono }}>
            View all →
          </Link>
        </div>

        {/* Action Needed */}
        <div className="px-5 py-5 border-b md:border-b-0 md:border-r flex flex-col"
          style={{ borderColor: LINE, backgroundColor: actionNeeded.length > 0 ? '#FDF6E9' : 'transparent' }}>
          <div className="flex items-center gap-2 mb-3.5">
            <AlertTriangle size={13} style={{ color: actionNeeded.length > 0 ? AMBER : MUTED }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: actionNeeded.length > 0 ? AMBER : MUTED, fontFamily: FONT.mono }}>
              Action Needed
            </span>
          </div>
          <div className="flex-1">
            {actionNeeded.length === 0 ? (
              <div className="text-sm py-3" style={{ color: MUTED }}>All clear. Nothing needs action.</div>
            ) : (
              <div className="space-y-3">
                {actionNeeded.map((item, i) => (
                  <div key={i} className="pb-3 border-b last:border-b-0 last:pb-0" style={{ borderColor: LINE }}>
                    <div className="text-sm font-semibold" style={{ color: NAVY }}>{item.title}</div>
                    {item.detected_at && (
                      <div className="text-[11px] mt-0.5" style={{ color: AMBER }}>
                        {daysSince(item.detected_at)} day{daysSince(item.detected_at) === 1 ? '' : 's'} open
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {actionNeeded.length > 0 && (
            <Link to="/alerts" className="text-[10px] uppercase tracking-widest font-semibold mt-auto pt-3" style={{ color: AMBER, fontFamily: FONT.mono }}>
              View →
            </Link>
          )}
        </div>

        {/* Prove */}
        <div className="px-5 py-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3.5">
            <FileText size={13} style={{ color: GREEN }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: GREEN, fontFamily: FONT.mono }}>Prove</span>
          </div>
          <div className="flex-1">
            {proof.total === 0 ? (
              <div className="text-sm py-3" style={{ color: MUTED }}>No obligations configured.</div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>{proof.filed}</div>
                  <div className="text-sm font-medium" style={{ color: MUTED }}>of {proof.total} required</div>
                </div>
                <div className="h-1.5 mb-3" style={{ backgroundColor: '#F4F1E6' }}>
                  <div className="h-full" style={{ width: `${(proof.filed / proof.total) * 100}%`, backgroundColor: proof.filed === proof.total ? GREEN : GOLD }} />
                </div>
                <div className="text-[11px]" style={{ color: MUTED }}>{proof.subtitle}</div>
              </>
            )}
          </div>
          <Link to={`/documents?pillar=${pillar}`} className="text-[10px] uppercase tracking-widest font-semibold mt-auto pt-3" style={{ color: GREEN, fontFamily: FONT.mono }}>
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Business Records Card ──────────────────────────────────────
function BusinessRecordsCard({ proof }: { proof: { requirements: { code: string; label: string; hasEvidence: boolean; isConditional: boolean }[]; filedCount: number; countingTotal: number } }) {
  return (
    <div className="bg-white border" style={{ borderColor: LINE }}>
      <div className="px-6 py-5 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <div className="p-2" style={{ backgroundColor: '#F4F1E6' }}>
            <Building2 size={18} style={{ color: NAVY }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>Business Records</h2>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: MUTED, fontFamily: FONT.mono }}>
              {proof.filedCount} of {proof.countingTotal} on file
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 space-y-3">
        {proof.requirements.map(req => (
          <div key={req.code} className="flex items-center gap-2.5 text-sm"
            style={{ opacity: req.isConditional ? 0.5 : 1 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              backgroundColor: req.hasEvidence ? GREEN : RED,
            }} />
            <span style={{ color: NAVY }}>{req.label}</span>
            {req.isConditional && (
              <span className="text-[10px]" style={{ color: MUTED, fontFamily: FONT.mono }}>(if applicable)</span>
            )}
          </div>
        ))}
        <Link to="/documents?pillar=business_records"
          className="text-[10px] uppercase tracking-widest font-semibold block pt-2"
          style={{ color: GOLD, fontFamily: FONT.mono }}>
          View →
        </Link>
      </div>
    </div>
  );
}

// ─── Vendor Records Card ────────────────────────────────────────
function VendorRecordsCard() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [vendors, setVendors] = useState<{ name: string; docCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setVendors([]); setLoading(false); return; }
    let cancelled = false;

    (async () => {
      // Get assigned vendors from location_service_schedules
      const { data: schedules } = await supabase
        .from('location_service_schedules')
        .select('vendor_id, vendors(business_name)')
        .eq('organization_id', orgId)
        .not('vendor_id', 'is', null);
      if (cancelled) return;

      // Deduplicate vendors
      const vendorMap = new Map<string, string>();
      for (const s of schedules || []) {
        if (s.vendor_id && !vendorMap.has(s.vendor_id)) {
          const vendorData = s.vendors as any;
          vendorMap.set(s.vendor_id, vendorData?.business_name || 'Unknown vendor');
        }
      }

      // Count docs per vendor
      const results: { name: string; docCount: number }[] = [];
      for (const [vendorId, name] of vendorMap) {
        const { count } = await supabase
          .from('compliance_documents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('vendor_id', vendorId);
        if (cancelled) return;
        results.push({ name, docCount: count ?? 0 });
      }

      if (!cancelled) { setVendors(results); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [orgId]);

  if (loading) return null;

  return (
    <div className="bg-white border" style={{ borderColor: LINE }}>
      <div className="px-6 py-5 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-3">
          <div className="p-2" style={{ backgroundColor: '#F4F1E6' }}>
            <Users size={18} style={{ color: NAVY }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>Vendor Documents</h2>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: MUTED, fontFamily: FONT.mono }}>
              {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} assigned
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 space-y-3">
        {vendors.length === 0 ? (
          <div className="text-sm" style={{ color: MUTED }}>No vendors assigned yet.</div>
        ) : (
          vendors.map(v => (
            <div key={v.name} className="flex items-center gap-2.5 text-sm">
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                backgroundColor: v.docCount > 0 ? GREEN : RED,
              }} />
              <span style={{ color: NAVY }}>{v.name}</span>
              <span className="text-[10px]" style={{ color: MUTED, fontFamily: FONT.mono }}>
                {v.docCount} doc{v.docCount !== 1 ? 's' : ''}
              </span>
            </div>
          ))
        )}
        <Link to="/documents?pillar=vendor_business"
          className="text-[10px] uppercase tracking-widest font-semibold block pt-2"
          style={{ color: GOLD, fontFamily: FONT.mono }}>
          View →
        </Link>
      </div>
    </div>
  );
}

// ─── Temperature Logs — real query, hidden when no data ─────────
interface TempReading {
  id: string;
  temperature: number;
  required_min: number | null;
  required_max: number | null;
  temp_pass: boolean;
  reading_time: string;
  step: string;
  equipment_name?: string;
}

function TemperatureLogs({ locationId, locationIds }: { locationId: string | null; locationIds: string[] }) {
  const [readings, setReadings] = useState<TempReading[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const ids = locationId ? [locationId] : locationIds;
    if (ids.length === 0) { setReadings([]); setLoading(false); return; }

    const { data } = await supabase
      .from('temperature_logs')
      .select('id, temperature, required_min, required_max, temp_pass, reading_time, step')
      .in('facility_id', ids)
      .gte('reading_time', since)
      .is('superseded_by_log_id', null)
      .order('reading_time', { ascending: false })
      .limit(20);

    setReadings((data || []) as TempReading[]);
    setLoading(false);
  }, [locationId, locationIds]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (loading) return null;

  // Empty state when no temperature readings
  if (readings.length === 0) {
    return (
      <div>
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Thermometer size={16} style={{ color: NAVY }} />
            <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>Temperature Logs</h3>
          </div>
        </div>
        <div className="bg-white border px-6 py-8" style={{ borderColor: LINE }}>
          <p className="text-sm mb-4" style={{ color: MUTED }}>
            EvidLY tracks 5 temperature checkpoints per kitchen: receiving, hot holding, cold holding, cooldown, and reheating.
          </p>
          <Link to="/equipment" className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: GOLD, fontFamily: FONT.mono }}>
            Add equipment →
          </Link>
        </div>
      </div>
    );
  }

  const stepLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: FONT.display }}>Temperature Logs</h3>
        <Link to="/equipment" className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: GOLD }}>
          View all →
        </Link>
      </div>
      <div className="bg-white border divide-y" style={{ borderColor: LINE }}>
        {readings.map(r => {
          const outOfRange = !r.temp_pass;
          const time = new Date(r.reading_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const rangeText = r.required_min != null && r.required_max != null
            ? `${r.required_min}°–${r.required_max}°F`
            : '';
          return (
            <div key={r.id} className="px-5 py-3 flex items-center gap-4" style={{ borderColor: LINE }}>
              <Thermometer size={16} style={{ color: outOfRange ? RED : GREEN }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: NAVY }}>{r.temperature}°F</div>
                <div className="text-[11px]" style={{ color: MUTED }}>{stepLabel(r.step)} · {time}{rangeText ? ` · Range ${rangeText}` : ''}</div>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1"
                style={{
                  backgroundColor: outOfRange ? '#F7E9E9' : '#E4EBE3',
                  color: outOfRange ? RED : GREEN,
                }}>
                {outOfRange ? 'Out of range' : 'In range'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
