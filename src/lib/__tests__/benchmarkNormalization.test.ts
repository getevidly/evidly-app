import { describe, it, expect } from 'vitest';
import {
  computePercentileRank,
  computePeerGroupComparison,
  computeNormalizedBenchmark,
  computePillarBenchmarks,
  computeSubcategoryBenchmarks,
  computeLeadLag,
  computeJurisdictionDifficulty,
} from '../benchmarkNormalization';
import {
  PEER_POPULATIONS,
  getPeerPopulation,
  getFilteredPopulation,
  DEMO_LOCATION_CONTEXT,
  LOCATION_SUBCATEGORY_SCORES,
} from '../../data/benchmarkDemoData';

// ── computePercentileRank ────────────────────────────────────

describe('computePercentileRank', () => {
  it('score above all peers returns 99th percentile', () => {
    const peers = [50, 60, 70, 80, 90];
    const { percentile, rank } = computePercentileRank(95, peers);
    expect(percentile).toBe(99);
    expect(rank).toBe(1);
  });

  it('score below all peers returns 1st percentile', () => {
    const peers = [50, 60, 70, 80, 90];
    const { percentile } = computePercentileRank(40, peers);
    expect(percentile).toBe(1);
  });

  it('score at median returns ~50th percentile', () => {
    const peers = Array.from({ length: 100 }, (_, i) => i + 1);
    const { percentile } = computePercentileRank(50, peers);
    expect(percentile).toBeGreaterThanOrEqual(45);
    expect(percentile).toBeLessThanOrEqual(55);
  });

  it('empty peer array returns defaults', () => {
    const { percentile, rank, total } = computePercentileRank(80, []);
    expect(percentile).toBe(50);
    expect(rank).toBe(1);
    expect(total).toBe(1);
  });

  it('rank is correct for known position', () => {
    const peers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const { rank, total } = computePercentileRank(75, peers);
    expect(total).toBe(10);
    expect(rank).toBeLessThanOrEqual(4); // beats 7 peers
  });
});

// ── computePeerGroupComparison ───────────────────────────────

describe('computePeerGroupComparison', () => {
  it('returns correct stats for known distribution', () => {
    const peers = [60, 65, 70, 75, 80, 85, 90];
    const result = computePeerGroupComparison(85, peers, 'Test Group');
    expect(result.peerLabel).toBe('Test Group');
    expect(result.peerMean).toBeCloseTo(75, 0);
    expect(result.peerMedian).toBe(75);
    expect(result.sampleSize).toBe(7);
    expect(result.yourScore).toBe(85);
    expect(result.gap).toBeGreaterThan(0);
    expect(result.aboveAverage).toBe(true);
  });

  it('below average returns negative gap', () => {
    const peers = [70, 75, 80, 85, 90];
    const result = computePeerGroupComparison(65, peers, 'Test');
    expect(result.gap).toBeLessThan(0);
    expect(result.aboveAverage).toBe(false);
  });

  it('returns p25/p75/p90 values', () => {
    const peers = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = computePeerGroupComparison(50, peers, 'Test');
    expect(result.p25).toBeGreaterThanOrEqual(20);
    expect(result.p25).toBeLessThanOrEqual(30);
    expect(result.p75).toBeGreaterThanOrEqual(70);
    expect(result.p75).toBeLessThanOrEqual(80);
    expect(result.p90).toBeGreaterThanOrEqual(85);
  });
});

// ── Peer Populations ─────────────────────────────────────────

describe('peer populations', () => {
  it('industry population has correct sample size', () => {
    const pop = PEER_POPULATIONS['industry'];
    expect(pop.overall.length).toBe(4200);
    expect(pop.metadata.sampleSize).toBe(4200);
  });

  it('vertical populations exist for all verticals', () => {
    expect(PEER_POPULATIONS['vertical:Restaurant']).toBeDefined();
    expect(PEER_POPULATIONS['vertical:Healthcare']).toBeDefined();
    expect(PEER_POPULATIONS['vertical:K-12']).toBeDefined();
  });

  it('geo populations exist for demo counties', () => {
    expect(PEER_POPULATIONS['geo:fresno']).toBeDefined();
    expect(PEER_POPULATIONS['geo:merced']).toBeDefined();
    expect(PEER_POPULATIONS['geo:stanislaus']).toBeDefined();
  });

  it('populations are sorted ascending', () => {
    const pop = PEER_POPULATIONS['industry'];
    for (let i = 1; i < pop.overall.length; i++) {
      expect(pop.overall[i]).toBeGreaterThanOrEqual(pop.overall[i - 1]);
    }
  });

  it('getPeerPopulation falls back to industry for unknown key', () => {
    const pop = getPeerPopulation('nonexistent');
    expect(pop.metadata.sampleSize).toBe(4200);
  });

  it('getFilteredPopulation returns geo when county specified', () => {
    const pop = getFilteredPopulation({ county: 'Fresno County' });
    expect(pop.metadata.label).toBe('Fresno County');
  });

  it('getFilteredPopulation returns vertical when no county', () => {
    const pop = getFilteredPopulation({ vertical: 'Healthcare' });
    expect(pop.metadata.label).toBe('Healthcare');
  });
});

// ── computeNormalizedBenchmark ────────────────────────────────

describe('computeNormalizedBenchmark', () => {
  const populations = {
    industry: PEER_POPULATIONS['industry'],
    vertical: PEER_POPULATIONS['vertical:Restaurant'],
    geo: PEER_POPULATIONS['geo:fresno'],
    size: PEER_POPULATIONS['size:2-10'],
  };

  it('downtown (score ~91) has high industry percentile', () => {
    const result = computeNormalizedBenchmark(91, populations);
    expect(result.industryComparison.percentile).toBeGreaterThan(80);
    expect(result.industryComparison.aboveAverage).toBe(true);
  });

  it('university (score ~56) has low industry percentile', () => {
    const result = computeNormalizedBenchmark(56, populations);
    expect(result.industryComparison.percentile).toBeLessThan(25);
    expect(result.industryComparison.aboveAverage).toBe(false);
  });

  it('returns 4 comparison types', () => {
    const result = computeNormalizedBenchmark(75, populations);
    expect(result).toHaveProperty('industryComparison');
    expect(result).toHaveProperty('verticalComparison');
    expect(result).toHaveProperty('geoComparison');
    expect(result).toHaveProperty('sizeComparison');
  });
});

// ── computePillarBenchmarks ──────────────────────────────────

describe('computePillarBenchmarks', () => {
  it('returns 2 pillar benchmarks', () => {
    const pop = PEER_POPULATIONS['industry'];
    const result = computePillarBenchmarks(92, 86, pop);
    expect(result).toHaveLength(2);
    expect(result[0].pillar).toBe('Food Safety');
    expect(result[1].pillar).toBe('Facility Safety');
  });

  it('high food safety score yields high percentile', () => {
    const pop = PEER_POPULATIONS['industry'];
    const result = computePillarBenchmarks(95, 50, pop);
    expect(result[0].percentile).toBeGreaterThan(80);
  });
});

// ── computeSubcategoryBenchmarks ─────────────────────────────

describe('computeSubcategoryBenchmarks', () => {
  it('returns 8 subcategory results', () => {
    const pop = PEER_POPULATIONS['industry'];
    const scores = LOCATION_SUBCATEGORY_SCORES['downtown'];
    const result = computeSubcategoryBenchmarks(scores, pop);
    expect(result).toHaveLength(8);
  });

  it('each result has correct fields', () => {
    const pop = PEER_POPULATIONS['industry'];
    const scores = LOCATION_SUBCATEGORY_SCORES['downtown'];
    const result = computeSubcategoryBenchmarks(scores, pop);
    for (const r of result) {
      expect(r).toHaveProperty('key');
      expect(r).toHaveProperty('label');
      expect(r).toHaveProperty('pillar');
      expect(r).toHaveProperty('yourScore');
      expect(r).toHaveProperty('peerMean');
      expect(r).toHaveProperty('percentile');
      expect(r).toHaveProperty('delta');
    }
  });

  it('downtown temp compliance has positive delta', () => {
    const pop = PEER_POPULATIONS['industry'];
    const scores = LOCATION_SUBCATEGORY_SCORES['downtown'];
    const result = computeSubcategoryBenchmarks(scores, pop);
    const temp = result.find(r => r.key === 'temp_compliance');
    expect(temp!.delta).toBeGreaterThan(0);
    expect(temp!.yourScore).toBe(95);
  });
});

// ── computeLeadLag ───────────────────────────────────────────

describe('computeLeadLag', () => {
  it('returns top 3 leads and bottom 3 lags', () => {
    const pop = PEER_POPULATIONS['industry'];
    const scores = LOCATION_SUBCATEGORY_SCORES['downtown'];
    const subcats = computeSubcategoryBenchmarks(scores, pop);
    const result = computeLeadLag(subcats);
    expect(result.leads).toHaveLength(3);
    expect(result.lags).toHaveLength(3);
  });

  it('leads have higher delta than lags', () => {
    const pop = PEER_POPULATIONS['industry'];
    const scores = LOCATION_SUBCATEGORY_SCORES['airport'];
    const subcats = computeSubcategoryBenchmarks(scores, pop);
    const result = computeLeadLag(subcats);
    const minLead = Math.min(...result.leads.map(l => l.delta));
    const maxLag = Math.max(...result.lags.map(l => l.delta));
    expect(minLead).toBeGreaterThanOrEqual(maxLag);
  });

  it('recommendations are non-empty for all subcategories', () => {
    const pop = PEER_POPULATIONS['industry'];
    const scores = LOCATION_SUBCATEGORY_SCORES['university'];
    const subcats = computeSubcategoryBenchmarks(scores, pop);
    const result = computeLeadLag(subcats);
    expect(Object.keys(result.recommendations).length).toBeGreaterThan(0);
    for (const rec of Object.values(result.recommendations)) {
      expect(rec.length).toBeGreaterThan(10);
    }
  });
});

// ── computeJurisdictionDifficulty ────────────────────────────

describe('computeJurisdictionDifficulty', () => {
  it('Kern County has higher difficulty than LA County', () => {
    const kern = computeJurisdictionDifficulty('kern', 75);
    const la = computeJurisdictionDifficulty('la', 75);
    expect(kern.difficultyIndex).toBeGreaterThan(la.difficultyIndex);
  });

  it('Orange County (pass/fail) has highest difficulty', () => {
    const orange = computeJurisdictionDifficulty('orange', 75);
    expect(orange.difficultyIndex).toBe(1.0);
    expect(orange.explanation).toContain('pass/fail');
  });

  it('Generic CalCode has baseline difficulty', () => {
    const generic = computeJurisdictionDifficulty('generic', 75);
    expect(generic.difficultyIndex).toBe(0.5);
  });

  it('stricter county boosts adjusted percentile', () => {
    const kern = computeJurisdictionDifficulty('kern', 75);
    expect(kern.adjustedPercentile).toBeGreaterThanOrEqual(kern.rawPercentile);
  });

  it('explanation is always non-empty', () => {
    for (const slug of ['la', 'kern', 'orange', 'fresno', 'generic']) {
      const result = computeJurisdictionDifficulty(slug, 60);
      expect(result.explanation.length).toBeGreaterThan(10);
    }
  });
});
