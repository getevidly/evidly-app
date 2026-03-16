import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface AgreementTemplate {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  content_html: string;
  content_json: any;
  default_term_months: number;
  default_payment_terms: string;
  default_auto_renew: boolean;
  default_cancellation_days: number;
  default_services: any;
  terms_and_conditions: string | null;
  liability_limit: number | null;
  insurance_requirements: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceAgreement {

  id: string;

  vendor_id: string;

  template_id: string | null;

  agreement_number: string;

  organization_id: string;

  location_ids: string[] | null;

  signer_name: string | null;

  signer_title: string | null;

  signer_email: string | null;

  start_date: string;

  end_date: string;

  term_months: number;

  auto_renew: boolean;

  cancellation_notice_days: number;

  pricing_type: string;

  monthly_amount: number | null;

  annual_amount: number | null;

  services: any;

  payment_terms: string;

  billing_frequency: string;

  discount_percent: number;

  discount_reason: string | null;

  status: string;

  sent_at: string | null;

  viewed_at: string | null;

  signed_at: string | null;

  signature_data: any;

  pdf_url: string | null;

  signed_pdf_url: string | null;

  renewed_from_id: string | null;

  renewed_to_id: string | null;

  renewal_reminder_sent: boolean;

  created_by: string | null;

  notes: string | null;

  created_at: string;

  updated_at: string;

}

export interface AgreementActivity {

  id: string;

  agreement_id: string;

  activity_type: string;

  description: string | null;

  performed_by: string | null;

  ip_address: string | null;

  created_at: string;

}

// Templates

export function useAgreementTemplates() {

  const [data, setData] = useState<AgreementTemplate[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    (async () => {

      setLoading(true);

      const { data: templates } = await supabase.from('agreement_templates').select('*').eq('is_active', true).order('created_at', { ascending: false });

      setData(templates || []);

      setLoading(false);

    })();

  }, []);

  return { data, loading };

}

export function useAgreementTemplate(id: string | undefined) {

  const [data, setData] = useState<AgreementTemplate | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (\!id) return;

    (async () => {

      setLoading(true);

      const { data: template } = await supabase.from('agreement_templates').select('*').eq('id', id).single();

      setData(template);

      setLoading(false);

    })();

  }, [id]);

  return { data, loading };

}

export function useCreateAgreementTemplate() {

  const [loading, setLoading] = useState(false);

  const mutate = async (template: Partial<AgreementTemplate>) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('agreement_templates').insert(template).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useUpdateAgreementTemplate() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, updates: Partial<AgreementTemplate>) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('agreement_templates').update(updates).eq('id', id).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useDuplicateAgreementTemplate() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string) => {

    setLoading(true);

    try {

      const { data: original } = await supabase.from('agreement_templates').select('*').eq('id', id).single();

      if (\!original) throw new Error('Template not found');

      const { id: _id, created_at, updated_at, ...rest } = original;

      const { data, error } = await supabase.from('agreement_templates').insert({ ...rest, name: `${rest.name} (Copy)`, is_default: false }).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

// Agreements

export function useAgreements(filters?: { status?: string; organization_id?: string }) {

  const [data, setData] = useState<ServiceAgreement[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {

    setLoading(true);

    try {

      let query = supabase.from('service_agreements').select('*').order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);

      if (filters?.organization_id) query = query.eq('organization_id', filters.organization_id);

      const { data: agreements, error: err } = await query;

      if (err) throw err;

      setData(agreements || []);

    } catch (e: any) {

      setError(e.message);

    } finally {

      setLoading(false);

    }

  }, [filters?.status, filters?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };

}

export function useAgreement(id: string | undefined) {

  const [data, setData] = useState<ServiceAgreement | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (\!id) return;

    (async () => {

      setLoading(true);

      const { data: agreement } = await supabase.from('service_agreements').select('*').eq('id', id).single();

      setData(agreement);

      setLoading(false);

    })();

  }, [id]);

  return { data, loading };

}

export function useCreateAgreement() {

  const [loading, setLoading] = useState(false);

  const mutate = async (agreement: Partial<ServiceAgreement>) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('service_agreements').insert(agreement).select().single();

      if (error) throw error;

      // Log activity

      if (data) {

        await supabase.from('agreement_activities').insert({ agreement_id: data.id, activity_type: 'created', description: 'Agreement created' });

      }

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useUpdateAgreement() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, updates: Partial<ServiceAgreement>) => {

    setLoading(true);

    try {

      const { data, error } = await supabase.from('service_agreements').update(updates).eq('id', id).select().single();

      if (error) throw error;

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useSendAgreement() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, email: string) => {

    setLoading(true);

    try {

      const { data, error } = await supabase

        .from('service_agreements')

        .update({ status: 'sent', sent_at: new Date().toISOString(), signer_email: email })

        .eq('id', id).select().single();

      if (error) throw error;

      await supabase.from('agreement_activities').insert({ agreement_id: id, activity_type: 'sent', description: `Agreement sent to ${email}` });

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useResendAgreement() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string) => {

    setLoading(true);

    try {

      await supabase.from('agreement_activities').insert({ agreement_id: id, activity_type: 'sent', description: 'Agreement resent' });

      return true;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useAgreementActivities(agreementId: string | undefined) {

  const [data, setData] = useState<AgreementActivity[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (\!agreementId) return;

    (async () => {

      setLoading(true);

      const { data: activities } = await supabase

        .from('agreement_activities').select('*').eq('agreement_id', agreementId)

        .order('created_at', { ascending: false });

      setData(activities || []);

      setLoading(false);

    })();

  }, [agreementId]);

  return { data, loading };

}

// Public signing

export function useAgreementByToken(token: string | undefined) {

  const [data, setData] = useState<ServiceAgreement | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (\!token) return;

    (async () => {

      setLoading(true);

      // Token is the agreement ID for now

      const { data: agreement } = await supabase.from('service_agreements').select('*').eq('id', token).single();

      if (agreement && \!agreement.viewed_at) {

        await supabase.from('service_agreements').update({ viewed_at: new Date().toISOString(), status: 'viewed' }).eq('id', token);

        await supabase.from('agreement_activities').insert({ agreement_id: token, activity_type: 'viewed', description: 'Agreement viewed by customer' });

      }

      setData(agreement);

      setLoading(false);

    })();

  }, [token]);

  return { data, loading };

}

export function useSignAgreement() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, signatureData: { name: string; title: string; signature: any }) => {

    setLoading(true);

    try {

      const { data, error } = await supabase

        .from('service_agreements')

        .update({

          status: 'signed',

          signed_at: new Date().toISOString(),

          signer_name: signatureData.name,

          signer_title: signatureData.title,

          signature_data: signatureData.signature,

        })

        .eq('id', id).select().single();

      if (error) throw error;

      await supabase.from('agreement_activities').insert({ agreement_id: id, activity_type: 'signed', description: `Signed by ${signatureData.name}` });

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

// Renewal

export function useRenewAgreement() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, updates?: Partial<ServiceAgreement>) => {

    setLoading(true);

    try {

      const { data: original } = await supabase.from('service_agreements').select('*').eq('id', id).single();

      if (\!original) throw new Error('Agreement not found');

      const newStart = new Date(original.end_date);

      const newEnd = new Date(newStart);

      newEnd.setMonth(newEnd.getMonth() + (original.term_months || 12));

      const { id: _id, created_at, updated_at, ...rest } = original;

      const renewed = {

        ...rest,

        ...updates,

        agreement_number: `${original.agreement_number}-R`,

        start_date: newStart.toISOString().split('T')[0],

        end_date: newEnd.toISOString().split('T')[0],

        status: 'draft',

        renewed_from_id: id,

        sent_at: null, viewed_at: null, signed_at: null, signature_data: null,

        pdf_url: null, signed_pdf_url: null, renewal_reminder_sent: false,

      };

      const { data, error } = await supabase.from('service_agreements').insert(renewed).select().single();

      if (error) throw error;

      await supabase.from('service_agreements').update({ renewed_to_id: data.id, status: 'renewed' }).eq('id', id);

      await supabase.from('agreement_activities').insert({ agreement_id: id, activity_type: 'renewed', description: `Renewed as ${data.agreement_number}` });

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useCancelAgreement() {

  const [loading, setLoading] = useState(false);

  const mutate = async (id: string, reason?: string) => {

    setLoading(true);

    try {

      const { data, error } = await supabase

        .from('service_agreements')

        .update({ status: 'cancelled' })

        .eq('id', id).select().single();

      if (error) throw error;

      await supabase.from('agreement_activities').insert({ agreement_id: id, activity_type: 'cancelled', description: reason || 'Agreement cancelled' });

      return data;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useExpiringAgreements(days: number = 30) {

  const [data, setData] = useState<ServiceAgreement[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    (async () => {

      setLoading(true);

      const futureDate = new Date();

      futureDate.setDate(futureDate.getDate() + days);

      const { data: agreements } = await supabase

        .from('service_agreements')

        .select('*')

        .eq('status', 'active')

        .lte('end_date', futureDate.toISOString().split('T')[0])

        .order('end_date', { ascending: true });

      setData(agreements || []);

      setLoading(false);

    })();

  }, [days]);

  return { data, loading };

}

export function useGenerateAgreementPdf() {

  const [loading, setLoading] = useState(false);

  const mutate = async (agreementId: string) => {

    setLoading(true);

    try {

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-agreement-pdf`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },

        body: JSON.stringify({ agreement_id: agreementId }),

      });

      const result = await response.json();

      if (\!result.success) throw new Error(result.error);

      return result;

    } finally {

      setLoading(false);

    }

  };

  return { mutate, loading };

}

export function useDownloadAgreementPdf() {

  const mutate = async (agreementId: string) => {

    const { data: agreement } = await supabase.from('service_agreements').select('pdf_url, signed_pdf_url').eq('id', agreementId).single();

    const url = agreement?.signed_pdf_url || agreement?.pdf_url;

    if (url) window.open(url, '_blank');

  };

  return { mutate };

}

export function useAgreementStats() {

  const [data, setData] = useState<{ active: number; pending: number; expiringSoon: number; monthlyValue: number } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    (async () => {

      const { data: agreements } = await supabase.from('service_agreements').select('*');

      if (\!agreements || agreements.length === 0) {

        setData({ active: 0, pending: 0, expiringSoon: 0, monthlyValue: 0 });

        setLoading(false);

        return;

      }

      const active = agreements.filter(a => a.status === 'active' || a.status === 'signed').length;

      const pending = agreements.filter(a => a.status === 'sent' || a.status === 'viewed').length;

      const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);

      const expiringSoon = agreements.filter(a => (a.status === 'active' || a.status === 'signed') && new Date(a.end_date) <= thirtyDays).length;

      const monthlyValue = agreements.filter(a => a.status === 'active' || a.status === 'signed').reduce((s, a) => s + (a.monthly_amount || 0), 0);

      setData({ active, pending, expiringSoon, monthlyValue });

      setLoading(false);

    })();

  }, []);

  return { data, loading };

}

export function useMonthlyRecurringValue() {

  const { data } = useAgreementStats();

  return data?.monthlyValue || 0;

}
