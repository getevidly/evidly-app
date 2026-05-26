/**
 * useServiceCostIntelligence — aggregates cost data from vendor_service_records.
 * Computes YTD, TTM, YoY delta, forecast with confidence, and benchmark lookup.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type ConfidenceLevel = 'LIMITED_HISTORY' | 'MEDIUM_CONFIDENCE' | 'HIGH_CONFIDENCE' | 'VARIABLE';

export interface CostForecast {
  amount: number;
  rangeMin: number;
  rangeMax: number;
  confidence: ConfidenceLevel;
  sampleCount: number;
  variancePercent: number;
}

export interface CostBenchmark {
  jurisdictionId: string;
  serviceCategory: string;
  sampleSize: number;
  p25: number;
  p50: number;
  p75: number;
}

export interface PerSystemCost {
  safeguardType: string;
  ytd: number;
  ttm: number;
}

export interface CostIntelligence {
  ytdTotal: number;
  ttmTotal: number;
  priorTtmTotal: number;
  yoyDelta: number | null;
  yoyDirection: 'up' | 'down' | 'flat' | null;
  forecast: CostForecast | null;
  benchmark: CostBenchmark | null;
  perSystem: PerSystemCost[];
  vendorName: string | null;
  vendorServiceCount: number;
}

function computeConfidence(prices: number[]): { confidence: ConfidenceLevel; variancePercent: number } {
  const n = prices.length;
  if (n === 0) return { confidence: 'LIMITED_HISTORY', variancePercent: 0 };
  if (n === 1) return { confidence: 'LIMITED_HISTORY', variancePercent: 0 };
  if (n === 2) return { confidence: 'MEDIUM_CONFIDENCE', variancePercent: 0 };
  const avg = prices.reduce((a, b) => a + b, 0) / n;
  if (avg === 0) return { confidence: 'VARIABLE', variancePercent: 0 };
  const maxDev = Math.max(...prices.map(p => Math.abs(p - avg)));
  const variancePercent = (maxDev / avg) * 100;
  if (variancePercent <= 15) return { confidence: 'HIGH_CONFIDENCE', variancePercent };
  return { confidence: 'VARIABLE', variancePercent };
}

export function useServiceCostIntelligence(
  organizationId: string | undefined,
  locationId: string | undefined,
  safeguardTypes: string[],
  jurisdictionId: string | undefined,
) {
  const [data, setData] = useState<CostIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!organizationId || !locationId || safeguardTypes.length === 0) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const now = new Date();
    const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const ttmStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
    const priorTtmStart = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()).toISOString().slice(0, 10);

    try {
      // Fetch all records with cost for last 24 months
      const { data: rows, error: qErr } = await supabase
        .from('vendor_service_records')
        .select('safeguard_type, service_date, price_charged, vendor_name')
        .eq('organization_id', organizationId)
        .eq('location_id', locationId)
        .eq('is_sample', false)
        .in('safeguard_type', safeguardTypes)
        .gte('service_date', priorTtmStart)
        .order('service_date', { ascending: false });

      if (qErr) throw qErr;
      const records = rows || [];

      // Aggregate
      let ytdTotal = 0, ttmTotal = 0, priorTtmTotal = 0;
      const perSystemMap: Record<string, { ytd: number; ttm: number }> = {};
      const recentPrices: number[] = [];
      const vendorCounts: Record<string, number> = {};

      for (const r of records) {
        const price = Number(r.price_charged) || 0;
        const date = r.service_date || '';
        const sg = r.safeguard_type;
        if (!perSystemMap[sg]) perSystemMap[sg] = { ytd: 0, ttm: 0 };

        if (date >= ytdStart && price > 0) {
          ytdTotal += price;
          perSystemMap[sg].ytd += price;
        }
        if (date >= ttmStart && price > 0) {
          ttmTotal += price;
          perSystemMap[sg].ttm += price;
          recentPrices.push(price);
        } else if (date >= priorTtmStart && date < ttmStart && price > 0) {
          priorTtmTotal += price;
        }
        if (r.vendor_name) vendorCounts[r.vendor_name] = (vendorCounts[r.vendor_name] || 0) + 1;
      }

      const yoyDelta = priorTtmTotal > 0 ? ((ttmTotal - priorTtmTotal) / priorTtmTotal) * 100 : null;
      const yoyDirection = yoyDelta === null ? null : yoyDelta > 2 ? 'up' : yoyDelta < -2 ? 'down' : 'flat';

      // Forecast
      let forecast: CostForecast | null = null;
      if (recentPrices.length > 0) {
        const avg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const { confidence, variancePercent } = computeConfidence(recentPrices);
        const margin = avg * (variancePercent / 100);
        forecast = {
          amount: Math.round(avg * 100) / 100,
          rangeMin: Math.round((avg - margin) * 100) / 100,
          rangeMax: Math.round((avg + margin) * 100) / 100,
          confidence,
          sampleCount: recentPrices.length,
          variancePercent: Math.round(variancePercent),
        };
      }

      // Benchmark
      let benchmark: CostBenchmark | null = null;
      if (jurisdictionId) {
        const { data: bRows } = await supabase
          .from('service_cost_benchmarks')
          .select('jurisdiction_id, service_category, sample_size, p25, p50, p75')
          .eq('jurisdiction_id', jurisdictionId)
          .in('service_category', safeguardTypes)
          .limit(1);
        if (bRows && bRows.length > 0) {
          const b = bRows[0];
          benchmark = {
            jurisdictionId: b.jurisdiction_id,
            serviceCategory: b.service_category,
            sampleSize: b.sample_size,
            p25: Number(b.p25),
            p50: Number(b.p50),
            p75: Number(b.p75),
          };
        }
      }

      // Top vendor
      const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0];

      setData({
        ytdTotal: Math.round(ytdTotal * 100) / 100,
        ttmTotal: Math.round(ttmTotal * 100) / 100,
        priorTtmTotal: Math.round(priorTtmTotal * 100) / 100,
        yoyDelta: yoyDelta !== null ? Math.round(yoyDelta) : null,
        yoyDirection,
        forecast,
        benchmark,
        perSystem: Object.entries(perSystemMap).map(([safeguardType, v]) => ({ safeguardType, ...v })),
        vendorName: topVendor ? topVendor[0] : null,
        vendorServiceCount: topVendor ? topVendor[1] : 0,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load cost data');
    }
    setIsLoading(false);
  }, [organizationId, locationId, safeguardTypes.join(','), jurisdictionId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, isLoading, error, refetch };
}
