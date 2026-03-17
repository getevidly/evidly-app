/**
 * EMOTIONAL-UX-01 — JTBD-aligned milestone celebration messages.
 * Used by MilestoneCelebrationModal and streak celebrations.
 */

export const MILESTONE_MESSAGES: Record<string, {
  heading: string;
  subtext: string;
  badge: string;
}> = {
  first_temp_log: {
    heading: 'First log recorded.',
    subtext: 'You just started a record that protects your team.',
    badge: 'First Log',
  },
  streak_5: {
    heading: '5-day streak.',
    subtext: 'Consistency is the foundation of every great kitchen.',
    badge: '5-Day Streak',
  },
  streak_10: {
    heading: '10-day streak.',
    subtext: "Your standards are becoming your kitchen's culture.",
    badge: '10-Day Streak',
  },
  streak_30: {
    heading: '30-day streak.',
    subtext: "A month of discipline. That's what great operators are made of.",
    badge: '30-Day Streak',
  },
  streak_50: {
    heading: '50-day streak.',
    subtext: "You're not just running a kitchen. You're setting the standard.",
    badge: '50-Day Streak',
  },
  streak_100: {
    heading: '100 days.',
    subtext: 'This kitchen is exceptional. You made it that way.',
    badge: '100-Day Streak',
  },
  first_checklist_complete: {
    heading: 'Checklist complete.',
    subtext: 'Every completed checklist is a shift your team can be proud of.',
    badge: 'Checklist Done',
  },
  first_document_uploaded: {
    heading: 'Document secured.',
    subtext: "Your proof is on file. That's how prepared operators operate.",
    badge: 'Document Filed',
  },
  corrective_action_resolved: {
    heading: 'Issue resolved.',
    subtext: "You caught it and fixed it. That's leadership.",
    badge: 'CA Resolved',
  },
  shift_handoff_complete: {
    heading: 'Shift handed off.',
    subtext: 'Your team is set up for success. Good managers do this every time.',
    badge: 'Shift Complete',
  },
  pse_safeguard_verified: {
    heading: 'Safeguard verified.',
    subtext: 'Your kitchen is protected. Keep this record current.',
    badge: 'PSE Verified',
  },
};
