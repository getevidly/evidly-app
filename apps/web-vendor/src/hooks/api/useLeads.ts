import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface Lead {
  id: string;
  vendor_id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lead_source: string;
  lead_type: string;
  industry: string | null;
  kitchen_type: string | null;
  estimated_value: number | null;
  estimated_monthly_value: number | null;
  pipeline_stage: string;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  last_contact_at: string | null;
  next_followup_at: string | null;
  followup_count: number;
  organization_id: string | null;
  converted_at: string | null;
  lost_reason: string | null;
  lost_at: string | null;
  campaign_id: string | null;
  utm_source: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string | null;
  outcome: string | null;
  call_duration_seconds: number | null;
  email_subject: string | null;
  meeting_date: string | null;
  meeting_location: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface SalesGoal {
  id: string;
  employee_id: string | null;
  period_type: string;
  period_start: string;
  period_end: string;
  revenue_target: number | null;
  new_customers_target: number | null;
  leads_target: number | null;
  jobs_target: number | null;
  revenue_actual: number;
  new_customers_actual: number;
  leads_actual: number;
  jobs_actual: number;
}

export interface PipelineStats {
  totalValue: number;
  leadsThisMonth: number;
  conversionRate: number;
  avgDaysToClose: number;
  stageBreakdown: Record<string, number>;
}

export function useLeads(filters?: { stage?: string; source?: string; assigned_to?: string }) {

  const [data, setData] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {

    setLoading(true);

    try {

      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

      if (filters?.stage) query = query.eq('pipeline_stage', filters.stage);

      if (filters?.source) query = query.eq('lead_source', filters.source);

      if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

      const { data: leads, error: err } = await query;

      if (err) throw err;

      setData(leads || []);

    } catch (e: any) {

      setError(e.message);

    } finally {

      setLoading(false);

    }

  }, [filters?.stage, filters?.source, filters?.assigned_to]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };

}

export function useLead(id: string | undefined) {

  const [data, setData] = useState<Lead | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    if (\!id) return;

    (async () => {

      setLoading(true);

      try {

        const { data: lead, error: err } = await supabase

          .from('leads').select('*').eq('id', id).single();

        if (err) throw err;

        setData(lead);

      } catch (e: any) {

        setError(e.message);

      } finally {

        setLoading(false);

      }

    })();

  }, [id]);

  return { data, loading, error };

}

export function useCreateLead() {

  const [loading, setLoading] = useState(false);

  const mutate = async (lead: Partial<Lead>) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('leads').insert(lead).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useUpdateLead() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, updates: Partial<Lead>) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useUpdateLeadStage() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, stage: string, probability?: number) => {

    setLoading(true);

    try {

      const updates: any = { pipeline_stage: stage };

      if (probability \!== undefined) updates.probability = probability;

      if (stage === 'won') updates.converted_at = new Date().toISOString();

      if (stage === 'lost') updates.lost_at = new Date().toISOString();

      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useConvertLead() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, organizationId: string) => {

    setLoading(true);

    try {

      const { data, error } = await supabase

        .from('leads')

        .update({

          pipeline_stage: 'won',

          lead_type: 'customer',

          organization_id: organizationId,

          converted_at: new Date().toISOString(),

        })

        .eq('id', id).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useLeadActivities(leadId: string | undefined) {

  const [data, setData] = useState<LeadActivity[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (\!leadId) return;

    (async () => {

      setLoading(true);

      const { data: activities } = await supabase

        .from('lead_activities').select('*').eq('lead_id', leadId)

        .order('created_at', { ascending: false });

      setData(activities || []);

      setLoading(false);

    })();

  }, [leadId]);

  return { data, loading };

}

export function useLogActivity() {

  const [loading, setLoading] = useState(false);

  const mutate = async (activity: Partial<LeadActivity> & { lead_id: string; activity_type: string; vendor_id: string }) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('lead_activities').insert(activity).select().single();

      if (error) throw error;

      // Update last_contact_at on lead

      await supabase.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', activity.lead_id);

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function usePipelineStats() {

  const [data, setData] = useState<PipelineStats | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    (async () => {

      setLoading(true);

      const { data: leads } = await supabase.from('leads').select('*');

      if (\!leads || leads.length === 0) {

        setData({ totalValue: 0, leadsThisMonth: 0, conversionRate: 0, avgDaysToClose: 0, stageBreakdown: {} });

        setLoading(false);

        return;

      }

      const now = new Date();

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

      const leadsThisMonth = leads.filter(l => l.created_at >= monthStart).length;

      const won = leads.filter(l => l.pipeline_stage === 'won').length;

      const conversionRate = leads.length > 0 ? (won / leads.length) * 100 : 0;

      const stageBreakdown: Record<string, number> = {};

      leads.forEach(l => { stageBreakdown[l.pipeline_stage] = (stageBreakdown[l.pipeline_stage] || 0) + 1; });

      setData({ totalValue, leadsThisMonth, conversionRate: Math.round(conversionRate), avgDaysToClose: 0, stageBreakdown });

      setLoading(false);

    })();

  }, []);

  return { data, loading };

}

export function useSalesGoals() {

  const [data, setData] = useState<SalesGoal[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    (async () => {

      setLoading(true);

      const { data: goals } = await supabase.from('sales_goals').select('*').order('period_start', { ascending: false });

      setData(goals || []);

      setLoading(false);

    })();

  }, []);

  return { data, loading };

}
