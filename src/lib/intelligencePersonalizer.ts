/**
 * INTEL-06 — Intelligence Personalizer
 *
 * Adds "What does this mean for MY business?" context to every intelligence insight.
 * Demo mode: returns personalizedBusinessImpact from static demo data.
 * Live mode: computes personalization from ClientProfile + insight data.
 */

import type { IntelligenceInsight, PersonalizedBusinessImpact } from '../data/demoIntelligenceData';
import type { ClientProfile } from './businessImpactContext';

// ── Caching ─────────────────────────────────────────────────────

const CACHE_KEY = 'evidly_personalization_cache';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface CacheEntry {
  insightId: string;
  result: PersonalizedBusinessImpact;
  cachedAt: number;
}

function getCachedResult(insightId: string): PersonalizedBusinessImpact | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entries: CacheEntry[] = JSON.parse(raw);
    const entry = entries.find(e => e.insightId === insightId);
    if (!entry || Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.result;
  } catch {
    return null;
  }
}

function setCachedResult(insightId: string, result: PersonalizedBusinessImpact): void {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const entries: CacheEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = entries.filter(e => e.insightId !== insightId && Date.now() - e.cachedAt <= CACHE_TTL_MS);
    filtered.push({ insightId, result, cachedAt: Date.now() });
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  } catch { /* quota exceeded — ignore */ }
}

// ── Geographic Relevance ────────────────────────────────────────

const NEIGHBORING_COUNTIES: Record<string, string[]> = {
  fresno: ['madera', 'kings', 'tulare', 'merced', 'mariposa'],
  merced: ['stanislaus', 'mariposa', 'madera', 'fresno', 'san_benito'],
  stanislaus: ['san_joaquin', 'merced', 'tuolumne', 'calaveras', 'santa_clara'],
  mariposa: ['tuolumne', 'merced', 'madera', 'fresno'],
};

function computeGeographicRelevance(insightCounties: string[], clientCounties: string[]): number {
  if (insightCounties.length === 0) return 0.5; // statewide/national — moderate relevance

  let score = 0;
  for (const county of insightCounties) {
    const lc = county.toLowerCase();
    if (clientCounties.includes(lc)) {
      score = Math.max(score, 1.0); // direct match
    } else {
      for (const cc of clientCounties) {
        const neighbors = NEIGHBORING_COUNTIES[cc] || [];
        if (neighbors.includes(lc)) {
          score = Math.max(score, 0.6); // neighboring county
          break;
        }
      }
    }
  }
  return score || 0.3; // national scope fallback
}

// ── Pillar Vulnerability ────────────────────────────────────────

function computePillarVulnerability(insightPillars: string[], profile: ClientProfile): number {
  if (insightPillars.length === 0) return 0.3;

  let hasVulnerability = false;
  for (const pillar of insightPillars) {
    if (pillar === 'facility_safety') {
      hasVulnerability = profile.active_vulnerabilities.some(v =>
        v.includes('hood') || v.includes('fire') || v.includes('nfpa') || v.includes('suppression') || v.includes('nps_documentation')
      );
    } else if (pillar === 'food_safety') {
      hasVulnerability = profile.active_vulnerabilities.some(v =>
        v.includes('temp') || v.includes('cooler') || v.includes('poultry') || v.includes('contamination') || v.includes('haccp')
      );
    }
  }
  return hasVulnerability ? 0.9 : 0.5;
}

// ── Direct Vulnerability Hit ────────────────────────────────────

function computeVulnerabilityHit(insightTags: string[], profile: ClientProfile): number {
  const vulnKeywords = profile.active_vulnerabilities.flatMap(v => v.split('_'));
  const tagHits = insightTags.filter(tag =>
    vulnKeywords.some(kw => tag.toLowerCase().includes(kw))
  );
  return Math.min(1.0, tagHits.length * 0.25);
}

// ── Financial Impact Adjustment ─────────────────────────────────

export function adjustFinancialImpact(
  baseCost: { low: number; high: number },
  profile: ClientProfile,
  affectedLocationCount: number,
): { low: number; high: number; methodology: string } {
  const multiplier = profile.industry_multiplier;
  const locationScale = Math.max(1, affectedLocationCount);

  return {
    low: Math.round(baseCost.low * multiplier * locationScale),
    high: Math.round(baseCost.high * multiplier * locationScale),
    methodology: `Adjusted for ${profile.segment.replace(/_/g, ' ')} (${multiplier}x multiplier) across ${locationScale} affected location${locationScale > 1 ? 's' : ''}`,
  };
}

// ── Location Exposure Mapping ───────────────────────────────────

function mapLocationExposure(
  insightCounties: string[],
  insightTags: string[],
  profile: ClientProfile,
): PersonalizedBusinessImpact['affected_locations'] {
  if (insightCounties.length === 0) {
    // Statewide — all locations affected
    return profile.locations.map(loc => ({
      name: loc.name,
      impact: 'Statewide regulation applies to this location',
      risk_level: loc.active_vulnerabilities.some(v =>
        insightTags.some(t => v.includes(t.toLowerCase().replace(/\s/g, '_')))
      ) ? 'high' as const : 'medium' as const,
    }));
  }

  return profile.locations
    .filter(loc => insightCounties.map(c => c.toLowerCase()).includes(loc.county))
    .map(loc => {
      const vulnMatch = loc.active_vulnerabilities.some(v =>
        insightTags.some(t => v.includes(t.toLowerCase().replace(/\s/g, '_')))
      );
      return {
        name: loc.name,
        impact: vulnMatch
          ? 'Direct exposure \u2014 active vulnerability detected at this location'
          : `Located in affected county (${loc.county})`,
        risk_level: vulnMatch ? 'high' as const : 'medium' as const,
      };
    });
}

// ── Main Personalizer ───────────────────────────────────────────

export function personalizeInsight(
  insight: IntelligenceInsight,
  profile: ClientProfile,
  isDemoMode: boolean,
): PersonalizedBusinessImpact | null {
  // Demo mode: return static data if available
  if (isDemoMode && insight.personalizedBusinessImpact) {
    return insight.personalizedBusinessImpact;
  }

  // Check cache
  const cached = getCachedResult(insight.id);
  if (cached) return cached;

  // Compute relevance components
  const geoRelevance = computeGeographicRelevance(insight.affected_counties, profile.primary_counties);
  const pillarVuln = computePillarVulnerability(insight.affected_pillars, profile);
  const vulnHit = computeVulnerabilityHit(insight.tags, profile);

  // Composite relevance score (weighted)
  const relevance_score = Math.min(1.0,
    geoRelevance * 0.35 +
    pillarVuln * 0.30 +
    vulnHit * 0.20 +
    (insight.confidence_score * 0.15)
  );

  // Location exposure
  const affected_locations = mapLocationExposure(insight.affected_counties, insight.tags, profile);

  // Financial adjustment
  const financial_impact_adjusted = adjustFinancialImpact(
    insight.estimated_cost_impact,
    profile,
    Math.max(1, affected_locations.length),
  );

  // Build result
  const result: PersonalizedBusinessImpact = {
    relevance_score,
    business_context: `This ${insight.impact_level}-impact event affects ${profile.organization_name}'s operations${affected_locations.length > 0 ? ` at ${affected_locations.map(l => l.name).join(', ')}` : ' across all locations'}.`,
    affected_locations,
    financial_impact_adjusted,
    personalized_actions: insight.action_items.slice(0, 3),
    industry_specific_note: profile.dual_jurisdiction
      ? `As a ${profile.segment.replace(/_/g, ' ')} operator with dual jurisdiction requirements, ensure compliance documentation satisfies both authorities.`
      : `As a ${profile.segment.replace(/_/g, ' ')} operator, the industry impact multiplier (${profile.industry_multiplier}x) reflects heightened regulatory scrutiny for your segment.`,
  };

  setCachedResult(insight.id, result);
  return result;
}

// ── Batch Personalizer ──────────────────────────────────────────

export function personalizeInsights(
  insights: IntelligenceInsight[],
  profile: ClientProfile,
  isDemoMode: boolean,
): Map<string, PersonalizedBusinessImpact> {
  const results = new Map<string, PersonalizedBusinessImpact>();
  for (const insight of insights) {
    const result = personalizeInsight(insight, profile, isDemoMode);
    if (result) results.set(insight.id, result);
  }
  return results;
}
