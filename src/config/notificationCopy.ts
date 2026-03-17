/**
 * EMOTIONAL-UX-01 — Empathetic notification copy.
 * Frames notifications as the platform watching out for the user.
 */

export function getNotificationCopy(
  type: string,
  context: Record<string, string>,
): { title: string; body: string } {
  const copies: Record<string, { title: string; body: string }> = {
    doc_expiry_30: {
      title: 'Document expiring soon',
      body: `${context.docName} expires in 30 days. File the update before your next inspection.`,
    },
    doc_expiry_7: {
      title: 'Document expires this week',
      body: `${context.docName} expires in 7 days. Don't let this be what an inspector finds.`,
    },
    temp_excursion: {
      title: 'Temperature excursion logged',
      body: `A temp excursion was recorded at ${context.location}. A corrective action has been started.`,
    },
    checklist_overdue: {
      title: 'Checklist not completed',
      body: `${context.checklistName} hasn't been done today. Your team needs this to close strong.`,
    },
    signal_detected: {
      title: 'New activity in your jurisdiction',
      body: `${context.jurisdiction} has new activity. Here's what it means for your kitchen.`,
    },
    inspection_window: {
      title: 'Inspection window approaching',
      body: `${context.jurisdiction} typically inspects in ${context.month}. You have time to prepare.`,
    },
    pse_due: {
      title: 'Safeguard service due',
      body: `${context.safeguard} service is due ${context.dueDate}. Schedule it before it becomes a violation.`,
    },
    streak_broken: {
      title: 'Streak interrupted',
      body: `Your ${context.streakDays}-day streak paused. Start a new one today — your kitchen depends on it.`,
    },
  };

  return copies[type] ?? { title: 'Platform update', body: 'Check your dashboard for details.' };
}
