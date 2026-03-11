// ── Temperature Monitoring Configuration ─────────────────────────
// Extracted constants for overdue thresholds and temperature ranges.
// FDA Food Code references in comments.

export const TEMP_CHECK_INTERVALS = {
  HOT_HOLDING_OVERDUE_MINUTES: 240,     // 4 hours — FDA Food Code 3-501.16
  COLD_HOLDING_OVERDUE_MINUTES: 240,    // 4 hours
  EQUIPMENT_CHECK_OVERDUE_MINUTES: 480, // 8 hours (start of shift)
  RECEIVING_OVERDUE_HOURS: 24,          // Daily receiving log
} as const;

/** Derive shift from current hour */
export function getShift(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** Map equipment context to log_type for temperature_logs table */
export function getLogType(
  equipmentType: string,
  context?: 'storage' | 'holding' | 'receiving' | 'cooling'
): string {
  if (context === 'cooling') return 'cooling';
  if (context === 'receiving') return 'equipment_check';
  if (equipmentType.includes('holding') || equipmentType === 'hot_hold') {
    return equipmentType.includes('hot') || equipmentType === 'hot_hold'
      ? 'hot_holding'
      : 'cold_holding';
  }
  return 'equipment_check';
}
