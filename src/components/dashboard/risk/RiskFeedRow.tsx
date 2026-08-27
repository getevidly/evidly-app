/**
 * RiskFeedRow — one open item, whatever raised it.
 *
 * Every row carries the same three things: what it is, why it is rated where it
 * is, and the one action that moves it. Items already being worked show the
 * action instead of offering to create a second one.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEVERITY_COLORS } from '../../../lib/severityEngine';
import { CreateCorrectiveActionModal, type CACategory } from '../../correctiveActions/CreateCorrectiveActionModal';
import { classify } from '../../../lib/severityEngine';
import type { RiskFeedItem } from '../../../hooks/useRiskFeed';
import type { DriftRecipient } from '../../../hooks/useDriftRouting';

/** Role display names — the same map AlertsSection used for routing lines. */
const ROLE_LABELS: Record<string, string> = {
  owner_operator: 'Owner',
  executive: 'Executive',
  compliance_manager: 'Compliance',
  facilities_manager: 'Facilities',
  chef: 'Chef',
  kitchen_manager: 'Manager',
};

/** Lifted verbatim from AlertsSection so routing reads identically. */
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

const NAVY = '#1E2D4D';
const MUTED = '#6B7F96';
const LINE = 'rgba(30,45,77,0.10)';
const CREAM = '#FAF7F0';
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const PILLAR_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
};

/** Kinds that can spawn a corrective action, and the source_type each writes. */
const SPAWNABLE: Record<string, 'drift' | 'record_expiry'> = {
  drift: 'drift',
  service: 'record_expiry',
  document: 'record_expiry',
  task: 'record_expiry',
};

interface Props {
  item: RiskFeedItem;
  onCreated?: () => void;
  /** Drift rows only — same handler semantics AlertsSection was given. */
  onAcknowledge?: (id: string) => void;
  roleLabel?: string;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full text-[11px]"
      style={{ background: CREAM, border: `1px solid ${LINE}`, color: MUTED, padding: '2px 8px' }}
    >
      {children}
    </span>
  );
}

const actionStyle: React.CSSProperties = {
  background: 'transparent',
  color: NAVY,
  border: `1px solid ${NAVY}`,
  fontWeight: 600,
  padding: '4px 11px',
  borderRadius: 6,
  fontSize: 11,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
};

export function RiskFeedRow({ item, onCreated, onAcknowledge, roleLabel }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const color = SEVERITY_COLORS[item.severity];
  const spawnType = SPAWNABLE[item.kind];

  // The severity shown is already rated; the modal reuses it for its due date.
  const suggestion = classify({ kind: 'corrective_action', storedSeverity: item.severity.toLowerCase() });

  const routingText = item.kind === 'drift' ? buildRoutingText(item.recipients || []) : null;
  const escalationText = item.kind === 'drift' ? buildEscalationText(item.recipients || []) : null;
  // Acknowledge is an open-drift affordance only. A 'reduced' catch has
  // already been acted on, so it carries the spawn / open-action path alone.
  const canAcknowledge = item.kind === 'drift' && item.driftStatus === 'open' && !!onAcknowledge;

  const category: CACategory =
    item.pillar === 'food_safety' || item.pillar === 'fire_safety' ? item.pillar : 'facility_services';

  return (
    <div
      className="bg-white border rounded-lg"
      style={{ borderColor: LINE, borderLeft: `3px solid ${color}`, padding: '11px 13px' }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center rounded-full text-[10.5px] font-semibold"
              style={{ color: '#FFFFFF', backgroundColor: color, padding: '1px 8px' }}
            >
              {item.severity}
            </span>
            <span className="text-[13.5px] font-semibold" style={{ color: NAVY }}>
              {item.title}
            </span>
            {item.recordId && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{item.recordId}</span>
            )}
          </div>

          <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>
            {item.reason}
          </p>

          {(routingText || escalationText) && (
            <div className="text-[11px] flex items-center gap-2 flex-wrap mt-1" style={{ color: MUTED }}>
              {routingText && <span>{routingText}</span>}
              {escalationText && <span style={{ color }}>· {escalationText}</span>}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <Chip>{item.orgLevel ? 'Organization' : item.locationName || 'Unassigned'}</Chip>
            {item.pillar && <Chip>{PILLAR_LABELS[item.pillar]}</Chip>}
            {item.approaching && <Chip>Approaching</Chip>}
            {item.inMotion && (
              <Link
                to={`/corrective-actions/${item.inMotion.id}`}
                className="inline-flex items-center rounded-full text-[11px] font-semibold"
                style={{
                  color: item.inMotion.sealed ? '#FAF7F0' : NAVY,
                  background: item.inMotion.sealed ? NAVY : 'transparent',
                  border: `1px solid ${NAVY}`,
                  padding: '2px 8px',
                  textDecoration: 'none',
                }}
              >
                {item.inMotion.sealed ? 'Corrective action sealed' : 'Corrective action open'}
              </Link>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {canAcknowledge && (
            <button
              type="button"
              onClick={() => onAcknowledge!(item.id)}
              style={{ ...actionStyle, background: NAVY, color: '#FFFFFF' }}
            >
              Acknowledge as {roleLabel}
            </button>
          )}
          {item.kind === 'incident' ? (
            <Link to={item.href} style={actionStyle}>Open incident</Link>
          ) : item.kind === 'corrective_action' ? (
            <Link to={item.href} style={actionStyle}>Open</Link>
          ) : item.inMotion ? (
            <Link to={`/corrective-actions/${item.inMotion.id}`} style={actionStyle}>Open action</Link>
          ) : spawnType ? (
            <button type="button" onClick={() => setShowCreate(true)} style={actionStyle}>
              Create corrective action
            </button>
          ) : null}
        </div>
      </div>

      {spawnType && !item.inMotion && (
        <CreateCorrectiveActionModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          source={{
            sourceType: spawnType,
            sourceId: item.id,
            sourceLabel: item.reason,
            category,
            locationId: item.locationId,
          }}
          initialTitle={item.title}
          suggestedSeverity={item.severity}
          suggestedDueDate={suggestion.dueSuggestion}
          onCreated={() => onCreated?.()}
        />
      )}
    </div>
  );
}
