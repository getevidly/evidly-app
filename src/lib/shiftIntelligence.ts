// SUPERPOWERS-APP-01 — SP5: Shift Intelligence
// Auto-generated shift summary for handoff

export interface ShiftSummary {
  shift: string;
  shiftLabel: string;
  completionStats: {
    checklistsCompleted: number;
    checklistsTotal: number;
    tempLogsRecorded: number;
    tempFailures: number;
    correctiveActionsOpened: number;
    correctiveActionsResolved: number;
  };
  flags: ShiftFlag[];
  handoffNotes: string[];
}

export interface ShiftFlag {
  type: 'warning' | 'info' | 'success';
  message: string;
}

interface ShiftInput {
  shift: string;
  checklistsCompleted: number;
  checklistsTotal: number;
  tempLogs: Array<{ temp_pass: boolean; equipment_name?: string }>;
  correctiveActionsOpened: number;
  correctiveActionsResolved: number;
}

export function computeShiftSummary(input: ShiftInput): ShiftSummary {
  const { shift, checklistsCompleted, checklistsTotal, tempLogs, correctiveActionsOpened, correctiveActionsResolved } = input;

  const shiftLabels: Record<string, string> = {
    morning: 'Morning (5 AM – 1 PM)',
    midday: 'Midday (1 PM – 5 PM)',
    evening: 'Evening (5 PM – Close)',
  };

  const tempFailures = tempLogs.filter(t => !t.temp_pass);
  const flags: ShiftFlag[] = [];
  const handoffNotes: string[] = [];

  // Generate flags
  if (checklistsTotal > 0 && checklistsCompleted < checklistsTotal) {
    const remaining = checklistsTotal - checklistsCompleted;
    flags.push({
      type: 'warning',
      message: `${remaining} checklist${remaining !== 1 ? 's' : ''} not completed this shift`,
    });
    handoffNotes.push(`${remaining} incomplete checklist(s) may need attention next shift`);
  }

  if (tempFailures.length > 0) {
    const equipNames = tempFailures
      .map(t => t.equipment_name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    flags.push({
      type: 'warning',
      message: `${tempFailures.length} temperature reading(s) out of range${equipNames ? ` (${equipNames})` : ''}`,
    });
    handoffNotes.push(`Temperature issues flagged — verify equipment is operating within safe range`);
  }

  if (correctiveActionsOpened > 0) {
    flags.push({
      type: 'info',
      message: `${correctiveActionsOpened} new corrective action(s) opened this shift`,
    });
    handoffNotes.push(`New corrective action(s) opened — review and assign if not already handled`);
  }

  if (correctiveActionsResolved > 0) {
    flags.push({
      type: 'success',
      message: `${correctiveActionsResolved} corrective action(s) resolved this shift`,
    });
  }

  if (checklistsCompleted === checklistsTotal && checklistsTotal > 0 && tempFailures.length === 0) {
    flags.push({
      type: 'success',
      message: 'All checklists completed and all temperatures within range',
    });
    handoffNotes.push('Clean shift — all tasks completed, no issues to hand off');
  }

  if (handoffNotes.length === 0) {
    handoffNotes.push('No notable items to hand off');
  }

  return {
    shift,
    shiftLabel: shiftLabels[shift] || shift,
    completionStats: {
      checklistsCompleted,
      checklistsTotal,
      tempLogsRecorded: tempLogs.length,
      tempFailures: tempFailures.length,
      correctiveActionsOpened,
      correctiveActionsResolved,
    },
    flags,
    handoffNotes,
  };
}
