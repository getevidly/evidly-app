/**
 * DriftCatchCard — C12
 *
 * Catch card row for standard and audit variants.
 * Only renders for open, unacknowledged items (parent filters).
 * Coral dot + "Open" label, duration, stakes line, inline ack button.
 */

import { useRole } from '../../../contexts/RoleContext';
import { getDriftLabel, getSourceTableLabel } from '../../../constants/driftTypeLabels';
import { daysSince } from '../../../lib/daysSince';
import type { DriftCatchWithAcks } from '../../../hooks/useDriftCatches';
import type { DriftRecipient } from '../../../hooks/useDriftRouting';

interface DriftCatchCardProps {
  drift: DriftCatchWithAcks;
  variant: 'standard' | 'audit';
  onAcknowledge: (id: string) => void;
  recipients?: DriftRecipient[];
}

const ROLE_LABELS: Record<string, string> = {
  owner_operator: 'Owner',
  executive: 'Executive',
  compliance_manager: 'Compliance',
  facilities_manager: 'Facilities',
  chef: 'Chef',
  kitchen_manager: 'Manager',
};

const PILLAR_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
};

/** Generic stakes text per drift type — no hardcoded county. */
const STAKES: Record<string, string> = {
  temperature_out_of_range:    'A temperature excursion is the record an inspector opens with.',
  temperature_trend_drift:     'A trending excursion is what escalates a routine walk-through.',
  missed_checklist:            'A missed checklist is documented proof of a lapse.',
  document_expiration:         'An expired document is a citable deficiency on sight.',
  receiving_log_missing:       'A receiving log gap is a citable deficiency on sight.',
  allergen_training_overdue:   'An overdue allergen certification is a citable deficiency.',
  hood_cleaning_approaching:   'A lapsed hood cleaning is a fire marshal citation on sight.',
  suppression_semi_annual_due: 'A missed suppression service is a fire marshal citation on sight.',
  extinguisher_monthly_missed: 'A missed extinguisher check is a fire marshal citation on sight.',
  inspection_readiness_gap:    'A readiness gap becomes a finding the moment an inspector arrives.',
  team_miss_clustering:        'A pattern of misses becomes a systemic finding.',
  streak_break:                'A broken streak signals a compliance lapse to an inspector.',
  task_overdue:                'An overdue task is documented proof of a lapse.',
  task_skipped:                'A skipped task is documented proof of a lapse.',
};

function buildEvidence(drift: DriftCatchWithAcks): string {
  let ev = `Evidence: ${getSourceTableLabel(drift.source_table)}`;
  if (drift.expected_value && drift.actual_value) {
    ev += ` · Expected: ${drift.expected_value} · Actual: ${drift.actual_value}`;
  }
  return ev;
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
    const soonest = unacked
      .filter(r => r.escalation_deadline)
      .sort((a, b) => (a.escalation_deadline! < b.escalation_deadline! ? -1 : 1))[0];
    const names = unacked.map(r => `${r.full_name} (${ROLE_LABELS[r.role] || r.role})`).join(', ');
    if (soonest?.escalation_deadline) {
      const minutesLeft = Math.max(0, Math.round((new Date(soonest.escalation_deadline).getTime() - Date.now()) / 60_000));
      if (minutesLeft > 0) {
        return `Routed to ${names} · escalating in ${minutesLeft} min`;
      }
      return `Routed to ${names} · escalation pending`;
    }
    return `Routed to ${names}`;
  }
  return null;
}

export function DriftCatchCard({ drift, variant, onAcknowledge, recipients = [] }: DriftCatchCardProps) {
  const { userRole } = useRole();
  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const days = daysSince(drift.detected_at);
  const stakesText = STAKES[drift.drift_type] || 'A gap here becomes a finding when an inspector arrives.';
  const ackNames = drift.acknowledgments.map(a => a.user_full_name);
  const routingText = buildRoutingText(recipients);

  return (
    <div className="catch">
      <div className="catch-body">
        <div className="catch-head">
          <span className="catch-dot" />
          <span className="catch-open-label">Open</span>
          <span className="catch-pillar">{PILLAR_LABELS[drift.pillar] || drift.pillar} · {drift.location_name}</span>
        </div>
        <p className="catch-label">{getDriftLabel(drift.drift_type, { form: 'noun' })}</p>
        <p className="catch-meta">{days} day{days === 1 ? '' : 's'} running</p>
        <p className="catch-stakes">{stakesText}</p>
        {variant === 'audit' && <p className="catch-meta">{buildEvidence(drift)}</p>}
        {routingText && (
          <p className="catch-meta" style={{ fontSize: 11, color: '#5A6478', marginBottom: 4 }}>
            {routingText}
          </p>
        )}
        <div className="catch-ack-row">
          <span className="catch-ack-stat">
            {ackNames.length > 0
              ? `Acknowledged by ${ackNames.join(', ')}`
              : 'Awaiting acknowledgment'}
          </span>
          <button
            type="button"
            className="catch-ack-btn"
            onClick={() => onAcknowledge(drift.id)}
            style={{ background: '#1E2D4D', color: '#ffffff', border: '1px solid #1E2D4D', fontWeight: 600, padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Acknowledge as {roleLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
