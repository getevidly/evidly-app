import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface Campaign {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  target_audience: string | null;
  target_criteria: any;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  subject_line: string | null;
  message_body: string | null;
  template_id: string | null;
  budget: number | null;
  spent: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  responded_count: number;
  leads_generated: number;
  revenue_attributed: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViolationOutreachRecord {
  id: string;
  vendor_id: string;
  campaign_id: string | null;
  source: string;
  source_url: string | null;
  violation_date: string | null;
  violation_type: string | null;
  business_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  outreach_method: string | null;
  outreach_count: number;
  last_outreach_at: string | null;
  lead_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface OutreachSequence {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
  steps?: SequenceStep[];
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  action_type: string;
  subject: string | null;
  message: string | null;
  skip_if: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  merge_fields: string[];
  category: string;
}

export function useCampaigns(filters?: { status?: string; type?: string }) {

  const [data, setData] = useState<Campaign[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {

    setLoading(true);

    try {

      let query = supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);

      if (filters?.type) query = query.eq('campaign_type', filters.type);

      const { data: campaigns, error: err } = await query;

      if (err) throw err;

      setData(campaigns || []);

    } catch (e: any) {

      setError(e.message);

    } finally {

      setLoading(false);

    }

  }, [filters?.status, filters?.type]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };

}

export function useCampaign(id: string | undefined) {

  const [data, setData] = useState<Campaign | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (\!id) return;

    (async () => {

      setLoading(true);

      const { data: campaign } = await supabase.from('marketing_campaigns').select('*').eq('id', id).single();

      setData(campaign);

      setLoading(false);

    })();

  }, [id]);

  return { data, loading };

}

export function useCreateCampaign() {

  const [loading, setLoading] = useState(false);

  const mutate = async (campaign: Partial<Campaign>) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('marketing_campaigns').insert(campaign).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useLaunchCampaign() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string) => {

    setLoading(true);

    try {

      const { data, error } = await supabase

        .from('marketing_campaigns')

        .update({ status: 'active', starts_at: new Date().toISOString() })

        .eq('id', id).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function usePauseCampaign() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string) => {

    setLoading(true);

    try {

      const { data, error } = await supabase

        .from('marketing_campaigns')

        .update({ status: 'paused' })

        .eq('id', id).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useCampaignStats() {

  const [data, setData] = useState<{ active: number; totalSent: number; avgOpenRate: number; leadsGenerated: number } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    (async () => {

      const { data: campaigns } = await supabase.from('marketing_campaigns').select('*');

      if (\!campaigns || campaigns.length === 0) {

        setData({ active: 0, totalSent: 0, avgOpenRate: 0, leadsGenerated: 0 });

        setLoading(false);

        return;

      }

      const active = campaigns.filter(c => c.status === 'active').length;

      const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);

      const totalOpened = campaigns.reduce((s, c) => s + (c.opened_count || 0), 0);

      const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

      const leadsGenerated = campaigns.reduce((s, c) => s + (c.leads_generated || 0), 0);

      setData({ active, totalSent, avgOpenRate, leadsGenerated });

      setLoading(false);

    })();

  }, []);

  return { data, loading };

}

export function useViolationOutreach(filters?: { status?: string }) {

  const [data, setData] = useState<ViolationOutreachRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {

    setLoading(true);

    let query = supabase.from('violation_outreach').select('*').order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);

    const { data: records } = await query;

    setData(records || []);

    setLoading(false);

  }, [filters?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };

}

export function useImportViolations() {

  const [loading, setLoading] = useState(false);

  const mutate = async (violations: Partial<ViolationOutreachRecord>[]) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('violation_outreach').insert(violations).select();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useEmailTemplates() {

  const [data, setData] = useState<EmailTemplate[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Email templates are stored as static config for now

    setData([

      { id: '1', name: 'New Customer Welcome', subject: 'Welcome to HoodOps\!', body: 'Hi {contact_name}, welcome...', merge_fields: ['contact_name', 'business_name'], category: 'onboarding' },

      { id: '2', name: 'Quote Follow-up', subject: 'Following up on your quote', body: 'Hi {contact_name}, just checking...', merge_fields: ['contact_name', 'quote_amount'], category: 'sales' },

      { id: '3', name: 'Service Reminder', subject: 'Service coming up\!', body: 'Hi {contact_name}, your next service...', merge_fields: ['contact_name', 'next_due_date'], category: 'service' },

      { id: '4', name: 'Re-engagement', subject: 'We miss you, {business_name}\!', body: 'Hi {contact_name}, it has been a while...', merge_fields: ['contact_name', 'business_name', 'last_service_date'], category: 'retention' },

      { id: '5', name: 'Violation Outreach', subject: 'Stay Compliant — Kitchen Exhaust Cleaning', body: 'Hi {contact_name}, we noticed...', merge_fields: ['contact_name', 'business_name'], category: 'outreach' },

      { id: '6', name: 'Referral Request', subject: 'Know someone who needs hood cleaning?', body: 'Hi {contact_name}, thank you for being...', merge_fields: ['contact_name', 'referral_link'], category: 'referral' },

      { id: '7', name: 'Review Request', subject: 'How did we do?', body: 'Hi {contact_name}, we recently serviced...', merge_fields: ['contact_name', 'business_name'], category: 'review' },

      { id: '8', name: 'Seasonal Promotion', subject: 'Spring Cleaning Special — 15% Off', body: 'Hi {contact_name}, spring is here...', merge_fields: ['contact_name', 'business_name'], category: 'promotion' },

    ]);

    setLoading(false);

  }, []);

  return { data, loading };

}

export function useSequences() {

  const [data, setData] = useState<OutreachSequence[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    (async () => {

      setLoading(true);

      const { data: sequences } = await supabase.from('outreach_sequences').select('*, outreach_sequence_steps(*)').order('created_at', { ascending: false });

      setData((sequences || []).map((s: any) => ({ ...s, steps: s.outreach_sequence_steps || [] })));

      setLoading(false);

    })();

  }, []);

  return { data, loading };

}

export function useSequence(id: string | undefined) {

  const [data, setData] = useState<OutreachSequence | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (\!id) return;

    (async () => {

      setLoading(true);

      const { data: seq } = await supabase

        .from('outreach_sequences')

        .select('*, outreach_sequence_steps(*)')

        .eq('id', id).single();

      if (seq) {

        setData({ ...seq, steps: seq.outreach_sequence_steps || [] });

      }

      setLoading(false);

    })();

  }, [id]);

  return { data, loading };

}

export function useCreateSequence() {

  const [loading, setLoading] = useState(false);

  const mutate = async (sequence: Partial<OutreachSequence>, steps: Partial<SequenceStep>[]) => {

    setLoading(true);

    try {

      const { data: seq, error } = await supabase.from('outreach_sequences').insert(sequence).select().single();

      if (error) throw error;

      if (steps.length > 0 && seq) {

        const stepsWithSeqId = steps.map((s, i) => ({ ...s, sequence_id: seq.id, step_order: i + 1 }));

        await supabase.from('outreach_sequence_steps').insert(stepsWithSeqId);

      }

      return seq;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}
