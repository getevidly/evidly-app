import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertCircle, AlertTriangle, CheckCircle2, Clock, MapPin, ArrowRight, Flame, Utensils } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { PageEmptyState } from '../components/shared/PageStates';
import { usePageTitle } from '../hooks/usePageTitle';
import { useTranslation } from '../contexts/LanguageContext';
import { useRole } from '../contexts/RoleContext';
import { useDriftCatches } from '../hooks/useDriftCatches';
import { useDriftRouting } from '../hooks/useDriftRouting';
import { getDriftLabel } from '../constants/driftTypeLabels';
import { daysSince } from '../lib/daysSince';
import { colors, typography } from '../lib/designSystem';
import type { DriftCatchWithAcks } from '../hooks/useDriftCatches';
import type { DriftRecipient } from '../hooks/useDriftRouting';

// ─── Design tokens ────────────────────────────────────────────
const NAVY = '#1E2D4D';
const GOLD = '#B24A2E';
const MUTED = '#6B7689';
const LINE = '#E6E1D3';
const GREEN = '#3F6B47';
const RED = '#A04040';
const AMBER = '#B08A2E';
const RUST = '#B85D22';

const ROLE_LABELS: Record<string, string> = {
  owner_operator: 'Owner',
  executive: 'Executive',
  compliance_manager: 'Compliance',
  facilities_manager: 'Facilities',
  chef: 'Chef',
  kitchen_manager: 'Manager',
  platform_admin: 'Admin',
};

// ─── Route map: drift source → navigable page ────────────────
function driftNavigateTo(drift: DriftCatchWithAcks): string {
  if (drift.source_table === 'temperature_logs') return '/equipment';
  if (drift.source_table === 'compliance_documents') return '/documents';
  if (drift.source_table === 'equipment') return '/equipment';
  if (drift.pillar === 'fire_safety') return '/documents?pillar=fire_safety';
  return '/documents?pillar=food_safety';
}

export function Alerts() {
  const { t } = useTranslation();
  usePageTitle('Alerts');
  const { userRole } = useRole();
  const roleLabel = ROLE_LABELS[userRole] || userRole;

  // Real drift catches — same hook the dashboard uses
  const { catches, loading, acknowledge } = useDriftCatches();
  const routingMap = useDriftRouting(catches.map(c => c.id));

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [pillarFilter, setPillarFilter] = useState<'all' | 'fire_safety' | 'food_safety'>('all');

  const filtered = catches.filter(c => {
    if (statusFilter === 'open' && (c.status !== 'open' || c.userHasAcked)) return false;
    if (statusFilter === 'acknowledged' && !c.userHasAcked) return false;
    if (statusFilter === 'resolved' && c.status !== 'resolved') return false;
    if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
    if (pillarFilter !== 'all' && c.pillar !== pillarFilter) return false;
    return true;
  });

  const openCount = catches.filter(c => c.status === 'open' && !c.userHasAcked).length;
  const urgentCount = catches.filter(c => c.severity === 'urgent' || c.severity === 'high').length;

  return (
    <>
      <Breadcrumb items={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: 'Alerts' }]} />
      <div className="space-y-6">
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyDark || NAVY} 100%)` }}
          className="p-4 sm:p-6 text-white rounded-xl">
          <div className="flex items-center space-x-3 mb-2">
            <Bell className="h-8 w-8" style={{ color: GOLD }} />
            <h2 style={{ fontSize: typography.size.h1, fontWeight: typography.weight.bold, letterSpacing: '-0.02em' }}>
              Alerts
            </h2>
          </div>
          <p className="text-white/45">
            Real drift catches from EvidLY monitoring. Acknowledging here clears the alert on the dashboard.
          </p>
          <div className="flex items-center space-x-6 mt-4 flex-wrap gap-y-2">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bell className="h-4 w-4" style={{ color: GOLD }} />
                <span className="text-sm text-white/45 font-medium">Open</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold tracking-tight text-white text-center">{openCount}</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-white/45 font-medium">Critical</span>
              </div>
              <div className="text-xl sm:text-3xl font-bold tracking-tight text-red-400 text-center">{urgentCount}</div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'acknowledged', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f ? 'bg-[#1E2D4D] text-white' : 'bg-white text-[#1E2D4D]/80 border border-[#1E2D4D]/15 hover:bg-[#FAF7F0]'
              }`}>
              {f === 'all' ? `All (${catches.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        <div className="flex flex-wrap gap-3">
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as typeof severityFilter)}
            aria-label="Filter by severity"
            className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#B24A2E]">
            <option value="all">All severities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={pillarFilter} onChange={e => setPillarFilter(e.target.value as typeof pillarFilter)}
            aria-label="Filter by pillar"
            className="px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#B24A2E]">
            <option value="all">All pillars</option>
            <option value="fire_safety">Fire Safety</option>
            <option value="food_safety">Food Safety</option>
          </select>
          {(severityFilter !== 'all' || pillarFilter !== 'all') && (
            <button onClick={() => { setSeverityFilter('all'); setPillarFilter('all'); }}
              className="px-3 py-2 text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D] underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Alert list */}
        <div className="space-y-3">
          {loading && <div className="text-sm py-8 text-center" style={{ color: MUTED }}>Loading alerts...</div>}
          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10">
              <PageEmptyState
                icon={<CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />}
                title="No alerts match your filters"
                description="Adjust your filters or check back later."
              />
            </div>
          )}
          {filtered.map(drift => (
            <AlertRow
              key={drift.id}
              drift={drift}
              recipients={routingMap[drift.id] || []}
              onAcknowledge={acknowledge}
              roleLabel={roleLabel}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── AlertRow ─────────────────────────────────────────────────
function AlertRow({ drift, recipients, onAcknowledge, roleLabel }: {
  drift: DriftCatchWithAcks;
  recipients: DriftRecipient[];
  onAcknowledge: (id: string) => void;
  roleLabel: string;
}) {
  const isCritical = drift.severity === 'urgent' || drift.severity === 'high';
  const pillarLabel = drift.pillar === 'fire_safety' ? 'Fire Safety' : 'Food Safety';
  const PillarIcon = drift.pillar === 'fire_safety' ? Flame : Utensils;
  const title = getDriftLabel(drift.drift_type, { form: 'noun' });
  const description = getDriftLabel(drift.drift_type, { form: 'verb' });
  const days = daysSince(drift.detected_at);
  const navigateTo = driftNavigateTo(drift);

  // Routing/ack status
  const unacked = recipients.filter(r => !r.acknowledged_at);
  const acked = recipients.filter(r => r.acknowledged_at);

  return (
    <div className="bg-white rounded-xl border-l-4 shadow-sm"
      style={{
        borderLeftColor: isCritical ? RED : AMBER,
        borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
        borderTopColor: LINE, borderRightColor: LINE, borderBottomColor: LINE,
      }}>
      <div className="p-4 sm:p-6">
        {/* Top row: severity + pillar chips + title */}
        <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 font-bold rounded"
                style={{
                  backgroundColor: isCritical ? '#F7E9E9' : '#FDF6E9',
                  color: isCritical ? RED : AMBER,
                }}>
                {isCritical ? 'critical' : 'warning'}
              </span>
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 font-semibold rounded inline-flex items-center gap-1"
                style={{
                  backgroundColor: drift.pillar === 'fire_safety' ? '#FBEDDF' : '#EAEFF7',
                  color: drift.pillar === 'fire_safety' ? RUST : NAVY,
                }}>
                <PillarIcon size={10} />
                {pillarLabel}
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight mb-1" style={{ color: NAVY }}>{title}</h3>
            <p className="text-sm mb-2" style={{ color: MUTED }}>{description}</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: MUTED }}>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {days} day{days !== 1 ? 's' : ''} ago
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {drift.location_name}
              </span>
              {drift.status === 'resolved' && (
                <span className="flex items-center gap-1" style={{ color: GREEN }}>
                  <CheckCircle2 size={12} /> Resolved
                </span>
              )}
            </div>

            {/* Routing/ack info */}
            {(acked.length > 0 || unacked.length > 0) && (
              <div className="mt-2 text-[11px]" style={{ color: MUTED }}>
                {acked.length > 0 && (
                  <span className="inline-flex items-center gap-1 mr-3">
                    <CheckCircle2 size={11} style={{ color: GREEN }} />
                    Acknowledged by {acked.map(a => a.full_name).join(', ')}
                  </span>
                )}
                {unacked.length > 0 && (
                  <span>Awaiting: {unacked.map(r => `${r.full_name} (${ROLE_LABELS[r.role] || r.role})`).join(', ')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t flex-wrap" style={{ borderColor: LINE }}>
          <Link to={navigateTo}
            className="px-4 py-2 text-sm font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: '#F4F1E6', color: NAVY }}>
            Go to source <ArrowRight size={12} />
          </Link>
          {!drift.userHasAcked && drift.status !== 'resolved' && (
            <button onClick={() => onAcknowledge(drift.id)}
              className="px-4 py-2 text-sm font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors text-white"
              style={{ backgroundColor: NAVY }}>
              Acknowledge as {roleLabel} <ArrowRight size={12} />
            </button>
          )}
          {drift.userHasAcked && (
            <span className="px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5" style={{ color: GREEN }}>
              <CheckCircle2 size={14} /> Acknowledged
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
