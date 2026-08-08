/**
 * useContentScheduleData — Supabase reads/writes for the Content Schedule tab.
 *
 * Reads:  content_schedule (all rows, newest first)
 * Writes: content_schedule (insert, delete)
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
  owner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddPostInput {
  title: string;
  channel_label: string;
  scheduled_date: string;
  status: string;
  owner: string;
  notes: string;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useContentScheduleData() {
  const [posts, setPosts] = useState<ContentPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: pErr } = await supabase
        .from('content_schedule')
        .select('*')
        .order('scheduled_date', { ascending: false });
      if (pErr) throw pErr;
      setPosts((data || []) as ContentPostRow[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load schedule';
      setError(msg);
      setPosts([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Add post ─────────────────────────────────────────────────

  const addPost = async (input: AddPostInput): Promise<{ error: string | null }> => {
    const { error: insertErr } = await supabase
      .from('content_schedule')
      .insert({
        title: input.title,
        channel_id: null,
        channel_label: input.channel_label,
        scheduled_date: input.scheduled_date,
        status: input.status,
        owner: input.owner || null,
        notes: input.notes || null,
      });
    if (insertErr) return { error: insertErr.message };
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

  return { posts, loading, error, refresh, addPost, deletePost };
}
