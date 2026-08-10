/**
 * useForecastData — Supabase reads/writes for the Forecast vs Actual tab.
 *
 * Reads:  campaign_forecast (all rows, newest period first)
 *         marketing_channels (for dropdown + label→id map)
 *         marketing_channel_actuals (all months, for matching)
 * Writes: campaign_forecast (upsert on period + channel, delete)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// ── Row types ────────────────────────────────────────────────────

export interface ForecastRow {
  id: string;
  period: string;
  channel: string;
  forecast_demos: number;
  forecast_spend_cents: number;
  created_at: string;
  updated_at: string;
}

export interface ChannelRef {
  id: string;
  label: string;
}

export interface ActualRef {
  channel_id: string;
  period_month: string;
  demos: number;
  spend_cents: number;
}

export interface UpsertForecastInput {
  period: string;        // YYYY-MM-01
  channel: string;       // channel label
  forecast_demos: number;
  forecast_spend_cents: number;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useForecastData() {
  const [forecasts, setForecasts] = useState<ForecastRow[]>([]);
  const [channels, setChannels] = useState<ChannelRef[]>([]);
  const [actuals, setActuals] = useState<ActualRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Forecast rows
      const { data: fData, error: fErr } = await supabase
        .from('campaign_forecast')
        .select('*')
        .order('period', { ascending: false });
      if (fErr) throw fErr;
      setForecasts((fData || []) as ForecastRow[]);

      // Channel definitions (for dropdown)
      const { data: chData, error: chErr } = await supabase
        .from('marketing_channels')
        .select('id, label')
        .eq('is_active', true)
        .order('sort_order');
      if (chErr) throw chErr;
      setChannels((chData || []) as ChannelRef[]);

      // All actuals (for matching to forecast rows)
      const { data: aData, error: aErr } = await supabase
        .from('marketing_channel_actuals')
        .select('channel_id, period_month, demos, spend_cents');
      if (aErr) throw aErr;
      setActuals((aData || []) as ActualRef[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load forecast data';
      setError(msg);
      setForecasts([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Upsert forecast row ────────────────────────────────────────

  const upsertForecast = async (input: UpsertForecastInput): Promise<{ error: string | null }> => {
    const { error: upsertErr } = await supabase
      .from('campaign_forecast')
      .upsert(
        {
          period: input.period,
          channel: input.channel,
          forecast_demos: input.forecast_demos,
          forecast_spend_cents: input.forecast_spend_cents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'period,channel' },
      );
    if (upsertErr) return { error: upsertErr.message };
    await refresh();
    return { error: null };
  };

  // ── Delete forecast row ────────────────────────────────────────

  const deleteForecast = async (id: string): Promise<{ error: string | null }> => {
    const { error: delErr } = await supabase
      .from('campaign_forecast')
      .delete()
      .eq('id', id);
    if (delErr) return { error: delErr.message };
    await refresh();
    return { error: null };
  };

  return { forecasts, channels, actuals, loading, error, refresh, upsertForecast, deleteForecast };
}
