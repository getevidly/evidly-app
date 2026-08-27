/**
 * intelligenceGate — who sees what in the intelligence feed.
 *
 * Shared by the in-app feed (RegulatoryAlerts) and mirrored by the
 * intelligence-digest edge function, which carries the same two constants.
 * Keep them in step: the email and the page must never disagree about whether
 * an org is inside its window.
 */

/** Days 0-15 from trial_start_date: setup. */
export const TRIAL_SETUP_ENDS_DAY = 15;
/** Days 16-60: use. Past 60: lapsed. */
export const TRIAL_USE_ENDS_DAY = 60;

export type TrialPhase = 'setup' | 'use' | 'lapsed';

/** 'full' renders summaries; 'teaser' gates them; 'none' shows no alerts. */
export type FeedMode = 'full' | 'teaser' | 'none';

/**
 * Where an org sits in its 60-day window. Null when there is no trial clock —
 * the phase is then indeterminate and callers must not guess at one.
 */
export function trialPhase(
  trialStartDate: string | null | undefined,
  now: Date = new Date(),
): TrialPhase | null {
  if (!trialStartDate) return null;
  const start = new Date(trialStartDate).getTime();
  if (Number.isNaN(start)) return null;
  const days = Math.floor((now.getTime() - start) / 86400000);
  if (days <= TRIAL_SETUP_ENDS_DAY) return 'setup';
  if (days <= TRIAL_USE_ENDS_DAY) return 'use';
  return 'lapsed';
}

/**
 * Feed mode for an org.
 *
 *   paying            -> full    (overrides phase entirely)
 *   setup phase       -> none    (nothing to show yet)
 *   use phase         -> full
 *   lapsed, unpaid    -> teaser  (cpp_free counts as unpaid — it is not in
 *                                 useFeatureAccess's isPaid tier list)
 *   no trial clock    -> none    (indeterminate; same call the digest makes)
 *
 * isPaid comes from useFeatureAccess, which reads organizations.plan_tier and
 * treats founder | standard | enterprise as paying.
 */
export function feedMode(opts: {
  isPaid: boolean;
  trialStartDate: string | null | undefined;
  now?: Date;
}): FeedMode {
  if (opts.isPaid) return 'full';
  const phase = trialPhase(opts.trialStartDate, opts.now);
  if (phase === null) return 'none';
  if (phase === 'setup') return 'none';
  if (phase === 'use') return 'full';
  return 'teaser';
}
