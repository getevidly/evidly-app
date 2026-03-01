/**
 * Demo data for the Creative Referral System (Task #59)
 */
import type {
  Referral,
  ComplianceBadge,
  NetworkScore,
  K2CDonation,
  VendorRipple,
  InspectionHeroStory,
} from '../lib/referralSystem';

// ── Referrals ──────────────────────────────────────────
export const demoReferrals: Referral[] = [
  {
    id: 'ref-1',
    referralCode: 'CB-ARTH-X7KM2P',
    mechanic: 'champion_badge',
    status: 'converted',
    referredEmail: 'maria@centralcafe.com',
    rewardType: 'month_free',
    rewardAmount: 99,
    createdAt: '2026-01-15T10:00:00Z',
    convertedAt: '2026-01-28T14:30:00Z',
    expiresAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'ref-2',
    referralCode: 'IH-ARTH-B3QN9R',
    mechanic: 'inspection_hero',
    status: 'signed_up',
    referredEmail: 'tom@seasidegrill.com',
    rewardType: 'feature_unlock',
    createdAt: '2026-02-01T09:00:00Z',
    expiresAt: '2026-05-01T09:00:00Z',
  },
  {
    id: 'ref-3',
    referralCode: 'K2C-ARTH-D5WF4T',
    mechanic: 'k2c_amplifier',
    status: 'converted',
    referredEmail: 'jenny@pizzaplace.com',
    rewardType: 'k2c_donation',
    rewardAmount: 25,
    createdAt: '2026-01-20T11:00:00Z',
    convertedAt: '2026-02-05T16:00:00Z',
    expiresAt: '2026-04-20T11:00:00Z',
  },
  {
    id: 'ref-4',
    referralCode: 'NL-ARTH-H8YJ6V',
    mechanic: 'network_leaderboard',
    status: 'clicked',
    createdAt: '2026-02-10T08:00:00Z',
    expiresAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 'ref-5',
    referralCode: 'VR-ARTH-M2PK7W',
    mechanic: 'vendor_ripple',
    status: 'signed_up',
    referredEmail: 'chef@harborhouse.com',
    rewardType: 'vendor_credit',
    rewardAmount: 50,
    createdAt: '2026-02-08T13:00:00Z',
    expiresAt: '2026-05-08T13:00:00Z',
  },
  {
    id: 'ref-6',
    referralCode: 'CB-ARTH-Q4RL9N',
    mechanic: 'champion_badge',
    status: 'pending',
    createdAt: '2026-02-12T07:00:00Z',
    expiresAt: '2026-05-12T07:00:00Z',
  },
];

// ── Compliance Badges ──────────────────────────────────
export const demoBadges: ComplianceBadge[] = [
  {
    id: 'badge-1',
    badgeType: 'compliance_champion',
    badgeLevel: 'gold',
    locationName: 'Downtown Kitchen',
    earnedAt: '2026-01-15T10:00:00Z',
    scoreAtEarning: 91,
    shareCount: 12,
    clickCount: 47,
    conversionCount: 2,
    referralCode: 'CB-ARTH-X7KM2P',
  },
  {
    id: 'badge-2',
    badgeType: 'perfect_streak',
    badgeLevel: 'silver',
    locationName: 'Downtown Kitchen',
    earnedAt: '2026-02-01T08:00:00Z',
    scoreAtEarning: 94,
    shareCount: 5,
    clickCount: 18,
    conversionCount: 0,
    referralCode: 'CB-ARTH-Q4RL9N',
  },
  {
    id: 'badge-3',
    badgeType: 'rapid_response',
    badgeLevel: 'bronze',
    locationName: 'Airport Cafe',
    earnedAt: '2026-01-28T14:00:00Z',
    scoreAtEarning: 69,
    shareCount: 3,
    clickCount: 9,
    conversionCount: 1,
    referralCode: 'IH-ARTH-B3QN9R',
  },
  {
    id: 'badge-4',
    badgeType: 'vendor_excellence',
    badgeLevel: 'gold',
    locationName: 'Downtown Kitchen',
    earnedAt: '2026-02-10T09:00:00Z',
    scoreAtEarning: 91,
    shareCount: 2,
    clickCount: 7,
    conversionCount: 0,
    referralCode: 'NL-ARTH-H8YJ6V',
  },
];

// ── Network Leaderboard ────────────────────────────────
export const demoNetworkScores: NetworkScore[] = [
  {
    id: 'ns-1',
    displayName: "Arthur's Kitchen Group",
    complianceScore: 91,
    referralPoints: 1250,
    badgesEarned: 4,
    k2cDonations: 75,
    networkRank: 3,
    totalReferrals: 6,
    successfulReferrals: 3,
    isCurrentOrg: true,
  },
  {
    id: 'ns-2',
    displayName: 'Bay Area Restaurant Co.',
    complianceScore: 96,
    referralPoints: 2100,
    badgesEarned: 7,
    k2cDonations: 250,
    networkRank: 1,
    totalReferrals: 12,
    successfulReferrals: 8,
  },
  {
    id: 'ns-3',
    displayName: 'Valley Food Services',
    complianceScore: 94,
    referralPoints: 1800,
    badgesEarned: 5,
    k2cDonations: 150,
    networkRank: 2,
    totalReferrals: 9,
    successfulReferrals: 6,
  },
  {
    id: 'ns-4',
    displayName: 'Metro Dining Group',
    complianceScore: 88,
    referralPoints: 900,
    badgesEarned: 3,
    k2cDonations: 50,
    networkRank: 4,
    totalReferrals: 5,
    successfulReferrals: 2,
  },
  {
    id: 'ns-5',
    displayName: 'Pacific Coast Kitchens',
    complianceScore: 85,
    referralPoints: 650,
    badgesEarned: 2,
    k2cDonations: 25,
    networkRank: 5,
    totalReferrals: 3,
    successfulReferrals: 1,
  },
  {
    id: 'ns-6',
    displayName: 'Sunrise Hospitality',
    complianceScore: 82,
    referralPoints: 400,
    badgesEarned: 2,
    k2cDonations: 0,
    networkRank: 6,
    totalReferrals: 2,
    successfulReferrals: 0,
  },
  {
    id: 'ns-7',
    displayName: 'Golden Gate Foods',
    complianceScore: 79,
    referralPoints: 300,
    badgesEarned: 1,
    k2cDonations: 10,
    networkRank: 7,
    totalReferrals: 1,
    successfulReferrals: 0,
  },
  {
    id: 'ns-8',
    displayName: 'Central Valley Catering',
    complianceScore: 74,
    referralPoints: 150,
    badgesEarned: 1,
    k2cDonations: 0,
    networkRank: 8,
    totalReferrals: 1,
    successfulReferrals: 0,
  },
];

// ── K2C Donations ──────────────────────────────────────
export const demoK2CDonations: K2CDonation[] = [
  {
    id: 'k2c-1',
    charityName: 'Feeding America',
    amount: 25,
    donatedAt: '2026-02-05T16:00:00Z',
    publicMessage: 'From our kitchen to the community - compliance helps everyone!',
  },
  {
    id: 'k2c-2',
    charityName: 'Meals on Wheels',
    amount: 25,
    donatedAt: '2026-01-28T14:30:00Z',
    publicMessage: 'Safe kitchens feed safe communities.',
  },
  {
    id: 'k2c-3',
    charityName: 'Local Food Bank',
    amount: 25,
    donatedAt: '2026-01-15T10:00:00Z',
  },
];

// ── Vendor Ripples ─────────────────────────────────────
export const demoVendorRipples: VendorRipple[] = [
  {
    id: 'vr-1',
    vendorName: 'ABC Fire Protection',
    referredOrgName: 'Harbor House Kitchen',
    status: 'onboarded',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'vr-2',
    vendorName: 'Pacific Pest Control',
    referredOrgName: 'Seaside Grill',
    status: 'connected',
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'vr-3',
    vendorName: 'Valley Fire Systems',
    status: 'pending',
    createdAt: '2026-02-10T14:00:00Z',
  },
];

// ── Inspection Hero Stories ────────────────────────────
export const demoHeroStories: InspectionHeroStory[] = [
  {
    id: 'hero-1',
    locationName: 'Downtown Kitchen',
    inspectionDate: '2026-01-10T09:00:00Z',
    score: 97,
    headline: 'Perfect health inspection — zero violations!',
    quote: "EvidLY helped us stay on top of every requirement. When the inspector arrived, we were ready. No scrambling, no stress — just confidence.",
    shareCount: 23,
    referralCode: 'IH-ARTH-B3QN9R',
  },
  {
    id: 'hero-2',
    locationName: 'Airport Cafe',
    inspectionDate: '2026-02-05T10:00:00Z',
    score: 88,
    headline: 'From 3 violations to zero in 60 days',
    quote: 'We went from dreading inspections to acing them. The checklist system caught issues before inspectors could.',
    shareCount: 15,
    referralCode: 'IH-ARTH-B3QN9R',
  },
];

// ── K2C Referral Invites ──────────────────────────────
export interface K2CReferralInvite {
  id: string;
  contactName: string;
  businessName: string;
  email: string;
  phone?: string;
  role: string;
  status: 'invited' | 'signed_up' | 'active' | 'expired';
  mealsGenerated: number;
  invitedAt: string;
  signedUpAt?: string;
  chainDepth: number;
  referredOrgCode?: string;
}

export const demoK2CInvites: K2CReferralInvite[] = [
  {
    id: 'k2c-inv-1',
    contactName: 'Maria Gonzalez',
    businessName: 'Central Cafe & Grill',
    email: 'maria@centralcafe.com',
    phone: '(415) 555-0142',
    role: 'Owner/Operator',
    status: 'active',
    mealsGenerated: 12,
    invitedAt: '2026-01-15T10:00:00Z',
    signedUpAt: '2026-01-28T14:30:00Z',
    chainDepth: 1,
    referredOrgCode: 'CENT-9PQ4',
  },
  {
    id: 'k2c-inv-2',
    contactName: 'Tom Harrison',
    businessName: 'Seaside Grill',
    email: 'tom@seasidegrill.com',
    role: 'Kitchen Manager',
    status: 'signed_up',
    mealsGenerated: 12,
    invitedAt: '2026-02-01T09:00:00Z',
    signedUpAt: '2026-02-12T11:00:00Z',
    chainDepth: 1,
    referredOrgCode: 'SEAS-4WK7',
  },
  {
    id: 'k2c-inv-3',
    contactName: 'Jenny Park',
    businessName: 'Park Pizza Co.',
    email: 'jenny@parkpizza.com',
    phone: '(510) 555-0198',
    role: 'Owner/Operator',
    status: 'invited',
    mealsGenerated: 0,
    invitedAt: '2026-02-18T14:00:00Z',
    chainDepth: 1,
  },
  {
    id: 'k2c-inv-4',
    contactName: 'David Chen',
    businessName: 'Golden Dragon Kitchen',
    email: 'david@goldendragon.com',
    role: 'Chef',
    status: 'invited',
    mealsGenerated: 0,
    invitedAt: '2026-02-22T09:30:00Z',
    chainDepth: 1,
  },
  {
    id: 'k2c-inv-5',
    contactName: 'Sarah Mitchell',
    businessName: 'Harbor House Kitchen',
    email: 'sarah@harborhouse.com',
    role: 'Owner/Operator',
    status: 'active',
    mealsGenerated: 12,
    invitedAt: '2026-02-05T11:00:00Z',
    signedUpAt: '2026-02-15T10:00:00Z',
    chainDepth: 2,
    referredOrgCode: 'HARB-6MN3',
  },
];

// ── Summary stats ──────────────────────────────────────
export const demoReferralStats = {
  totalReferrals: 6,
  converted: 2,
  signedUp: 2,
  pending: 2,
  totalRewardsEarned: 174, // $99 + $25 + $50
  monthsFreeEarned: 1,
  k2cTotalDonated: 75,
  badgesEarned: 4,
  networkRank: 3,
  referralPoints: 1250,
};
