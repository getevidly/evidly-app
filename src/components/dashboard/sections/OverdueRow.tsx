/**
 * OverdueRow — C14
 *
 * Single overdue item row with clock icon, title, and days-late detail.
 */

import type { OverdueItem } from '../../../hooks/useOverdueItems';

interface OverdueRowProps {
  item: OverdueItem;
}

export function OverdueRow({ item }: OverdueRowProps) {
  return (
    <div className="ov-row">
      <div className="ov-l">
        <i className="ti ti-clock-exclamation" />
        <span>{item.title}</span>
      </div>
      <span className="ov-meta">{item.detail_text}</span>
    </div>
  );
}
