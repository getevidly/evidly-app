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
  brand: string | null;
  body: string | null;
  cta: string | null;
  post_type: string | null;
  brief: string | null;
  post_as: string;
}

export interface AddPostInput {
  title: string;
  channel_label: string;
  scheduled_date: string;
  status: string;
  owner: string;
  notes: string;
  body: string;
  cta: string;
  post_type: string;
}

export interface BaselineInfo {
  savedAt: string;
  count: number;
  name: string;
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
      // Paginate to fetch ALL rows — PostgREST caps at 1000 per request
      const allRows: ContentPostRow[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error: pErr } = await supabase
          .from('content_schedule')
          .select('*')
          .order('scheduled_date', { ascending: true })
          .range(from, from + PAGE - 1);
        if (pErr) throw pErr;
        if (!data || data.length === 0) break;
        allRows.push(...(data as ContentPostRow[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setPosts(allRows);
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
        body: input.body || null,
        cta: input.cta || null,
        post_type: input.post_type || null,
      });
    if (insertErr) return { error: insertErr.message };
    await refresh();
    return { error: null };
  };

  // ── Update post ─────────────────────────────────────────────

  const updatePost = async (id: string, input: AddPostInput): Promise<{ error: string | null }> => {
    const { error: updateErr } = await supabase
      .from('content_schedule')
      .update({
        title: input.title,
        channel_label: input.channel_label,
        scheduled_date: input.scheduled_date,
        status: input.status,
        owner: input.owner || null,
        notes: input.notes || null,
        body: input.body || null,
        cta: input.cta || null,
        post_type: input.post_type || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (updateErr) return { error: updateErr.message };
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

  // ── Bulk update dates ──────────────────────────────────────────

  const bulkUpdateDates = async (
    updates: { id: string; scheduled_date: string }[],
  ): Promise<{ error: string | null }> => {
    if (updates.length === 0) return { error: 'No posts to update' };
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(u =>
          supabase
            .from('content_schedule')
            .update({
              scheduled_date: u.scheduled_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', u.id),
        ),
      );
      const failed = results.find(r => r.error);
      if (failed?.error) return { error: failed.error.message };
    }
    await refresh();
    return { error: null };
  };

  // ── Bulk update post_as ────────────────────────────────────────

  const bulkUpdatePostAs = async (
    ids: string[],
    value: 'personal' | 'company',
  ): Promise<{ error: string | null }> => {
    if (ids.length === 0) return { error: 'No posts to update' };
    const batchSize = 50;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(id =>
          supabase
            .from('content_schedule')
            .update({
              post_as: value,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id),
        ),
      );
      const failed = results.find(r => r.error);
      if (failed?.error) return { error: failed.error.message };
    }
    await refresh();
    return { error: null };
  };

  // ── Save baseline ────────────────────────────────────────────

  const saveBaseline = async (): Promise<{ count: number }> => {
    // Paginate content_schedule to get all rows
    const allRows: { id: string; scheduled_date: string }[] = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error: fetchErr } = await supabase
        .from('content_schedule')
        .select('id, scheduled_date')
        .range(from, from + PAGE - 1);
      if (fetchErr) throw new Error(fetchErr.message);
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    if (allRows.length === 0) throw new Error('No posts to save');

    // Upsert into content_schedule_baseline in batches of 500
    const now = new Date().toISOString();
    const BATCH = 500;
    for (let i = 0; i < allRows.length; i += BATCH) {
      const batch = allRows.slice(i, i + BATCH).map(r => ({
        content_id: r.id,
        baseline_date: r.scheduled_date,
        saved_at: now,
        baseline_name: 'Launch schedule',
      }));
      const { error: upsertErr } = await supabase
        .from('content_schedule_baseline')
        .upsert(batch, { onConflict: 'content_id' });
      if (upsertErr) throw new Error(upsertErr.message);
    }

    return { count: allRows.length };
  };

  // ── Restore baseline ──────────────────────────────────────────

  const restoreBaseline = async (): Promise<{ count: number }> => {
    // Paginate content_schedule_baseline to get all rows
    const allRows: { content_id: string; baseline_date: string }[] = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error: fetchErr } = await supabase
        .from('content_schedule_baseline')
        .select('content_id, baseline_date')
        .range(from, from + PAGE - 1);
      if (fetchErr) throw new Error(fetchErr.message);
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    if (allRows.length === 0) throw new Error('No baseline to restore');

    // Build updates and use existing bulkUpdateDates
    const updates = allRows.map(r => ({
      id: r.content_id,
      scheduled_date: r.baseline_date,
    }));
    const { error: bulkErr } = await bulkUpdateDates(updates);
    if (bulkErr) throw new Error(bulkErr);

    return { count: updates.length };
  };

  // ── Baseline info ─────────────────────────────────────────────

  const fetchBaselineInfo = async (): Promise<BaselineInfo | null> => {
    const { data, error: infoErr } = await supabase
      .from('content_schedule_baseline')
      .select('saved_at, baseline_name')
      .order('saved_at', { ascending: false })
      .limit(1);
    if (infoErr) throw new Error(infoErr.message);
    if (!data || data.length === 0) return null;

    const { count, error: countErr } = await supabase
      .from('content_schedule_baseline')
      .select('*', { count: 'exact', head: true });
    if (countErr) throw new Error(countErr.message);

    return {
      savedAt: data[0].saved_at,
      count: count ?? 0,
      name: data[0].baseline_name ?? 'Launch schedule',
    };
  };

  return {
    posts, loading, error, refresh,
    addPost, updatePost, deletePost, bulkUpdateDates, bulkUpdatePostAs,
    saveBaseline, restoreBaseline, fetchBaselineInfo,
  };
}
