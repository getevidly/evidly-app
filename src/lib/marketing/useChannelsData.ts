/**
 * useChannelsData — Supabase reads/writes for the Marketing Channels tab.
 *
 * Reads:  marketing_channels (definitions), marketing_channel_actuals (current month)
 * Writes: marketing_channel_actuals (upsert on channel_id + period_month)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// ── Row types ────────────────────────────────────────────────────

export interface ChannelRow {
  id: string;
  slug: string;
  label: string;
  category: string;
  prp_band: string;
  sort_order: number;
  is_active: boolean;
}

export interface ChannelActualRow {
  id: string;
  channel_id: string;
  period_month: string;
  demos: number;
  spend_cents: number;
  notes: string | null;
  updated_by: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────

/** First day of the current month as YYYY-MM-DD */
function currentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useChannelsData() {
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [actuals, setActuals] = useState<ChannelActualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Channel definitions
    try {
      const { data, error: chErr } = await supabase
        .from('marketing_channels')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (chErr) throw chErr;
      setChannels((data || []) as ChannelRow[]);
    } catch {
      setChannels([]);
    }

    // Current-month actuals
    try {
      const { data, error: actErr } = await supabase
        .from('marketing_channel_actuals')
        .select('*')
        .eq('period_month', currentMonth());
      if (actErr) throw actErr;
      setActuals((data || []) as ChannelActualRow[]);
    } catch {
      setActuals([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Upsert a single field on a channel's current-month row ────

  const upsertActual = async (
    channelId: string,
    field: 'demos' | 'spend_cents',
    value: number,
  ): Promise<{ error: string | null }> => {
    const month = currentMonth();
    const existing = actuals.find(
      (a) => a.channel_id === channelId && a.period_month === month,
    );

    const row: Record<string, unknown> = {
      channel_id: channelId,
      period_month: month,
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    // Carry forward the other field so upsert doesn't zero it out
    if (existing) {
      if (field === 'demos') row.spend_cents = existing.spend_cents;
      else row.demos = existing.demos;
    }

    const { error: upsertErr } = await supabase
      .from('marketing_channel_actuals')
      .upsert(row, { onConflict: 'channel_id,period_month' });

    if (upsertErr) return { error: upsertErr.message };
    await refresh();
    return { error: null };
  };

  return { channels, actuals, loading, error, refresh, upsertActual };
}
