/**
 * Ambassador System — AMBASSADOR-SCRIPT-01
 *
 * Milestone config, StandingCard data type, social share URL generators,
 * and milestone check/award function.
 */

// ── Milestone Types & Config ────────────────────────────────────────

export type MilestoneKey =
  | 'first_temp_log'
  | 'first_checklist'
  | 'seven_day_streak'
  | 'first_service_logged'
  | 'zero_open_cas'
  | 'thirty_day_mark'
  | 'first_inspection_passed';

export interface MilestoneConfig {
  emoji: string;
  title: string;
  message: string;
  shareable: boolean;
}

export const MILESTONE_CONFIG: Record<MilestoneKey, MilestoneConfig> = {
  first_temp_log: {
    emoji: '🌡️',
    title: 'First log recorded.',
    message: 'You just started a record that protects your team.',
    shareable: true,
  },
  first_checklist: {
    emoji: '✅',
    title: 'Checklist complete.',
    message: 'Every completed checklist is a shift your team can be proud of.',
    shareable: true,
  },
  seven_day_streak: {
    emoji: '🔥',
    title: '7-day streak.',
    message: 'Consistency is the foundation of every great kitchen.',
    shareable: true,
  },
  first_service_logged: {
    emoji: '🔧',
    title: 'Safeguard verified.',
    message: 'Your kitchen is protected. Keep this record current.',
    shareable: false,
  },
  zero_open_cas: {
    emoji: '🎯',
    title: 'Issue resolved.',
    message: "You caught it and fixed it. That's leadership.",
    shareable: true,
  },
  thirty_day_mark: {
    emoji: '📅',
    title: '30-day streak.',
    message: "A month of discipline. That's what great operators are made of.",
    shareable: true,
  },
  first_inspection_passed: {
    emoji: '🏆',
    title: 'Inspection completed.',
    message: "You went into that inspection with EvidLY. That's the difference.",
    shareable: true,
  },
};

// ── Standing Card Data ──────────────────────────────────────────────

export interface StandingCardData {
  orgName: string;
  city: string;
  isAmbassador: boolean;
  ambassadorSince?: string;
  daysActive: number;
  tempLogs: number;
  checklistsCompleted: number;
  kecStatus: string; // 'Active' | 'Pending' | 'Not Started'
  documentsOnFile: number;
  referralCode: string;
}

// ── Social Share URL Generators ─────────────────────────────────────

export function getStandingVerifyUrl(referralCode: string): string {
  return `https://www.getevidly.com/verify/${referralCode}`;
}

export function generateLinkedInShareUrl(referralCode: string, text: string): string {
  const url = getStandingVerifyUrl(referralCode);
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function generateEmailShareHref(
  orgName: string,
  referralCode: string,
  customBody?: string,
): string {
  const subject = encodeURIComponent(`${orgName} is EvidLY-monitored`);
  const url = getStandingVerifyUrl(referralCode);
  const body = encodeURIComponent(
    customBody
      ? customBody.replace('{referralUrl}', url)
      : `Check out how ${orgName} manages food safety and facility compliance with EvidLY.\n\nVerify our standing: ${url}\n\nLearn more at getevidly.com`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export function generateSmsShareHref(
  orgName: string,
  referralCode: string,
  customBody?: string,
): string {
  const url = getStandingVerifyUrl(referralCode);
  const body = encodeURIComponent(
    customBody
      ? customBody.replace('{referralUrl}', url)
      : `${orgName} uses EvidLY for food safety compliance. Check us out: ${url}`,
  );
  return `sms:?body=${body}`;
}

// ── Milestone Award Function ────────────────────────────────────────

/**
 * Attempt to award a milestone. Returns the config if newly awarded, null if
 * already existed or on error. Uses upsert with DO NOTHING for dedup.
 */
export async function checkAndAwardMilestone(
  supabase: any,
  userId: string,
  orgId: string,
  key: MilestoneKey,
): Promise<MilestoneConfig | null> {
  try {
    // Check if already awarded
    const { data: existing } = await supabase
      .from('user_milestones')
      .select('id')
      .eq('user_id', userId)
      .eq('milestone_key', key)
      .maybeSingle();

    if (existing) return null; // Already awarded

    const { error } = await supabase.from('user_milestones').insert({
      user_id: userId,
      org_id: orgId,
      milestone_key: key,
      achieved_at: new Date().toISOString(),
    });

    if (error) return null; // Likely unique constraint — already awarded
    return MILESTONE_CONFIG[key];
  } catch {
    return null;
  }
}
