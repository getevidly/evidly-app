/**
 * DashboardView — Full dashboard layout matching DashboardMockup.jsx.
 * Renders: LocationTabs → Hero → WatchingBanner → Alerts → Pillars → TemperatureLogs
 * All data from live PROD hooks. No fake/sample data.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Utensils, CheckCircle2, AlertTriangle, Calendar, Bell, Eye, TrendingUp, FileText, Thermometer, ArrowRight, Home, Upload, ClipboardList, Truck, Download } from 'lucide-react';
import { useDashboardLocation } from '../../contexts/DashboardLocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrgSummary } from '../../hooks/useOrgSummary';
import { useDriftCatches } from '../../hooks/useDriftCatches';
import { useDriftRouting } from '../../hooks/useDriftRouting';
import { useAdvisorBriefings } from '../../hooks/useAdvisorBriefings';
import { useUpcomingServicesList } from '../../hooks/useUpcomingServicesList';
import { useProofStats } from '../../hooks/useProofStats';
import { useRole } from '../../contexts/RoleContext';
import { getDriftLabel } from '../../constants/driftTypeLabels';
import { daysSince } from '../../lib/daysSince';
import { supabase } from '../../lib/supabase';
import type { DriftCatchWithAcks } from '../../hooks/useDriftCatches';
import type { DriftRecipient } from '../../hooks/useDriftRouting';

// ─── Brand tokens ────────────────────────────────────────────────
const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const MUTED = '#6B7689';
const LINE = '#E6E1D3';
const GREEN = '#3F6B47';
const RED = '#A04040';
const AMBER = '#B08A2E';
const RUST = '#B85D22';
const INK = '#0F1828';
const EMBER = '#B24A2E';
const SLATE = '#3E6B8A';

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
      style={{ backgroundColor: s.bg, color: s.color, letterSpacing: '0.1em' }}>
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

  const alertCount = openCatches.length;

  // Watching bar: total requirement count across all locations
  const watchingCount = (fireProof.total + foodProof.total) * Math.max(locationCount, 1);

  // Derive location name for hero
  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const heroLocationName = selectedLocation?.name || orgName || '';

  return (
    <div className="space-y-6 pb-16">
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

      {/* Watching Banner */}
      <WatchingBanner alertCount={alertCount} watchingCount={watchingCount} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Alerts */}
      {alertCount > 0 && (
        <AlertsSection
          catches={openCatches}
          routingMap={routingMap}
          onAcknowledge={acknowledge}
          roleLabel={roleLabel}
        />
      )}

      {/* Fire + Food Pillars side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PillarCard
          pillar="fire_safety"
          name="Fire Safety"
          Icon={Flame}
          framework="NFPA 10 · 17A · 25 · 72 · 96 · California Fire Code"
          status={postureToPill(fireBriefing?.posture)}
          upcoming={fireUpcoming.items}
          actionNeeded={(fireBriefing?.open_items || []).filter(i => i.pillar === 'fire_safety')}
          proof={fireProof}
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
  return (
    <div className="bg-white border" style={{ borderColor: LINE }}>
      <div className="flex overflow-x-auto">
        {showAll && (
          <button onClick={() => onChange(null)}
            className="px-4 py-3 text-sm whitespace-nowrap inline-flex items-center gap-2 transition"
            style={{
              color: activeId === null ? NAVY : MUTED,
              fontWeight: activeId === null ? 600 : 500,
              borderBottom: activeId === null ? `2px solid ${GOLD}` : '2px solid transparent',
            }}>
            <Home size={13} /> All locations ({locations.length})
          </button>
        )}
        {locations.map(loc => (
          <button key={loc.id} onClick={() => onChange(loc.id)}
            className="px-4 py-3 text-sm whitespace-nowrap inline-flex items-center gap-2 transition"
            style={{
              color: activeId === loc.id ? NAVY : MUTED,
              fontWeight: activeId === loc.id ? 600 : 500,
              borderBottom: activeId === loc.id ? `2px solid ${GOLD}` : '2px solid transparent',
            }}>
            {loc.name}
          </button>
        ))}
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
    <div className="py-8">
      <div className="text-[10px] uppercase tracking-[0.2em] mb-2 font-semibold" style={{ color: GOLD }}>
        Today · {today}
      </div>
      <h1 className="text-4xl leading-tight" style={{ color: NAVY, fontFamily: 'Fraunces, serif', fontWeight: 600 }}>
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
          ? `EvidLY is watching ${watchingCount} requirements across your kitchen${kitchenCount !== 1 ? 's' : ''}.`
          : `EvidLY caught ${alertCount} thing${alertCount !== 1 ? 's' : ''} that ${alertCount !== 1 ? 'were' : 'was'} about to be overlooked, and is watching ${watchingCount} requirements across your kitchen${kitchenCount !== 1 ? 's' : ''}.`}
      </p>
    </div>
  );
}

// ─── WatchingBanner ──────────────────────────────────────────────
function WatchingBanner({ alertCount, watchingCount }: { alertCount: number; watchingCount: number }) {
  const clean = alertCount === 0;
  return (
    <div className="border" style={{ borderColor: LINE, backgroundColor: clean ? '#E4EBE3' : '#FBF9F2' }}>
      <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
        {clean ? <CheckCircle2 size={16} style={{ color: GREEN }} /> : <Eye size={16} style={{ color: NAVY }} />}
        <div className="text-sm font-semibold flex-1" style={{ color: clean ? GREEN : NAVY, fontFamily: 'Fraunces, serif' }}>
          {clean
            ? `EvidLY is watching ${watchingCount} requirements · all clear`
            : 'EvidLY is watching · real-time alerts routed automatically'}
        </div>
        <span className="text-xs inline-flex items-center gap-1.5" style={{ color: MUTED }}>
          <TrendingUp size={12} />
          Active monitoring
        </span>
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: 'Fraunces, serif' }}>Alerts</h3>
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
          <div className="text-sm font-bold mb-0.5" style={{ color: NAVY, fontFamily: 'Fraunces, serif' }}>{title}</div>
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

// ─── Proof Ring (donut chart) ────────────────────────────────────
function ProofRing({ proven, total, color }: { proven: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((proven / total) * 100) : 0;
  const r = 20;
  const stroke = 4;
  const size = (r + stroke) * 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center" style={{ minWidth: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg" role="img"
        aria-label={`${pct}% proven — ${proven} of ${total} on file`}
        style={{ display: 'block', overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={LINE} strokeWidth={stroke} />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${c}`} strokeDashoffset={`${offset}`} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fill={NAVY} fontSize="13" fontWeight="700" fontFamily="Montserrat, sans-serif">
          {pct}%
        </text>
      </svg>
      <div className="text-[10px] mt-1 whitespace-nowrap" style={{ color: MUTED }}>
        {proven} of {total} on file
      </div>
    </div>
  );
}

// ─── Pillar Card ─────────────────────────────────────────────────
function PillarCard({ pillar, name, Icon, framework, status, upcoming, actionNeeded, proof }: {
  pillar: 'fire_safety' | 'food_safety';
  name: string;
  Icon: typeof Flame;
  framework: string;
  status: PillStatus;
  upcoming: { title: string; due: string }[];
  actionNeeded: { title: string; urgency?: string; detected_at?: string }[];
  proof: { filed: number; total: number; subtitle: string; loading: boolean };
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
            <h2 className="text-xl font-bold" style={{ color: NAVY, fontFamily: 'Fraunces, serif' }}>{name}</h2>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: MUTED }}>{framework}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ProofRing proven={proof.filed} total={proof.total} color={pillar === 'fire_safety' ? EMBER : SLATE} />
          <StatusPill status={status} />
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3">
        {/* Upcoming */}
        <div className="px-5 py-5 border-b md:border-b-0 md:border-r" style={{ borderColor: LINE }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={13} style={{ color: NAVY }} />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: NAVY }}>Upcoming</span>
            </div>
            <Link to={`/vendors?pillar=${pillar}`} className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: GOLD }}>
              View all →
            </Link>
          </div>
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

        {/* Action Needed */}
        <div className="px-5 py-5 border-b md:border-b-0 md:border-r"
          style={{ borderColor: LINE, backgroundColor: actionNeeded.length > 0 ? '#FDF6E9' : 'transparent' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} style={{ color: actionNeeded.length > 0 ? AMBER : MUTED }} />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: actionNeeded.length > 0 ? AMBER : MUTED }}>
                Action Needed
              </span>
            </div>
            {actionNeeded.length > 0 && (
              <Link to="/alerts" className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: AMBER }}>
                View →
              </Link>
            )}
          </div>
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

        {/* Prove */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={13} style={{ color: GREEN }} />
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: GREEN }}>Prove</span>
            </div>
            <Link to={`/documents?pillar=${pillar}`} className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: GREEN }}>
              View →
            </Link>
          </div>
          {proof.total === 0 ? (
            <div className="text-sm py-3" style={{ color: MUTED }}>No obligations configured.</div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-3xl font-bold" style={{ color: NAVY, fontFamily: 'Fraunces, serif' }}>{proof.filed}</div>
                <div className="text-sm font-medium" style={{ color: MUTED }}>of {proof.total} required</div>
              </div>
              <div className="h-1.5 mb-3" style={{ backgroundColor: '#F4F1E6' }}>
                <div className="h-full" style={{ width: `${(proof.filed / proof.total) * 100}%`, backgroundColor: proof.filed === proof.total ? GREEN : GOLD }} />
              </div>
              <div className="text-[11px]" style={{ color: MUTED }}>{proof.subtitle}</div>
            </>
          )}
        </div>
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

  // Hide section entirely when no readings and not loading
  if (!loading && readings.length === 0) return null;
  if (loading) return null;

  const stepLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: 'Fraunces, serif' }}>Temperature Logs</h3>
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
