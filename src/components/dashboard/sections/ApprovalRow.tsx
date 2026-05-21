/**
 * ApprovalRow — C14
 *
 * Single approval queue row with icon, body, why block, and action buttons.
 * Buttons are TODO no-op for C14 (no /approvals route yet).
 */

import type { ApprovalItem } from '../../../hooks/useApprovalQueue';

interface ApprovalRowProps {
  item: ApprovalItem;
}

export function ApprovalRow({ item }: ApprovalRowProps) {
  return (
    <div className="appr-row">
      <div className="appr-icon">
        <i className={item.icon} />
      </div>
      <div className="appr-body">
        <p className="appr-label">{item.title}</p>
        <p className="appr-meta">{item.meta_text}</p>
        {item.why_text && (
          <div className="appr-why">
            {item.why_reg && <><span className="reg">{item.why_reg}</span> </>}
            {item.why_text}
            {item.why_rec && <>{' '}<span className="rec">{item.why_rec}</span></>}
          </div>
        )}
      </div>
      <div className="appr-buttons">
        {item.secondary_action_label && (
          <button
            type="button"
            className="appr-btn reject"
            onClick={() => { console.log(`[approval] secondary action on ${item.id}`); }}
          >
            {item.secondary_action_label}
          </button>
        )}
        {/* TODO: Route to approval workflow when /approvals route lands */}
        <button
          type="button"
          className="appr-btn approve"
          onClick={() => { console.log(`[approval] primary action on ${item.id}`); }}
        >
          {item.primary_action_label}
        </button>
      </div>
    </div>
  );
}
