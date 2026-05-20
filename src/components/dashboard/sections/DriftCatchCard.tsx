/**
 * DriftCatchCard — C12
 *
 * Shared catch card row for standard and audit variants.
 * Status visual mapping: reduced/resolved → shield-check,
 * proven → alert-triangle, open → eye (WATCHING).
 */

import { useAuth } from '../../../contexts/AuthContext';
import { useRole } from '../../../contexts/RoleContext';
import { getDriftLabel, getSourceTableLabel } from '../../../constants/driftTypeLabels';
import type { DriftCatchWithAcks } from '../../../hooks/useDriftCatches';

interface DriftCatchCardProps {
  drift: DriftCatchWithAcks;
  variant: 'standard' | 'audit';
  onAcknowledge: (id: string) => void;
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

function statusIcon(status: string): { cls: string; icon: string } {
  if (status === 'reduced' || status === 'resolved') return { cls: 'reduced', icon: 'ti-shield-check' };
  if (status === 'proven') return { cls: 'proven', icon: 'ti-alert-triangle' };
  return { cls: 'open', icon: 'ti-eye' };
}

function statusTag(status: string): { cls: string; text: string } {
  if (status === 'reduced' || status === 'resolved') return { cls: 'reduced', text: 'PREDICTED & REDUCED' };
  if (status === 'proven') return { cls: 'proven', text: 'PREDICTED & PROVEN' };
  return { cls: 'open', text: 'WATCHING' };
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch { return ''; }
}

function daysBetween(from: string, to: Date): number {
  const diff = to.getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function buildMeta(drift: DriftCatchWithAcks): { text: string; savings: string } {
  const parts: string[] = [`Predicted ${fmtDate(drift.detected_at)}`];

  if ((drift.status === 'reduced' || drift.status === 'resolved') && drift.resolved_at) {
    parts.push(`Reduced ${fmtDate(drift.resolved_at)}`);
  } else if (drift.status === 'proven' && drift.resolved_at) {
    parts.push(`Proven ${fmtDate(drift.resolved_at)}`);
  } else if (drift.status === 'open') {
    const days = daysBetween(drift.detected_at, new Date());
    parts.push(`${days} day${days === 1 ? '' : 's'} monitored`);
  }

  const savings = drift.estimated_savings_cents > 0
    ? `Est. $${(drift.estimated_savings_cents / 100).toLocaleString()} saved`
    : '';

  return { text: parts.join(' · '), savings };
}

function buildEvidence(drift: DriftCatchWithAcks): string {
  let ev = `Evidence: ${getSourceTableLabel(drift.source_table)}`;
  if (drift.expected_value && drift.actual_value) {
    ev += ` · Expected: ${drift.expected_value} · Actual: ${drift.actual_value}`;
  }
  return ev;
}

function buildAckStat(drift: DriftCatchWithAcks, currentUserId: string): string {
  if (drift.userHasAcked) {
    const myAck = drift.acknowledgments.find(a => a.user_id === currentUserId);
    const ackDate = myAck?.acknowledged_at;
    return `Acknowledged by you${ackDate ? ` · ${fmtDate(ackDate)}` : ''}`;
  }
  if (drift.acknowledgments.length > 0) {
    const names = drift.acknowledgments.map(a => a.user_full_name).join(', ');
    return `Acknowledged by ${names}`;
  }
  return 'Awaiting acknowledgments';
}

export function DriftCatchCard({ drift, variant, onAcknowledge }: DriftCatchCardProps) {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const si = statusIcon(drift.status);
  const st = statusTag(drift.status);
  const meta = buildMeta(drift);
  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const currentUserId = profile?.id || '';

  return (
    <div className="catch">
      <div className={`catch-icon ${si.cls}`}>
        <i className={`ti ${si.icon}`} />
      </div>
      <div className="catch-body">
        <div className="catch-head">
          <span className={`catch-tag ${st.cls}`}>{st.text}</span>
          <span className="catch-pillar">{PILLAR_LABELS[drift.pillar] || drift.pillar} · {drift.location_name}</span>
        </div>
        <p className="catch-label">{getDriftLabel(drift.drift_type)}</p>
        <p className="catch-meta">
          {meta.text}
          {meta.savings && <> · <span className="savings">{meta.savings}</span></>}
        </p>
        {variant === 'audit' && (
          <p className="catch-meta">{buildEvidence(drift)}</p>
        )}
        <div className="catch-ack-row">
          <span className="catch-ack-stat">{buildAckStat(drift, currentUserId)}</span>
          {!drift.userHasAcked ? (
            <button
              type="button"
              className="catch-ack-btn"
              onClick={() => onAcknowledge(drift.id)}
            >
              <i className="ti ti-check" />
              Acknowledge as {roleLabel}
            </button>
          ) : (
            <span className="catch-ack-btn done">
              <i className="ti ti-check" />
              Acknowledged
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
