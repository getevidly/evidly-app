import type { BadgeTier, BadgeQualification } from '../data/benchmarkData';
import { BADGE_QUALIFICATIONS } from '../data/benchmarkData';

export function getBadgeColor(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#9CA3AF';
    case 'gold': return '#d4af37';
    case 'platinum': return '#6366f1';
  }
}

export function getBadgeBgGradient(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return 'linear-gradient(135deg, #CD7F32 0%, #A0522D 100%)';
    case 'silver': return 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)';
    case 'gold': return 'linear-gradient(135deg, #d4af37 0%, #b8962f 100%)';
    case 'platinum': return 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)';
  }
}

export function getBadgeLabel(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return 'EvidLY Verified';
    case 'silver': return 'EvidLY Excellence';
    case 'gold': return 'EvidLY Elite';
    case 'platinum': return 'EvidLY Platinum';
  }
}

export function getBadgeRequirement(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return 'Score 80+ for 3 consecutive months';
    case 'silver': return 'Score 90+ for 3 consecutive months';
    case 'gold': return 'Top 10% in vertical for 3 consecutive months';
    case 'platinum': return 'Top 5% overall for 6 consecutive months';
  }
}

export function calculateBadgeTier(locationId: string): BadgeQualification {
  return BADGE_QUALIFICATIONS[locationId] || {
    locationId,
    locationCode: locationId,
    tier: null,
    qualified: false,
    qualifyingSince: null,
    monthsQualified: 0,
    nextTier: 'bronze',
    progressToNext: 0,
  };
}

export function generateSocialPost(tier: BadgeTier, locationName: string, percentile: number): string {
  const tierLabel = getBadgeLabel(tier);
  return `Proud to announce ${locationName} has earned the ${tierLabel} Compliance Badge! We're in the top ${100 - percentile}% of restaurant operations in California. Verify our status at evidly-app.vercel.app #FoodSafety #Compliance #EvidLY`;
}

export const ALL_BADGE_TIERS: BadgeTier[] = ['bronze', 'silver', 'gold', 'platinum'];
