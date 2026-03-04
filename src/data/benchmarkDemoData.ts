// ============================================================
// Benchmark Demo Data — Synthetic Peer Populations
// ============================================================
// Generates deterministic synthetic score distributions for
// proper percentile computation. Uses seeded PRNG + Box-Muller.
// Config is derived from existing benchmarkData.ts constants.
// ============================================================

import {
  VERTICAL_BENCHMARKS,
  GEO_BENCHMARKS,
  SIZE_BENCHMARKS,
  SUBCATEGORY_BENCHMARKS,
  MONTHLY_TRENDS,
  LOCATION_SUBCATEGORY_SCORES,
  BADGE_QUALIFICATIONS,
  type MonthlyTrend,
} from './benchmarkData';

// ── Types ────────────────────────────────────────────────────

export interface PeerPopulation {
  overall: number[];
  foodSafety: number[];
  facilitySafety: number[];
  subcategories: Record<string, number[]>;
  metadata: { label: string; sampleSize: number };
}

export interface PopulationConfig {
  mean: number;
  stdDev: number;
  sampleSize: number;
  label: string;
  /** Pillar-level means (optional, derived from overall if absent) */
  foodSafetyMean?: number;
  facilitySafetyMean?: number;
}

export interface DemoLocationContext {
  vertical: string;
  county: string;
  size: string;
}

// ── Seeded PRNG ──────────────────────────────────────────────
// Mulberry32 — simple, fast, deterministic

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Box-Muller Normal Distribution ───────────────────────────

function generateNormalSamples(
  count: number,
  mean: number,
  stdDev: number,
  rng: () => number,
): number[] {
  const samples: number[] = [];
  for (let i = 0; i < count; i += 2) {
    const u1 = rng() || 0.0001; // avoid log(0)
    const u2 = rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    samples.push(Math.round(Math.max(0, Math.min(100, mean + z0 * stdDev))));
    if (samples.length < count) {
      samples.push(Math.round(Math.max(0, Math.min(100, mean + z1 * stdDev))));
    }
  }
  return samples.sort((a, b) => a - b);
}

// ── Population Generator ─────────────────────────────────────

function generatePopulation(config: PopulationConfig, seed: number): PeerPopulation {
  const rng = mulberry32(seed);
  const fsMean = config.foodSafetyMean ?? config.mean + 2;
  const facMean = config.facilitySafetyMean ?? config.mean - 3;

  const overall = generateNormalSamples(config.sampleSize, config.mean, config.stdDev, rng);
  const foodSafety = generateNormalSamples(config.sampleSize, fsMean, config.stdDev, rng);
  const facilitySafety = generateNormalSamples(config.sampleSize, facMean, config.stdDev + 1, rng);

  // Generate subcategory populations
  const subcategories: Record<string, number[]> = {};
  for (const sub of SUBCATEGORY_BENCHMARKS) {
    const subMean = sub.industryAvg;
    const subStdDev = config.stdDev + 1;
    subcategories[sub.key] = generateNormalSamples(config.sampleSize, subMean, subStdDev, rng);
  }

  return {
    overall,
    foodSafety,
    facilitySafety,
    subcategories,
    metadata: { label: config.label, sampleSize: config.sampleSize },
  };
}

// ── Pre-generated Populations ────────────────────────────────
// Keyed by group identifier, generated once at import time.

const SEEDS = {
  industry: 42,
  verticalBase: 100,
  geoBase: 200,
  sizeBase: 300,
};

function buildPopulations(): Record<string, PeerPopulation> {
  const pops: Record<string, PeerPopulation> = {};

  // Industry-wide
  pops['industry'] = generatePopulation({
    mean: 73, stdDev: 12, sampleSize: 4200, label: 'All EvidLY Customers',
  }, SEEDS.industry);

  // Per-vertical
  VERTICAL_BENCHMARKS.forEach((v, i) => {
    pops[`vertical:${v.vertical}`] = generatePopulation({
      mean: v.avgScore,
      stdDev: 11,
      sampleSize: v.peerCount,
      label: v.vertical,
      foodSafetyMean: v.avgFoodSafety,
      facilitySafetyMean: v.avgFacilitySafety,
    }, SEEDS.verticalBase + i);
  });

  // Per-geography
  GEO_BENCHMARKS.forEach((g, i) => {
    pops[`geo:${g.name.toLowerCase().replace(/\s+county$/i, '').replace(/\s+/g, '-')}`] = generatePopulation({
      mean: g.avgScore,
      stdDev: 13,
      sampleSize: g.peerCount,
      label: g.name,
    }, SEEDS.geoBase + i);
  });

  // Per-size
  SIZE_BENCHMARKS.forEach((s, i) => {
    pops[`size:${s.size}`] = generatePopulation({
      mean: s.avgScore,
      stdDev: 11,
      sampleSize: s.peerCount,
      label: s.label,
    }, SEEDS.sizeBase + i);
  });

  return pops;
}

export const PEER_POPULATIONS = buildPopulations();

// ── Demo Location Context ────────────────────────────────────

export const DEMO_LOCATION_CONTEXT: Record<string, DemoLocationContext> = {
  downtown: { vertical: 'Restaurant', county: 'fresno', size: '2-10' },
  airport: { vertical: 'Restaurant', county: 'merced', size: '2-10' },
  university: { vertical: 'Restaurant', county: 'stanislaus', size: '2-10' },
};

// ── Population Accessor ──────────────────────────────────────

export function getPeerPopulation(key: string): PeerPopulation {
  return PEER_POPULATIONS[key] ?? PEER_POPULATIONS['industry'];
}

/**
 * Get the most specific peer population for a set of filters.
 * Priority: county > vertical > industry (fallback).
 */
export function getFilteredPopulation(filters: {
  vertical?: string;
  county?: string;
  size?: string;
}): PeerPopulation {
  if (filters.county) {
    const geoKey = `geo:${filters.county.toLowerCase().replace(/\s+county$/i, '').replace(/\s+/g, '-')}`;
    if (PEER_POPULATIONS[geoKey]) return PEER_POPULATIONS[geoKey];
  }
  if (filters.vertical && filters.vertical !== 'All EvidLY Customers') {
    const vertKey = `vertical:${filters.vertical}`;
    if (PEER_POPULATIONS[vertKey]) return PEER_POPULATIONS[vertKey];
  }
  if (filters.size) {
    const sizeKey = `size:${filters.size}`;
    if (PEER_POPULATIONS[sizeKey]) return PEER_POPULATIONS[sizeKey];
  }
  return PEER_POPULATIONS['industry'];
}

// ── Re-exports for convenience ───────────────────────────────

export {
  MONTHLY_TRENDS,
  LOCATION_SUBCATEGORY_SCORES,
  BADGE_QUALIFICATIONS,
  SUBCATEGORY_BENCHMARKS,
  VERTICAL_BENCHMARKS,
  GEO_BENCHMARKS,
  SIZE_BENCHMARKS,
  type MonthlyTrend,
};
