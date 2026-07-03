/**
 * useMarketingData — Supabase reads/writes for the Marketing console
 *
 * Reads:  sales_pipeline, marketing_influencers, marketing_relationship_types, marketing_sends
 * Writes: sales_pipeline (addAccount, updateAccount, setBroker)
 *         marketing_influencers (addInfluencer)
 *         marketing_relationship_types (addType)
 *         marketing_sends — stub (Phase 3c)
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
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  stage: string | null;
  notes: string | null;
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

// ── Input types ──────────────────────────────────────────────────

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

export interface AddInfluencerInput {
  name: string;
  org?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  typeId?: string | null;
  stage?: string | null;
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

      // Influencers
      try {
        const { data: infData } = await supabase
          .from('marketing_influencers')
          .select('*')
          .order('created_at', { ascending: false });
        setInfluencers((infData || []) as InfluencerRow[]);
      } catch { setInfluencers([]); }

      // Relationship types
      try {
        const { data: typeData } = await supabase
          .from('marketing_relationship_types')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        setTypes((typeData || []) as RelationshipTypeRow[]);
      } catch { setTypes([]); }

      // Sends — stub read (Phase 3c)
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

  // ── setBroker: link/unlink a champion on an account ─────────────

  const setBroker = async (
    accountId: string,
    brokerId: string | null,
  ): Promise<{ error: string | null }> => {
    const { error: updateErr } = await supabase
      .from('sales_pipeline')
      .update({ broker_id: brokerId, updated_at: new Date().toISOString() })
      .eq('id', accountId);
    if (updateErr) return { error: updateErr.message };
    await refresh();
    return { error: null };
  };

  // ── CRUD: Relationship types ────────────────────────────────────

  const addType = async (name: string): Promise<{ error: string | null }> => {
    // Determine next sort_order
    const maxSort = types.reduce((mx, t) => Math.max(mx, t.sort_order), 0);
    const { error: insertErr } = await supabase
      .from('marketing_relationship_types')
      .insert({ name, is_hero: false, sort_order: maxSort + 1 });
    if (insertErr) return { error: insertErr.message };
    await refresh();
    return { error: null };
  };

  // ── CRUD: Influencers ───────────────────────────────────────────

  const addInfluencer = async (form: AddInfluencerInput): Promise<{ error: string | null }> => {
    const { error: insertErr } = await supabase
      .from('marketing_influencers')
      .insert({
        name: form.name,
        org: form.org || null,
        contact_name: form.contactName || null,
        contact_email: form.contactEmail || null,
        contact_phone: form.contactPhone || null,
        type_id: form.typeId || null,
        stage: form.stage || null,
        notes: form.notes || null,
      });
    if (insertErr) return { error: insertErr.message };
    await refresh();
    return { error: null };
  };

  // ── Stub: sends (Phase 3c) ─────────────────────────────────────

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
    setBroker,
    addInfluencer,
    addType,
    recordSend,
  };
}
