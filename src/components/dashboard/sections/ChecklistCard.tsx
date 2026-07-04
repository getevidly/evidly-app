/**
 * ChecklistCard — C11
 *
 * Cadence-grouped item list with status dots and time tags.
 * Used inside ChecklistsBlockGrid for the 3-card layout.
 */

import { useOrgSummary } from '../../../hooks/useOrgSummary';
import type { ChecklistItem, ChecklistItemStatus } from '../../../hooks/useChecklistStatus';
import { daysSince } from '../../../lib/daysSince';

interface ChecklistCardProps {
  cadence: 'daily' | 'weekly' | 'monthly';
  items: ChecklistItem[];
  readonly: boolean;
  onComplete?: (instanceId: string) => void;
}

const CADENCE_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function formatTimeTag(
  status: ChecklistItemStatus,
  dueAt: string,
  completedAt: string | null,
  tz: string,
): string {
  if (status === 'done' && completedAt) {
    try {
      return 'Done ' + new Date(completedAt).toLocaleTimeString('en-US', {
        timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
      });
    } catch {
      return 'Done';
    }
  }

  if (status === 'overdue') {
    const diffMs = Date.now() - new Date(dueAt).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs >= 24) return `${daysSince(dueAt)}d late`;
    if (diffHrs >= 1) return `${diffHrs}h late`;
    return `${Math.max(1, Math.floor(diffMs / 60000))}m late`;
  }

  // due or upcoming — show due time
  try {
    return 'By ' + new Date(dueAt).toLocaleTimeString('en-US', {
      timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return '';
  }
}

export function ChecklistCard({ cadence, items, readonly, onComplete }: ChecklistCardProps) {
  const { timezone } = useOrgSummary();

  const handleDotClick = (item: ChecklistItem) => {
    if (readonly || item.status === 'done' || !onComplete) return;
    onComplete(item.instanceId);
  };

  return (
    <div className="cl-card">
      <div className="cl-h">
        <span className="cl-h-label">{CADENCE_LABEL[cadence]}</span>
        <span className="cl-h-cadence">{items.filter(i => i.status === 'done').length}/{items.length}</span>
      </div>
      {items.length === 0 && (
        <div className="cl-item" style={{ opacity: 0.5 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No {cadence} items today</span>
        </div>
      )}
      {items.map(item => (
        <div key={item.instanceId} className={`cl-item ${item.status === 'done' ? 'done' : ''}`}>
          <span
            className={`cl-stat ${item.status}`}
            role={!readonly && item.status !== 'done' ? 'button' : undefined}
            tabIndex={!readonly && item.status !== 'done' ? 0 : undefined}
            onClick={() => handleDotClick(item)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDotClick(item); } }}
          />
          <span>{item.title}</span>
          <span className={`cl-when ${item.status === 'overdue' ? 'overdue' : item.status === 'due' ? 'due' : ''}`}>
            {formatTimeTag(item.status, item.dueAt, item.completedAt, timezone)}
          </span>
        </div>
      ))}
    </div>
  );
}
