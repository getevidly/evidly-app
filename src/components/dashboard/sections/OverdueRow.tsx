/**
 * OverdueRow — C14
 *
 * Single overdue item row with clock icon, title, and days-late detail.
 *
 * Every row now offers a way forward: an overdue task or expired document can
 * spawn a corrective action; a row that already IS a corrective action links to
 * itself instead, since spawning one from another would just duplicate it.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OverdueItem } from '../../../hooks/useOverdueItems';
import { classify } from '../../../lib/severityEngine';
import { CreateCorrectiveActionModal } from '../../correctiveActions/CreateCorrectiveActionModal';

interface OverdueRowProps {
  item: OverdueItem;
}

const actionStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#1E2D4D',
  border: '1px solid #1E2D4D',
  fontWeight: 600,
  padding: '3px 10px',
  borderRadius: 6,
  fontSize: 11,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
};

export function OverdueRow({ item }: OverdueRowProps) {
  const [showCreate, setShowCreate] = useState(false);

  const isCorrectiveAction = item.source === 'corrective_action';

  // Documents rate off the document table; tasks off the task table.
  const rating = isCorrectiveAction
    ? null
    : classify(
        item.source === 'document'
          ? { kind: 'document', docLabel: item.raw_title, daysOverdue: item.days_late }
          : { kind: 'task', daysOverdue: item.days_late, label: item.raw_title },
      );

  return (
    <div className="ov-row">
      <div className="ov-l">
        <i className="ti ti-clock-exclamation" />
        <span>{item.title}</span>
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="ov-meta">{item.detail_text}</span>
        {isCorrectiveAction ? (
          <Link to={`/corrective-actions/${item.id}`} style={actionStyle}>
            Open
          </Link>
        ) : (
          <button type="button" onClick={() => setShowCreate(true)} style={actionStyle}>
            Create corrective action
          </button>
        )}
      </span>

      {rating && (
        <CreateCorrectiveActionModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          source={{
            sourceType: 'record_expiry',
            sourceId: item.id,
            sourceLabel:
              item.source === 'document'
                ? `Expired record — ${item.raw_title}`
                : `Overdue task — ${item.raw_title}`,
            // Neither an overdue task nor an expired document carries a pillar,
            // so the neutral category is used rather than guessing food or fire.
            category: 'facility_services',
            locationId: item.location_id,
          }}
          initialTitle={item.raw_title}
          suggestedSeverity={rating.severity}
          suggestedDueDate={rating.dueSuggestion}
        />
      )}
    </div>
  );
}
