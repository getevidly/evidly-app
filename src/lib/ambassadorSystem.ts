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
    title: 'First temperature logged',
    message: 'Your compliance record just started. Every reading from here builds your history.',
    shareable: true,
  },
  first_checklist: {
    emoji: '✅',
    title: 'First checklist completed',
    message: 'Your team completed their first EvidLY checklist. This is what documentation looks like.',
    shareable: true,
  },
  seven_day_streak: {
    emoji: '🔥',
    title: '7-day compliance streak',
    message: 'Seven days of consistent logging. Your inspector would be impressed.',
    shareable: true,
  },
  first_service_logged: {
    emoji: '🔧',
    title: 'First service record added',
    message: 'Your KEC history is now on file. One step closer to full PSE coverage.',
    shareable: false,
  },
  zero_open_cas: {
    emoji: '🎯',
    title: 'All corrective actions resolved',
    message: "Zero open items. If your inspector walked in right now, you'd be ready.",
    shareable: true,
  },
  thirty_day_mark: {
    emoji: '📅',
    title: '30 days with EvidLY',
    message: '30 days of compliance intelligence. You know things about your kitchen most operators never will.',
    shareable: true,
  },
  first_inspection_passed: {
    emoji: '🏆',
    title: 'Inspection completed',
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
