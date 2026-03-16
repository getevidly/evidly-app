/**
 * Ambassador Demo Data — AMBASSADOR-SCRIPT-01
 *
 * Demo-mode data for Standing Card, Milestones, and Share Messages.
 */
import type { StandingCardData, MilestoneKey } from '../lib/ambassadorSystem';

export const demoStandingCard: StandingCardData = {
  orgName: 'Pacific Coast Dining',
  city: 'Fresno, California',
  isAmbassador: true,
  ambassadorSince: '2026-02-01',
  daysActive: 47,
  tempLogs: 312,
  checklistsCompleted: 94,
  kecStatus: 'Active',
  documentsOnFile: 23,
  referralCode: 'CPPL-7KM2',
};

export const demoMilestones: { key: MilestoneKey; achieved_at: string; shared: boolean }[] = [
  { key: 'first_temp_log', achieved_at: '2026-01-28T09:15:00Z', shared: true },
  { key: 'first_checklist', achieved_at: '2026-01-28T14:30:00Z', shared: true },
  { key: 'seven_day_streak', achieved_at: '2026-02-04T08:00:00Z', shared: false },
  { key: 'first_service_logged', achieved_at: '2026-02-10T11:00:00Z', shared: false },
  { key: 'thirty_day_mark', achieved_at: '2026-02-27T00:00:00Z', shared: false },
];

/** Pre-written referral share messages for social channels */
export const SHARE_MESSAGES = {
  linkedin:
    "We use EvidLY to stay inspection-ready every day. If you run a commercial kitchen in California, this is worth 14 minutes of your time.",
  email_subject: "Tool I've been using for our kitchen compliance",
  email_body:
    "Hey,\n\nWe've been using EvidLY for our kitchen and it's changed how we prepare for inspections.\n\nThought you'd find it useful: {referralUrl}\n\nFree 14-day trial.",
  sms: "Using EvidLY for our kitchen — tracks compliance, flags service gaps, tells you what your inspector looks for. Free trial: {referralUrl}",
};
