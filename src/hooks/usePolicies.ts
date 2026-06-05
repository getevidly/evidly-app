import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────

export interface PolicyTemplate {
  id: string;
  pillar: string;
  category: string;
  title: string;
  body_sections: PolicySection[];
  citation_refs: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OrgPolicy {
  id: string;
  organization_id: string;
  template_id: string | null;
  pillar: string;
  category: string;
  title: string;
  body_sections: PolicySection[];
  status: 'draft' | 'active' | 'archived';
  version: number;
  effective_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicySection {
  heading: string;
  content: string;
}

// ── useOrgPolicies ───────────────────────────────────────

export function useOrgPolicies(orgId: string | undefined) {
  const [policies, setPolicies] = useState<OrgPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('org_policies')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false });
    if (err) setError(new Error(err.message));
    else setPolicies((data || []) as OrgPolicy[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { policies, loading, error, refetch: fetch };
}

// ── usePolicyTemplates ───────────────────────────────────

export function usePolicyTemplates() {
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('policy_templates')
        .select('*')
        .order('pillar, title');
      if (err) setError(new Error(err.message));
      else setTemplates((data || []) as PolicyTemplate[]);
      setLoading(false);
    })();
  }, []);

  return { templates, loading, error };
}

// ── usePolicy (single) ──────────────────────────────────

export function usePolicy(id: string | undefined) {
  const [policy, setPolicy] = useState<OrgPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('org_policies')
      .select('*')
      .eq('id', id)
      .single();
    if (err) setError(new Error(err.message));
    else setPolicy(data as OrgPolicy);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { policy, loading, error, refetch: fetch };
}

// ── adoptTemplate ────────────────────────────────────────

export async function adoptTemplate(
  orgId: string,
  userId: string,
  templateId: string,
): Promise<OrgPolicy> {
  const { data: template, error: tErr } = await supabase
    .from('policy_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (tErr || !template) throw new Error(tErr?.message || 'Template not found');

  const { data: newPolicy, error: iErr } = await supabase
    .from('org_policies')
    .insert({
      organization_id: orgId,
      template_id: template.id,
      pillar: template.pillar,
      category: template.category,
      title: template.title,
      body_sections: template.body_sections,
      status: 'draft',
      version: 1,
      effective_date: null,
      created_by: userId,
    })
    .select()
    .single();

  if (iErr || !newPolicy) throw new Error(iErr?.message || 'Failed to adopt template');

  return newPolicy as OrgPolicy;
}
