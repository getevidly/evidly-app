import { useMemo } from 'react';
import {
  COMMON_SERVICE_CADENCES,
  CADENCE_TO_EVENT_CATEGORY,
} from '../../data/commonServiceCadences';
import type { CalendarEvent } from '../../pages/Calendar';

export interface DueNotScheduledItem {
  cadenceId: string;
  displayName: string;
  regulatoryBasis: string;
  category: string;
  lastCompletedDate: string | null;
  dueDate: string | null;
  daysOverdue: number;
  neverCompleted: boolean;
  nextScheduledDate: string | null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

export function useDueNotScheduled(events: CalendarEvent[]): DueNotScheduledItem[] {
  return useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const result: DueNotScheduledItem[] = [];

    for (const cadence of COMMON_SERVICE_CADENCES) {
      const eventCategory = CADENCE_TO_EVENT_CATEGORY[cadence.id];
      if (!eventCategory) continue;

      const matching = events.filter((e) => e.category === eventCategory);

      // Most recent completed event
      const completed = matching
        .filter((e) => e.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date));
      const lastCompleted = completed[0] || null;

      // Next future scheduled event
      const scheduled = matching
        .filter((e) => e.status === 'scheduled' && e.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
      const nextScheduled = scheduled[0] || null;

      if (lastCompleted) {
        const dueDate = addDays(lastCompleted.date, cadence.default_cadence_days);
        const isDueDatePassed = dueDate <= todayStr;
        const noUpcomingCoverage =
          !nextScheduled || nextScheduled.date > addDays(dueDate, 7);

        if (isDueDatePassed && noUpcomingCoverage) {
          result.push({
            cadenceId: cadence.id,
            displayName: cadence.display_name,
            regulatoryBasis: cadence.regulatory_basis,
            category: eventCategory,
            lastCompletedDate: lastCompleted.date,
            dueDate,
            daysOverdue: diffDays(todayStr, dueDate),
            neverCompleted: false,
            nextScheduledDate: nextScheduled?.date || null,
          });
        }
      } else if (!nextScheduled) {
        // Never completed and nothing scheduled
        result.push({
          cadenceId: cadence.id,
          displayName: cadence.display_name,
          regulatoryBasis: cadence.regulatory_basis,
          category: eventCategory,
          lastCompletedDate: null,
          dueDate: null,
          daysOverdue: 0,
          neverCompleted: true,
          nextScheduledDate: null,
        });
      }
    }

    return result;
  }, [events]);
}
