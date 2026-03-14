import { useState } from 'react';

export function useClock() {
  const [isClockedIn] = useState<boolean>(true);
  const [clockedInAt] = useState<string>('2026-03-15T07:00:00Z');

  const clockedInDate = new Date(clockedInAt);
  const now = new Date('2026-03-15T12:00:00Z');
  const todayMs = now.getTime() - clockedInDate.getTime();
  const todayHours = Math.round((todayMs / (1000 * 60 * 60)) * 10) / 10;

  return {
    isClockedIn,
    clockedInAt,
    clockIn: async () => {
      throw new Error('Not implemented in demo mode');
    },
    clockOut: async () => {
      throw new Error('Not implemented in demo mode');
    },
    todayHours,
    weekHours: 28.5 + todayHours,
  };
}
