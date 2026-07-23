/**
 * DashboardView — Full dashboard layout matching DashboardMockup.jsx.
 * Renders: LocationTabs → Hero → WatchingBanner → Alerts → Pillars → TemperatureLogs
 * All data from live PROD hooks. No fake/sample data.
 */

import { Flame, Utensils, CheckCircle2, AlertTriangle, Calendar, Bell, Eye, TrendingUp, FileText, Thermometer, ArrowRight, Home } from 'lucide-react';
import { useDashboardLocation } from '../../contexts/DashboardLocationContext';
import { useOrgSummary } from '../../hooks/useOrgSummary';
import { useDriftCatches } from '../../hooks/useDriftCatches';
import { useDriftRouting } from '../../hooks/useDriftRouting';
import { useAdvisorBriefings } from '../../hooks/useAdvisorBriefings';
import { useUpcomingServicesList } from '../../hooks/useUpcomingServicesList';
import { useProofStats } from '../../hooks/useProofStats';
import { useRole } from '../../contexts/RoleContext';
import { getDriftLabel } from '../../constants/driftTypeLabels';
import { daysSince } from '../../lib/daysSince';
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

  const { catches, acknowledge } = useDriftCatches({ locationIdFilter: selectedLocationId || undefined });
  const openCatches = catches.filter(c => c.status === 'open' && !c.userHasAcked);
  const routingMap = useDriftRouting(openCatches.map(c => c.id));

  const { food_safety: foodBriefing, fire_safety: fireBriefing } = useAdvisorBriefings({ locationIdFilter: selectedLocationId || undefined });

  const fireUpcoming = useUpcomingServicesList(30, selectedLocationId || undefined, 'fire_safety');
  const foodUpcoming = useUpcomingServicesList(30, selectedLocationId || undefined, 'food_safety');

  const fireProof = useProofStats('fire_safety', selectedLocationId || undefined);
  const foodProof = useProofStats('food_safety', selectedLocationId || undefined);

  const alertCount = openCatches.length;

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
      />

      {/* Watching Banner */}
      <WatchingBanner alertCount={alertCount} />

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
          name="Fire Safety"
          Icon={Flame}
          framework="NFPA 10 · 17A · 25 · 72 · 96 · California Fire Code"
          status={postureToPill(fireBriefing?.posture)}
          upcoming={fireUpcoming.items}
          actionNeeded={(fireBriefing?.open_items || []).filter(i => i.pillar === 'fire_safety')}
          proof={fireProof}
        />
        <PillarCard
          name="Food Safety"
          Icon={Utensils}
          framework="California Retail Food Code"
          status={postureToPill(foodBriefing?.posture)}
          upcoming={foodUpcoming.items}
          actionNeeded={(foodBriefing?.open_items || []).filter(i => i.pillar === 'food_safety')}
          proof={foodProof}
        />
      </div>

      {/* Temperature Logs — empty state */}
      <TemperatureLogsEmpty />
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
function Hero({ alertCount, locationName, kitchenCount, isMulti }: {
  alertCount: number; locationName: string; kitchenCount: number; isMulti: boolean;
}) {
  const clean = alertCount === 0;
  return (
    <div className="py-8">
      <div className="text-[10px] uppercase tracking-[0.2em] mb-2 font-semibold" style={{ color: GOLD }}>Today</div>
      <h1 className="text-4xl leading-tight" style={{ color: NAVY, fontFamily: 'Fraunces, serif', fontWeight: 600 }}>
        {isMulti
          ? (clean ? `${kitchenCount} kitchens · on track.` : `${kitchenCount} kitchens · ${alertCount} alert${alertCount > 1 ? 's' : ''} caught.`)
          : (clean ? `${locationName} · on track.` : `${locationName} · ${alertCount} alert${alertCount > 1 ? 's' : ''} caught.`)}
      </h1>
      <p className="text-sm mt-2" style={{ color: MUTED }}>
        {clean
          ? "All records current. Nothing overdue. EvidLY is watching."
          : `EvidLY caught ${alertCount} thing${alertCount > 1 ? 's' : ''} that were overlooked. See below.`}
      </p>
    </div>
  );
}

// ─── WatchingBanner ──────────────────────────────────────────────
function WatchingBanner({ alertCount }: { alertCount: number }) {
  const clean = alertCount === 0;
  return (
    <div className="border" style={{ borderColor: LINE, backgroundColor: clean ? '#E4EBE3' : '#FBF9F2' }}>
      <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
        {clean ? <CheckCircle2 size={16} style={{ color: GREEN }} /> : <Eye size={16} style={{ color: NAVY }} />}
        <div className="text-sm font-semibold flex-1" style={{ color: clean ? GREEN : NAVY, fontFamily: 'Fraunces, serif' }}>
          {clean ? "EvidLY is watching · all clear" : 'EvidLY is watching · real-time alerts routed automatically'}
        </div>
        <span className="text-xs inline-flex items-center gap-1.5" style={{ color: MUTED }}>
          <TrendingUp size={12} />
          Active monitoring
        </span>
      </div>
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
        <button
          type="button"
          className="text-xs px-4 py-2 font-medium inline-flex items-center gap-1.5 flex-shrink-0"
          style={{ backgroundColor: NAVY, color: 'white' }}
          onClick={() => onAcknowledge(drift.id)}
        >
          Acknowledge as {roleLabel} <ArrowRight size={11} />
        </button>
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
function PillarCard({ name, Icon, framework, status, upcoming, actionNeeded, proof }: {
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
        <StatusPill status={status} />
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3">
        {/* Upcoming */}
        <div className="px-5 py-5 border-b md:border-b-0 md:border-r" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={13} style={{ color: NAVY }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: NAVY }}>Upcoming</span>
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
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={13} style={{ color: actionNeeded.length > 0 ? AMBER : MUTED }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: actionNeeded.length > 0 ? AMBER : MUTED }}>
              Action Needed
            </span>
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
          <div className="flex items-center gap-2 mb-4">
            <FileText size={13} style={{ color: GREEN }} />
            <span className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: GREEN }}>Prove</span>
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

// ─── Temperature Logs — empty state ──────────────────────────────
function TemperatureLogsEmpty() {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-bold" style={{ color: NAVY, fontFamily: 'Fraunces, serif' }}>Temperature Logs</h3>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: MUTED }}>Manual logs</span>
      </div>
      <div className="bg-white border px-6 py-8 text-center" style={{ borderColor: LINE }}>
        <Thermometer size={24} style={{ color: MUTED, margin: '0 auto 8px' }} />
        <p className="text-sm" style={{ color: MUTED }}>No temperature equipment configured yet.</p>
        <p className="text-xs mt-1" style={{ color: MUTED }}>Add equipment in Settings to begin logging.</p>
      </div>
    </div>
  );
}
