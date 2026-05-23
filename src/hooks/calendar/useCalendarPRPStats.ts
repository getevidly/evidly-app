import { useMemo } from 'react';
import type { CalendarEvent } from '../../pages/Calendar';

export interface CalendarPRPStats {
  predictCount: number;
  proveCount: number;
  proveTotal: number;
  todayCount: number;
  monthServicesCount: number;
  monthWithRecordsCount: number;
}

export function useCalendarPRPStats(
  events: CalendarEvent[],
  prpEnabled: boolean,
  predictCount: number,
): CalendarPRPStats {
  return useMemo(() => {
    if (!prpEnabled) {
      return {
        predictCount: 0,
        proveCount: 0,
        proveTotal: 0,
        todayCount: 0,
        monthServicesCount: 0,
        monthWithRecordsCount: 0,
      };
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const todayCount = events.filter((e) => e.date === todayStr).length;

    // This month's events
    const monthEvents = events.filter((e) => {
      const d = new Date(e.date + 'T12:00:00');
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const monthServicesCount = monthEvents.length;

    // Completed events this month
    const completedThisMonth = monthEvents.filter(
      (e) => e.status === 'completed',
    );
    const proveTotal = completedThisMonth.length;

    // Completed with records — description non-null as proxy for documentation
    const proveCount = completedThisMonth.filter(
      (e) => e.description && e.description.trim().length > 0,
    ).length;

    return {
      predictCount,
      proveCount,
      proveTotal,
      todayCount,
      monthServicesCount,
      monthWithRecordsCount: proveCount,
    };
  }, [events, prpEnabled, predictCount]);
}
