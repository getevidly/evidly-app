/**
 * DecisionRow — C13a
 *
 * Single decision row with priority dot, body, and action button.
 */

import type { OwnerDecision } from '../../../hooks/useDecisionsQueue';

interface DecisionRowProps {
  decision: OwnerDecision;
}

const DECISION_TYPE_LABELS: Record<string, string> = {
  doc_renewal: 'Document renewal',
  vendor_change: 'Vendor change',
  service_schedule: 'Service schedule',
  ca_approval: 'Corrective action',
  contract_renewal: 'Contract renewal',
};

const BUTTON_LABELS: Record<string, string> = {
  doc_renewal: 'Decide',
  vendor_change: 'Decide',
  service_schedule: 'Schedule',
  ca_approval: 'Review',
  contract_renewal: 'Decide',
};

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch { return ''; }
}

function buildMeta(decision: OwnerDecision): string {
  const parts: string[] = [DECISION_TYPE_LABELS[decision.decision_type] || decision.decision_type];
  if (decision.location_name) parts.push(decision.location_name);
  if (decision.due_by) parts.push(`Due ${fmtDate(decision.due_by)}`);
  return parts.join(' · ');
}

function buildWhy(decision: OwnerDecision): {
  citation: string | null;
  citation_clause: string | null;
  cost_narrative: string | null;
  alternatives_clause: string | null;
} {
  const citation = decision.regulatory_citation || null;
  const dv = (decision.decision_value && typeof decision.decision_value === 'object')
    ? decision.decision_value
    : {};

  const citation_clause = typeof dv.citation_clause === 'string' ? dv.citation_clause : null;

  let cost_narrative: string | null = null;
  if (typeof dv.cost_narrative === 'string') {
    cost_narrative = dv.cost_narrative;
  } else if (typeof dv.penalty_range === 'string') {
    cost_narrative = dv.penalty_range;
  } else if (typeof dv.cost_exposure === 'number' && dv.cost_exposure > 0) {
    cost_narrative = `${(dv.cost_exposure / 100).toLocaleString()} exposure`;
  }

  const alternatives_clause = typeof dv.alternatives_clause === 'string' ? dv.alternatives_clause : null;

  return { citation, citation_clause, cost_narrative, alternatives_clause };
}

export function DecisionRow({ decision }: DecisionRowProps) {
  const meta = buildMeta(decision);
  const why = buildWhy(decision);
  const btnLabel = decision.priority === 'urgent' && decision.decision_type === 'doc_renewal'
    ? 'Renew' : (BUTTON_LABELS[decision.decision_type] || 'Decide');
  const btnCls = decision.priority === 'urgent' ? 'dec-act urgent' : 'dec-act';

  return (
    <div className="dec-row">
      <span className={`dec-prio ${decision.priority}`} />
      <div className="dec-body">
        <p className="dec-label">{decision.title}</p>
        <p className="dec-meta">{meta}</p>
        {(why.citation || why.cost_narrative) && (
          <p className="dec-why">
            {why.citation && (
              <span className="reg-link" title={why.citation}>{why.citation}</span>
            )}
            {why.citation && why.citation_clause && ` ${why.citation_clause}.`}
            {(why.citation || why.citation_clause) && why.cost_narrative && ' '}
            {why.cost_narrative && (
              <span className="cost">{why.cost_narrative}</span>
            )}
            {why.alternatives_clause && (
              <span>{(why.citation || why.cost_narrative) ? ' ' : ''}{why.alternatives_clause}</span>
            )}
          </p>
        )}
      </div>
      {/* TODO: Route to /decisions/{id} when route lands (post-C13a) */}
      <button
        type="button"
        className={btnCls}
        onClick={() => { console.log(`[decisions] action on ${decision.id}`); }}
      >
        {btnLabel}
      </button>
    </div>
  );
}
