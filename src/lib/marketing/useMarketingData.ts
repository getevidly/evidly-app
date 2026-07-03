/**
 * useMarketingData — Supabase reads/writes for the Marketing console
 *
 * Reads:  sales_pipeline, marketing_influencers, marketing_relationship_types, marketing_sends
 * Writes: sales_pipeline (addAccount, updateAccount)
 *         marketing_influencers / types / sends — stub signatures, wired in 3b/3c
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// ── Row types ────────────────────────────────────────────────────

export interface AccountRow {
  id: string;
  org_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_title: string | null;
  segment: string | null;
  county: string | null;
  location_count: number;
  estimated_mrr_cents: number;
  stage: string;
  buyer_type: string | null;
  broker_id: string | null;
  insurer: string | null;
  source: string | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InfluencerRow {
  id: string;
  type_id: string | null;
  name: string;
  org: string | null;
  contact_email: string | null;
  created_at: string;
}

export interface RelationshipTypeRow {
  id: string;
  name: string;
  is_hero: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface SendRow {
  id: string;
  sent_at: string;
}

// ── Add-account input ────────────────────────────────────────────

export interface AddAccountInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  role?: string;
  segment?: string;
  county?: string;
  locations?: number;
  mrr?: number;
  stage?: string;
  buyerType?: string;
  brokerId?: string | null;
  insurer?: string;
  source?: string;
  nextAction?: string;
  notes?: string;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useMarketingData() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [influencers, setInfluencers] = useState<InfluencerRow[]>([]);
  const [types, setTypes] = useState<RelationshipTypeRow[]>([]);
  const [sends, setSends] = useState<SendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Accounts — always query
      const { data: acctData, error: acctErr } = await supabase
        .from('sales_pipeline')
        .select('*')
        .order('created_at', { ascending: false });
      if (acctErr) throw acctErr;
      setAccounts((acctData || []) as AccountRow[]);

      // Influencers — may not exist yet; fail gracefully
      try {
        const { data: infData } = await supabase
          .from('marketing_influencers')
          .select('*')
          .order('created_at', { ascending: false });
        setInfluencers((infData || []) as InfluencerRow[]);
      } catch { setInfluencers([]); }

      // Relationship types — may not exist yet
      try {
        const { data: typeData } = await supabase
          .from('marketing_relationship_types')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        setTypes((typeData || []) as RelationshipTypeRow[]);
      } catch { setTypes([]); }

      // Sends — may not exist yet
      try {
        const { data: sendData } = await supabase
          .from('marketing_sends')
          .select('*')
          .order('sent_at', { ascending: false });
        setSends((sendData || []) as SendRow[]);
      } catch { setSends([]); }
    } catch (err: any) {
      console.error('[useMarketingData] refresh failed:', err);
      setError(err?.message || 'Failed to load marketing data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── CRUD: Accounts ──────────────────────────────────────────────

  const addAccount = async (form: AddAccountInput): Promise<{ error: string | null }> => {
    const { error: insertErr } = await supabase
      .from('sales_pipeline')
      .insert({
        org_name: form.name,
        contact_name: form.contactName || null,
        contact_email: form.contactEmail || null,
        contact_title: form.role || null,
        segment: form.segment || null,
        county: form.county || null,
        location_count: form.locations ?? 1,
        estimated_mrr_cents: (form.mrr ?? 0) * 100,
        stage: form.stage || 'prospect',
        buyer_type: form.buyerType || null,
        broker_id: form.brokerId || null,
        insurer: form.insurer || null,
        source: form.source || null,
        next_action: form.nextAction || null,
        notes: form.notes || null,
      });
    if (insertErr) return { error: insertErr.message };
    await refresh();
    return { error: null };
  };

  const updateAccount = async (
    id: string,
    patch: Partial<AccountRow>,
  ): Promise<{ error: string | null }> => {
    const { error: updateErr } = await supabase
      .from('sales_pipeline')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateErr) return { error: updateErr.message };
    await refresh();
    return { error: null };
  };

  // ── Stubs: wired in 3b/3c ──────────────────────────────────────

  const addInfluencer = async (_form: Partial<InfluencerRow>): Promise<{ error: string | null }> => {
    return { error: 'Not implemented — Phase 3b' };
  };

  const addType = async (_form: Partial<RelationshipTypeRow>): Promise<{ error: string | null }> => {
    return { error: 'Not implemented — Phase 3b' };
  };

  const recordSend = async (_form: Partial<SendRow>): Promise<{ error: string | null }> => {
    return { error: 'Not implemented — Phase 3c' };
  };

  return {
    accounts,
    influencers,
    types,
    sends,
    loading,
    error,
    refresh,
    addAccount,
    updateAccount,
    addInfluencer,
    addType,
    recordSend,
  };
}
