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

// ── Merge-field substitution ─────────────────────────────

function substituteMergeFields(
  sections: PolicySection[],
  replacements: Record<string, string>,
): PolicySection[] {
  return sections.map(s => ({
    heading: applyReplacements(s.heading, replacements),
    content: applyReplacements((s as any).body ?? s.content, replacements),
  }));
}

function applyReplacements(text: string, replacements: Record<string, string>): string {
  if (!text) return text;
  let result = text;
  for (const [token, value] of Object.entries(replacements)) {
    if (value) result = result.replaceAll(token, value);
  }
  return result;
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

  // ── Resolve merge fields ──────────────────────────────
  // Fetch org name, primary location name, and county (via jurisdiction).
  // If any lookup fails, leave that token raw — never insert empty strings.

  const replacements: Record<string, string> = {};

  // 1. Org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();
  if (org?.name) replacements['{{org_name}}'] = org.name;

  // 2. Primary location + county via jurisdiction
  const { data: locations } = await supabase
    .from('locations')
    .select('name, jurisdiction_id')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (locations?.length === 1) {
    // Single location — clear primary
    replacements['{{location_name}}'] = locations[0].name;

    // 3. County via jurisdiction agency_name
    if (locations[0].jurisdiction_id) {
      const { data: jurisdiction } = await supabase
        .from('jurisdictions')
        .select('agency_name')
        .eq('id', locations[0].jurisdiction_id)
        .single();
      if (jurisdiction?.agency_name) replacements['{{county}}'] = jurisdiction.agency_name;
    }
  }
  // Multiple locations: leave {{location_name}} raw; still try county from first
  if (locations && locations.length > 1 && locations[0].jurisdiction_id) {
    const { data: jurisdiction } = await supabase
      .from('jurisdictions')
      .select('agency_name')
      .eq('id', locations[0].jurisdiction_id)
      .single();
    if (jurisdiction?.agency_name) replacements['{{county}}'] = jurisdiction.agency_name;
  }

  // ── Deep-replace merge fields in body_sections ────────
  const rawSections: PolicySection[] = Array.isArray(template.body_sections)
    ? template.body_sections
    : [];
  const resolvedSections = Object.keys(replacements).length > 0
    ? substituteMergeFields(rawSections, replacements)
    : rawSections;

  const { data: newPolicy, error: iErr } = await supabase
    .from('org_policies')
    .insert({
      organization_id: orgId,
      template_id: template.id,
      pillar: template.pillar,
      category: template.category,
      title: template.title,
      body_sections: resolvedSections,
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
