/**
 * Referral System — Creative, workflow-embedded referral mechanics
 *
 * 5 mechanics:
 * 1. Compliance Champion — Share badge when hitting 90%+ compliance
 * 2. Network Leaderboard — Cross-org competition with referral bonus points
 * 3. Inspection Hero — Share success story after passing inspection
 * 4. K2C Amplifier — Kitchen to Community charitable donations
 * 5. Vendor Ripple — Vendors refer their other restaurant clients
 */

export type ReferralMechanic = 'champion_badge' | 'network_leaderboard' | 'inspection_hero' | 'k2c_amplifier' | 'vendor_ripple';
export type ReferralStatus = 'pending' | 'clicked' | 'signed_up' | 'converted' | 'expired';
export type BadgeType = 'compliance_champion' | 'perfect_streak' | 'zero_incidents' | 'rapid_response' | 'vendor_excellence';
export type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Referral {
  id: string;
  referralCode: string;
  mechanic: ReferralMechanic;
  status: ReferralStatus;
  referredEmail?: string;
  rewardType?: string;
  rewardAmount?: number;
  createdAt: string;
  convertedAt?: string;
  expiresAt: string;
}

export interface ComplianceBadge {
  id: string;
  badgeType: BadgeType;
  badgeLevel: BadgeLevel;
  locationName: string;
  earnedAt: string;
  scoreAtEarning: number;
  shareCount: number;
  clickCount: number;
  conversionCount: number;
  referralCode: string;
}

export interface NetworkScore {
  id: string;
  displayName: string;
  complianceScore: number;
  referralPoints: number;
  badgesEarned: number;
  k2cDonations: number;
  networkRank: number;
  totalReferrals: number;
  successfulReferrals: number;
  isCurrentOrg?: boolean;
}

export interface K2CDonation {
  id: string;
  charityName: string;
  amount: number;
  donatedAt: string;
  publicMessage?: string;
}

export interface VendorRipple {
  id: string;
  vendorName: string;
  referredOrgName?: string;
  status: 'pending' | 'connected' | 'onboarded';
  createdAt: string;
}

export interface InspectionHeroStory {
  id: string;
  locationName: string;
  inspectionDate: string;
  score: number;
  headline: string;
  quote: string;
  shareCount: number;
  referralCode: string;
}

/**
 * Generate a unique referral code
 */
export function generateReferralCode(orgSlug: string, mechanic: ReferralMechanic): string {
  const prefix = mechanic === 'champion_badge' ? 'CB'
    : mechanic === 'network_leaderboard' ? 'NL'
    : mechanic === 'inspection_hero' ? 'IH'
    : mechanic === 'k2c_amplifier' ? 'K2C'
    : 'VR';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${orgSlug.toUpperCase().slice(0, 4)}-${random}`;
}

/**
 * Build the public verify URL for a referral code
 */
export function getVerifyUrl(code: string): string {
  return `${window.location.origin}/ref/${code}`;
}

/**
 * Badge display configuration
 */
export const BADGE_CONFIG: Record<BadgeType, { label: string; description: string; icon: string }> = {
  compliance_champion: {
    label: 'Compliance Champion',
    description: 'Achieved 90%+ compliance score across all locations',
    icon: '🏆',
  },
  perfect_streak: {
    label: 'Perfect Streak',
    description: '30+ consecutive days at 100% daily compliance',
    icon: '🔥',
  },
  zero_incidents: {
    label: 'Zero Incidents',
    description: 'No compliance incidents for 90 days',
    icon: '✨',
  },
  rapid_response: {
    label: 'Rapid Response',
    description: 'Resolved all alerts within 24 hours for 30 days',
    icon: '⚡',
  },
  vendor_excellence: {
    label: 'Vendor Excellence',
    description: 'All vendor documents current for 60 days',
    icon: '📋',
  },
};

export const BADGE_LEVEL_COLORS: Record<BadgeLevel, { bg: string; border: string; text: string }> = {
  bronze: { bg: '#fef3e2', border: '#d97706', text: '#92400e' },
  silver: { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' },
  gold: { bg: '#fefce8', border: '#d4af37', text: '#854d0e' },
  platinum: { bg: '#eef4f8', border: '#1e4d6b', text: '#1e4d6b' },
};

/**
 * Calculate referral points for the network leaderboard
 */
export function calculateReferralPoints(referrals: Referral[]): number {
  return referrals.reduce((total, r) => {
    if (r.status === 'converted') return total + 500;
    if (r.status === 'signed_up') return total + 200;
    if (r.status === 'clicked') return total + 50;
    return total;
  }, 0);
}

/**
 * Check if the user should see a referral touchpoint this session
 */
const TOUCHPOINT_KEY = 'evidly_referral_touchpoint';

export function shouldShowTouchpoint(): boolean {
  try {
    const shown = sessionStorage.getItem(TOUCHPOINT_KEY);
    return !shown;
  } catch {
    return false;
  }
}

export function markTouchpointShown(): void {
  try {
    sessionStorage.setItem(TOUCHPOINT_KEY, 'true');
  } catch { /* noop */ }
}

/**
 * Generate a K2C-specific referral code (4-char org slug + 4 alphanumeric)
 */
export function generateK2CReferralCode(orgName: string): string {
  const slug = orgName.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${slug}-${random}`;
}

/**
 * Get K2C charity options
 */
export const K2C_CHARITIES = [
  { id: 'feeding-america', name: 'Feeding America', description: 'Fighting hunger in every community' },
  { id: 'meals-on-wheels', name: 'Meals on Wheels', description: 'Nourishing seniors in need' },
  { id: 'food-bank', name: 'Local Food Bank', description: 'Supporting your local community' },
  { id: 'world-central-kitchen', name: 'World Central Kitchen', description: 'Feeding people affected by crisis' },
];
