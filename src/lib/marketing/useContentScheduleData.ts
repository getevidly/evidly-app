/**
 * useContentScheduleData — Supabase reads/writes for the Content Schedule tab.
 *
 * Reads:  content_schedule (filtered by month), marketing_channels (for dropdown)
 * Writes: content_schedule (insert, update, delete)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// ── Row types ────────────────────────────────────────────────────

export interface ContentPostRow {
  id: string;
  title: string;
  channel_id: string | null;
  channel_label: string;
  scheduled_date: string;
  status: string;
  prp_band: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelOption {
  id: string;
  label: string;
  category: string;
  prp_band: string;
}

export interface AddPostInput {
  title: string;
  channel_id: string | null;
  channel_label: string;
  scheduled_date: string;
  status: string;
  prp_band: string | null;
  notes: string;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useContentScheduleData(year: number, month: number) {
  const [posts, setPosts] = useState<ContentPostRow[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range for the viewed month
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, '0')}-01`;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Channels (for dropdown)
    try {
      const { data, error: chErr } = await supabase
        .from('marketing_channels')
        .select('id, label, category, prp_band')
        .eq('is_active', true)
        .order('sort_order');
      if (chErr) throw chErr;
      setChannels((data || []) as ChannelOption[]);
    } catch {
      setChannels([]);
    }

    // Posts for the viewed month
    try {
      const { data, error: pErr } = await supabase
        .from('content_schedule')
        .select('*')
        .gte('scheduled_date', firstDay)
        .lt('scheduled_date', lastDay)
        .order('scheduled_date');
      if (pErr) throw pErr;
      setPosts((data || []) as ContentPostRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load schedule';
      setError(msg);
      setPosts([]);
    }

    setLoading(false);
  }, [firstDay, lastDay]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Add post ─────────────────────────────────────────────────

  const addPost = async (input: AddPostInput): Promise<{ error: string | null }> => {
    const { error: insertErr } = await supabase
      .from('content_schedule')
      .insert({
        title: input.title,
        channel_id: input.channel_id || null,
        channel_label: input.channel_label,
        scheduled_date: input.scheduled_date,
        status: input.status,
        prp_band: input.prp_band || null,
        notes: input.notes || null,
      });
    if (insertErr) return { error: insertErr.message };
    await refresh();
    return { error: null };
  };

  // ── Update post ──────────────────────────────────────────────

  const updatePost = async (
    id: string,
    fields: Partial<Omit<ContentPostRow, 'id' | 'created_at'>>,
  ): Promise<{ error: string | null }> => {
    const { error: upErr } = await supabase
      .from('content_schedule')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) return { error: upErr.message };
    await refresh();
    return { error: null };
  };

  // ── Delete post ──────────────────────────────────────────────

  const deletePost = async (id: string): Promise<{ error: string | null }> => {
    const { error: delErr } = await supabase
      .from('content_schedule')
      .delete()
      .eq('id', id);
    if (delErr) return { error: delErr.message };
    await refresh();
    return { error: null };
  };

  return { posts, channels, loading, error, refresh, addPost, updatePost, deletePost };
}
