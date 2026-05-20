/**
 * TodayListRow — C13b
 *
 * Single today-list row with status checkbox visual and detail text.
 * Checkbox is STATUS DISPLAY ONLY — not interactive. Completion via /checklists.
 */

import type { TodayItem } from '../../../hooks/useTodayList';

interface TodayListRowProps {
  item: TodayItem;
}

export function TodayListRow({ item }: TodayListRowProps) {
  const isDone = item.status === 'completed';
  const rowCls = isDone ? 'tdr done' : 'tdr';
  const checkCls = isDone ? 'tch done' : 'tch';

  return (
    <div className={rowCls}>
      <div className="tdl">
        <span className={checkCls} />
        <span>
          {item.title}
          {item.scope_text && ` — ${item.scope_text}`}
        </span>
      </div>
      {item.detail_text && <span className="tdm">{item.detail_text}</span>}
    </div>
  );
}
